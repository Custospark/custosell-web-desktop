import { useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Button } from '../../../shared/components/buttons/Button';
import { LoadingSpinner } from '../../../shared/components/loading/LoadingSpinner';
import { ROUTES } from '../../../app/routes/constants/shared.paths';
import DocumentsPanel from '../ui/DocumentsPanel';
import AllCabinetsPickerModal from '../ui/AllCabinetsPickerModal';
import CreateCabinetModal from '../ui/CreateCabinetModal';
import CabinetSettingsModal from '../ui/CabinetSettingsModal';
import CabinetSwitcherIcons from '../ui/CabinetSwitcherIcons';
import { useDocumentCabinet } from '../api/useDocumentCabinetQueries';
import { cabinetCardHeroStyle } from '../ui/cabinetMeta';

export default function DocumentsCabinetPage() {
  const navigate = useNavigate();
  const { cabinetId: cabinetIdParam } = useParams();
  const cabinetId = Number(cabinetIdParam);
  const [params] = useSearchParams();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const folderId = useMemo(() => {
    const raw = params.get('folder_id');
    return raw ? Number(raw) : null;
  }, [params]);

  const { data: cabinet, isLoading, isError } = useDocumentCabinet(cabinetId, cabinetId > 0);

  if (!cabinetId || cabinetId <= 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-4 text-center sm:p-6">
        <p className="text-sm font-medium text-gray-800">Invalid cabinet</p>
        <Button variant="secondary" onClick={() => navigate(ROUTES.DOCUMENTS.INDEX)}>Back to cabinets</Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-full min-h-[12rem] items-center justify-center p-4 sm:p-6">
        <LoadingSpinner />
      </div>
    );
  }

  if (isError || !cabinet) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-4 text-center sm:p-6">
        <p className="text-sm font-medium text-gray-800">Cabinet not found</p>
        <p className="text-sm text-gray-500">It may have been removed or you no longer have access.</p>
        <Button variant="secondary" onClick={() => navigate(ROUTES.DOCUMENTS.INDEX)}>Back to cabinets</Button>
      </div>
    );
  }

  const cabinetBgStyle = cabinetCardHeroStyle(cabinet);

  return (
    <div
      className="flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-white/50 shadow-sm"
      style={cabinetBgStyle}
    >
      <div className="min-h-0 flex-1">
        <DocumentsPanel
          cabinetId={cabinetId}
          cabinet={cabinet}
          folderId={folderId}
          title={cabinet.name}
          fullBleed
        />
      </div>

      <CabinetSwitcherIcons
        allowSettings={cabinet.can_manage}
        onOpenAll={() => setPickerOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
        onCreateNew={() => setCreateOpen(true)}
      />

      <AllCabinetsPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        activeCabinetId={cabinetId}
        onCreateNew={() => setCreateOpen(true)}
      />

      <CreateCabinetModal open={createOpen} onClose={() => setCreateOpen(false)} />

      {cabinet.can_manage && (
        <CabinetSettingsModal
          open={settingsOpen}
          cabinet={cabinet}
          onClose={() => setSettingsOpen(false)}
          onDeleted={() => navigate(ROUTES.DOCUMENTS.INDEX)}
        />
      )}
    </div>
  );
}
