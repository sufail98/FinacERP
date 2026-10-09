import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import Switch from "@mui/material/Switch";
import { Building2, Edit, Trash2, MapPin, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import BreadCrumb from "@/components/common/BreadCrumb";
import ContentTable from "@/components/common/ContentTable";
import axiosInstance from "@/lib/axiosConfig";
import ErrorPage from "@/components/common/ErrorPage";
import Preloader from "@/components/common/Preloader";
import AlertBox from "@/components/common/AlertBox";
import NoAcessComponent from "@/components/common/NoAcessComponent";
import Swal from "sweetalert2";
import usePrivileges from "@/lib/hooks/usePrivileges";


const BranchesList = () => {
  const navigate = useNavigate();
  const { t } = useTranslation(); // ✅ get translation function

  const [fetchError, setFetchError] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [alert, setAlert] = useState(null);
  const [branches, setBranches] = useState([]);

    const { privileges, loading: privilegeLoading,hasAccess ,message} = usePrivileges("Branch");
useEffect(()=>{
  fetchAllBranches()
},[])

  const fetchAllBranches = async () => {
    setFetchLoading(true);
    try {
      const response = await axiosInstance.get("branches");
      
      setBranches(response.data.data);
    } catch (error) {
      setErrorMessage(
        `${error.response?.data?.message}, Line : ${error.response?.data?.line}, File : ${error.response?.data?.file}`
      );
      setFetchError(true);
    } finally {
      setFetchLoading(false);
    }
  };

  const handleToggleBranchStatus = async (branchId, currentStatus) => {
    try {
      await axiosInstance.get(`toggle-branch-status/${branchId}`, {
        activeStatus: !currentStatus,
      }); 

      setBranches((prev) =>
        prev.map((b) =>
          b.branchId === branchId ? { ...b, activeStatus: !currentStatus } : b
        )
      );

      setAlert({ type: "success", message: t("branches.alerts.statusUpdated") });
    } catch (error) {
      setAlert({
        type: "error",
        message: error.response?.data?.message || t("branches.alerts.deleteError"),
      });
    }
  };

  const deleteBranch = async (branchId) => {
    if (!privileges?.can_delete) {
      setAlert({ type: "error", message: t("branches.alerts.noPermission") });
      return;
    }

    if (branchId === 1) {
      setAlert({ type: "error", message: t("DefaultDataMsg") });
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
      await axiosInstance.get(`delete-branch/${branchId}`);
      setAlert({ type: "success", message: t("branches.alerts.deleteSuccess") });
      fetchAllBranches();
    } catch (error) {
      setAlert({ type: "error", message: error.response.data.message });
    }
  };

  const columns = [
    { key: "SNo", label: t("branches.columns.sno"), sortable: true },
    { key: "branchCode", label: t("branches.columns.branchName"), sortable: true },
    { key: "city", label: t("branches.columns.cityName"), sortable: true },
    { key: "activeStatus", label: t("branches.columns.status"), sortable: true },
  ];

  const actions = [];
  if (privileges?.can_edit) {
    actions.push({
      icon: <Edit className="h-4 w-4" />,
      onClick: (row) => navigate(`/edit-branch/${row.branchId}`),
      className: "text-green-600 hover:text-green-800",
      tooltip: t("branches.actions.edit"),
    });
  }
  // if (privileges?.can_delete) {
  //   actions.push({
  //     icon: <Trash2 className="h-4 w-4" />,
  //     className: "text-red-600 hover:text-red-800",
  //     onClick: (row) => deleteBranch(row.branchId),
  //     tooltip: t("branches.actions.delete"),
  //   });
  // }

  if (fetchLoading||privilegeLoading)
    return (
      <div>
        <BreadCrumb
          routes={[
            { title: t("branches.breadcrumb.branch"), url: "#" },
            { title: t("branches.breadcrumb.branchList"), url: "#" },
          ]}
          heading={{ icon: Building2, title: t("branches.title") }}
          // actions={
          //   [
          //     {
          //       label: t("branches.actions.addBranch"),
          //       icon: Plus,
          //       type: "primary",
          //       onClick: () => navigate("/create-new-branch"),
          //     },
          //   ]

          // }
        />
        <Preloader />
      </div>
    );

  if (!hasAccess) {
    return (
      <div>
        <BreadCrumb
          routes={[
            { title: t("branches.breadcrumb.branch"), url: "#" },
            { title: t("branches.breadcrumb.branchList"), url: "#" },
          ]}
          heading={{ icon: Building2, title: t("branches.title") }}
        />
        <NoAcessComponent message={message} />
      </div>
    );
  }

  if (fetchError) return <ErrorPage errorMessage={errorMessage} />;

  return (
    <div>
      {alert && <AlertBox key={alert.id} message={alert.message} type={alert.type} />}

      <BreadCrumb
        routes={[
          { title: t("branches.breadcrumb.branch"), url: "#" },
          { title: t("branches.breadcrumb.branchList"), url: "#" },
        ]}
        heading={{ icon: Building2, title: t("branches.title") }}
        // actions={
        //   privileges?.can_add
        //     ? [
        //       {
        //         label: t("branches.actions.addBranch"),
        //         icon: Plus,
        //         type: "primary",
        //         onClick: () => navigate("/create-new-branch"),
        //       },
        //     ]
        //     : []
        // }
      />

     <div className="w-full bg-gray-50 dark:bg-[#121212] px-2 py-2 transition-colors">
        <div className="w-full mx-auto">
              <ContentTable
                columns={columns}
                data={branches}
                actions={actions}
                renderCell={(key, row) => {
                  if (key === "city") {
                    return (
                      <div className="text-sm">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-gray-400" /> {row.cityName},{" "}
                          {row.district}
                        </div>
                        <div className="text-xs text-gray-500">{row.country}</div>
                      </div>
                    );
                  }
                  if (key === "activeStatus") {
                    return (
                      <Switch
                        checked={row.activeStatus}
                        onChange={() =>
                          handleToggleBranchStatus(row.branchId, row.activeStatus)
                        }
                        color="success"
                      />
                    );
                  }
                  return row[key] ?? "-";
                }}
                showPagination={false}
                searchable={true}
              />
                    </div>
      </div>
    </div>
  );
};

export default BranchesList;
