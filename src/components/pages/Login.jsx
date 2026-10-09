import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "../ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import axiosInstance from "@/lib/axiosConfig";
import AlertBox from "../common/AlertBox";
import { clearMenuData } from "../../../public/assets/js/menuData";
import { useTranslation } from "react-i18next";
import { fetchAllProducts } from "@/redux/slice/productSlice";
import { useDispatch } from "react-redux";
import { Eye, EyeOff } from "lucide-react";
import { showToast } from "@/utils/toast";
import { setOrganizationData } from "@/redux/slice/organizationSlice";
import PlanExpired from "../common/PlanExpired";
import { isPlanExpired } from "@/utils/planExpiry";

// ─── helpers: use localStorage for remember-me (works in web + Electron) ───
const REMEMBER_KEYS = {
  userName: "remember_userName",
  slno: "remember_slno",
  password: "remember_password",
  flag: "remember_me",
};

const saveCredentials = (userName, slno, password) => {
  localStorage.setItem(REMEMBER_KEYS.userName, userName);
  localStorage.setItem(REMEMBER_KEYS.slno, slno);
  localStorage.setItem(REMEMBER_KEYS.password, password);
  localStorage.setItem(REMEMBER_KEYS.flag, "true");
};

const clearCredentials = () => {
  Object.values(REMEMBER_KEYS).forEach((k) => localStorage.removeItem(k));
};

const loadCredentials = () => {
  if (localStorage.getItem(REMEMBER_KEYS.flag) !== "true") return null;
  return {
    userName: localStorage.getItem(REMEMBER_KEYS.userName) || "",
    slno: localStorage.getItem(REMEMBER_KEYS.slno) || "",
    password: localStorage.getItem(REMEMBER_KEYS.password) || "",
  };
};
// ───────────────────────────────────────────────────────────────────────────

const Login = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();

  const [slno, setSlno] = useState("");
  const [formData, setFormData] = useState({ userName: "", Password: "" });
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [planExpired, setPlanExpired] = useState(false);

  // ✅ Populate saved credentials on mount
  useEffect(() => {
    const saved = loadCredentials();
    if (saved) {
      setSlno(saved.slno);
      setFormData({ userName: saved.userName, Password: saved.password });
      setRememberMe(true);
    }
  }, []);

  // Clear menu data on fresh login screen
  useEffect(() => {
    clearMenuData();
  }, []);

  const validateForm = () => {
    const newErrors = {};
    if (!slno.trim()) newErrors.slno = "Serial number is required";
    if (!formData.userName.trim()) newErrors.userName = "Username is required";
    if (!formData.Password.trim()) newErrors.Password = "Password is required";
    else if (formData.Password.length < 2)
      newErrors.Password = "Password must be at least 2 characters long";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleSlnoChange = (e) => {
    setSlno(e.target.value);
    if (errors.slno) setErrors((prev) => ({ ...prev, slno: "" }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      showToast.error("Please fix the validation errors");
      return;
    }

    setLoading(true);
    setAlert(null);

    try {
      localStorage.setItem("customerSlno", slno);

      // 1) Resolve DB by slno
      const companyRes = await axiosInstance.post("get-organization", { slno });
      if (companyRes.data?.status !== 200) {
        localStorage.removeItem("customerSlno");
        showToast.error(companyRes.data?.message || "Invalid company serial number.");
        setLoading(false);
        return;
      }
      const org = companyRes.data.organization_details[0];
      dispatch(setOrganizationData(companyRes.data.organization_details[0]));
      const dbName = companyRes.data.organization_details[0].DatabaseName;
      localStorage.setItem("dbNameEncrypted", dbName);
      if (isPlanExpired(org.ExpiryDate)) {
        localStorage.removeItem("customerSlno");
        setPlanExpired(true);
        setLoading(false);
        return;
      }


      // 2) Login
      const response = await axiosInstance.post("login", formData);

      if (!response.data.error && response.data.status === 200) {
        const { token, user } = response.data.data;

        if (!user) {
          showToast.error("Invalid response from server. User data missing.");
          setLoading(false);
          return;
        }

        // ✅ Save or clear remembered credentials
        if (rememberMe) {
          saveCredentials(formData.userName, slno, formData.Password);
        } else {
          clearCredentials();
        }

        // Save auth details
        localStorage.setItem("authToken", token);
        localStorage.setItem("userData", JSON.stringify(user));
        dispatch(fetchAllProducts());

        if (user.userId != null) localStorage.setItem("userId", user.userId.toString());
        if (user.userName) localStorage.setItem("userName", user.userName);
        if (user.email) localStorage.setItem("userEmail", user.email);
        if (user.UserRoleId != null) localStorage.setItem("userRole", user.UserRoleId.toString());
        if (user.branchIds) localStorage.setItem("userBranches", JSON.stringify(user.branchIds));

        axiosInstance.defaults.headers.common["Authorization"] = `Bearer ${token}`;

        showToast.success("Login successful!");

        // ✅ Redirect back to the original page if present, else go home
        const redirectTo = searchParams.get("redirect");
        const destination = redirectTo ? decodeURIComponent(redirectTo) : "/";

        setTimeout(() => navigate(destination, { replace: true }), 500);

      } else {
        showToast.error(response.data.message || "Login failed. Please check credentials.");
      }
    } catch (error) {
      console.error("Login error:", error.message);
      let errorMessage = "Login failed. Please try again.";
      if (error.response) {
        if (error.response.status === 401) errorMessage = "Invalid username or password";
        else if (error.response.status === 422) errorMessage = "Please check your input and try again";
        else if (error.response.data?.message) errorMessage = error.response.data.message;
      } else if (error.request) {
        errorMessage = "Network error. Please check your connection.";
      }
      showToast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };
  if (planExpired) {
    return <PlanExpired />;
  }
  return (
    <div className="flex flex-col md:flex-row h-screen justify-center" style={{
      backgroundImage: "url(./assets/images/paralax.png)",
      backgroundSize: "cover",
      backgroundPosition: "center",
    }}>
      <div className="hidden md:flex w-1/2 justify-center items-center">
        <img className="object-cover" src="./assets/images/finac_splashlogo.png" alt="Login Illustration" />
      </div>

      <div className="flex w-full md:w-1/2 justify-center items-center">
        <Card className="w-[90%] md:w-[70%] shadow-lg rounded-2xl">
          <CardHeader>
            <CardTitle className="text-2xl">{t("loginHeading")}</CardTitle>
            <CardDescription>{t("loginDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            {alert && <AlertBox key={alert.id} message={alert.message} type={alert.type} />}
            <form onSubmit={handleSubmit}>
              <div className="flex flex-col gap-6">
                {/* Serial Number */}
                <div className="grid gap-2">
                  <Label htmlFor="slno">{t("slno")} <span className="text-red-500">*</span></Label>
                  <Input
                    id="slno" name="slno" type="text"
                    placeholder={t("slno")} value={slno}
                    onChange={handleSlnoChange}
                    className={errors.slno ? "border-red-500" : ""}
                    disabled={loading} autoFocus required
                  />
                  {errors.slno && <p className="text-xs text-red-500 mt-1">{errors.slno}</p>}
                </div>

                {/* Username */}
                <div className="grid gap-2">
                  <Label htmlFor="userName">{t("username")} <span className="text-red-500">*</span></Label>
                  <Input
                    id="userName" name="userName" type="text"
                    placeholder={t("username")} value={formData.userName}
                    onChange={handleInputChange}
                    className={errors.userName ? "border-red-500" : ""}
                    disabled={loading} required
                  />
                  {errors.userName && <p className="text-xs text-red-500 mt-1">{errors.userName}</p>}
                </div>

                {/* Password */}
                <div className="grid gap-2">
                  <Label htmlFor="Password">{t("password")} <span className="text-red-500">*</span></Label>
                  <div className="relative">
                    <Input
                      id="Password" name="Password"
                      type={showPassword ? "text" : "password"}
                      placeholder={t("password")} value={formData.Password}
                      onChange={handleInputChange}
                      className={errors.Password ? "border-red-500 pr-10" : "pr-10"}
                      disabled={loading} required
                    />
                    <button
                      type="button"
                      aria-label={showPassword ? t("hidePassword") : t("showPassword")}
                      onClick={() => setShowPassword((s) => !s)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center justify-center p-1 text-gray-500 hover:text-gray-700"
                    >
                      {showPassword ? <EyeOff /> : <Eye />}
                    </button>
                  </div>
                  {errors.Password && <p className="text-xs text-red-500 mt-1">{errors.Password}</p>}
                </div>

                {/* Remember Me */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox" id="rememberMe"
                    checked={rememberMe}
                    onChange={() => setRememberMe((v) => !v)}
                  />
                  <Label htmlFor="rememberMe">{t("rememberMe")}</Label>
                </div>
              </div>

              <div className="flex-col gap-2 mt-3">
                <Button type="submit" className="w-full main-bg dark:text-white" disabled={loading}>
                  {loading ? t("loadingText") : t("loginBtn")}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;