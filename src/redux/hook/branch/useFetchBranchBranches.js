import { fetchBranches } from "@/redux/slice/branch/fetchBranchSlice";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";

const useBranches = () => {
  const dispatch = useDispatch();
  const { data, loading, error } = useSelector((state) => state.branches);

  useEffect(() => {
    dispatch(fetchBranches());
  }, [dispatch]);

  return { branchList: data, branchListLoading:loading, branchListError:error };
};

export default useBranches;
