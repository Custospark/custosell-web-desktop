import { DOCUMENT_SURFACE } from '../../../shared/utils/surfaceStyles';

export const HR_SURFACE = {
  panel: DOCUMENT_SURFACE.panel,
  tableWrap: 'overflow-hidden rounded-2xl border border-white/55 bg-white/85 shadow-sm backdrop-blur-lg',
  toolbar: 'flex flex-wrap items-center gap-3 rounded-2xl border border-white/55 bg-white/75 p-3 shadow-sm backdrop-blur-md',
} as const;
