/**
 * One-shot import rewriter after offline/ folder modularization.
 * Run from repo root: node scripts/refactor-offline-imports.mjs
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(import.meta.dirname, '..');
const OFFLINE = path.join(ROOT, 'src/renderer/app/store/offline');

/** basename -> path relative to offline/ (without .ts) */
const FILE_MAP = {
  offlineDb: 'core/offlineDb',
  offlineQueryUtils: 'core/offlineQueryUtils',
  offlineReadStrategy: 'core/offlineReadStrategy',
  offlinePreferences: 'core/offlinePreferences',
  remapBusinessContext: 'core/remapBusinessContext',
  secureStorage: 'auth/secureStorage',
  passwordVerifier: 'auth/passwordVerifier',
  localAuthStore: 'auth/localAuthStore',
  deviceCredentials: 'auth/deviceCredentials',
  deviceLoginSecrets: 'auth/deviceLoginSecrets',
  offlineAuthUtils: 'auth/offlineAuthUtils',
  completeOfflineLogin: 'auth/completeOfflineLogin',
  completeOfflineRegistration: 'auth/completeOfflineRegistration',
  authSessionApply: 'auth/authSessionApply',
  sessionUpgrade: 'auth/sessionUpgrade',
  sessionRefresh: 'auth/sessionRefresh',
  persistAuthSnapshot: 'auth/persistAuthSnapshot',
  syncAuthEngine: 'auth/syncAuthEngine',
  localSalesStore: 'sales/localSalesStore',
  localRefundsStore: 'sales/localRefundsStore',
  localShiftsStore: 'sales/localShiftsStore',
  completeOfflineSale: 'sales/completeOfflineSale',
  completeOfflineRefund: 'sales/completeOfflineRefund',
  completeOfflineShift: 'sales/completeOfflineShift',
  offlineSalesSummary: 'sales/offlineSalesSummary',
  receiptGenerator: 'sales/receiptGenerator',
  syncSalesBatch: 'sales/syncSalesBatch',
  localProductsStore: 'inventory/localProductsStore',
  localCategoriesStore: 'inventory/localCategoriesStore',
  stockLedger: 'inventory/stockLedger',
  offlineStockOverlay: 'inventory/offlineStockOverlay',
  completeOfflineProduct: 'inventory/completeOfflineProduct',
  completeOfflineCategory: 'inventory/completeOfflineCategory',
  localCustomersStore: 'customers/localCustomersStore',
  completeOfflineCustomer: 'customers/completeOfflineCustomer',
  localExpensesStore: 'expenses/localExpensesStore',
  localExpenseCategoriesStore: 'expenses/localExpenseCategoriesStore',
  completeOfflineExpense: 'expenses/completeOfflineExpense',
  completeOfflineExpenseCategory: 'expenses/completeOfflineExpenseCategory',
  localRolesStore: 'settings/localRolesStore',
  localStaffStore: 'settings/localStaffStore',
  localBusinessSettingsStore: 'settings/localBusinessSettingsStore',
  completeOfflineSettings: 'settings/completeOfflineSettings',
  serverCatalogStore: 'catalogs/serverCatalogStore',
  catalogSnapshotUtils: 'catalogs/catalogSnapshotUtils',
  catalogSnapshotRefresh: 'catalogs/catalogSnapshotRefresh',
  salesCatalogSnapshot: 'catalogs/salesCatalogSnapshot',
  mutationQueue: 'sync/mutationQueue',
  syncCoordinator: 'sync/syncCoordinator',
  syncEngine: 'sync/syncEngine',
  syncPendingIfOnline: 'sync/syncPendingIfOnline',
  syncCacheRefresh: 'sync/syncCacheRefresh',
  syncProgressReporter: 'sync/syncProgressReporter',
  syncConstants: 'sync/syncConstants',
  syncErrorUtils: 'sync/syncErrorUtils',
  syncMutationFinalize: 'sync/syncMutationFinalize',
  offlineCacheReconcile: 'sync/offlineCacheReconcile',
  localGuideFeedbackStore: 'guide/localGuideFeedbackStore',
  completeOfflineGuideFeedback: 'guide/completeOfflineGuideFeedback',
};

function basenameFromImport(spec) {
  const clean = spec.replace(/^\.\.?\//, '').split('/').pop() ?? spec;
  return clean.replace(/\.ts$/, '');
}

function resolveOfflineTarget(spec, fromFile) {
  const base = basenameFromImport(spec);
  const mapped = FILE_MAP[base];
  if (!mapped) return null;
  return path.join(OFFLINE, `${mapped}.ts`);
}

function toRelativeImport(fromFile, targetAbs) {
  const fromDir = path.dirname(fromFile);
  let rel = path.relative(fromDir, targetAbs).replace(/\\/g, '/');
  if (!rel.startsWith('.')) rel = `./${rel}`;
  return rel.replace(/\.ts$/, '');
}

function rewriteFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  // Absolute-style imports: .../store/offline/foo or .../offline/foo
  content = content.replace(
    /from (['"])([^'"]*\/offline\/)([a-zA-Z0-9]+)\1/g,
    (match, quote, prefix, name) => {
      const mapped = FILE_MAP[name];
      if (!mapped) return match;
      changed = true;
      return `from ${quote}${prefix}${mapped}${quote}`;
    },
  );

  // Relative imports within offline tree
  if (filePath.startsWith(OFFLINE)) {
    content = content.replace(
      /from (['"])(\.\.?\/[^'"]+)\1/g,
      (match, quote, spec) => {
        const base = basenameFromImport(spec);
        if (!FILE_MAP[base]) return match;
        const target = resolveOfflineTarget(spec, filePath);
        if (!target) return match;
        const newSpec = toRelativeImport(filePath, target);
        if (newSpec === spec) return match;
        changed = true;
        return `from ${quote}${newSpec}${quote}`;
      },
    );
  }

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
  }
  return changed;
}

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) out.push(full);
  }
  return out;
}

const srcDir = path.join(ROOT, 'src');
let count = 0;
for (const file of walk(srcDir)) {
  if (rewriteFile(file)) count++;
}
console.log(`Updated imports in ${count} files`);
