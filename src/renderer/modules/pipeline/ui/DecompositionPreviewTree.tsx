import type { TargetAllocation } from '../api/boardProgressTypes';
import { PLANNING_LEVEL_OPTIONS } from '../api/pipelineProgressTerms';

interface DecompositionPreviewTreeProps {
  nodes: TargetAllocation[];
  loading?: boolean;
  onOverride?: (index: number, value: number) => void;
}

const levelLabel = Object.fromEntries(
  PLANNING_LEVEL_OPTIONS.map((o) => [o.value, o.label]),
) as Record<string, string>;

export default function DecompositionPreviewTree({ nodes, loading, onOverride }: DecompositionPreviewTreeProps) {
  if (loading) {
    return <p className="text-sm text-gray-500">Calculating decomposition…</p>;
  }

  if (nodes.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">
        Set a planning level and target value to preview how expectations break down across periods.
      </p>
    );
  }

  const grouped = nodes.reduce<Record<string, Array<{ node: TargetAllocation; flatIndex: number }>>>((acc, node, flatIndex) => {
    const key = node.planning_level;
    acc[key] = acc[key] ?? [];
    acc[key].push({ node, flatIndex });
    return acc;
  }, {});

  return (
    <div className="max-h-72 space-y-3 overflow-y-auto rounded-xl border border-gray-200 bg-gray-50/50 p-3">
      {Object.entries(grouped).map(([level, levelNodes]) => (
        <div key={level}>
          <p className="mb-1 text-xs font-bold uppercase tracking-wide text-violet-700">
            {levelLabel[level] ?? level} ({levelNodes.length})
          </p>
          <div className="space-y-1">
            {levelNodes.slice(0, 12).map(({ node, flatIndex }) => (
              <div
                key={`${level}-${node.period_start}-${flatIndex}`}
                className="flex items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 text-xs"
              >
                <span className="text-gray-700">
                  {node.period_start}
                  {node.period_end !== node.period_start ? ` → ${node.period_end}` : ''}
                  {node.is_override ? <span className="ml-1 text-violet-600">(override)</span> : null}
                </span>
                {onOverride ? (
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={node.expected_value}
                    onChange={(e) => onOverride(flatIndex, Number(e.target.value))}
                    className="w-20 rounded border border-gray-200 px-2 py-1 text-right"
                  />
                ) : (
                  <span className="font-semibold text-gray-900">{node.expected_value.toFixed(2)}</span>
                )}
              </div>
            ))}
            {levelNodes.length > 12 && (
              <p className="px-2 text-[10px] text-gray-500">+{levelNodes.length - 12} more {level} periods</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
