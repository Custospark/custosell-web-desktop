import { useState } from 'react';
import { Building2, Briefcase, Plus, Trash2 } from 'lucide-react';
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
import { HR_SURFACE } from '../ui/hrSurfaceStyles';

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500';

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
      message: `Delete “${name}”? Positions linked to it may need reassignment.`,
      confirmText: 'Delete',
      variant: 'danger',
    });
    if (ok) await deleteDept.mutateAsync(id);
  }

  async function handleDeletePos(id: number, title: string) {
    const ok = await confirm({
      title: 'Delete position?',
      message: `Delete “${title}”?`,
      confirmText: 'Delete',
      variant: 'danger',
    });
    if (ok) await deletePos.mutateAsync(id);
  }

  return (
    <div className="space-y-4">
      <HrPageHeader
        title="Departments & positions"
        description="Organize your org chart before assigning employees."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <HrSectionCard
          title="Departments"
          actions={
            <Button size="sm" onClick={() => setDeptOpen(true)} className="inline-flex items-center gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Add
            </Button>
          }
        >
          {loadingDepts ? (
            <div className="flex justify-center py-10"><LoadingSpinner /></div>
          ) : departments.length === 0 ? (
            <HrEmptyState
              className="border-0 bg-transparent shadow-none backdrop-blur-none"
              icon={<Building2 className="h-5 w-5" />}
              title="No departments"
              description="Create departments like Sales, Operations, or Finance."
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
                    title="Delete"
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
          actions={
            <Button size="sm" onClick={() => setPosOpen(true)} className="inline-flex items-center gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Add
            </Button>
          }
        >
          {loadingPositions ? (
            <div className="flex justify-center py-10"><LoadingSpinner /></div>
          ) : positions.length === 0 ? (
            <HrEmptyState
              className="border-0 bg-transparent shadow-none backdrop-blur-none"
              icon={<Briefcase className="h-5 w-5" />}
              title="No positions"
              description="Add job titles and optionally attach them to a department."
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

      <Modal isOpen={deptOpen} onClose={() => setDeptOpen(false)} title="Add department">
        <form onSubmit={handleCreateDept} className="space-y-3">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-gray-700">Name</span>
            <input required value={deptName} onChange={(e) => setDeptName(e.target.value)} className={inputClass} />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-gray-700">Description</span>
            <textarea value={deptDesc} onChange={(e) => setDeptDesc(e.target.value)} rows={2} className={inputClass} />
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setDeptOpen(false)}>Cancel</Button>
            <Button type="submit" loading={createDept.isPending}>Create</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={posOpen} onClose={() => setPosOpen(false)} title="Add position">
        <form onSubmit={handleCreatePos} className="space-y-3">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-gray-700">Title</span>
            <input required value={posTitle} onChange={(e) => setPosTitle(e.target.value)} className={inputClass} />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-gray-700">Department</span>
            <select value={posDeptId} onChange={(e) => setPosDeptId(e.target.value)} className={inputClass}>
              <option value="">None</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-gray-700">Description</span>
            <textarea value={posDesc} onChange={(e) => setPosDesc(e.target.value)} rows={2} className={inputClass} />
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setPosOpen(false)}>Cancel</Button>
            <Button type="submit" loading={createPos.isPending}>Create</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
