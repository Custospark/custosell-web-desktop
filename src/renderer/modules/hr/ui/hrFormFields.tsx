/* eslint-disable react-refresh/only-export-components -- shared HR form utilities */
import type { ReactNode } from 'react';
import {
  PipelineFormSection,
  PipelineIconField,
  PipelineModalHero,
  pipelineInputClass,
  pipelineLabelClass,
  pipelineSelectClass,
} from '../../pipeline/ui/pipelineFormFields';

export {
  PipelineFormSection as HrFormSection,
  PipelineIconField as HrIconField,
  PipelineModalHero as HrModalHero,
  pipelineInputClass as hrInputClass,
  pipelineLabelClass as hrLabelClass,
  pipelineSelectClass as hrSelectClass,
};

export function HrModalFooter({ children }: { children: ReactNode }) {
  return (
    <div className="sticky bottom-0 -mx-1 flex justify-end gap-2 border-t border-gray-100 bg-white/95 px-1 pt-4 backdrop-blur-sm">
      {children}
    </div>
  );
}
