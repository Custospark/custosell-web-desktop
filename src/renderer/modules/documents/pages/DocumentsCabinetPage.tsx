import { useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Button } from '../../../shared/components/buttons/Button';
import { LoadingSpinner } from '../../../shared/components/loading/LoadingSpinner';
import { ROUTES } from '../../../app/routes/constants/shared.paths';
import DocumentsPanel from '../ui/DocumentsPanel';
import AllCabinetsPickerModal from '../ui/AllCabinetsPickerModal';
import CreateCabinetModal from '../ui/CreateCabinetModal';
import CabinetSettingsModal from '../ui/CabinetSettingsModal';
import { useDocumentCabinet } from '../api/useDocumentCabinetQueries';
import { Archive, ChevronDown, LayoutGrid, Plus, Settings } from 'lucide-react';

type SettingsTab = 'details' | 'access' | 'canvas';

export default function DocumentsCabinetPage() {
  const navigate = useNavigate();
  const { cabinetId: cabinetIdParam } = useParams();
  const cabinetId = Number(cabinetIdParam);
  const [params] = useSearchParams();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<SettingsTab>('details');

  const folderId = useMemo(() => {
    const raw = params.get('folder_id');
    return raw ? Number(raw) : null;
  }, [params]);

  const { data: cabinet, isLoading, isError } = useDocumentCabinet(cabinetId, cabinetId > 0);

  if (!cabinetId || cabinetId <= 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
        <p className="text-sm font-medium text-gray-800">Invalid cabinet</p>
        <Button variant="secondary" onClick={() => navigate(ROUTES.DOCUMENTS.INDEX)}>Back to cabinets</Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-full min-h-[12rem] items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (isError || !cabinet) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
        <p className="text-sm font-medium text-gray-800">Cabinet not found</p>
        <p className="text-sm text-gray-500">It may have been removed or you no longer have access.</p>
        <Button variant="secondary" onClick={() => navigate(ROUTES.DOCUMENTS.INDEX)}>Back to cabinets</Button>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <header className="mb-2 flex shrink-0 flex-wrap items-center gap-2 border-b border-gray-200/80 pb-2">
        <button
          type="button"
          onClick={() => navigate(ROUTES.DOCUMENTS.INDEX)}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100"
          title="All cabinets"
        >
          <LayoutGrid className="h-3.5 w-3.5" />
          Cabinets
        </button>
        <span className="text-gray-300">/</span>
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-md bg-indigo-50 px-2.5 py-1 text-sm font-semibold text-indigo-800 hover:bg-indigo-100"
        >
          <Archive className="h-4 w-4" />
          {cabinet.name}
          <ChevronDown className="h-3.5 w-3.5 opacity-70" />
        </button>
        <div className="ml-auto flex items-center gap-2">
          {cabinet.can_manage && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="inline-flex items-center gap-1.5"
              onClick={() => {
                setSettingsTab('details');
                setSettingsOpen(true);
              }}
            >
              <Settings className="h-3.5 w-3.5" />
              Settings
            </Button>
          )}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="inline-flex items-center gap-1.5"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            New cabinet
          </Button>
        </div>
      </header>

      <div className="min-h-0 flex-1">
        <DocumentsPanel
          cabinetId={cabinetId}
          cabinet={cabinet}
          folderId={folderId}
          title={cabinet.name}
          fullBleed
          onOpenCabinetSettings={(tab = 'details') => {
            setSettingsTab(tab);
            setSettingsOpen(true);
          }}
        />
      </div>

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
          initialTab={settingsTab}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  );
}
