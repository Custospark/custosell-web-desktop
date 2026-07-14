import { Eye, Layers } from 'lucide-react';
import { Button } from '../../../shared/components/buttons/Button';
import type { TargetAllocation } from '../api/boardProgressTypes';
import DecompositionPreviewTree from './DecompositionPreviewTree';
import { PipelineFormSection } from './pipelineFormFields';

interface BoardTargetDecompositionSectionProps {
  previewVisible: boolean;
  allocationNodes: TargetAllocation[];
  canPreview: boolean;
  isPending: boolean;
  onPreview: () => void;
  onOverride: (flatIndex: number, value: number) => void;
}

export function BoardTargetDecompositionSection({
  previewVisible,
  allocationNodes,
  canPreview,
  isPending,
  onPreview,
  onOverride,
}: BoardTargetDecompositionSectionProps) {
  return (
    <PipelineFormSection
      title="Decomposition preview"
      icon={Layers}
      description="Review how this target breaks into sub-periods before saving. Edit values to override."
    >
      {!previewVisible ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-gray-200 bg-gray-50/80 px-4 py-6 text-center">
          <p className="text-sm text-gray-600">
            Click below to generate a one-time preview from your planning inputs.
          </p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="inline-flex items-center gap-2"
            onClick={onPreview}
            disabled={!canPreview || isPending}
            loading={isPending}
          >
            <Eye className="h-3.5 w-3.5" />
            Show decomposition preview
          </Button>
        </div>
      ) : (
        <>
          <div className="mb-3 flex justify-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="inline-flex items-center gap-2 text-gray-600"
              onClick={onPreview}
              disabled={!canPreview || isPending}
              loading={isPending}
            >
              <Eye className="h-3.5 w-3.5" />
              Regenerate preview
            </Button>
          </div>
          <DecompositionPreviewTree
            nodes={allocationNodes}
            loading={isPending}
            onOverride={onOverride}
          />
        </>
      )}
    </PipelineFormSection>
  );
}
