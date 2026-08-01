import { useState, useMemo } from 'react';
import { useCustomers, useDeleteCustomer } from '../../api/customers/CustomerQueries';
import type { CustomerWithSyncMeta } from '../../../../app/store/offline/customers/localCustomersStore';
import { useAppSelector } from '../../../../app/store/hooks/useApp';
import { selectIsCompletelyOffline } from '../../../../app/store/slices/networkSlice';
import { Button } from '../../../../shared/components/buttons/Button';
import { SearchInput } from '../../../../shared/components/inputs/SearchInput';
import { Table } from '../../../../shared/components/tables/Table';
import { Card } from '../../../../shared/components/cards/Card';
import { Badge } from '../../../../shared/components/badges/Badge';
import { LoadingSkeleton } from '../../../../shared/components/loading/LoadingSkeletons';
import { EmptyState } from '../../../../shared/components/cards/EmptyState';
import { useConfirm } from '../../../../shared/components/Feedback/ConfirmContext';
import { formatCurrency } from '../../../../shared/utils/formatCurrency';
import { Pagination, usePagination } from '../../../../shared/components/tables/Pagination';
import { CustomerStatsCards } from './CustomerStatsCards';
import CustomerFormDrawer from './CustomerFormDrawer';
import CustomerPurchaseModal from './CustomerPurchaseModal';
import { displayCustomerPhone } from '../../../../shared/utils/customerContactUtils';
import { Plus, Users, Pencil, Trash, ShoppingBag, Files, BarChart3 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ROUTES } from '../../../../app/routes/constants/shared.paths';
import { canAccessModule } from '../../../../shared/utils/moduleAccess';

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-UG', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function CustomerList() {
  const { data: customers, isLoading, error } = useCustomers();
  const deleteMutation = useDeleteCustomer();
  const isOffline = useAppSelector(selectIsCompletelyOffline);
  const user = useAppSelector((s) => s.auth.user);
  const canDocuments = canAccessModule(user, 'documents');
  const { confirm } = useConfirm();
  const [search, setSearch] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerWithSyncMeta | null>(null);
  const [modalCustomerId, setModalCustomerId] = useState<number | null>(null);
  const [modalCustomerName, setModalCustomerName] = useState('');

  const filtered = useMemo(() => {
    if (!customers) return [];
    const safe = customers.filter(Boolean) as CustomerWithSyncMeta[];
    if (!search.trim()) return safe;
    const q = search.toLowerCase();
    return safe.filter((c) => {
      const phone = displayCustomerPhone(c.phone) ?? '';
      return c.name.toLowerCase().includes(q) || phone.toLowerCase().includes(q);
    });
  }, [customers, search]);

  const paginated = usePagination(filtered, 10);

  const openCreate = () => { setEditingCustomer(null); setDrawerOpen(true); };
  const openEdit = (c: CustomerWithSyncMeta) => { setEditingCustomer(c); setDrawerOpen(true); };

  const openPurchases = (customer: CustomerWithSyncMeta) => {
    setModalCustomerId(customer.id);
    setModalCustomerName(customer.name);
  };

  const handleDelete = async (customer: CustomerWithSyncMeta) => {
    const confirmed = await confirm({
      title: 'Delete Customer',
      message: `Are you sure you want to delete "${customer.name}"? This cannot be undone.`,
      confirmText: 'Delete', variant: 'danger',
    });
    if (confirmed) deleteMutation.mutate(customer.id);
  };

  if (isLoading) return <LoadingSkeleton variant="table" />;

  if (error) {
    return (
      <EmptyState icon={<Users className="w-12 h-12" />} title="Failed to load customers"
        description={error?.message || 'An error occurred'} actionLabel="Retry" onAction={() => window.location.reload()} />
    );
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Customers</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your customer relationships{isOffline && ' · Offline mode'}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link to={ROUTES.CUSTOMERS.OVERVIEW} className="inline-flex items-center gap-2 rounded-xl border-2 border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
            <BarChart3 className="w-4 h-4" />Overview
          </Link>
          <Button onClick={openCreate}><Plus className="w-4 h-4 mr-1.5" />Add Customer</Button>
        </div>
      </div>

      <CustomerStatsCards customers={customers || []} />
      <div className="h-6" />

      <Card>
        <div className="flex items-center gap-4 mb-4">
          <div className="flex-1">
            <SearchInput placeholder="Search customers by name or phone..." value={search} onChange={(e) => setSearch(e.target.value)} onClear={() => setSearch('')} />
          </div>
        </div>
        <Table<CustomerWithSyncMeta>
          rowKey={(c) => c.id}
          columns={[
            { key: 'id', header: '#' },
            { key: 'name', header: 'Name', render: (item) => (
              <div className="flex items-center gap-2">
                <span>{item.name}</span>
                {item._pendingSync && <Badge variant="warning">Pending sync</Badge>}
              </div>
            )},
            { key: 'phone', header: 'Phone', render: (item) => displayCustomerPhone(item.phone) ?? <span className="text-gray-400">—</span> },
            { key: 'email', header: 'Email', render: (item) => item.email || <span className="text-gray-400">—</span> },
            { key: 'total_purchases', header: 'Total Purchases', render: (item) => formatCurrency(item.total_purchases) },
            { key: 'last_purchase_at', header: 'Last Purchase', render: (item) => formatDate(item.last_purchase_at) },
            { key: 'actions', header: 'Actions', align: 'center', render: (item) => (
                <div className="flex items-center justify-center gap-1">
                  <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openEdit(item); }} title="Edit"><Pencil className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleDelete(item); }} title="Delete" disabled={item._pendingSync}><Trash className="w-4 h-4 text-red-500" /></Button>
                  <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openPurchases(item); }} title="Purchases"><ShoppingBag className="w-4 h-4 text-blue-600" /></Button>
                  {canDocuments && (
                    <Link to={`${ROUTES.DOCUMENTS.INDEX}?customer_id=${item.id}`} title="Documents" onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="sm"><Files className="w-4 h-4 text-indigo-600" /></Button>
                    </Link>
                  )}
                </div>
              ),
            },
          ]}
          data={paginated.data}
        />
        <Pagination
          currentPage={paginated.page}
          totalPages={paginated.totalPages}
          totalItems={paginated.totalItems}
          pageSize={paginated.pageSize}
          onPageChange={paginated.setPage}
          onPageSizeChange={paginated.setPageSize}
        />
      </Card>

      <CustomerFormDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        customer={editingCustomer}
      />

      {modalCustomerId && (
        <CustomerPurchaseModal
          open={!!modalCustomerId}
          onClose={() => setModalCustomerId(null)}
          customerId={modalCustomerId}
          customerName={modalCustomerName}
        />
      )}
    </>
  );
}
