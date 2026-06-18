import { useEffect, useMemo, useState } from "react";
import { Edit, Plus, ScrollText, Trash2, } from "lucide-react";
import BreadCrumb from "@/components/common/BreadCrumb";
import ContentTable from "@/components/common/ContentTable";
import Preloader from "@/components/common/Preloader";
import AlertBox from "@/components/common/AlertBox";
import NoAcessComponent from "@/components/common/NoAcessComponent";
import AddAccountLedger from "./AddAccountLedger";
import useAuth from "@/redux/hook/auth/useAuth";
import { useTranslation } from "react-i18next";
import axiosInstance from "@/lib/axiosConfig";
import Swal from "sweetalert2";
import usePrivileges from "@/lib/hooks/usePrivileges";
import ErrorPage from "@/components/common/ErrorPage";
import { useSelector } from 'react-redux';

const AccountLedger = () => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);
  const [editId, setEditId] = useState(null);
  const [fetchError, setFetchError] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);


  const [searchTerm, setSearchTerm] = useState("");
  const { selectedBranchId } = useAuth();
  const { privileges, loading: privilegeLoading, hasAccess, message } = usePrivileges("Account Ledger");

  const { generalSettings } = useSelector((state) => state.settings);

  const filteredData = useMemo(() => {
    if (!searchTerm) return data;

    return data.filter((item) =>
      item.ledgerCode?.toString().toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.ledgerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.groupUnderName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.groupId?.toString().toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [data, searchTerm]);

  const columns = [
    { key: "SNo", label: t("accountLedger.columns.sno"), sortable: true },
    { key: "ledgerCode", label: t("accountLedger.columns.ledgerCode"), sortable: true, width: "110px" },
    { key: "ledgerName", label: t("accountLedger.columns.ledgerName"), sortable: true },
    { key: "openingBalance", label: t("accountLedger.columns.openingBalance"), sortable: true ,width:"150px" },
  ];

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && (e.key === 'c' || e.key === 'C')) {
        const selectedText = window.getSelection()?.toString();
        if (selectedText && selectedText.length > 0) {
          return;
        }

        const activeElement = document.activeElement;
        const isInputField = activeElement?.tagName === 'INPUT' ||
          activeElement?.tagName === 'TEXTAREA';

        if (isInputField) {
          const selectionStart = activeElement.selectionStart;
          const selectionEnd = activeElement.selectionEnd;
          if (selectionStart !== selectionEnd) {
            return;
          }
        }

        e.preventDefault();
        e.stopPropagation();

        if (open) return;

        if (!privileges?.can_add) {
          setAlert({ id: Date.now(), type: 'error', message: 'You do not have permission to add account ledgers' });
          return;
        }

        setEditId(null);
        setOpen(true);
        return;
      }

      if (e.key === 'Escape' && open) {
        e.preventDefault();
        setOpen(false);
        setEditId(null);
        return;
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [privileges, open]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.post("account-ledgers", { group_ids: [5, 6, 28, 29], branchId: selectedBranchId });

      if (res.data && !res.data.error) {
        const formatOpeningBalance = (balanceValue, crDrLabel) => {
          const val = parseFloat(balanceValue) || 0;
          const absVal = Math.abs(val);
          
          let resolvedLabel = crDrLabel;
          if (!resolvedLabel) {
            resolvedLabel = val < 0 ? "Cr" : "Dr";
          }
          
          const isCrDr = generalSettings?.AccountCalculationMethod === "CrDr";
          if (isCrDr) {
            return `${absVal.toFixed(generalSettings?.decimalPart || 2)} ${resolvedLabel}`;
          } else {
            const isNeg = val < 0 || (resolvedLabel === "Cr" && absVal !== 0);
            return `${isNeg ? "-" : ""}${absVal.toFixed(generalSettings?.decimalPart || 2)}`;
          }
        };

        // Process data to extract opening balance from branchId array
        const processedData = (res.data.data || []).map(item => {
          let openingBalance = "";

          // Case 1: openingBalance is directly on the item
          if (item.openingBalance !== undefined && item.openingBalance !== null && item.openingBalance !== "") {
            const balance = parseFloat(item.openingBalance);
            const crDr = item.crOrDr || "";
            openingBalance = formatOpeningBalance(balance, crDr);
          }
          // Case 2: branchId is an array with branch details — extract for selected branch or sum all
          else if (item.branchId && Array.isArray(item.branchId) && item.branchId.length > 0) {
            // Try to find the matching branch first
            const matchingBranch = item.branchId.find(
              bd => String(bd.branchId) === String(selectedBranchId)
            );

            if (matchingBranch) {
              const balance = parseFloat(matchingBranch.openingBalance) || 0;
              const crDr = matchingBranch.crOrDr || "";
              openingBalance = formatOpeningBalance(balance, crDr);
            } else {
              // If no matching branch, show total across all branches
              let totalCr = 0;
              let totalDr = 0;

              item.branchId.forEach(bd => {
                const bal = parseFloat(bd.openingBalance) || 0;
                if (bd.crOrDr === "Cr") {
                  totalCr += bal;
                } else {
                  totalDr += bal;
                }
              });

              if (totalCr > 0 && totalDr > 0) {
                // Both Cr and Dr exist — show net
                const net = totalDr - totalCr;
                openingBalance = formatOpeningBalance(Math.abs(net), net >= 0 ? "Dr" : "Cr");
              } else if (totalCr > 0) {
                openingBalance = formatOpeningBalance(totalCr, "Cr");
              } else if (totalDr > 0) {
                openingBalance = formatOpeningBalance(totalDr, "Dr");
              } else {
                openingBalance = (0).toFixed(generalSettings?.decimalPart || 2);
              }
            }
          }
          // Case 3: branchDetails array (alternative structure)
          else if (item.branchDetails && Array.isArray(item.branchDetails) && item.branchDetails.length > 0) {
            const matchingBranch = item.branchDetails.find(
              bd => String(bd.branchId) === String(selectedBranchId)
            );

            if (matchingBranch) {
              const balance = parseFloat(matchingBranch.openingBalance) || 0;
              const crDr = matchingBranch.crOrDr || "";
              openingBalance = formatOpeningBalance(balance, crDr);
            }
          }

          return {
            ...item,
            openingBalance: openingBalance,
          };
        });

        setData(processedData);
      } else {
        console.error("API Error:", res.data.message);
      }
    } catch (err) {
      setErrorMessage(
        `${err.response?.data?.message}, Line : ${err.response?.data?.line}, File : ${err.response?.data?.file}`
      );
      setFetchError(true);
      console.error("Error fetching Account Ledgers:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    const accountLedger = data.find((item) => item.ledgerId === id);

    if (accountLedger?.default) {
      setAlert({ id: Date.now(), type: "error", message: "This is marked as default and cannot be deleted" });
      return;
    }

    if (!privileges?.can_delete) {
      setAlert({ type: "error", message: "You do not have permission to delete Brand" });
      return;
    }

    const result = await Swal.fire({
      title: t("delete.title"),
      text: t("delete.text"),
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: t("delete.confirm"),
      cancelButtonText: t("delete.cancel"),
    });

    if (!result.isConfirmed) return;
    try {
      await axiosInstance.get(`delete-account-ledger/${id}`);

      setAlert({
        type: "success",
        message: t("accountLedger.delete.success")
      });

      fetchData();
    } catch (err) {
      const errorMessage = err.response?.data?.message;
      const finalMessage = errorMessage.toLowerCase().includes("foreign key violation")
        ? t("foreeignKeyError")
        : errorMessage;

      setAlert({
        id: Date.now(),
        type: "error",
        message: finalMessage,
      });
    }
  };

  const actions = [];
  if (privileges?.can_edit) {
    actions.push({
      icon: <Edit className="h-4 w-4" />,
      onClick: (row) => {
        setOpen(true)
        setEditId(row.ledgerId)
      },
      className: "text-green-600 hover:text-green-800",
      tooltip: "Edit"
    });
  }
  if (privileges?.can_delete) {
    actions.push({
      icon: <Trash2 className="h-4 w-4" />,
      className: "text-red-600 hover:text-red-800",
      onClick: (row) => handleDelete(row.ledgerId),
      tooltip: "Delete"
    });
  }

  if (loading) {
    return (
      <div>
        <BreadCrumb
          routes={[
            { title: t("accountLedger.breadcrumb.master"), url: "#" },
            { title: t("accountLedger.breadcrumb.title"), url: "#" },
          ]}
          heading={{ icon: ScrollText, title: t("accountLedger.heading") }}
          actions={[]}
        />
        <Preloader />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div>
        <BreadCrumb
          routes={[
            { title: t("accountLedger.breadcrumb.master"), url: "#" },
            { title: t("accountLedger.breadcrumb.title"), url: "#" },
          ]}
          heading={{ icon: ScrollText, title: t("accountLedger.heading") }}
        />
        {message && <NoAcessComponent message={message} />}
      </div>
    );
  }
  if (fetchError) return <ErrorPage errorMessage={errorMessage} />;
  return (
    <div>
      {alert && <AlertBox key={alert.id} message={alert.message} type={alert.type} />}
      <BreadCrumb
        routes={[
          { title: t("accountLedger.breadcrumb.master"), url: "#" },
          { title: t("accountLedger.breadcrumb.title"), url: "#" },
        ]}
        heading={{ icon: ScrollText, title: t("accountLedger.heading") }}
        actions={
          privileges?.can_add
            ? [
              {
                label: `${t("createNewBtn")} (Ctrl+C)`,
                icon: Plus,
                type: "primary",
                onClick: () => {
                  setOpen(true)
                  setEditId(null)
                },
              },
            ]
            : []
        }
      />
      <div className="w-full bg-gray-50 dark:bg-[#121212] px-2 py-2 transition-colors">
        <div className="w-full mx-auto">
          <ContentTable
            columns={columns}
            data={filteredData}
            actions={actions}
            showPagination={true}
            searchable={true}
            staticSearchable={true}
            pageSize={80}
            autoFocusSearch={true}
          />
        </div>
      </div>
      <AddAccountLedger open={open} handleClose={() => setOpen(false)} onSuccess={fetchData} editId={editId} />
    </div>
  );
};

export default AccountLedger;