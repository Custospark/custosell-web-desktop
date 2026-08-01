import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { useAppSelector } from '../../../app/store/hooks/useApp';
import { ROUTES } from '../../../app/routes/constants/shared.paths';
import ModuleLauncherModal from './ModuleLauncherModal';
import {
  User, LogOut, Clock, BookOpen, HelpCircle, MessageSquareText, Bell, Sparkles, LayoutGrid,
} from 'lucide-react';

interface UserProfileMenuProps {
  menuRef: React.RefObject<HTMLDivElement>;
  menuPos: { top: number; left: number; width: number };
  open: boolean;
  onClose: () => void;
  onLogout: () => void;
  isLoggingOut: boolean;
  onEndShift: () => void;
  isEnding: boolean;
  onReplayTour: () => void;
  isReplaying: boolean;
}

export function UserProfileMenu({
  menuRef, menuPos, open, onClose, onLogout, isLoggingOut, onEndShift, isEnding, onReplayTour, isReplaying,
}: UserProfileMenuProps) {
  const user = useAppSelector((s) => s.auth.user);
  const [appsOpen, setAppsOpen] = useState(false);

  if (typeof document === 'undefined') return null;
  if (!open && !appsOpen) return null;

  return createPortal(
    <>
      {open && (
        <div
          ref={menuRef}
          role="menu"
          className="fixed z-[300] overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-xl ring-1 ring-black/5"
          style={{ top: menuPos.top, left: menuPos.left, width: menuPos.width }}
        >
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-900 break-words">{user?.name || 'User'}</p>
            {user?.email && (
              <p className="text-xs text-gray-500 truncate mt-0.5" title={user.email}>{user.email}</p>
            )}
            {user?.shift_clock_in && (
              <div className="md:hidden mt-2 pt-2 border-t border-gray-100">
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span className="font-medium text-blue-600 tabular-nums">
                    {new Date(user.shift_clock_in).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            )}
          </div>

          <Link
            to={ROUTES.ACCOUNT.PROFILE}
            role="menuitem"
            onClick={onClose}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <User className="w-4 h-4 shrink-0" />
            My Profile
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={() => { onClose(); setAppsOpen(true); }}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <LayoutGrid className="w-4 h-4 shrink-0" />
            Apps
          </button>
          <Link
            to={ROUTES.GUIDE.TUTORIALS}
            role="menuitem"
            onClick={onClose}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <BookOpen className="w-4 h-4 shrink-0" />
            Tutorials
          </Link>
          <Link
            to={ROUTES.GUIDE.FAQS}
            role="menuitem"
            onClick={onClose}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <HelpCircle className="w-4 h-4 shrink-0" />
            FAQs
          </Link>
          <Link
            to={ROUTES.GUIDE.FEEDBACK}
            role="menuitem"
            onClick={onClose}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <MessageSquareText className="w-4 h-4 shrink-0" />
            Feedback
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={() => { onReplayTour(); onClose(); }}
            disabled={isReplaying}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4 shrink-0" />
            {isReplaying ? 'Starting tour\u2026' : 'Replay Tour'}
          </button>
          <Link
            to={ROUTES.ACCOUNT.NOTIFICATIONS}
            role="menuitem"
            onClick={onClose}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Bell className="w-4 h-4 shrink-0" />
            Notifications
          </Link>

          {user?.shift_clock_in && (
            <>
              <hr className="border-gray-100" />
              <button
                type="button"
                role="menuitem"
                onClick={onEndShift}
                disabled={isEnding}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50"
              >
                <LogOut className="w-4 h-4 shrink-0" />
                {isEnding ? 'Ending shift\u2026' : 'End Shift'}
              </button>
            </>
          )}
          <hr className="border-gray-100" />
          <button
            type="button"
            role="menuitem"
            onClick={onLogout}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {isLoggingOut ? 'Logging out...' : 'Logout'}
          </button>
        </div>
      )}
      <ModuleLauncherModal open={appsOpen} onClose={() => setAppsOpen(false)} />
    </>,
    document.body,
  );
}
