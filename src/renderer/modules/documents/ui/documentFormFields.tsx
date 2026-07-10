/* eslint-disable react-refresh/only-export-components -- shared document form utilities */
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
  PipelineFormSection as DocumentFormSection,
  PipelineIconField as DocumentIconField,
  PipelineModalHero as DocumentModalHero,
  pipelineInputClass as documentInputClass,
  pipelineLabelClass as documentLabelClass,
  pipelineSelectClass as documentSelectClass,
};

export function DocumentModalFooter({ children }: { children: ReactNode }) {
  return (
    <div className="sticky bottom-0 -mx-1 flex justify-end gap-2 border-t border-gray-100 bg-white/95 px-1 pt-4 backdrop-blur-sm">
      {children}
    </div>
  );
}
