import { useState } from 'react';
import { useWallFamePosts, useDeleteWallPost, useUpdateWallPost } from '../api/useWallFameQueries';
import type { WallFamePost } from '../api/pipelineTypes';
import CreateWallPostModal from './CreateWallPostModal';
import { useConfirm } from '../../../shared/components/Feedback/ConfirmContext';
import { cn } from '../../../shared/utils/cn';
import { CustosellLoader } from '../../../shared/components/loading/CustosellLoader';
import { UserAvatar } from '../../../shared/components/UserAvatar';
import { avatarUrl } from '../../../shared/utils/avatarUrl';
import {
  Quote, Megaphone, Trophy, Flag, Pin, Trash2, PinOff, Pencil, Sparkles, Plus, Calendar, User,
} from 'lucide-react';

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const abs = Math.abs(diff);
  const mins = Math.floor(abs / 60000);
  const future = diff < 0;
  if (mins < 1) return future ? 'any moment' : 'just now';
  if (mins < 60) return future ? `in ${mins}m` : `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return future ? `in ${hours}h` : `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return future ? `in ${days}d` : `${days}d ago`;
  const months = Math.floor(days / 30);
  return future ? `in ${months}mo` : `${months}mo ago`;
}
interface BoardFameViewProps {
  canContribute?: boolean;
}

const TYPE_STYLES: Record<string, { icon: typeof Quote; gradient: string; border: string; badge: string }> = {
  quote: {
    icon: Quote,
    gradient: 'from-violet-50 to-white',
    border: 'border-violet-200',
    badge: 'bg-violet-100 text-violet-700',
  },
  shoutout: {
    icon: Megaphone,
    gradient: 'from-blue-50 to-white',
    border: 'border-blue-200',
    badge: 'bg-blue-100 text-blue-700',
  },
  performer: {
    icon: Trophy,
    gradient: 'from-amber-50 to-yellow-50',
    border: 'border-amber-200',
    badge: 'bg-amber-100 text-amber-700',
  },
  milestone: {
    icon: Flag,
    gradient: 'from-emerald-50 to-white',
    border: 'border-emerald-200',
    badge: 'bg-emerald-100 text-emerald-700',
  },
};

function FameCard({ post, canManage, onEdit }: { post: WallFamePost; canManage: boolean; onEdit?: (post: WallFamePost) => void }) {
  const deletePost = useDeleteWallPost();
  const updatePost = useUpdateWallPost();
  const { confirm } = useConfirm();
  const style = TYPE_STYLES[post.type] ?? TYPE_STYLES.shoutout;
  const Icon = style.icon;

  const handleDelete = async () => {
    const ok = await confirm({
      title: 'Remove post?',
      message: `"${post.content.slice(0, 80)}${post.content.length > 80 ? '...' : ''}" will be removed from the Wall of Fame.`,
      confirmText: 'Remove',
      variant: 'danger',
    });
    if (!ok) return;
    deletePost.mutate(post.id);
  };

  const handleTogglePin = () => {
    updatePost.mutate({ id: post.id, pinned: !post.pinned });
  };

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-xl border bg-white shadow-[0_4px_16px_rgba(15,23,42,0.08)] transition-all hover:shadow-md',
        'border-gray-200/80',
        post.pinned && 'ring-2 ring-amber-400/60',
      )}
    >
      {post.pinned && (
        <div className="absolute right-2 top-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700 shadow-sm">
          PINNED
        </div>
      )}

      {post.photo_url && (
        <div className="aspect-[16/9] w-full overflow-hidden bg-gray-100">
            <img src={avatarUrl(post.photo_url) ?? undefined} alt="" className="h-full w-full object-cover" />
        </div>
      )}

      <div className="p-4">
        <div className="mb-3 flex items-center gap-2">
          <span className={cn('flex h-7 w-7 items-center justify-center rounded-lg', style.badge)}>
            <Icon className="h-3.5 w-3.5" />
          </span>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
            {post.type === 'performer' ? 'Best Performer' : post.type}
          </span>
        </div>

        {post.title && (
          <h3 className="mb-1.5 text-sm font-bold text-gray-900">{post.title}</h3>
        )}

        <p className="text-sm leading-relaxed text-gray-700">
          {post.type === 'quote' && <span className="mr-1 font-serif text-lg text-gray-400">&ldquo;</span>}
          {post.content}
          {post.type === 'quote' && <span className="ml-1 font-serif text-lg text-gray-400">&rdquo;</span>}
        </p>

        {(post.author_name || post.staff) && (
          <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-gray-600">
            {post.staff ? (
              <UserAvatar name={post.staff.name} avatar={post.staff.avatar} size="xs" />
            ) : (
              <User className="h-3 w-3 text-gray-400" />
            )}
            {post.staff?.name ?? post.author_name}
          </p>
        )}

        <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-2.5">
          <div className="flex items-center gap-2 text-[11px] text-gray-400">
            <Calendar className="h-3 w-3" />
            {timeAgo(post.created_at)}
            {post.expires_at && (
              <span className="text-gray-300">
                &middot; Expires {timeAgo(post.expires_at)}
              </span>
            )}
          </div>

          {canManage && (
            <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
              <button
                type="button"
                onClick={() => onEdit?.(post)}
                className="rounded p-1 text-gray-400 transition-colors hover:bg-white hover:text-blue-600"
                title="Edit post"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={handleTogglePin}
                className="rounded p-1 text-gray-400 transition-colors hover:bg-white hover:text-amber-600"
                title={post.pinned ? 'Unpin' : 'Pin post'}
              >
                {post.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
              </button>
              <button
                type="button"
                onClick={() => void handleDelete()}
                className="rounded p-1 text-gray-400 transition-colors hover:bg-white hover:text-red-500"
                title="Remove post"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function BoardFameView({ canContribute }: BoardFameViewProps) {
  const { data: posts = [], isLoading } = useWallFamePosts();
  const [createOpen, setCreateOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<WallFamePost | null>(null);

  const pinned = posts.filter((p) => p.pinned);
  const unpinned = posts.filter((p) => !p.pinned);

  if (isLoading) {
    return <CustosellLoader />;
  }

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        {posts.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center rounded-xl bg-white shadow-sm">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 shadow-inner">
              <Trophy className="h-8 w-8 text-amber-500" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">Wall of Fame</h2>
            <p className="max-w-sm text-sm text-gray-500">
              Celebrate wins, share quotes, recognize top performers, and mark milestones &mdash; all in one place.
            </p>
            {canContribute && (
              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-amber-600"
              >
                <Sparkles className="h-4 w-4" />
                Add your first post
              </button>
            )}
          </div>
        ) : (
          <div className="p-5">
            <div className="mb-5 flex items-center justify-between rounded-xl bg-white/90 px-4 py-3 shadow-sm">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Wall of Fame</h2>
                <p className="text-sm text-gray-500">{posts.length} celebration{posts.length !== 1 ? 's' : ''}</p>
              </div>
              <div className="flex items-center gap-2">
                {canContribute && (
                  <button
                    type="button"
                    onClick={() => setCreateOpen(true)}
                    className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-amber-600"
                  >
                    <Plus className="h-4 w-4" />
                    <span className="hidden sm:inline">Add post</span>
                  </button>
                )}
              </div>
            </div>

            {pinned.length > 0 && (
              <div className="mb-6">
                <div className="mb-3 inline-flex items-center gap-1.5 rounded-lg bg-white/80 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-amber-700 shadow-sm">
                  <Pin className="h-3.5 w-3.5" />
                  Pinned
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {pinned.map((post) => (
                    <FameCard key={post.id} post={post} canManage={canContribute ?? false} onEdit={setEditingPost} />
                  ))}
                </div>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {unpinned.map((post) => (
                <FameCard key={post.id} post={post} canManage={canContribute ?? false} onEdit={setEditingPost} />
              ))}
            </div>
          </div>
        )}
      </div>

      {createOpen && (
        <CreateWallPostModal open onClose={() => setCreateOpen(false)} />
      )}
      {editingPost && (
        <CreateWallPostModal
          open
          post={editingPost}
          onClose={() => setEditingPost(null)}
        />
      )}
    </>
  );
}
