import { useRef, useState } from 'react';
import { Bot, X } from 'lucide-react';
import oscarAvatar from '../../assets/oscar.webp';

const STORAGE_KEY = 'assistant-fab-position';
const FAB_SIZE = 48;
const MARGIN = 16;
const DRAG_THRESHOLD_PX = 6;

interface FabPosition {
  x: number;
  y: number;
}

function clampPosition(x: number, y: number): FabPosition {
  const maxX = Math.max(MARGIN, window.innerWidth - FAB_SIZE - MARGIN);
  const maxY = Math.max(MARGIN, window.innerHeight - FAB_SIZE - MARGIN);
  return {
    x: Math.min(Math.max(MARGIN, x), maxX),
    y: Math.min(Math.max(MARGIN, y), maxY),
  };
}

function loadPosition(): FabPosition | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof (parsed as { x?: unknown }).x === 'number' &&
      typeof (parsed as { y?: unknown }).y === 'number'
    ) {
      const pos = parsed as FabPosition;
      if (Number.isFinite(pos.x) && Number.isFinite(pos.y)) {
        return clampPosition(pos.x, pos.y);
      }
    }
  } catch {
    // Corrupt cache - fall back to the docked corner.
  }
  return null;
}

/**
 * Draggable launcher (Intercom-style): users can park it anywhere on
 * screen, the spot persists per device, and a double-click re-docks it.
 * A press without dragging still toggles the panel.
 */
export function AssistantFab({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const [position, setPosition] = useState<FabPosition | null>(loadPosition);
  const dragRef = useRef<{ startX: number; startY: number; baseX: number; baseY: number; moved: boolean; latest: FabPosition | null } | null>(null);
  const justDragged = useRef(false);

  function persist(pos: FabPosition | null) {
    setPosition(pos);
    try {
      if (pos) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(pos));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // Private mode - position just will not persist.
    }
  }

  function onPointerDown(e: React.PointerEvent<HTMLButtonElement>) {
    const base = position ?? {
      x: window.innerWidth - FAB_SIZE - MARGIN,
      y: window.innerHeight - FAB_SIZE - MARGIN,
    };
    dragRef.current = { startX: e.clientX, startY: e.clientY, baseX: base.x, baseY: base.y, moved: false, latest: null };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    if (!drag.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
    drag.moved = true;
    const next = clampPosition(drag.baseX + dx, drag.baseY + dy);
    drag.latest = next;
    setPosition(next);
  }

  function onPointerUp() {
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag || !drag.moved) return;
    justDragged.current = true;
    persist(drag.latest ?? position);
  }

  function onClick() {
    if (justDragged.current) {
      justDragged.current = false;
      return;
    }
    onToggle();
  }

  return (
    <button
      type="button"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onClick={onClick}
      onDoubleClick={() => persist(null)}
      title="Chat with Custosell AI Agent (drag to move, double-click to re-dock)"
      aria-label={open ? 'Close assistant' : 'Chat with Custosell AI Agent'}
      aria-expanded={open}
      className={`fixed z-[9000] flex h-12 w-12 touch-none select-none items-center justify-center rounded-full shadow-lg ring-2 ring-white transition-all active:scale-95 ${
        position ? '' : 'bottom-20 right-4 sm:bottom-6 sm:right-6'
      }`}
      style={position ? { left: position.x, top: position.y } : undefined}
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
