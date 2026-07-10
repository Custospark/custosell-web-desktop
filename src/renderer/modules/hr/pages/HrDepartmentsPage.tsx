import { useState } from 'react';
import { AlignLeft, Briefcase, Building2, FileText, Plus, Trash2 } from 'lucide-react';
import { Button } from '../../../shared/components/buttons/Button';
import { Modal } from '../../../shared/components/modals/Modal';
import { LoadingSpinner } from '../../../shared/components/loading/LoadingSpinner';
import { useConfirm } from '../../../shared/components/Feedback/ConfirmContext';
import {
  useCreateHrDepartment,
  useCreateHrPosition,
  useDeleteHrDepartment,
  useDeleteHrPosition,
  useHrDepartments,
  useHrPositions,
} from '../api/useHrQueries';
import { HrEmptyState, HrPageHeader, HrSectionCard } from '../ui/HrSurface';
import {
  HrFormSection,
  HrIconField,
  HrModalFooter,
  HrModalHero,
  hrInputClass,
  hrSelectClass,
} from '../ui/hrFormFields';
import { HR_SURFACE } from '../ui/hrSurfaceStyles';

export default function HrDepartmentsPage() {
  const { confirm } = useConfirm();
  const { data: departments = [], isLoading: loadingDepts } = useHrDepartments();
  const { data: positions = [], isLoading: loadingPositions } = useHrPositions();
  const createDept = useCreateHrDepartment();
  const deleteDept = useDeleteHrDepartment();
  const createPos = useCreateHrPosition();
  const deletePos = useDeleteHrPosition();

  const [deptOpen, setDeptOpen] = useState(false);
  const [posOpen, setPosOpen] = useState(false);
  const [deptName, setDeptName] = useState('');
  const [deptDesc, setDeptDesc] = useState('');
  const [posTitle, setPosTitle] = useState('');
  const [posDeptId, setPosDeptId] = useState('');
  const [posDesc, setPosDesc] = useState('');

  async function handleCreateDept(e: React.FormEvent) {
    e.preventDefault();
    await createDept.mutateAsync({ name: deptName.trim(), description: deptDesc || null });
    setDeptOpen(false);
    setDeptName('');
    setDeptDesc('');
  }

  async function handleCreatePos(e: React.FormEvent) {
    e.preventDefault();
    await createPos.mutateAsync({
      title: posTitle.trim(),
      department_id: posDeptId ? Number(posDeptId) : null,
      description: posDesc || null,
    });
    setPosOpen(false);
    setPosTitle('');
    setPosDeptId('');
    setPosDesc('');
  }

  async function handleDeleteDept(id: number, name: string) {
    const ok = await confirm({
      title: 'Delete department?',
      message: `Remove “${name}”? Positions linked to it may need reassignment first.`,
      confirmText: 'Delete',
      variant: 'danger',
    });
    if (ok) await deleteDept.mutateAsync(id);
  }

  async function handleDeletePos(id: number, title: string) {
    const ok = await confirm({
      title: 'Delete position?',
      message: `Remove “${title}”? Employees assigned to this role will need a new position.`,
      confirmText: 'Delete',
      variant: 'danger',
    });
    if (ok) await deletePos.mutateAsync(id);
  }

  return (
    <div className="space-y-5">
      <HrPageHeader
        icon={Building2}
        title="Departments & positions"
        description="Shape your org chart before assigning people — departments group teams, positions define roles."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <HrSectionCard
          title="Departments"
          description="Teams like Sales, Operations, or Finance"
          actions={
            <Button size="sm" onClick={() => setDeptOpen(true)} className="inline-flex items-center gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Add department
            </Button>
          }
        >
          {loadingDepts ? (
            <div className="flex justify-center py-10"><LoadingSpinner /></div>
          ) : departments.length === 0 ? (
            <HrEmptyState
              className="border-0 bg-transparent shadow-none backdrop-blur-none"
              icon={<Building2 className="h-5 w-5" />}
              title="No departments yet"
              description="Start with one team — you can always add more as you grow."
              action={
                <Button size="sm" onClick={() => setDeptOpen(true)} className="inline-flex items-center gap-1.5">
                  <Plus className="h-3.5 w-3.5" /> Add your first department
                </Button>
              }
            />
          ) : (
            <ul className="divide-y divide-gray-100">
              {departments.map((d) => (
                <li key={d.id} className="flex items-start justify-between gap-3 py-3">
                  <div>
                    <p className="font-medium text-gray-900">{d.name}</p>
                    {d.description ? <p className="text-xs text-gray-500">{d.description}</p> : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteDept(d.id, d.name)}
                    className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                    title="Delete department"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </HrSectionCard>

        <HrSectionCard
          title="Positions"
          description="Job titles you can assign to employees"
          actions={
            <Button size="sm" onClick={() => setPosOpen(true)} className="inline-flex items-center gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Add position
            </Button>
          }
        >
          {loadingPositions ? (
            <div className="flex justify-center py-10"><LoadingSpinner /></div>
          ) : positions.length === 0 ? (
            <HrEmptyState
              className="border-0 bg-transparent shadow-none backdrop-blur-none"
              icon={<Briefcase className="h-5 w-5" />}
              title="No positions yet"
              description="Add titles like Cashier, Store Manager, or Accountant — optionally tie them to a department."
              action={
                <Button size="sm" onClick={() => setPosOpen(true)} className="inline-flex items-center gap-1.5">
                  <Plus className="h-3.5 w-3.5" /> Add your first position
                </Button>
              }
            />
          ) : (
            <div className={HR_SURFACE.tableWrap}>
              <table className="min-w-full text-sm">
                <thead className="bg-white/60 text-left text-xs font-semibold uppercase text-gray-500">
                  <tr>
                    <th className="px-3 py-2">Title</th>
                    <th className="px-3 py-2">Department</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {positions.map((p) => (
                    <tr key={p.id}>
                      <td className="px-3 py-2 font-medium text-gray-900">{p.title}</td>
                      <td className="px-3 py-2 text-gray-600">{p.department?.name ?? '—'}</td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => handleDeletePos(p.id, p.title)}
                          className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                          title="Delete position"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </HrSectionCard>
      </div>

      <Modal
        isOpen={deptOpen}
        onClose={() => setDeptOpen(false)}
        title="Add department"
        subtitle="Group your team by function or location."
      >
        <form onSubmit={handleCreateDept} className="space-y-5">
          <HrModalHero
            icon={Building2}
            title="New department"
            description="Departments help you organize people before assigning roles and payroll."
            tone="indigo"
          />
          <HrFormSection title="Details" icon={Building2} description="Give it a clear name your team will recognize.">
            <HrIconField label="Name" icon={Building2} required>
              <input
                required
                value={deptName}
                onChange={(e) => setDeptName(e.target.value)}
                placeholder="Operations"
                className={hrInputClass}
                autoFocus
              />
            </HrIconField>
            <HrIconField label="Description" icon={AlignLeft}>
              <textarea
                value={deptDesc}
                onChange={(e) => setDeptDesc(e.target.value)}
                rows={2}
                placeholder="Optional — what this team is responsible for"
                className={hrInputClass}
              />
            </HrIconField>
          </HrFormSection>
          <HrModalFooter>
            <Button type="button" variant="outline" onClick={() => setDeptOpen(false)}>Cancel</Button>
            <Button type="submit" loading={createDept.isPending}>Create department</Button>
          </HrModalFooter>
        </form>
      </Modal>

      <Modal
        isOpen={posOpen}
        onClose={() => setPosOpen(false)}
        title="Add position"
        subtitle="Define a job title for your org chart."
      >
        <form onSubmit={handleCreatePos} className="space-y-5">
          <HrModalHero
            icon={Briefcase}
            title="New position"
            description="Positions appear on employee profiles and help you track who does what."
            tone="blue"
          />
          <HrFormSection title="Role details" icon={Briefcase} description="Link to a department when the role belongs to one team.">
            <HrIconField label="Title" icon={Briefcase} required>
              <input
                required
                value={posTitle}
                onChange={(e) => setPosTitle(e.target.value)}
                placeholder="Store Manager"
                className={hrInputClass}
                autoFocus
              />
            </HrIconField>
            <HrIconField label="Department" icon={Building2}>
              <select value={posDeptId} onChange={(e) => setPosDeptId(e.target.value)} className={hrSelectClass}>
                <option value="">No department</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </HrIconField>
            <HrIconField label="Description" icon={FileText}>
              <textarea
                value={posDesc}
                onChange={(e) => setPosDesc(e.target.value)}
                rows={2}
                placeholder="Optional — responsibilities or requirements"
                className={hrInputClass}
              />
            </HrIconField>
          </HrFormSection>
          <HrModalFooter>
            <Button type="button" variant="outline" onClick={() => setPosOpen(false)}>Cancel</Button>
            <Button type="submit" loading={createPos.isPending}>Create position</Button>
          </HrModalFooter>
        </form>
      </Modal>
    </div>
  );
}
