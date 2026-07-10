import { DOCUMENT_SURFACE } from '../../../shared/utils/surfaceStyles';

export const HR_SURFACE = {
  panel: DOCUMENT_SURFACE.panel,
  sidenav:
    'flex h-full w-[240px] shrink-0 flex-col overflow-hidden rounded-2xl border border-white/55 bg-white/80 shadow-md backdrop-blur-xl backdrop-saturate-150',
  tableWrap: 'overflow-hidden rounded-2xl border border-white/55 bg-white/85 shadow-sm backdrop-blur-lg',
} as const;
