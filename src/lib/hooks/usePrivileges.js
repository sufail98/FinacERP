import { useState, useEffect } from "react";
import useAuth from "@/redux/hook/auth/useAuth";
import { checkPageAccess } from "@/lib/checkPrivilege";

const usePrivileges = (pageName) => {
  const { user ,userId} = useAuth();
  const [privileges, setPrivileges] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const fetchPrivileges = async () => {
      try {
        setLoading(true);

        if (user?.UserRoleId == 1) {
          
          setPrivileges({
            can_all: true,
            can_view: true,
            can_add: true,
            can_edit: true,
            can_delete: true,
            can_post: true,
            can_home: true,
          });
          setHasAccess(true);
          setMessage("");
          setLoading(false);
          return;
        }

        // ✅ Otherwise check privileges normally
        const priv = await checkPageAccess(pageName, user?.UserRoleId);
        

        if (!priv || !priv.can_view) {
          setMessage(`You don't have permission to view ${pageName}`);
          setHasAccess(false);
        } else {
          setHasAccess(true);
          setPrivileges(priv);
        }
      } catch (error) {
        console.error(`Error checking privileges for ${pageName}:`, error);
        setMessage(`Error checking permissions for ${pageName}`);
        setHasAccess(false);
      } finally {
        setLoading(false);
      }
    };

    // if ( Number(userId) === 1) {
      fetchPrivileges();
    // }
  }, [pageName,  userId]);
  

  return {
    privileges,
    loading,
    hasAccess,
    message,
    canView: privileges?.can_view || false,
    canAdd: privileges?.can_add || false,
    canEdit: privileges?.can_edit || false,
    canDelete: privileges?.can_delete || false,
  };
};

export default usePrivileges;
