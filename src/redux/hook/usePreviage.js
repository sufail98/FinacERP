// src/hooks/usePrivileges.js
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchPrivileges } from "../slice/privilegesSlice";

const usePrivileges = (userGroupId) => {
  const dispatch = useDispatch();
  const { data, loading, error } = useSelector((state) => state.privileges);

  useEffect(() => {
    if (userGroupId) {
      dispatch(fetchPrivileges(userGroupId));
    }
  }, [userGroupId, dispatch]);

  return { privileges: data, loading, error };
};

export default usePrivileges;
