import { useMemo, useState } from 'react'
import { X, Search } from 'lucide-react'
import { useTranslation } from 'react-i18next'

/**
 * Read-only quick-pick list of customers (from an external/legacy data source).
 * Double-clicking a row fills CustomerName / VatNo / CustomerPhone WITHOUT
 * touching ledgerId, since these records aren't necessarily linked ledgers.
 */
const CustomerQuickSelectModal = ({ open, onClose, customers = [], onSelect }) => {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return customers;
    const q = search.toLowerCase();
    return customers.filter((c) =>
      (c.customerName || '').toLowerCase().includes(q) ||
      (c.customerVat || '').toLowerCase().includes(q) ||
      (c.customerMobile || '').toLowerCase().includes(q)
    );
  }, [search, customers]);

  if (!open) return null;

  const handleDoubleClick = (item) => {
    onSelect({
      customerName: item.customerName || '',
      customerVat: item.customerVat || '',
      customerMobile: item.customerMobile || '',
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white dark:bg-[#1c1c1c] rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h2 className="font-semibold text-sm">
            {t('salesInvoice.form.label.formHeaderSection.quickCustomerSearch') || 'Select Customer'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="p-3 border-b">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              autoFocus
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('common.search') || 'Search name, VAT, or phone...'}
              className="w-full pl-8 pr-2 py-1.5 text-sm border rounded-md outline-none focus:ring-1 focus:ring-blue-500 dark:bg-[#242424]"
            />
          </div>
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1">
          {filtered.length === 0 ? (
            <div className="text-center text-xs text-gray-400 py-8">
              {t('common.noResults') || 'No matching customers'}
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-gray-50 dark:bg-[#242424]">
                <tr className="text-left text-gray-500">
                  <th className="px-3 py-2 font-medium">Name</th>
                  <th className="px-3 py-2 font-medium">VAT No</th>
                  <th className="px-3 py-2 font-medium">Mobile</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item, idx) => (
                  <tr
                    key={`${item.customerName}-${idx}`}
                    onDoubleClick={() => handleDoubleClick(item)}
                    className="border-t hover:bg-blue-50 dark:hover:bg-[#2a2a2a] cursor-pointer select-none"
                    title="Double-click to select"
                  >
                    <td className="px-3 py-1.5 whitespace-nowrap">{item.customerName || '-'}</td>
                    <td className="px-3 py-1.5 whitespace-nowrap">{item.customerVat || '-'}</td>
                    <td className="px-3 py-1.5 whitespace-nowrap">{item.customerMobile || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="px-3 py-2 border-t text-[11px] text-gray-400">
          {filtered.length} record{filtered.length !== 1 ? 's' : ''} — double-click a row to select
        </div>
      </div>
    </div>
  );
};

export default CustomerQuickSelectModal;