#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { request } from 'node:https';

const { GH_TOKEN } = process.env;
if (!GH_TOKEN) {
  console.error('Missing $GH_TOKEN - skipping draft publishing');
  process.exit(0);
}

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf-8'));
const tag = `v${pkg.version}`;

function githubRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'api.github.com',
      path,
      method,
      headers: {
        Authorization: `token ${GH_TOKEN}`,
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'custosell-release-script',
        'Content-Type': 'application/json',
        ...(body ? { 'Content-Length': Buffer.byteLength(body) } : {}),
      },
    };

    const req = request(opts, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

const { status: listStatus, data: releases } = await githubRequest(
  'GET',
  '/repos/Custospark/custosell-web-desktop/releases?per_page=20'
);

if (listStatus !== 200) {
  console.error(`❌ Failed to list releases (${listStatus})`);
  process.exit(0);
}

const release = Array.isArray(releases) ? releases.find((r) => r.tag_name === tag) : null;

if (!release) {
  console.log(`ℹ️  No release found for ${tag} - skipping`);
  process.exit(0);
}

if (!release.draft) {
  console.log(`ℹ️  Release ${tag} is already published - nothing to do`);
  process.exit(0);
}

console.log(`📝 Publishing draft release ${tag}...`);

const { status: patchStatus, data: patchData } = await githubRequest(
  'PATCH',
  `/repos/Custospark/custosell-web-desktop/releases/${release.id}`,
  JSON.stringify({ draft: false })
);

if (patchStatus === 200) {
  console.log(`✅ Release published: ${patchData.html_url}`);
} else {
  console.error(`❌ Failed to publish draft (${patchStatus}): ${patchData.message ?? patchStatus}`);
}

process.exit(0);
