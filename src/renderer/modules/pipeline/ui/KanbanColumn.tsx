import { useState } from 'react';
import type { PipelineLead, PipelineStage } from '../api/pipelineTypes';
import LeadCard from './LeadCard';
import { cn } from '../../../shared/utils/cn';
import { formatCurrency } from '../../../shared/utils/formatCurrency';
import { Inbox, GripVertical, MoreHorizontal, Plus } from 'lucide-react';

interface KanbanColumnProps {
  stage: PipelineStage;
  onLeadClick: (lead: PipelineLead) => void;
  onLeadCommentsClick?: (lead: PipelineLead) => void;
  onLeadHistoryClick?: (lead: PipelineLead) => void;
  onToggleComplete?: (lead: PipelineLead, complete: boolean) => void;
  onAddLead?: (stageId: number) => void;
  onDropLead?: (leadId: number, stageId: number, position: number) => void;
  onDropColumn?: (draggedStageId: number, targetStageId: number) => void;
  onEditStage?: (stage: PipelineStage) => void;
  isProjectBoard?: boolean;
}

export default function KanbanColumn({
  stage,
  onLeadClick,
  onLeadCommentsClick,
  onLeadHistoryClick,
  onToggleComplete,
  onAddLead,
  onDropLead,
  onDropColumn,
  onEditStage,
  isProjectBoard = false,
}: KanbanColumnProps) {
  const [dragOver, setDragOver] = useState(false);
  const [columnDragOver, setColumnDragOver] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const leads = stage.leads ?? [];
  const stageColor = stage.color ?? '#64748b';
  const itemNoun = isProjectBoard ? 'card' : 'lead';
  const canDropLeads = Boolean(onDropLead);
  const canReorderColumns = Boolean(onDropColumn);
  const canAddLeads = Boolean(onAddLead);
  const emptyColumnMessage = canAddLeads
    ? `Drop a ${itemNoun} here or add one`
    : `No ${itemNoun}s in this column`;

  const totalValue = stage.total_value ?? leads.reduce((sum, l) => sum + (l.estimated_value ?? 0), 0);
  const currency = stage.currency ?? leads.find((l) => l.currency)?.currency ?? 'UGX';

  const handleDragOver = (e: React.DragEvent) => {
    if (!canDropLeads && !canReorderColumns) return;
    e.preventDefault();
    if (e.dataTransfer.types.includes('text/stage-id') && canReorderColumns) {
      setColumnDragOver(true);
      setDragOver(false);
    } else if (canDropLeads) {
      setDragOver(true);
      setColumnDragOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    setColumnDragOver(false);

    const draggedStageId = Number(e.dataTransfer.getData('text/stage-id'));
    if (draggedStageId && draggedStageId !== stage.id && onDropColumn) {
      onDropColumn(draggedStageId, stage.id);
      return;
    }

    const leadId = Number(e.dataTransfer.getData('text/lead-id'));
    if (!leadId || !onDropLead) return;
    onDropLead(leadId, stage.id, leads.length + 1);
  };

  return (
    <div
      className={cn(
        'flex h-full min-h-0 w-[292px] shrink-0 flex-col rounded-2xl border shadow-[0_8px_32px_rgba(15,23,42,0.08)] backdrop-blur-xl backdrop-saturate-150 transition-all duration-200',
        columnDragOver
          ? 'border-violet-300/80 bg-white/75 ring-2 ring-violet-200/80'
          : dragOver
            ? 'border-blue-300/80 bg-white/75 ring-2 ring-blue-200/80'
            : 'border-white/60 bg-white/55 ring-1 ring-white/50',
      )}
      onDragOver={handleDragOver}
      onDragLeave={() => {
        setDragOver(false);
        setColumnDragOver(false);
      }}
      onDrop={canDropLeads || canReorderColumns ? handleDrop : undefined}
    >
      <div
        draggable={canReorderColumns}
        onDragStart={canReorderColumns ? (e) => {
          e.dataTransfer.setData('text/stage-id', String(stage.id));
          e.dataTransfer.effectAllowed = 'move';
        } : undefined}
        className={cn(
          'relative shrink-0 rounded-t-2xl border-b border-gray-100 px-3 py-3',
          canReorderColumns ? 'cursor-grab active:cursor-grabbing' : '',
        )}
        style={{ background: `linear-gradient(135deg, ${stageColor}14, transparent)` }}
        title={canReorderColumns ? 'Drag to reorder column' : undefined}
      >
        <div className="flex items-center justify-between gap-2 pr-14">
          <div className="flex min-w-0 items-center gap-2">
            {canReorderColumns && (
              <GripVertical className="h-4 w-4 shrink-0 text-gray-300" aria-hidden />
            )}
            <span
              className="h-3 w-3 shrink-0 rounded-full shadow-sm ring-2 ring-white"
              style={{ backgroundColor: stageColor }}
            />
            <h3 className="truncate text-sm font-semibold text-gray-900">{stage.name}</h3>
            <span
              className="rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums"
              style={{ backgroundColor: `${stageColor}20`, color: stageColor }}
            >
              {leads.length}
            </span>
          </div>
        </div>
        {totalValue > 0 && (
          <p className="mt-1.5 pl-5 text-xs font-semibold tabular-nums text-emerald-700">
            {formatCurrency(totalValue, currency)}
          </p>
        )}
        <div className="absolute right-2 top-3 flex shrink-0 items-center gap-0.5">
          {canAddLeads && (
            <button
              type="button"
              onClick={() => onAddLead?.(stage.id)}
              className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-white hover:text-gray-900 hover:shadow-sm"
              title={isProjectBoard ? 'Add card to this stage' : 'Add lead to this stage'}
            >
              <Plus className="h-4 w-4" />
            </button>
          )}
          {onEditStage && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-white hover:text-gray-900 hover:shadow-sm"
                title="Column options"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
              {menuOpen && (
                <>
                  <button
                    type="button"
                    className="fixed inset-0 z-10 cursor-default"
                    aria-label="Close menu"
                    onClick={() => setMenuOpen(false)}
                  />
                  <div className="absolute right-0 top-full z-20 mt-1 w-40 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                    <button
                      type="button"
                      className="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                      onClick={() => {
                        setMenuOpen(false);
                        onEditStage(stage);
                      }}
                    >
                      Edit column
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto p-2.5">
        {leads.length === 0 ? (
          canAddLeads ? (
            <button
              type="button"
              onClick={() => onAddLead?.(stage.id)}
              className="flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-gray-200 bg-gray-50/50 px-4 py-8 text-center transition-colors hover:border-gray-300 hover:bg-gray-50"
            >
              <Inbox className="h-8 w-8 text-gray-300" />
              <span className="text-xs font-medium text-gray-500">{emptyColumnMessage}</span>
            </button>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-gray-200 bg-gray-50/30 px-4 py-8 text-center">
              <Inbox className="h-8 w-8 text-gray-300" />
              <span className="text-xs font-medium text-gray-500">{emptyColumnMessage}</span>
            </div>
          )
        ) : (
          leads.map((lead) => (
            <div
              key={lead.id}
              draggable={canDropLeads}
              className={cn(canDropLeads && 'cursor-grab active:cursor-grabbing')}
              onDragStart={canDropLeads ? (e) => {
                e.dataTransfer.setData('text/lead-id', String(lead.id));
                e.dataTransfer.effectAllowed = 'move';
              } : undefined}
            >
              <LeadCard
                lead={lead}
                stageColor={stageColor}
                onClick={() => onLeadClick(lead)}
                onCommentsClick={onLeadCommentsClick}
                onHistoryClick={onLeadHistoryClick}
                onToggleComplete={onToggleComplete}
                showDragHandle={canDropLeads}
                isProjectBoard={isProjectBoard}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
