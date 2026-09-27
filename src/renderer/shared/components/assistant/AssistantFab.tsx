import { Bot, X } from 'lucide-react';
import oscarAvatar from '../../assets/oscar.webp';

export function AssistantFab({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={open ? 'Close assistant' : 'Chat with Custosell AI Agent'}
      aria-expanded={open}
      className="fixed bottom-20 right-4 z-[9000] flex h-12 w-12 items-center justify-center rounded-full shadow-lg ring-2 ring-white transition-all active:scale-95 sm:bottom-6 sm:right-6"
    >
      {open ? (
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg shadow-blue-500/30 hover:bg-blue-700">
          <X className="h-5 w-5" aria-hidden />
        </span>
      ) : (
        <span className="relative flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30 hover:from-blue-700 hover:to-indigo-700">
          <Bot className="h-6 w-6" aria-hidden />
          <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center overflow-hidden rounded-full ring-2 ring-white">
            <img src={oscarAvatar} alt="" aria-hidden className="h-full w-full object-cover" />
          </span>
        </span>
      )}
    </button>
  );
}
