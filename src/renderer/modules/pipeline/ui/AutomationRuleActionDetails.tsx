import { pipelineInputClass, pipelineSelectClass } from './pipelineFormFields';
import type { AutomationActionConfig } from '../api/pipelineAutomationRuleTypes';
import { PRIORITY_OPTIONS } from './automationRuleBuilderOptions';
import { PipelineNumberInput } from './PipelineNumberInput';

interface ActionDetailsProps {
  action: AutomationActionConfig;
  stages: { id: number; name: string }[];
  members: { id: number; name: string }[];
  labels: { id: number; name: string; color: string }[];
  metaFields: { id: number; name: string }[];
  onChange: (patch: Partial<AutomationActionConfig>) => void;
}

export default function ActionDetails({ action, stages, members, labels, metaFields, onChange }: ActionDetailsProps) {
  const type = action.type;

  if (type === 'move_to_stage') {
    return (
      <div className="mt-2">
        <label className="mb-1 block text-xs font-medium text-gray-600">Stage</label>
        <select
          value={action.stage_id ?? ''}
          onChange={(e) => onChange({ stage_id: e.target.value ? Number(e.target.value) : null })}
          className={pipelineSelectClass}
        >
          <option value="">Select stage</option>
          {stages.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>
    );
  }

  if (type === 'assign_to') {
    return (
      <div className="mt-2">
        <label className="mb-1 block text-xs font-medium text-gray-600">Member</label>
        <select
          value={action.user_id ?? ''}
          onChange={(e) => onChange({ user_id: e.target.value ? Number(e.target.value) : null })}
          className={pipelineSelectClass}
        >
          <option value="">Select member</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
      </div>
    );
  }

  if (type === 'add_label' || type === 'remove_label') {
    return (
      <div className="mt-2">
        <label className="mb-1 block text-xs font-medium text-gray-600">Label</label>
        <select
          value={action.label_id ?? ''}
          onChange={(e) => onChange({ label_id: e.target.value ? Number(e.target.value) : null })}
          className={pipelineSelectClass}
        >
          <option value="">Select label</option>
          {labels.map((l) => (
            <option key={l.id} value={l.id}>{l.name}</option>
          ))}
        </select>
      </div>
    );
  }

  if (type === 'set_priority') {
    return (
      <div className="mt-2">
        <label className="mb-1 block text-xs font-medium text-gray-600">Priority</label>
        <select
          value={action.priority ?? 'medium'}
          onChange={(e) => onChange({ priority: e.target.value as AutomationActionConfig['priority'] })}
          className={pipelineSelectClass}
        >
          {PRIORITY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
    );
  }

  if (type === 'set_due_date') {
    return (
      <div className="mt-2">
        <label className="mb-1 block text-xs font-medium text-gray-600">Due in (days from now)</label>
        <PipelineNumberInput
          value={action.offset_days ?? 0}
          onChange={(value) => onChange({ offset_days: value })}
          min={0}
        />
      </div>
    );
  }

  if (type === 'set_field') {
    return (
      <div className="mt-2 space-y-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Custom field</label>
          <select
            value={action.meta_field_id ?? ''}
            onChange={(e) => onChange({ meta_field_id: e.target.value ? Number(e.target.value) : null })}
            className={pipelineSelectClass}
          >
            <option value="">Select custom field</option>
            {metaFields.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Value</label>
          <input
            value={(action.value as string) ?? ''}
            onChange={(e) => onChange({ value: e.target.value })}
            className={pipelineInputClass}
          />
        </div>
      </div>
    );
  }

  if (type === 'post_conversation' || type === 'notify' || type === 'notify_email') {
    return (
      <div className="mt-2 space-y-2">
        {type !== 'post_conversation' && (
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Member</label>
            <select
              value={action.user_id ?? ''}
              onChange={(e) => onChange({ user_id: e.target.value ? Number(e.target.value) : null })}
              className={pipelineSelectClass}
            >
              <option value="">Select member</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Message</label>
          <textarea
            value={action.body ?? action.message ?? ''}
            onChange={(e) => onChange(type === 'post_conversation' ? { body: e.target.value } : { message: e.target.value })}
            placeholder="Use {card}, {board}, {column}, {status}, {assignee}"
            rows={2}
            className={pipelineInputClass}
          />
        </div>
      </div>
    );
  }

  if (type === 'create_card' || type === 'create_task') {
    return (
      <div className="mt-2 space-y-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Title</label>
          <input
            value={action.title ?? ''}
            onChange={(e) => onChange({ title: e.target.value })}
            className={pipelineInputClass}
          />
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Stage</label>
            <select
              value={action.stage_id ?? ''}
              onChange={(e) => onChange({ stage_id: e.target.value ? Number(e.target.value) : null })}
              className={pipelineSelectClass}
            >
              <option value="">First stage</option>
              {stages.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Due in (days)</label>
            <PipelineNumberInput
              value={action.offset_due_days ?? 0}
              onChange={(value) => onChange({ offset_due_days: value })}
              min={0}
            />
          </div>
        </div>
      </div>
    );
  }

  if (type === 'copy_card') {
    return (
      <div className="mt-2">
        <label className="mb-1 block text-xs font-medium text-gray-600">Copy title (optional)</label>
        <input
          value={action.title ?? ''}
          onChange={(e) => onChange({ title: e.target.value })}
          className={pipelineInputClass}
        />
      </div>
    );
  }

  if (type === 'webhook') {
    return (
      <div className="mt-2">
        <label className="mb-1 block text-xs font-medium text-gray-600">Webhook URL</label>
        <input
          value={action.url ?? ''}
          onChange={(e) => onChange({ url: e.target.value })}
          placeholder="https://example.com/hook"
          className={pipelineInputClass}
        />
      </div>
    );
  }

  return null;
}