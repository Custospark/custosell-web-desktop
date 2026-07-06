import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '../../../shared/components/buttons/Button';
import { LoadingSpinner } from '../../../shared/components/loading/LoadingSpinner';
import {
  useMovePipelineLead,
  usePipelineBoards,
  usePipelineKanban,
} from '../api/usePipelineQueries';
import type { PipelineLead } from '../api/pipelineTypes';
import KanbanColumn from '../ui/KanbanColumn';
import CreateLeadModal from '../ui/CreateLeadModal';
import CreateBoardModal from '../ui/CreateBoardModal';
import LeadDetailDrawer from '../ui/LeadDetailDrawer';
import BoardSearchMenu from '../ui/BoardSearchMenu';
import BoardSwitcherStrip from '../ui/BoardSwitcherStrip';
import { resolveBoardCoverColor, pipelineBoardBackgroundStyle } from '../api/pipelineKanbanCache';
import { Search, UserPlus, X } from 'lucide-react';

function leadMatchesQuery(lead: PipelineLead, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [
    lead.title,
    lead.contact_name,
    lead.contact_email,
    lead.contact_phone,
    lead.assignee?.name,
    lead.source?.name,
  ].some((v) => v?.toLowerCase().includes(q));
}

export default function BoardKanbanPage() {
  const { boardId: boardIdParam } = useParams();
  const boardId = Number(boardIdParam);
  const { data: board, isLoading } = usePipelineKanban(boardId);
  const { data: boards = [] } = usePipelineBoards();
  const moveLead = useMovePipelineLead();

  const [leadQuery, setLeadQuery] = useState('');
  const [createStageId, setCreateStageId] = useState<number | null>(null);
  const [createBoardOpen, setCreateBoardOpen] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);

  const allLeadsCount = useMemo(
    () => (board?.stages ?? []).reduce((n, s) => n + (s.leads?.length ?? 0), 0),
    [board?.stages],
  );

  const stages = useMemo(() => {
    const sorted = [...(board?.stages ?? [])].sort((a, b) => a.sort_order - b.sort_order);
    if (!leadQuery.trim()) return sorted;
    return sorted.map((stage) => ({
      ...stage,
      leads: (stage.leads ?? []).filter((lead) => leadMatchesQuery(lead, leadQuery)),
    }));
  }, [board?.stages, leadQuery]);

  const filteredCount = useMemo(
    () => stages.reduce((n, s) => n + (s.leads?.length ?? 0), 0),
    [stages],
  );

  const handleDropLead = (leadId: number, stageId: number, position: number) => {
    moveLead.mutate({ id: leadId, stage_id: stageId, position, board_id: boardId });
  };

  if (isLoading || !board) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  const accent = resolveBoardCoverColor(board, boards, boardId);

  return (
    <div
      className="flex min-h-0 flex-1 flex-col rounded-xl border border-gray-200/80 shadow-sm"
      style={pipelineBoardBackgroundStyle(accent)}
    >
      <header className="relative z-40 shrink-0 border-b border-gray-200/70 bg-white/90 px-3 py-3 backdrop-blur-md sm:px-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="shrink-0 lg:min-w-[200px]">
            <BoardSearchMenu
              boards={boards}
              activeBoard={board}
              onCreateBoard={() => setCreateBoardOpen(true)}
            />
          </div>

          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={leadQuery}
              onChange={(e) => setLeadQuery(e.target.value)}
              placeholder="Search leads by name, email, phone, assignee…"
              className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-10 text-sm shadow-sm transition-shadow focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            {leadQuery && (
              <button
                type="button"
                onClick={() => setLeadQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <Button
            onClick={() => setCreateStageId(stages[0]?.id ?? board.stages?.[0]?.id ?? null)}
            className="inline-flex w-full shrink-0 items-center justify-center gap-2 shadow-sm lg:w-auto"
            disabled={!stages.length && !board.stages?.length}
          >
            <UserPlus className="h-4 w-4" />
            Add lead
          </Button>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
          <span>{allLeadsCount} lead{allLeadsCount === 1 ? '' : 's'} on board</span>
          {leadQuery.trim() && (
            <span className="font-medium text-blue-700">
              {filteredCount} matching &ldquo;{leadQuery.trim()}&rdquo;
            </span>
          )}
        </div>
      </header>

      <div className="relative z-0 flex min-h-0 flex-1 gap-3 overflow-x-auto overflow-y-hidden p-3 pb-2">
        {stages.map((stage) => (
          <KanbanColumn
            key={stage.id}
            stage={stage}
            onLeadClick={(lead: PipelineLead) => setSelectedLeadId(lead.id)}
            onAddLead={(stageId) => setCreateStageId(stageId)}
            onDropLead={handleDropLead}
          />
        ))}
      </div>

      <BoardSwitcherStrip
        boards={boards}
        activeBoardId={boardId}
        onCreateBoard={() => setCreateBoardOpen(true)}
      />

      {createStageId != null && (
        <CreateLeadModal
          open
          boardId={boardId}
          stageId={createStageId}
          onClose={() => setCreateStageId(null)}
        />
      )}

      {createBoardOpen && (
        <CreateBoardModal open onClose={() => setCreateBoardOpen(false)} />
      )}

      {selectedLeadId != null && (
        <LeadDetailDrawer
          leadId={selectedLeadId}
          onClose={() => setSelectedLeadId(null)}
        />
      )}
    </div>
  );
}
