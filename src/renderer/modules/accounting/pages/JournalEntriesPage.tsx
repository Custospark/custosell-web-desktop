import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card } from '../../../shared/components/cards/Card';
import { Button } from '../../../shared/components/buttons/Button';
import { Table } from '../../../shared/components/tables/Table';
import { PeriodSelector } from '../../../shared/components/inputs/PeriodSelector';
import { useJournalEntries, usePostJournalEntry, useDeleteJournalEntry, useReverseJournalEntry } from '../api/AccountingQueries';
import { useAccountingPeriodSelection } from '../context/AccountingPeriodSelectionContext';
import type { JournalEntry } from '../api/AccountingTypes';
import { FileText, Plus, Send, Trash2, Search, ChevronLeft, ChevronRight, RotateCcw, Eye } from 'lucide-react';
import { cn } from '../../../shared/utils/cn';
import { formatShiftDate } from '../../../shared/utils/formatDateTime';
import { NewJournalEntryForm } from './NewJournalEntryForm';

const PAGE_SIZE = 20;

export default function JournalEntriesPage() {
  const [searchParams] = useSearchParams();
  const highlightEntryId = Number(searchParams.get('entry_id') || 0) || null;
  const [formOpen, setFormOpen] = useState(false);
  const { periodFilter, setPeriodFilter, startYear, endYear, periods } = useAccountingPeriodSelection();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [actionId, setActionId] = useState<number | null>(null);
  const [hoveredDescId, setHoveredDescId] = useState<number | null>(null);
  const [descPos, setDescPos] = useState({ top: 0, left: 0 });

  // All filtering client-side — always fetch all entries
  const { data: entries, isLoading } = useJournalEntries();
  const postEntry = usePostJournalEntry();
  const deleteEntry = useDeleteJournalEntry();
  const reverseEntry = useReverseJournalEntry();

  // Resolve periodFilter into a Set of matching period_ids
  const activePeriodIds = useMemo(() => {
    if (!periodFilter) return null;
    const ids = periodFilter.split(',').map(Number).filter(Boolean);
    return new Set(ids);
  }, [periodFilter]);

  const filtered = useMemo(() => {
    if (!entries) return [];
    const q = search.toLowerCase();
    return entries
      .filter((e) => {
        if (highlightEntryId && e.id === highlightEntryId) return true;
        // Period filter
        if (activePeriodIds && !activePeriodIds.has(e.period_id)) return false;
        // Search filter
        if (q && !e.entry_number.toLowerCase().includes(q) && !e.description.toLowerCase().includes(q)) return false;
        return true;
      })
      .sort((a, b) => {
        if (highlightEntryId) {
          if (a.id === highlightEntryId) return -1;
          if (b.id === highlightEntryId) return 1;
        }
        const byDate = new Date(b.date).getTime() - new Date(a.date).getTime();
        if (byDate !== 0) return byDate;
        const byCreated = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        if (byCreated !== 0) return byCreated;
        return b.id - a.id;
      });
  }, [entries, search, activePeriodIds, highlightEntryId]);

  // Build a set of entry numbers that have been reversed (by finding reversal descriptions)
  const reversedEntryNumbers = useMemo(() => {
    const set = new Set<string>();
    if (!entries) return set;
    for (const e of entries) {
      const match = e.description.match(/^Reversing entry for (JE-\d+-\d+):/);
      if (match) set.add(match[1]);
    }
    return set;
  }, [entries]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const paged = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  const columns = [
    {
      key: 'entry_number',
      header: 'Entry #',
      sortable: true,
      render: (item: JournalEntry) => (
        <span className={cn(highlightEntryId === item.id && 'rounded bg-violet-100 px-1.5 py-0.5 font-semibold text-violet-900')}>
          {item.entry_number}
        </span>
      ),
    },
    {
      key: 'date',
      header: 'Date',
      sortable: true,
      render: (item: JournalEntry) => formatShiftDate(item.date),
    },
    {
      key: 'description',
      header: 'Description',
      render: (item: JournalEntry) => {
        const isReversal = item.description.startsWith('Reversing entry');
        const text = isReversal ? item.description.replace(/^Reversing entry for [^:]+:\s*/, '↩ ') : item.description;
        return (
          <div
            className="flex items-center gap-1.5 cursor-default"
            onMouseEnter={(e) => {
              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
              setDescPos({ top: rect.bottom + 4, left: Math.min(rect.left, window.innerWidth - 330) });
              setHoveredDescId(item.id);
            }}
            onMouseLeave={() => setHoveredDescId(null)}
          >
            <span className="truncate max-w-[140px] text-sm">{text}</span>
            <Eye className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          </div>
        );
      },
    },
    {
      key: 'attachment',
      header: 'Attach.',
      render: (item: JournalEntry) => item.attachment_url ? (
        <a href={item.attachment_url} target="_blank" rel="noreferrer"
          onClick={(e) => { e.stopPropagation(); window.open(item.attachment_url ?? undefined, "_blank"); }}
          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 underline"
          title="View attachment">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
          View
        </a>
      ) : <span className="text-xs text-gray-300">—</span>,
    },
    {
      key: 'total_debits',
      header: 'Total Debits',
      align: 'right' as const,
      render: (item: JournalEntry) => {
        const total = item.lines?.reduce((s, l) => s + Number(l.debit_amount), 0) ?? 0;
        return total.toLocaleString(undefined, { minimumFractionDigits: 2 });
      },
    },
    {
      key: 'total_credits',
      header: 'Total Credits',
      align: 'right' as const,
      render: (item: JournalEntry) => {
        const total = item.lines?.reduce((s, l) => s + Number(l.credit_amount), 0) ?? 0;
        return total.toLocaleString(undefined, { minimumFractionDigits: 2 });
      },
    },
    {
      key: 'posted',
      header: 'Status',
      render: (item: JournalEntry) => {
        const isReversed = reversedEntryNumbers.has(item.entry_number);
        return (
          <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
            isReversed ? 'bg-purple-100 text-purple-700' :
            item.posted_at ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700')}>
            {isReversed ? 'Reversed' : item.posted_at ? 'Posted' : 'Draft'}
          </span>
        );
      },
    },
    {
      key: 'actions',
      header: '',
      render: (item: JournalEntry) => (
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          {!item.posted_at ? (
            <>
              <Button size="sm" variant="ghost" onClick={() => { setActionId(item.id); postEntry.mutate(item.id, { onSettled: () => setActionId(null) }); }} loading={actionId === item.id && postEntry.isPending} disabled={actionId !== null} title="Post">
                <Send className="w-3.5 h-3.5" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setActionId(item.id); deleteEntry.mutate(item.id, { onSettled: () => setActionId(null) }); }} loading={actionId === item.id && deleteEntry.isPending} disabled={actionId !== null} title="Delete" className="text-red-500 hover:text-red-700">
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </>
          ) : reversedEntryNumbers.has(item.entry_number) ? (
            <span className="text-xs text-gray-300 italic">Done</span>
          ) : (
            <Button size="sm" variant="ghost" onClick={() => { setActionId(item.id); reverseEntry.mutate(item.id, { onSettled: () => setActionId(null) }); }} loading={actionId === item.id && reverseEntry.isPending} disabled={actionId !== null} title="Reverse" className="text-amber-600 hover:text-amber-800">
              <RotateCcw className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Journal Entries</h1>
              <p className="text-sm text-gray-500">Record and manage journal entries</p>
            </div>
          </div>
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="w-4 h-4 mr-1.5" />New Entry
          </Button>
        </div>
      </Card>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by entry # or description..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <PeriodSelector
          periods={periods}
          value={periodFilter}
          onChange={setPeriodFilter}
          startYear={startYear}
          endYear={endYear}
          className="flex-1"
        />
        <span className="text-xs text-gray-400 whitespace-nowrap">{filtered.length} {filtered.length === 1 ? 'entry' : 'entries'}</span>
      </div>

      <Table columns={columns} data={paged} loading={isLoading} rowKey={(item) => item.id} />

      {pageCount > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>Showing {safePage * PAGE_SIZE + 1}–{Math.min((safePage + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}</span>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(safePage - 1)} disabled={safePage === 0} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"><ChevronLeft className="w-4 h-4" /></button>
            {Array.from({ length: pageCount }, (_, i) => (
              <button key={i} onClick={() => setPage(i)} className={cn('px-2.5 py-1 rounded text-sm', i === safePage ? 'bg-blue-600 text-white' : 'hover:bg-gray-100')}>{i + 1}</button>
            ))}
            <button onClick={() => setPage(safePage + 1)} disabled={safePage >= pageCount - 1} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      )}

      {/* Floating description card */}
      {hoveredDescId !== null && (() => {
        const entry = filtered.find((e) => e.id === hoveredDescId);
        if (!entry) return null;
        return (
          <div
            className="fixed z-[9999] w-80 bg-white rounded-lg shadow-xl border border-gray-200 p-3.5 text-sm text-gray-700 leading-relaxed"
            style={{ top: descPos.top, left: descPos.left }}
            onMouseEnter={() => setHoveredDescId(hoveredDescId)}
            onMouseLeave={() => setHoveredDescId(null)}
          >
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Description</span>
            </div>
            <p>{entry.description}</p>
            <p className="text-[11px] text-gray-400 mt-2 border-t border-gray-100 pt-2">Entry: {entry.entry_number}</p>
          </div>
        );
      })()}

      {formOpen && (
        <NewJournalEntryForm
          open={formOpen}
          onClose={() => setFormOpen(false)}
        />
      )}
    </div>
  );
}
