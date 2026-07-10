import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import DocumentsPanel from '../ui/DocumentsPanel';

export default function DocumentsBrowserPage() {
  const [params] = useSearchParams();
  const folderId = useMemo(() => {
    const raw = params.get('folder_id');
    return raw ? Number(raw) : null;
  }, [params]);
  const customerId = useMemo(() => {
    const raw = params.get('customer_id');
    return raw ? Number(raw) : undefined;
  }, [params]);
  const projectId = useMemo(() => {
    const raw = params.get('project_id');
    return raw ? Number(raw) : undefined;
  }, [params]);

  return (
    <div className="flex h-full min-h-0 w-full">
      <DocumentsPanel
        folderId={folderId}
        customerId={customerId}
        projectId={projectId}
        title="Business Documents"
        fullBleed
      />
    </div>
  );
}
