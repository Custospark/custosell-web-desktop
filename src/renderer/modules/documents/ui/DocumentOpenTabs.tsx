import { X } from 'lucide-react';
import { cn } from '../../../shared/utils/cn';
import type { DocumentItem } from '../api/documentTypes';
import { truncateDisplayName, documentIconLabel } from '../api/documentDisplayUtils';
import { DocumentItemIcon } from './documentFileIcons';

interface DocumentOpenTabsProps {
  tabs: DocumentItem[];
  activeTabId: number | null;
  onSelectTab: (id: number) => void;
  onCloseTab: (id: number) => void;
}

export function DocumentOpenTabs({ tabs, activeTabId, onSelectTab, onCloseTab }: DocumentOpenTabsProps) {
  if (tabs.length === 0) return null;

  return (
    <div className="flex shrink-0 overflow-x-auto border-b border-gray-200/80 bg-white/90 backdrop-blur-sm">
      <div className="flex min-w-0 items-stretch">
        {tabs.map((tab) => {
          const active = tab.id === activeTabId;
          const label = truncateDisplayName(documentIconLabel(tab), 28);

          return (
            <div
              key={tab.id}
              className={cn(
                'group flex max-w-[11rem] shrink-0 items-stretch border-r border-gray-200/70',
                active ? 'bg-white' : 'bg-gray-50/80 hover:bg-gray-100/80',
              )}
            >
              <button
                type="button"
                onClick={() => onSelectTab(tab.id)}
                title={documentIconLabel(tab)}
                className={cn(
                  'flex min-w-0 flex-1 items-center gap-1.5 px-2.5 py-2 text-left text-xs',
                  active ? 'font-medium text-indigo-700' : 'text-gray-700',
                )}
              >
                <DocumentItemIcon doc={tab} className="!h-3.5 !w-3.5 shrink-0" />
                <span className="truncate">{label}</span>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onCloseTab(tab.id);
                }}
                className={cn(
                  'flex w-7 shrink-0 items-center justify-center text-gray-400 transition-colors hover:bg-gray-200/60 hover:text-gray-700',
                  active && 'text-gray-500',
                )}
                title="Close tab"
                aria-label={`Close ${label}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
