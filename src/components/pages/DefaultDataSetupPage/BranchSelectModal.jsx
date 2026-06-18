import React, { useEffect, useState } from "react";
import { X, MapPin, Building2 } from "lucide-react";
import useAuth from "@/redux/hook/auth/useAuth";

const BranchSelectModal = ({ open, onClose, onSelect }) => {
  const { branches, selectedBranchId,setBranch } = useAuth();
  const [selected, setSelected] = useState(null);
    const [selectedBranch, setSelectedBranch] = useState(null);
  

  useEffect(() => {
    if (selectedBranchId && branches?.length > 0) {
      const branch = branches.find(b => b.branchId === selectedBranchId);
      setSelected(branch);
    }
  }, [branches, selectedBranchId]);
const handleBranchSelect = (branch) => {
    setSelectedBranch(branch);
    setBranch(branch.branchId);
    // localStorage.setItem("dbNameEncrypted", branch.dbNameEncrypted);
    // window.location.reload();
  };
  if (!open) return null;

  return (
    <>
      {/* Modal overlay */}
      <div
        className="fixed inset-0 bg-black/40 z-[200]"
        onClick={onClose}
      />

      {/* Modal Box */}
      <div className="fixed z-[210] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 
                      w-[420px] bg-white rounded-xl shadow-2xl">

        {/* Header */}
        <div className="flex justify-between items-center px-4 py-3 border-b">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-800">
            <MapPin className="w-5 h-5 text-blue-600" />
            Select Branch
          </h2>

          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Branch List */}
        <div className="max-h-80 overflow-y-auto p-2">
          {branches?.map(branch => (
            <button
              key={branch.branchId}
              onClick={() => handleBranchSelect(branch)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition 
                ${selected?.branchId === branch.branchId
                  ? "bg-blue-50 border border-blue-400"
                  : "hover:bg-gray-50"}
              `}
            >
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center
                ${selected?.branchId === branch.branchId
                  ? "border-blue-600 main-bg"
                  : "border-gray-400"}
              `}>
                {selected?.branchId === branch.branchId && (
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                )}
              </div>

              <Building2 className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-800">{branch.branchName}</span>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-4 py-3 border-t">
          <button
            className="px-4 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-100"
            onClick={onClose}
          >
            Cancel
          </button>

          <button
            disabled={!selected}
            className={`px-4 py-1.5 rounded-lg text-white 
              ${selected ? "main-bg hover:bg-blue-700" : "bg-blue-300 cursor-not-allowed"}
            `}
            onClick={() => onSelect(selected.branchId)}
          >
            Select
          </button>
        </div>

      </div>
    </>
  );
};

export default BranchSelectModal;
