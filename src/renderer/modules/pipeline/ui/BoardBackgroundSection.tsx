import BackgroundGallery from './BackgroundGallery';
import { PipelineFormSection } from './pipelineFormFields';
import { Palette } from 'lucide-react';

type BackgroundMode = 'color' | 'gallery' | 'upload';

interface BoardBackgroundSectionProps {
  boardId?: number;
  bgType: string;
  bgValue: string;
  uploadHistory?: string[];
  onSelect: (type: BackgroundMode, value: string) => void;
  onUpload?: (file: File) => void;
  isUploading?: boolean;
}

export default function BoardBackgroundSection({
  boardId = 0,
  bgType,
  bgValue,
  uploadHistory = [],
  onSelect,
  onUpload,
  isUploading,
}: BoardBackgroundSectionProps) {
  return (
    <PipelineFormSection title="Background" icon={Palette}>
      <BackgroundGallery
        boardId={boardId}
        currentType={bgType}
        currentValue={bgValue}
        uploadHistory={uploadHistory}
        onSelect={onSelect}
        onUpload={onUpload}
        isUploading={isUploading}
      />
    </PipelineFormSection>
  );
}
