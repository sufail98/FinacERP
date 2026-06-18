import { useState, useEffect } from "react";
import { X } from "lucide-react";
import axiosInstance from "@/lib/axiosConfig";
import useAuth from "@/redux/hook/auth/useAuth";
import { useTranslation } from "react-i18next";

const OtherChargeLedgerModal = ({ isOpen, onClose, onSelect, currentLedgerId,otherChargeLedgers }) => {
  const { t } = useTranslation();
  const [loading, ] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const { selectedBranchId } = useAuth()

const [otrherChrgLedgers,setOthrChrgledger]=useState([])
  useEffect(()=>{
    fetchOtherChargeLedger()
  },[])

  const fetchOtherChargeLedger = async () => {
    try {
      const res = await axiosInstance.post("bank-account-ledgers", {
        group_ids: [13, 17],
        branchId: selectedBranchId
      });
      
      setOthrChrgledger(res.data.data)
    } catch (error) {
      console.error(error);

    }
  }
  const handleDoubleClick = (ledger) => {
    onSelect(ledger);
    onClose();
  };

  const filteredLedgers = otrherChrgLedgers?.filter((ledger) =>
    ledger.ledgerName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#000000a0]">
      <div className="bg-primary dark:bg-primary rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col border border-themed dark:border-themed">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-themed dark:border-themed">
          <h2 className="text-lg font-semibold text-primary dark:text-primary">
            {t("salesInvoice.form.footerSection.otherChargeLedger.title")}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-hover dark:hover:bg-hover rounded transition-colors"
          >
            <X className="w-5 h-5 text-secondary dark:text-secondary" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-themed dark:border-themed">
          <input
            type="text"
            placeholder={t("salesInvoice.form.footerSection.otherChargeLedger.searchPlaceholder") || "Search ledgers..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border border-themed dark:border-themed rounded bg-primary dark:bg-primary text-primary dark:text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
        </div>

        {/* Ledger List */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center text-secondary dark:text-secondary">
                <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                {t("loadingText") || "Loading ledgers..."}
              </div>
            </div>
          ) : filteredLedgers.length === 0 ? (
            <div className="text-center py-8 text-secondary dark:text-secondary">
              {t("notfound")}
            </div>
          ) : (
            <div className="space-y-1">
              {filteredLedgers.map((ledger) => (
                <div
                  key={ledger.ledgerId}
                  onDoubleClick={() => handleDoubleClick(ledger)}
                // Change this line in the filteredLedgers.map():
className={`p-3 rounded cursor-pointer transition-colors ${
  Number(currentLedgerId) === Number(ledger.ledgerId)   // ← both cast to Number
    ? "bg-blue-100 dark:bg-blue-900 border border-blue-500"
    : "bg-secondary dark:bg-secondary hover:bg-hover dark:hover:bg-hover"
}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-primary dark:text-primary font-medium">
                      {ledger.ledgerName}
                    </span>
                  {Number(currentLedgerId) === Number(ledger.ledgerId) && (   // ← same fix
  <span className="text-xs text-blue-600 dark:text-blue-400 font-semibold">
    {t("salesInvoice.form.footerSection.otherChargeLedger.selectLedger") || "SELECTED"}
  </span>
)}
                  </div>
                  {/* <div className="text-xs text-secondary dark:text-secondary mt-1">
                    {t("salesInvoice.form.footerSection.otherChargeLedger.doubleClickHint") || "Double-click to select"}
                  </div> */}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-themed dark:border-themed flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-secondary dark:bg-secondary text-primary dark:text-primary rounded hover:bg-hover dark:hover:bg-hover transition-colors"
          >
            {t("cancelBtn")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OtherChargeLedgerModal;