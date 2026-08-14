import { LayoutGrid } from 'lucide-react';
import {
  MODULE_LABELS,
  type BusinessModuleSlug,
} from '../../../shared/utils/moduleAccess';

interface StaffModuleAccessFieldsProps {
  assignableModules: BusinessModuleSlug[];
  modules: BusinessModuleSlug[];
  estimatesFullAccess: boolean;
  hrFullAccess: boolean;
  modulesLocked: boolean;
  settingsRequired: boolean;
  onToggleModule: (module: BusinessModuleSlug) => void;
  onEstimatesFullAccessChange: (value: boolean) => void;
  onHrFullAccessChange: (value: boolean) => void;
}

export function StaffModuleAccessFields({
  assignableModules,
  modules,
  estimatesFullAccess,
  hrFullAccess,
  modulesLocked,
  settingsRequired,
  onToggleModule,
  onEstimatesFullAccessChange,
  onHrFullAccessChange,
}: StaffModuleAccessFieldsProps) {
  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden mb-5">
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
        <LayoutGrid className="w-4 h-4 text-gray-500" />
        <h3 className="text-sm font-semibold text-gray-800">Module access</h3>
      </div>
      <div className="p-4">
        <p className="text-xs text-gray-500 mb-3">
          Controls which sections appear in the app. Sales includes My Shift, where staff can record shift expenses.
          Projects &amp; Estimates can be project boards only, or full workspace access when you enable it below.
          Account and Custosell Guide remain available to everyone.
        </p>
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Your modules</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {assignableModules.map((module) => {
            const checked = modules.includes(module);
            const locked = modulesLocked || (settingsRequired && module === 'settings');
            return (
              <label
                key={module}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                  checked ? 'border-blue-200 bg-blue-50 text-blue-800' : 'border-gray-200 text-gray-700'
                } ${locked ? 'opacity-80 cursor-not-allowed' : 'cursor-pointer hover:border-blue-200'}`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggleModule(module)}
                  disabled={locked}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                {MODULE_LABELS[module]}
                {settingsRequired && module === 'settings' && (
                  <span className="ml-auto text-[10px] font-semibold uppercase text-gray-500">Required</span>
                )}
              </label>
            );
          })}
        </div>
        {!modulesLocked && modules.includes('estimates') && (
          <div className="mt-3 rounded-lg border border-indigo-100 bg-indigo-50/60 p-3">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={estimatesFullAccess}
                onChange={(e) => onEstimatesFullAccessChange(e.target.checked)}
                className="mt-0.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span>
                <span className="block text-sm font-medium text-gray-800">Full Projects &amp; Estimates workspace</span>
                <span className="mt-0.5 block text-xs text-gray-600">
                  Grants full access to estimates, projects, insights, templates, project boards, and costing reports - not just project boards.
                </span>
              </span>
            </label>
          </div>
        )}
        {!modulesLocked && modules.includes('hr') && (
          <div className="mt-3 rounded-lg border border-indigo-100 bg-indigo-50/60 p-3">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={hrFullAccess}
                onChange={(e) => onHrFullAccessChange(e.target.checked)}
                className="mt-0.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span>
                <span className="block text-sm font-medium text-gray-800">Full HR &amp; Payroll workspace</span>
                <span className="mt-0.5 block text-xs text-gray-600">
                  Grants people admin, departments, payroll, reports, and leave approval - not just attendance, leave requests, and talent tasks.
                </span>
              </span>
            </label>
          </div>
        )}
        {!modulesLocked && modules.length === 0 && (
          <p className="text-xs text-amber-700 mt-3">No business modules selected - they will only see Account and Guide.</p>
        )}
      </div>
    </div>
  );
}
