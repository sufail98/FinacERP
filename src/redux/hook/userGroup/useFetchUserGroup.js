// src/hooks/useUserGroups.js
import { fetchUserGroups } from "@/redux/slice/userGroup/fetchUserGroupSlice";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";

const useUserGroups = () => {
  const dispatch = useDispatch();
  const { data, loading, error } = useSelector((state) => state.userGroups);

  useEffect(() => {
    dispatch(fetchUserGroups());
  }, [dispatch]);

  return { userGroupList:data,userGroupLoading:loading, userGroupError:error };
};

export default useUserGroups;
