import { useMemo } from 'react';
import { cn } from '../../../shared/utils/cn';
import { usePipelineBoardMetaFields, usePipelineLeadMetaValues, useSyncPipelineLeadMetaValues } from '../api/usePipelineQueries';
import { PipelineFormSection, pipelineInputClass } from './pipelineFormFields';
import { Database } from 'lucide-react';

interface CardMetaFieldsSectionProps {
  leadId: number;
  boardId: number;
  canEdit?: boolean;
}

export default function CardMetaFieldsSection({ leadId, boardId, canEdit = true }: CardMetaFieldsSectionProps) {
  const { data: fields = [] } = usePipelineBoardMetaFields(boardId);
  const { data: values = [] } = usePipelineLeadMetaValues(leadId);
  const syncValues = useSyncPipelineLeadMetaValues(leadId);

  const valueMap = useMemo(() => {
    const map = new Map<number, string | null>();
    for (const v of values) {
      map.set(v.meta_field_id, v.value);
    }
    return map;
  }, [values]);

  const setValue = (metaFieldId: number, value: string | null) => {
    if (!canEdit) return;
    const next = fields
      .filter((f) => f.id !== metaFieldId || value != null)
      .map((f) => ({
        meta_field_id: f.id,
        value: f.id === metaFieldId ? value : (valueMap.get(f.id) ?? null),
      }));
    if (value != null) {
      const exists = next.find((n) => n.meta_field_id === metaFieldId);
      if (!exists) next.push({ meta_field_id: metaFieldId, value });
    }
    syncValues.mutate(next);
  };

  return (
    <PipelineFormSection title="Custom fields" icon={Database}>
      {fields.length === 0 ? (
        <p className="text-xs text-gray-400 italic">No custom fields defined for this board. Add them in board settings.</p>
      ) : (
        <div className="space-y-2.5">
        {fields.sort((a, b) => a.sort_order - b.sort_order).map((field) => {
          const currentValue = valueMap.get(field.id) ?? '';
          return (
            <div key={field.id}>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                {field.name}
                {field.required && <span className="ml-0.5 text-red-500">*</span>}
              </label>
              {field.type === 'text' && (
                <input
                  type="text"
                  value={currentValue}
                  onChange={(e) => setValue(field.id, e.target.value || null)}
                  disabled={!canEdit}
                  className={cn(pipelineInputClass, 'h-8 px-2.5 text-sm')}
                  placeholder={`Enter ${field.name.toLowerCase()}…`}
                />
              )}
              {field.type === 'number' && (
                <input
                  type="number"
                  value={currentValue}
                  onChange={(e) => setValue(field.id, e.target.value || null)}
                  disabled={!canEdit}
                  className={cn(pipelineInputClass, 'h-8 px-2.5 text-sm')}
                  placeholder="0"
                />
              )}
              {field.type === 'date' && (
                <input
                  type="date"
                  value={currentValue}
                  onChange={(e) => setValue(field.id, e.target.value || null)}
                  disabled={!canEdit}
                  className={cn(pipelineInputClass, 'h-8 px-2.5 text-sm')}
                />
              )}
              {field.type === 'select' && (
                <select
                  value={currentValue}
                  onChange={(e) => setValue(field.id, e.target.value || null)}
                  disabled={!canEdit}
                  className={cn(pipelineInputClass, 'h-8 px-2.5 text-sm')}
                >
                  <option value="">{field.required ? 'Select…' : 'None'}</option>
                  {(field.options ?? []).map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              )}
              {field.type === 'multi_select' && (
                <div className="flex flex-wrap gap-1.5">
                  {(field.options ?? []).map((opt) => {
                    const selected = (currentValue ?? '').split(',').map((s) => s.trim()).includes(opt);
                    return (
                      <button
                        key={opt}
                        type="button"
                        disabled={!canEdit}
                        onClick={() => {
                          const current = (currentValue ?? '').split(',').map((s) => s.trim()).filter(Boolean);
                          const next = selected
                            ? current.filter((s) => s !== opt)
                            : [...current, opt];
                          setValue(field.id, next.length > 0 ? next.join(', ') : null);
                        }}
                        className={cn(
                          'rounded-md px-2.5 py-1 text-xs font-semibold transition-all',
                          selected
                            ? 'bg-indigo-100 text-indigo-800 ring-1 ring-indigo-300'
                            : 'bg-gray-100 text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50',
                        )}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
      )}
    </PipelineFormSection>
  );
}
