import InvoiceBuilderForm from './InvoiceBuilderForm';

interface NewInvoiceBuilderProps {
  onCreated: () => void;
}

export default function NewInvoiceBuilder({ onCreated }: NewInvoiceBuilderProps) {
  return <InvoiceBuilderForm mode="create" onComplete={onCreated} />;
}
