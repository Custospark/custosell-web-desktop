import { UserCog, UserPlus, Link2 } from 'lucide-react';
import { Modal } from '../../../shared/components/modals/Modal';
import { Button } from '../../../shared/components/buttons/Button';
import type { StaffWithSyncMeta } from '../../../app/store/offline/settings/localStaffStore';
import RoleFormDrawer from './RoleFormDrawer';
import LocationFormModal from './LocationFormModal';
import { StaffModuleAccessFields } from './StaffModuleAccessFields';
import { StaffFormBanners } from './StaffFormBanners';
import { StaffIdentityFields } from './StaffIdentityFields';
import { HrFormSection, HrModalFooter, HrModalHero } from '../../hr/ui/hrFormFields';
import {
  STAFF_ALREADY_MEMBER_MESSAGE,
  STAFF_OTHER_BUSINESS_MESSAGE,
  STAFF_PLATFORM_INACTIVE_MESSAGE,
  useStaffForm,
} from './useStaffForm';

interface StaffFormModalProps {
  open: boolean;
  onClose: () => void;
  staff?: StaffWithSyncMeta | null;
}

export default function StaffFormModal({ open, onClose, staff }: StaffFormModalProps) {
  const f = useStaffForm(open, staff, onClose);

  const title = f.isEditing ? 'Edit staff' : f.isAttachMode ? 'Attach staff' : 'Add staff';
  const subtitle = f.isEditing
    ? (f.emailLocked
      ? `Update ${staff?.name ?? 'staff member'} — owner email stays fixed`
      : `Update ${staff?.name ?? 'staff member'} — email and details can be changed`)
    : f.isAttachMode
      ? 'Existing account — will attach to this organization'
      : 'Create a new staff login for your business';

  const heroIcon = f.isEditing ? UserCog : f.isAttachMode ? Link2 : UserPlus;
  const heroTitle = f.isEditing
    ? 'Staff profile'
    : f.isAttachMode
      ? 'Attach existing account'
      : 'New team member';
  const heroDescription = f.isEditing
    ? 'Change name, phone, role, and module access. Module checkboxes reflect what they can open today.'
    : f.isAttachMode
      ? 'Their password stays the same. Pick a role and modules for this business.'
      : 'Set identity, role, password, and which workspaces they can open.';

  const inputClass = 'w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors';
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1';

  return (
    <>
      <Modal isOpen={open} onClose={onClose} title={title} subtitle={subtitle} size="xl">
        <div className="space-y-5">
          <HrModalHero icon={heroIcon} title={heroTitle} description={heroDescription} tone="indigo" />

          {f.detailLoading ? (
            <p className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-800">
              Loading current module access…
            </p>
          ) : null}

          <StaffFormBanners
            syncFailed={Boolean(staff?._syncFailed)}
            syncError={staff?._lastError}
            isCurrentUser={f.accountRules?.isCurrentUser}
            isBusinessOwner={f.accountRules?.isBusinessOwner}
            emailLocked={f.emailLocked}
            isAttachMode={f.isAttachMode}
            lookupStatus={f.lookup?.status}
            lookupError={f.lookupError}
            alreadyMemberMessage={STAFF_ALREADY_MEMBER_MESSAGE}
            otherBusinessMessage={STAFF_OTHER_BUSINESS_MESSAGE}
            platformInactiveMessage={STAFF_PLATFORM_INACTIVE_MESSAGE}
          />

          <HrFormSection
            title="Identity & login"
            icon={UserCog}
            description="Name, contact, role, and password (only when creating or resetting)."
          >
            <StaffIdentityFields
              name={f.form.name}
              email={f.form.email}
              localPhone={f.form.localPhone}
              countryCode={f.countryCode}
              roleId={f.form.role_id}
              roles={f.roles}
              locationId={f.form.location_id}
              locations={f.locations}
              emailLocked={f.emailLocked}
              roleSelectionLocked={f.roleSelectionLocked}
              roleDisplayName={f.roleDisplayName}
              roleHelperText={f.roleHelperText}
              isEditing={f.isEditing}
              isPendingCreate={f.isPendingCreate}
              isAttachMode={f.isAttachMode}
              lookupLoading={f.lookupLoading}
              password={f.form.password}
              passwordConfirmation={f.form.password_confirmation}
              passwordRequired={f.passwordRequired}
              showConfirmPasswordField={f.showConfirmPasswordField}
              passwordsMatch={f.passwordsMatch}
              showPassword={f.showPassword}
              showConfirmPassword={f.showConfirmPassword}
              inputClass={inputClass}
              labelClass={labelClass}
              onNameChange={(value) => f.update('name', value)}
              onEmailChange={f.handleEmailChange}
              onEmailBlur={() => { void f.runEmailLookup(f.form.email); }}
              onCountryCodeChange={f.setCountryCode}
              onLocalPhoneChange={(value) => f.update('localPhone', value)}
              onRoleChange={(roleId) => f.update('role_id', roleId)}
              onAddRole={() => f.setRoleDrawerOpen(true)}
              onLocationChange={f.handleLocationChange}
              onAddLocation={() => f.setLocationFormOpen(true)}
              onPasswordChange={(value) => f.update('password', value)}
              onPasswordConfirmationChange={(value) => f.update('password_confirmation', value)}
              onToggleShowPassword={() => f.setShowPassword((v) => !v)}
              onToggleShowConfirmPassword={() => f.setShowConfirmPassword((v) => !v)}
            />
          </HrFormSection>

          <StaffModuleAccessFields
            assignableModules={f.assignableModules}
            modules={f.form.modules}
            estimatesFullAccess={f.form.estimatesFullAccess}
            hrFullAccess={f.form.hrFullAccess}
            modulesLocked={f.modulesLocked}
            settingsRequired={f.settingsRequired}
            onToggleModule={f.toggleModule}
            onEstimatesFullAccessChange={(value) => f.update('estimatesFullAccess', value)}
            onHrFullAccessChange={(value) => f.update('hrFullAccess', value)}
          />

          <HrModalFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={f.isSubmitting}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={f.handleSubmit}
              loading={f.isSubmitting}
              disabled={!f.canSubmit}
            >
              {f.isEditing ? 'Save changes' : f.isAttachMode ? 'Attach staff' : 'Create staff'}
            </Button>
          </HrModalFooter>
        </div>
      </Modal>
      <RoleFormDrawer open={f.roleDrawerOpen} onClose={() => f.setRoleDrawerOpen(false)} />
      <LocationFormModal open={f.locationFormOpen} onClose={() => f.setLocationFormOpen(false)} />
    </>
  );
}
