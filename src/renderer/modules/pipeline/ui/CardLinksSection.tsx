import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { PipelineLeadLink } from '../api/pipelineTypes';
import {
  usePipelineLeadLinks,
  useCreatePipelineLeadLink,
  useDeletePipelineLeadLink,
  usePipelineBoards,
  usePipelineLeads,
} from '../api/usePipelineQueries';
import { PipelineFormSection } from './pipelineFormFields';
import { Button } from '../../../shared/components/buttons/Button';
import { ROUTES } from '../../../app/routes/constants/shared.paths';
import { Link2, Plus, X, Search, ExternalLink } from 'lucide-react';

interface CardLinksSectionProps {
  leadId: number;
  boardId: number;
  workspace?: 'pipeline' | 'estimates';
  canEdit?: boolean;
  onNavigate?: () => void;
}

export default function CardLinksSection({ leadId, boardId, workspace = 'pipeline', canEdit = true, onNavigate }: CardLinksSectionProps) {
  const { data: links = [] } = usePipelineLeadLinks(leadId);
  const createLink = useCreatePipelineLeadLink();
  const deleteLink = useDeletePipelineLeadLink();
  const boardsQuery = workspace === 'estimates'
    ? { estimatesWorkspace: true as const }
    : { salesOnly: true as const };
  const { data: boards = [] } = usePipelineBoards(boardsQuery);

  const [showAdd, setShowAdd] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);
  const [selectedBoardLinkId, setSelectedBoardLinkId] = useState<number | ''>('');
  const [linkingCard, setLinkingCard] = useState(false);
  const [linkingBoard, setLinkingBoard] = useState(false);

  const { data: allLeads = [] } = usePipelineLeads(
    showAdd ? {} : undefined,
  );

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (q.length < 2) return [];
    return allLeads
      .filter((l) => l.id !== leadId && l.title.toLowerCase().includes(q))
      .slice(0, 20);
  }, [allLeads, searchQuery, leadId]);

  const cardLinks = useMemo(() => links.filter((l) => l.linked_lead_id != null), [links]);
  const boardLinks = useMemo(() => links.filter((l) => l.linked_board_id != null), [links]);

  const handleAddCardLink = () => {
    if (!selectedLeadId) return;
    setLinkingCard(true);
    createLink.mutate(
      { lead_id: leadId, linked_lead_id: selectedLeadId },
      { onSettled: () => { setLinkingCard(false); } },
    );
    setSelectedLeadId(null);
    setSearchQuery('');
    setShowAdd(false);
  };

  const handleAddBoardLink = () => {
    if (!selectedBoardLinkId) return;
    setLinkingBoard(true);
    createLink.mutate(
      { lead_id: leadId, linked_board_id: Number(selectedBoardLinkId) },
      { onSettled: () => { setLinkingBoard(false); } },
    );
    setSelectedBoardLinkId('');
    setShowAdd(false);
  };

  const handleRemove = (link: PipelineLeadLink) => {
    deleteLink.mutate({ id: link.id, lead_id: leadId });
  };

  return (
    <PipelineFormSection title="Linked cards & boards" icon={Link2}>
      {links.length > 0 && (
        <div className="mb-3 space-y-1.5">
          {cardLinks.map((link) => (
            <div key={link.id} className="group flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm">
              <Link2 className="h-3.5 w-3.5 shrink-0 text-indigo-400" />
              {link.linked_lead ? (
                <Link
                  to={ROUTES.PIPELINE.BOARD(link.linked_lead.board_id)}
                  onClick={onNavigate}
                  className="flex-1 truncate font-medium text-indigo-700 hover:text-indigo-900 hover:underline"
                  title={`${link.linked_lead.title} · ${link.linked_lead.stage?.name ?? ''}`}
                >
                  {link.linked_lead.title}
                  {link.linked_lead.stage && (
                    <span className="ml-1.5 text-xs font-normal text-gray-500">
                      · {link.linked_lead.stage.name}
                    </span>
                  )}
                </Link>
              ) : (
                <span className="flex-1 text-gray-500 italic">Card unavailable</span>
              )}
              {canEdit && (
                <button
                  type="button"
                  onClick={() => handleRemove(link)}
                  className="shrink-0 rounded p-0.5 text-gray-400 opacity-0 transition-opacity hover:text-red-600 group-hover:opacity-100"
                  title="Remove link"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
          {boardLinks.map((link) => (
            <div key={link.id} className="group flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm">
              <ExternalLink className="h-3.5 w-3.5 shrink-0 text-amber-400" />
              {link.linked_board ? (
                <Link
                  to={ROUTES.PIPELINE.BOARD(link.linked_board.id)}
                  onClick={onNavigate}
                  className="flex-1 truncate font-medium text-amber-700 hover:text-amber-900 hover:underline"
                >
                  {link.linked_board.name}
                  {link.linked_board.workspace === 'estimates' && (
                    <span className="ml-1.5 text-xs font-normal text-gray-500">· Project board</span>
                  )}
                </Link>
              ) : (
                <span className="flex-1 text-gray-500 italic">Board unavailable</span>
              )}
              {canEdit && (
                <button
                  type="button"
                  onClick={() => handleRemove(link)}
                  className="shrink-0 rounded p-0.5 text-gray-400 opacity-0 transition-opacity hover:text-red-600 group-hover:opacity-100"
                  title="Remove link"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {canEdit && (showAdd ? (
        <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50/80 p-3">
          <p className="text-xs font-medium text-gray-700">Link to a card</p>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <input
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setSelectedLeadId(null); }}
              placeholder="Search cards by title…"
              className="w-full rounded-lg border border-gray-200 py-2 pl-8 pr-3 text-xs focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
          </div>
          {searchQuery.trim().length >= 2 && searchResults.length > 0 && !selectedLeadId && (
            <ul className="max-h-32 overflow-y-auto rounded-lg border border-gray-200 bg-white text-xs">
              {searchResults.map((lead) => (
                <li key={lead.id}>
                  <button
                    type="button"
                    onClick={() => { setSelectedLeadId(lead.id); setSearchQuery(lead.title); }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-indigo-50"
                  >
                    <span className="font-medium text-gray-800">{lead.title}</span>
                    {lead.stage && <span className="text-gray-500">· {lead.stage.name}</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {searchQuery.trim().length >= 2 && !selectedLeadId && searchResults.length === 0 && (
            <p className="text-xs text-gray-500 italic">No matching cards found</p>
          )}
          {selectedLeadId && (
            <div className="flex items-center justify-between rounded-md bg-indigo-50 px-3 py-1.5 text-xs">
              <span className="font-medium text-indigo-800">Selected: {searchQuery}</span>
              <button type="button" onClick={() => { setSelectedLeadId(null); setSearchQuery(''); }} className="text-indigo-500 hover:text-indigo-700"><X className="h-3.5 w-3.5" /></button>
            </div>
          )}
          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={handleAddCardLink} disabled={!selectedLeadId || linkingCard} loading={linkingCard}>
              Link card
            </Button>
          </div>

          <div className="border-t border-gray-200 pt-3">
            <p className="mb-2 text-xs font-medium text-gray-700">Or link to a board</p>
            <select
              value={selectedBoardLinkId}
              onChange={(e) => setSelectedBoardLinkId(e.target.value ? Number(e.target.value) : '')}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200"
            >
              <option value="">Select a board</option>
              {boards.filter((b) => b.id !== boardId).map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
              {boards.find((b) => b.id === boardId) && (
                <option value={boardId}>{boards.find((b) => b.id === boardId)?.name} (current)</option>
              )}
            </select>
            <div className="mt-2 flex gap-2">
              <Button type="button" size="sm" onClick={handleAddBoardLink} disabled={!selectedBoardLinkId || linkingBoard} loading={linkingBoard} variant="secondary">
                Link board
              </Button>
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="button" size="sm" variant="secondary" onClick={() => { setShowAdd(false); setSearchQuery(''); setSelectedLeadId(null); setSelectedBoardLinkId(''); }}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button type="button" size="sm" variant="secondary" onClick={() => { setShowAdd(true); }} className="inline-flex items-center gap-1">
          <Plus className="h-3.5 w-3.5" />
          Add link
        </Button>
      ))}
    </PipelineFormSection>
  );
}
