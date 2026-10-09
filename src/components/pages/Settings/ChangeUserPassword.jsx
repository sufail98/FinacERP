import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import axiosInstance from "@/lib/axiosConfig";
import useAuth from "@/redux/hook/auth/useAuth";
import AlertBox from "@/components/common/AlertBox";
import { useTranslation } from "react-i18next";
import { Eye, EyeOff } from "lucide-react";
import { useNavigate, } from "react-router-dom";

const ChangeUserPassword = () => {
  const navigate = useNavigate();
  const { userId: passChangeId } = useAuth()
  // Support userId coming from route param OR query string (?userId=)

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [alert, setAlert] = useState(null);
  const { user } = useAuth();
  const { t } = useTranslation();
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const changePassWord = async () => {
    // 🔹 Validation: prevent spaces and mismatch
    if (/\s/.test(newPassword) || /\s/.test(confirmPassword)) {
      setError("Password cannot contain spaces");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      await axiosInstance.post("change-password", {
        userId: passChangeId,
        Password: newPassword,
        ModifedUser: user?.userId,
      });

      setAlert({
        id: new Date(),
        type: "success",
        message: "Password changed successfully",
      });

      setNewPassword("");
      setConfirmPassword("");

      setTimeout(() => {
        navigate(-1);
      }, 1500);
    } catch (error) {
      setError(error?.response?.data?.message || "Something went wrong");
      setAlert({
        id: new Date(),
        type: "error",
        message: error?.response?.data?.message || "Something went wrong",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setNewPassword("");
    setConfirmPassword("");
    setError(null);
    setAlert(null);
    navigate(-1);
  };

  return (
    <div className="flex justify-center items-start md:items-center min-h-[80vh] px-4 py-8">
      {alert && <AlertBox key={alert.id} message={alert.message} type={alert.type} />}

      <Card className="w-full max-w-[600px] border border-gray-300 dark:border-gray-600 shadow-md bg-white dark:bg-gray-800">
        <CardContent className="p-6 space-y-2 bg-transparent dark:bg-transparent">
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-8">
            Change Password
          </h2>

          {/* New Password */}
          <div>
            <Label className="text-xs text-gray-700 dark:text-gray-300">
              New Password
            </Label>
          </div>

          <div className="mb-6 relative">
            <Input
              type={showNewPassword ? "text" : "password"}
              placeholder="New Password"
              value={newPassword}
              onChange={(e) => {
                const value = e.target.value.replace(/\s/g, "");
                setNewPassword(value);
                setError(null);
              }}
              className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 
        border-gray-300 dark:border-gray-600
        placeholder:text-gray-400 dark:placeholder:text-gray-500 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowNewPassword((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              tabIndex={-1}
            >
              {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {/* Confirm Password */}
          <div>
            <Label className="text-xs text-gray-700 dark:text-gray-300">
              Confirm New Password
            </Label>
          </div>

          <div className="relative">
            <Input
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirm New Password"
              value={confirmPassword}
              onChange={(e) => {
                const value = e.target.value.replace(/\s/g, "");
                setConfirmPassword(value);
                setError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  changePassWord();
                }
              }}
              className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 
        border-gray-300 dark:border-gray-600
        placeholder:text-gray-400 dark:placeholder:text-gray-500 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              tabIndex={-1}
            >
              {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
            {error && (
              <div className="text-red-500 dark:text-red-400 text-sm mt-2 animate-shake">
                {error}
              </div>
            )}
          </div>

          {/* Buttons */}
          <div className="mt-7 flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={handleCancel}
              className="border-gray-300 dark:border-gray-600 
                                text-gray-700 dark:text-gray-300
                                hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Close
            </Button>
            <Button
              className="bg-[var(--main-bg)] text-white flex items-center justify-center gap-2 
                                hover:opacity-90 transition-opacity"
              onClick={changePassWord}
              disabled={loading}
            >
              {loading ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                    ></path>
                  </svg>
                  <span>Changing...</span>
                </>
              ) : (
                "Change Password"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ChangeUserPassword;