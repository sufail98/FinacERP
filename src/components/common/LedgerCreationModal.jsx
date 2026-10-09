import React, { useState } from 'react';
import { Modal, Fade, Box, useMediaQuery } from "@mui/material";
import { X } from "lucide-react";
import AddAccountLedger from "@/components/pages/Master/AccountLedger/AddAccountLedger";
import AddCustomerPage from "@/components/pages/Master/Customer&Supplier/AddCustomer";
import AddSupplierPage from "@/components/pages/Master/Customer&Supplier/AddSupplierForm";
import AddBankPage from "@/components/pages/Master/Bank/AddBank";

const LedgerCreationModal = ({ open, handleClose, onSuccess }) => {
  const [activeTab, setActiveTab] = useState("accountLedger");
  const isMobile = useMediaQuery("(max-width:600px)");

  const style = {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: isMobile ? "95%" : "1000px",
    maxHeight: "95vh",
    boxShadow: 24,
    borderRadius: 8,
    p: 0,
  };

  const tabs = [
    { id: 'accountLedger', label: 'Account Ledger' },
    { id: 'customer', label: 'Customer' },
    { id: 'supplier', label: 'Supplier' },
    { id: 'bank', label: 'Bank' },
  ];

  return (
    <Modal
      open={open}
      onClose={handleClose}
      closeAfterTransition
      slotProps={{ 
        backdrop: { 
          timeout: 300,
          sx: {
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            '.dark &': {
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
            }
          }
        } 
      }}
      style={{ zIndex: "99999999999999999" }}
    >
      <Fade in={open}>
        <Box sx={style} className="bg-white dark:bg-[#1e1e1e] border border-gray-300 dark:border-gray-600 outline-none flex flex-col h-[95vh] overflow-hidden">
          
          <div className="flex justify-between items-center px-4 py-2 border-b border-gray-200 dark:border-gray-700 shrink-0">
            <div className="flex gap-4 overflow-x-auto">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-3 font-medium text-sm whitespace-nowrap border-b-2 transition-colors ${
                    activeTab === tab.id 
                      ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400' 
                      : 'border-transparent text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <button 
              onClick={handleClose}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full shrink-0"
            >
              <X size={20} className="text-gray-500 dark:text-gray-400" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-[#121212]">
            {activeTab === 'accountLedger' && (
              <div className="p-4">
                <AddAccountLedger 
                  open={open} 
                  handleClose={handleClose} 
                  onSuccess={onSuccess} 
                  isTabMode={true} 
                />
              </div>
            )}
            {activeTab === 'customer' && (
              <AddCustomerPage 
                isModal={true} 
                onClose={handleClose} 
                onSuccess={onSuccess} 
              />
            )}
            {activeTab === 'supplier' && (
              <AddSupplierPage 
                isModal={true} 
                onClose={handleClose} 
                onSuccess={onSuccess} 
              />
            )}
            {activeTab === 'bank' && (
              <AddBankPage 
                isModal={true} 
                onClose={handleClose} 
                onSuccess={onSuccess} 
              />
            )}
          </div>

        </Box>
      </Fade>
    </Modal>
  );
};

export default LedgerCreationModal;
