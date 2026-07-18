import { useState } from 'react';
import { AlertTriangle, Trash2, ShieldAlert, Loader2 } from 'lucide-react';
import BusinessSettingsForm from './ui/BusinessSettingsForm';
import { Button } from '../../shared/components/buttons/Button';
import { Card } from '../../shared/components/cards/Card';
import { Modal } from '../../shared/components/modals/Modal';
import { useBusiness, useDeleteBusinessAccount } from './api/settings/BusinessQueries';
import { inputClass } from '../../shared/utils/inputStyles';

enum DeleteStep { Confirm, Password }

export default function BusinessSettingsPage() {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [step, setStep] = useState<DeleteStep>(DeleteStep.Confirm);
  const [understood, setUnderstood] = useState(false);
  const [password, setPassword] = useState('');
  const [businessName, setBusinessName] = useState('');
  const deleteMutation = useDeleteBusinessAccount();
  const { data: business } = useBusiness();

  const slug = business?.slug ?? '';
  const nameToType = `/reset ${slug}`;
  const nameMatch = businessName.trim().toLowerCase() === nameToType.trim().toLowerCase();
  const canDelete = understood && password.length > 0 && nameMatch;

  const handleOpenDelete = () => {
    setStep(DeleteStep.Confirm);
    setUnderstood(false);
    setPassword('');
    setBusinessName('');
    setDeleteOpen(true);
  };

  const handleProceedToPassword = () => {
    setStep(DeleteStep.Password);
  };

  const handleConfirmDelete = () => {
    if (!canDelete) return;
    deleteMutation.mutate({ password });
  };

  const handleClose = () => {
    setDeleteOpen(false);
  };

  return (
    <div className="mx-auto w-full min-w-0 max-w-5xl pb-10 sm:pb-8">
      <BusinessSettingsForm />

      <Card className="mt-10 border-red-200">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 rounded-lg bg-red-50">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-red-800">Danger Zone</h2>
              <p className="text-xs text-red-600 mt-0.5">Irreversible actions — proceed with caution</p>
            </div>
          </div>

          <div className="bg-red-50/50 border border-red-100 rounded-xl p-5">
            <div className="flex items-start gap-4">
              <Trash2 className="w-8 h-8 text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-red-900">Delete Business Account</h3>
                <p className="text-xs text-red-700 mt-1 leading-relaxed">
                  Permanently delete your business and all associated data. This action cannot be undone.
                  All products, customers, sales, invoices, expenses, accounting records, documents,
                  and settings will be permanently removed.
                </p>
                <p className="text-xs text-amber-700 mt-2 font-medium">
                  We strongly recommend exporting your data first.
                </p>
                <Button
                  variant="danger"
                  className="mt-4"
                  onClick={handleOpenDelete}
                >
                  <Trash2 className="w-4 h-4 mr-1.5" />
                  Delete Business Account
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Modal open={deleteOpen} onClose={handleClose}>
        <div className="p-6 space-y-5 max-w-lg">
          {step === DeleteStep.Confirm && (
            <>
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-full bg-red-50">
                  <ShieldAlert className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Delete Business Account</h3>
                  <p className="text-sm text-gray-500">This action is permanent and irreversible</p>
                </div>
              </div>

              <div className="bg-red-50 border border-red-100 rounded-xl p-4 space-y-2">
                <p className="text-sm font-medium text-red-800">When you delete your business account:</p>
                <ul className="text-xs text-red-700 space-y-1 ml-4 list-disc">
                  <li>All products, categories, and inventory data will be permanently removed</li>
                  <li>All sales history, invoices, payments, and customer records will be deleted</li>
                  <li>All expenses, accounting records, and financial data will be erased</li>
                  <li>All pipeline boards, leads, estimates, projects, and documents will be lost</li>
                  <li>All staff accounts and user roles will be disassociated</li>
                  <li>Your subscription will be cancelled immediately</li>
                </ul>
              </div>

              <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                <p className="text-xs text-amber-800 font-medium">
                  Tip: Go to <strong>Settings → Data & Export</strong> to export all your data before deleting.
                </p>
              </div>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={understood}
                  onChange={(e) => setUnderstood(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                />
                <span className="text-sm text-gray-700">
                  I understand that deleting my business account is permanent and irreversible.
                  All my data will be lost.
                </span>
              </label>

              <div className="flex gap-3 pt-2">
                <Button variant="danger" onClick={handleProceedToPassword} disabled={!understood}>
                  Continue to Deletion
                </Button>
                <Button variant="ghost" onClick={handleClose}>Cancel</Button>
              </div>
            </>
          )}

          {step === DeleteStep.Password && (
            <>
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-full bg-red-50">
                  <ShieldAlert className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Confirm Deletion</h3>
                  <p className="text-sm text-gray-500">Enter your password to confirm</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Type <code className="bg-gray-100 px-1.5 py-0.5 rounded text-red-600 font-mono text-xs">{nameToType}</code> to confirm
                  </label>
                  <input
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder={nameToType}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Your password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className={inputClass}
                  />
                </div>
              </div>

              {deleteMutation.isError && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                  {(deleteMutation.error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to delete account'}
                </p>
              )}

              <div className="flex gap-3 pt-2">
                <Button
                  variant="danger"
                  onClick={handleConfirmDelete}
                  disabled={!canDelete || deleteMutation.isPending}
                >
                  {deleteMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Deleting...</>
                  ) : (
                    <><Trash2 className="w-4 h-4 mr-1.5" /> Permanently Delete</>
                  )}
                </Button>
                <Button variant="ghost" onClick={handleClose} disabled={deleteMutation.isPending}>Cancel</Button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}
