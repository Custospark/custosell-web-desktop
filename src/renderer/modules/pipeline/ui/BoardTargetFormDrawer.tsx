import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Target } from 'lucide-react';
import { SlideDrawer } from '../../../shared/components/modals/SlideDrawer';
import { useToast } from '../../../app/contexts/useToast';
import { sanitizeErrorMessage } from '../../../app/store/offline/core/offlineQueryUtils';
import type {
  BoardProgressContext,
  BoardProgressMember,
  BoardProgressStage,
  BoardTarget,
  CreateBoardTargetPayload,
  TargetAllocation,
} from '../api/boardProgressTypes';
import {
  PROGRESS_PERIOD_OPTIONS,
  TARGET_TYPE_LABELS,
  metricUnitForKey,
  type ProgressPeriod,
} from '../api/pipelineProgressTerms';
import { useCreateBoardTarget, useDecomposeTargetPreview, useUpdateBoardTarget } from '../api/useBoardProgressQueries';
import { anchorsForPlanningLevel, formatAnchorRange, periodToPlanningLevel } from '../api/boardProgressAnchors';
import { useBoardResourceMembers } from '../api/usePipelineResourceQueries';
import { useProjectMembers } from '../../estimates/api/useProjectQueries';
import { resolveTargetAssigneeMembers } from '../api/progressMemberUtils';
import type { PipelineBoard } from '../api/pipelineTypes';
import { PipelineModalHero } from './pipelineFormFields';
import {
  emptyBoardTargetForm,
  emptyKeyResult,
  goalTagForType,
  metricOptions,
  type BoardTargetFormState,
  type KeyResultDraft,
} from './boardTargetFormHelpers';
import { BoardTargetTypeSection } from './BoardTargetTypeSection';
import { BoardTargetCoreFields } from './BoardTargetCoreFields';
import { BoardTargetDecompositionSection } from './BoardTargetDecompositionSection';
import { BoardTargetOwnershipSection } from './BoardTargetOwnershipSection';
import { BoardTargetKeyResultsSection } from './BoardTargetKeyResultsSection';

interface BoardTargetFormDrawerProps {
  open: boolean;
  onClose: () => void;
  boardId: number;
  projectId?: number;
  board?: Pick<PipelineBoard, 'members'> | null;
  context: BoardProgressContext;
  period: ProgressPeriod;
  customFrom?: string;
  customTo?: string;
  members: BoardProgressMember[];
  stages: BoardProgressStage[];
  target?: BoardTarget | null;
}

export default function BoardTargetFormDrawer({
  open,
  onClose,
  boardId,
  projectId = 0,
  board,
  context,
  period,
  members,
  stages,
  target,
}: BoardTargetFormDrawerProps) {
  const isEditing = Boolean(target);
  const createTarget = useCreateBoardTarget(boardId);
  const updateTarget = useUpdateBoardTarget(boardId);
  const decomposePreview = useDecomposeTargetPreview(boardId);
  const { showToast } = useToast();
  const { data: resourceMembers = [] } = useBoardResourceMembers(boardId, open);
  const { data: projectMembers = [] } = useProjectMembers(context.is_project_board ? projectId : 0);
  const isSubmitting = createTarget.isPending || updateTarget.isPending;

  const [form, setForm] = useState<BoardTargetFormState>(emptyBoardTargetForm);
  const [keyResults, setKeyResults] = useState<KeyResultDraft[]>([emptyKeyResult()]);
  const [allocationNodes, setAllocationNodes] = useState<TargetAllocation[]>([]);
  const [previewVisible, setPreviewVisible] = useState(false);

  const patchForm = (patch: Partial<BoardTargetFormState>) => {
    setForm((prev) => ({ ...prev, ...patch }));
  };

  const assigneeMembers = useMemo(
    () => resolveTargetAssigneeMembers({
      resourceMembers,
      board,
      projectMembers: context.is_project_board ? projectMembers : undefined,
      progressMembers: members,
    }),
    [board, context.is_project_board, members, projectMembers, resourceMembers],
  );

  const metrics = useMemo(() => metricOptions(context), [context]);
  const periodLabel = PROGRESS_PERIOD_OPTIONS.find((option) => option.value === period)?.label ?? period;

  const planningAnchors = useMemo(
    () => anchorsForPlanningLevel(form.planning_level),
    [form.planning_level],
  );

  const canPreviewDecomposition = useMemo(() => {
    if (isEditing) return false;
    const value = Number(form.target_value);
    return Boolean(form.stage_id) && !Number.isNaN(value) && value > 0;
  }, [form.stage_id, form.target_value, isEditing]);

  const runDecompositionPreview = () => {
    if (!canPreviewDecomposition || !form.stage_id) return;
    decomposePreview.mutate(
      {
        planning_level: form.planning_level,
        target_value: Number(form.target_value),
        stage_ids: [Number(form.stage_id)],
        decomposition_mode: form.decomposition_mode,
        ...planningAnchors,
      },
      {
        onSuccess: (preview) => {
          setAllocationNodes(preview.nodes);
          setPreviewVisible(true);
        },
        onError: (err) => {
          setPreviewVisible(false);
          setAllocationNodes([]);
          showToast('error', sanitizeErrorMessage(err, 'Could not generate decomposition preview'));
        },
      },
    );
  };

  useEffect(() => {
    if (!open) return;
    queueMicrotask(() => {
      if (target) {
        setForm({
          type: target.type === 'key_result' ? 'kpi' : target.type,
          goal_tag: target.goal_tag ?? goalTagForType(target.type === 'key_result' ? 'kpi' : target.type),
          title: target.title,
          description: target.description ?? '',
          metric_key: target.metric_key,
          target_value: String(target.target_value),
          scope: target.scope,
          member_user_id: target.member_user_id ?? '',
          planning_level: target.planning_level ?? periodToPlanningLevel(period),
          stage_id: target.stage_id ?? '',
          decomposition_mode: target.decomposition_mode ?? 'hybrid',
        });
        setKeyResults([emptyKeyResult()]);
        setAllocationNodes(target.allocations ?? []);
        setPreviewVisible((target.allocations ?? []).length > 0);
        return;
      }
      const initial = emptyBoardTargetForm();
      initial.planning_level = periodToPlanningLevel(period);
      initial.stage_id = stages[0]?.stage_id ?? '';
      setForm(initial);
      setKeyResults([emptyKeyResult()]);
      setAllocationNodes([]);
      setPreviewVisible(false);
    });
  }, [open, period, stages, target]);

  useEffect(() => {
    if (!open || isEditing) return;
    queueMicrotask(() => {
      setPreviewVisible(false);
      setAllocationNodes([]);
    });
  }, [form.planning_level, form.target_value, form.stage_id, form.decomposition_mode, open, isEditing]);

  const canSubmit = useMemo(() => {
    if (!form.title.trim() || !form.target_value.trim()) return false;
    if (Number.isNaN(Number(form.target_value)) || Number(form.target_value) < 0) return false;
    if (form.scope === 'member' && !form.member_user_id) return false;
    if (!isEditing && !form.stage_id) return false;
    if (!isEditing && form.type === 'objective') {
      const validKrs = keyResults.filter(
        (kr) => kr.title.trim() && kr.target_value.trim() && !Number.isNaN(Number(kr.target_value)),
      );
      if (validKrs.length === 0) return false;
    }
    return true;
  }, [form, isEditing, keyResults]);

  const handleSubmit = () => {
    if (!canSubmit) return;

    const unit = metricUnitForKey(form.metric_key);
    const basePayload: CreateBoardTargetPayload = {
      type: form.type,
      goal_tag: form.goal_tag,
      title: form.title.trim(),
      description: form.description.trim() || null,
      metric_key: form.metric_key,
      target_value: Number(form.target_value),
      unit,
      period_type: period,
      planning_level: form.planning_level,
      anchor_start: planningAnchors.anchor_start,
      anchor_end: planningAnchors.anchor_end,
      scope: form.scope,
      member_user_id: form.scope === 'member' ? Number(form.member_user_id) : null,
      stage_id: Number(form.stage_id),
      decomposition_mode: form.decomposition_mode,
      allocations: allocationNodes.length > 0 ? allocationNodes : undefined,
    };

    if (isEditing && target) {
      updateTarget.mutate(
        {
          id: target.id,
          data: {
            title: basePayload.title,
            description: basePayload.description,
            metric_key: basePayload.metric_key,
            target_value: basePayload.target_value,
            unit: basePayload.unit,
            period_type: basePayload.period_type,
            planning_level: basePayload.planning_level,
            anchor_start: basePayload.anchor_start,
            anchor_end: basePayload.anchor_end,
            scope: basePayload.scope,
            member_user_id: basePayload.member_user_id,
            stage_id: form.stage_id ? Number(form.stage_id) : undefined,
            decomposition_mode: basePayload.decomposition_mode,
            allocations: allocationNodes.length > 0 ? allocationNodes : undefined,
          },
        },
        { onSuccess: onClose },
      );
      return;
    }

    if (form.type === 'objective') {
      const stageId = Number(form.stage_id);
      basePayload.key_results = keyResults
        .filter((kr) => kr.title.trim() && kr.target_value.trim())
        .map((kr) => ({
          title: kr.title.trim(),
          metric_key: kr.metric_key,
          target_value: Number(kr.target_value),
          unit: metricUnitForKey(kr.metric_key),
          scope: form.scope,
          member_user_id: form.scope === 'member' ? Number(form.member_user_id) : null,
          stage_id: stageId,
        }));
    }

    createTarget.mutate(basePayload, { onSuccess: onClose });
  };

  const drawerTitle = isEditing ? 'Edit target' : 'Add target';
  const heroDescription = context.is_project_board
    ? `Define what success looks like on this project board for ${periodLabel.toLowerCase()}.`
    : context.is_pipeline_board
      ? `Define what success looks like on this pipeline board for ${periodLabel.toLowerCase()}.`
      : `Define what success looks like on this board for ${periodLabel.toLowerCase()}.`;

  const titlePlaceholder = form.type === 'objective'
    ? context.is_pipeline_board
      ? 'e.g. Grow qualified pipeline wins this quarter'
      : 'e.g. Ship core project milestones this quarter'
    : context.is_pipeline_board
      ? 'e.g. Win 20 leads this month'
      : 'e.g. Complete 15 tasks this month';

  return (
    <SlideDrawer
      open={open}
      onClose={onClose}
      title={drawerTitle}
      subtitle={
        isEditing
          ? 'Update this target for the selected period.'
          : 'Group your target details below — type, measure, and ownership.'
      }
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
      canSubmit={canSubmit}
    >
      <div className="space-y-5">
        <PipelineModalHero
          icon={Target}
          tone="indigo"
          title={isEditing ? 'Update board target' : 'New board target'}
          description={heroDescription}
        />

        <div className="flex flex-col gap-1 rounded-lg border border-violet-100 bg-violet-50/60 px-3 py-2 text-xs text-violet-900">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-3.5 w-3.5 shrink-0 text-violet-600" />
            <span>
              Progress view: <span className="font-semibold">{periodLabel}</span>
              {isEditing && target ? (
                <span className="text-violet-700/80"> · editing {TARGET_TYPE_LABELS[target.type] ?? target.type}</span>
              ) : null}
            </span>
          </div>
          <p className="pl-5 text-violet-800/90">
            Planning horizon for decomposition:{' '}
            <span className="font-semibold tabular-nums">{formatAnchorRange(planningAnchors)}</span>
            {' '}— future years / months / weeks each get their share of the full target.
          </p>
        </div>

        {!isEditing && (
          <BoardTargetTypeSection
            type={form.type}
            onTypeChange={(type) =>
              patchForm({ type, goal_tag: goalTagForType(type) })
            }
          />
        )}

        <BoardTargetCoreFields
          form={form}
          context={context}
          stages={stages}
          metrics={metrics}
          titlePlaceholder={titlePlaceholder}
          onChange={patchForm}
        />

        {!isEditing && (
          <BoardTargetDecompositionSection
            previewVisible={previewVisible}
            allocationNodes={allocationNodes}
            canPreview={canPreviewDecomposition}
            isPending={decomposePreview.isPending}
            onPreview={runDecompositionPreview}
            onOverride={(flatIndex, value) => {
              setAllocationNodes((prev) =>
                prev.map((node, i) =>
                  i === flatIndex ? { ...node, expected_value: value, is_override: true } : node,
                ),
              );
            }}
          />
        )}

        <BoardTargetOwnershipSection
          scope={form.scope}
          memberUserId={form.member_user_id}
          assigneeMembers={assigneeMembers}
          onScopeChange={(scope) =>
            setForm((prev) => ({
              ...prev,
              scope,
              member_user_id: scope === 'board' ? '' : prev.member_user_id,
            }))
          }
          onMemberChange={(member_user_id) => patchForm({ member_user_id })}
        />

        {!isEditing && form.type === 'objective' && (
          <BoardTargetKeyResultsSection
            keyResults={keyResults}
            metrics={metrics}
            onChange={setKeyResults}
          />
        )}
      </div>
    </SlideDrawer>
  );
}
