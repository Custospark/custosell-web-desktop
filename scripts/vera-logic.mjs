/**
 * Vera Logic — repo rules & contracts (not ESLint).
 * Runs on every Vera Fast handoff after lint.
 *
 * Usage: node scripts/vera-logic.mjs
 */
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const MAX_LINES = 500;

/** @typedef {{ id: string, ok: boolean, detail: string }} RuleResult */

function read(relPath) {
  const full = path.join(ROOT, relPath);
  if (!fs.existsSync(full)) return null;
  return fs.readFileSync(full, 'utf8');
}

function lineCount(relPath) {
  const text = read(relPath);
  if (text == null) return 0;
  return text.split(/\r?\n/).length;
}

function getChangedTsFiles() {
  const commands = [
    'git diff --name-only --diff-filter=ACMRTUXB HEAD',
    'git diff --cached --name-only --diff-filter=ACMRTUXB',
  ];
  const files = new Set();
  for (const cmd of commands) {
    try {
      const out = execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
      for (const line of out.split('\n')) {
        const trimmed = line.trim().replace(/\\/g, '/');
        if (
          trimmed
          && (trimmed.endsWith('.ts') || trimmed.endsWith('.tsx'))
          && trimmed.startsWith('src/')
        ) {
          files.add(trimmed);
        }
      }
    } catch {
      // ignore
    }
  }
  return [...files];
}

/** @returns {RuleResult[]} */
function checkFileSizeLimit(changedFiles) {
  const results = [];
  const targets = changedFiles.length > 0
    ? changedFiles
    : [];

  for (const file of targets) {
    const lines = lineCount(file);
    if (lines > MAX_LINES) {
      results.push({
        id: 'file-size-500',
        ok: false,
        detail: `${file} has ${lines} lines (max ${MAX_LINES})`,
      });
    }
  }

  if (results.length === 0) {
    results.push({
      id: 'file-size-500',
      ok: true,
      detail: targets.length
        ? `Changed source files ≤ ${MAX_LINES} lines (${targets.length} checked)`
        : 'No changed TS/TSX under src/ — size check skipped',
    });
  }

  return results;
}

/** @returns {RuleResult} */
function checkSupplierInvoicesRoute() {
  const routes = read('src/renderer/app/routes/index.tsx') ?? '';
  const paths = read('src/renderer/app/routes/constants/shared.paths.ts') ?? '';
  const hasPath = /SUPPLIER\s*:\s*['"]\/invoices\/supplier['"]/.test(paths);
  const hasRoute = /INVOICES\.SUPPLIER/.test(routes) && /mode=["']supplier["']/.test(routes);

  if (!hasPath || !hasRoute) {
    return {
      id: 'supplier-invoices-route',
      ok: false,
      detail: 'Expected ROUTES.INVOICES.SUPPLIER = /invoices/supplier and <InvoicesPage mode="supplier" />',
    };
  }
  return {
    id: 'supplier-invoices-route',
    ok: true,
    detail: 'Supplier invoices route locked to mode="supplier"',
  };
}

/** @returns {RuleResult} */
function checkSidebarInvoiceLabels() {
  const nav = read('src/renderer/shared/components/layout/sidebarNavGroups.ts') ?? '';
  const hasSales = /label:\s*['"]Sales invoices['"]/.test(nav);
  const hasSupplier = /label:\s*['"]Supplier invoices['"]/.test(nav);
  if (!hasSales || !hasSupplier) {
    return {
      id: 'sidebar-invoice-labels',
      ok: false,
      detail: 'Sidebar must label Sales invoices and Supplier invoices',
    };
  }
  return {
    id: 'sidebar-invoice-labels',
    ok: true,
    detail: 'Sidebar Sales / Supplier invoices labels present',
  };
}

/** @returns {RuleResult} */
function checkBuyerCannotRecordPaymentUi() {
  const modal = read('src/renderer/modules/invoices/RecordPaymentModal.tsx') ?? '';
  const gatesReceived = /isReceivedInvoice/.test(modal) && /canRecord/.test(modal);
  if (!gatesReceived) {
    return {
      id: 'buyer-record-payment-gate',
      ok: false,
      detail: 'RecordPaymentModal must gate canRecord with isReceivedInvoice / viewOnly',
    };
  }
  return {
    id: 'buyer-record-payment-gate',
    ok: true,
    detail: 'RecordPaymentModal gates recording for received invoices',
  };
}

/** @returns {RuleResult} */
function checkNoBuyerFocusPaymentsDeepLink() {
  const files = [
    'src/renderer/modules/inventory/ui/supply/buyerPoActions.tsx',
    'src/renderer/modules/inventory/PurchaseOrdersPage.tsx',
  ];
  const offenders = [];
  for (const file of files) {
    const text = read(file);
    if (text == null) continue;
    if (/focus=payments|focus['"]?\s*[:=]\s*['"]payments['"]/.test(text)) {
      offenders.push(file);
    }
  }
  if (offenders.length) {
    return {
      id: 'no-buyer-focus-payments',
      ok: false,
      detail: `Buyer PO surfaces must not deep-link focus=payments: ${offenders.join(', ')}`,
    };
  }
  return {
    id: 'no-buyer-focus-payments',
    ok: true,
    detail: 'Buyer PO surfaces do not auto-open record-payment deep-links',
  };
}

/** @returns {RuleResult} */
function checkViewInvoiceModalExists() {
  const exists = fs.existsSync(path.join(ROOT, 'src/renderer/modules/invoices/ViewInvoiceModal.tsx'));
  return {
    id: 'view-invoice-modal',
    ok: exists,
    detail: exists
      ? 'ViewInvoiceModal present for in-place PO/IO viewing'
      : 'Missing ViewInvoiceModal.tsx (required for in-place invoice viewing)',
  };
}

const changed = getChangedTsFiles();
const results = [
  ...checkFileSizeLimit(changed),
  checkSupplierInvoicesRoute(),
  checkSidebarInvoiceLabels(),
  checkBuyerCannotRecordPaymentUi(),
  checkNoBuyerFocusPaymentsDeepLink(),
  checkViewInvoiceModalExists(),
];

const failed = results.filter((r) => !r.ok);

console.log(`🧪 Vera logic: ${results.length} rule(s)`);
for (const r of results) {
  console.log(`  ${r.ok ? '✅' : '❌'} [${r.id}] ${r.detail}`);
}

if (failed.length) {
  console.log(`❌ Vera logic: failed (${failed.length})`);
  process.exit(1);
}

console.log('✅ Vera logic: passed');
process.exit(0);
