import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Building2, FileText, Plus, ChevronUp, ChevronDown, SaveAll, Cross, Eraser, RefreshCcw } from "lucide-react";
import BreadCrumb from "@/components/common/BreadCrumb";
import { useNavigate, useParams } from "react-router-dom";
import { Textarea } from "@/components/ui/textarea";
import { FLLanguage } from "@/lib/LanguageHelper";
import axiosInstance from "@/lib/axiosConfig";
import Preloader from "@/components/common/Preloader";
import useAuth from "@/redux/hook/auth/useAuth";
import { useTranslation } from "react-i18next";
import { MdGTranslate } from "react-icons/md";
import useCtrlSave from "@/lib/hooks/useCtrlSave";
import { showToast } from "@/utils/toast";
import SearchableDropdown from "@/components/elements/theme/SearchableDropdown";

const AddBranch = () => {
  const { branchId } = useParams();
  const { t } = useTranslation();
  const isEditMode = Boolean(branchId);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();
  const [isFullAddressOpen, setIsFullAddressOpen] = useState(false);
  const [isBranchDetailsOpen, setIsBranchDetailsOpen] = useState(false);
  const { userId } = useAuth();

  const [formData, setFormData] = useState({
    companyId: 1,
    currencyId: "",
    branchName: "",
    branchNameFL: "",
    address: "",
    addressFL: "",
    streetName: "",
    streetNameFL: "",
    buildingNo: "",
    buildingNoFL: "",
    additionalNumber: "",
    additionalNumberFL: "",
    cityName: "",
    cityNameFL: "",
    district: "",
    districtFL: "",
    country: "",
    countryFL: "",
    postalCode: "",
    postalCodeFL: "",
    phoneNo: "",
    fax: "",
    mobile: "",
    email: "",
    web: "",
    taxNo: "",
    panNo: "",
    crNo: "",
    subscriptionNo: "",
    logo: null,
    mainBranch: true,
    startDate: "2025-08-01",
    activeStatus: true,
    createdDate: new Date().toISOString().slice(0, 19).replace("T", " "),
    createdUser: userId,
    modifiedDate: new Date().toISOString().slice(0, 19).replace("T", " "),
    modifiedUser: userId,
  });

  const [logoPreview, setLogoPreview] = useState(null);
  const [currencies, setCurrency] = useState([])

  const currency = currencies.map((item) => ({
    currencyId: item.currencyId,
    label: `${item.currencyName} (${item.currencySymbol})`,
  }));

  useEffect(() => {
    fetchCurrency()
  }, [])

  const fetchCurrency = async () => {
    try {
      const res = await axiosInstance.get('currencies');
      setCurrency(res.data.data)
    } catch (error) {
      console.error(error);
    }
  }

  useEffect(() => {
    if (isEditMode) {
      fetchBranchData();
    }
  }, [branchId, isEditMode]);

  const fetchBranchData = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get(`get-branch-byId/${branchId}`);
      const branchData = response.data.data;

      setFormData({
        ...formData,
        ...branchData,
        modifiedDate: new Date().toISOString().slice(0, 19).replace("T", " "),
        modifiedUser: userId,
      });

      if (branchData.logoUrl) {
        setLogoPreview(branchData.logoUrl);
      }
    } catch (error) {
      console.error("Error fetching branch data:", error);
      showToast.error("Failed to fetch branch data");
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    const requiredFields = [
      { field: 'branchName', label: 'Branch Name' },
      { field: 'branchNameFL', label: `Branch Name (${FLLanguage})` },
      { field: 'address', label: 'Address' },
      { field: 'addressFL', label: `Address (${FLLanguage})` },
      { field: 'streetName', label: 'Street Name' },
      { field: 'streetNameFL', label: `Street Name (${FLLanguage})` },
      { field: 'buildingNo', label: 'Building Number' },
      { field: 'buildingNoFL', label: `Building Number (${FLLanguage})` },
      { field: 'cityName', label: 'City Name' },
      { field: 'cityNameFL', label: `City Name (${FLLanguage})` },
      { field: 'district', label: 'District' },
      { field: 'districtFL', label: `District (${FLLanguage})` },
      { field: 'country', label: 'Country' },
      { field: 'countryFL', label: `Country (${FLLanguage})` },
      { field: 'postalCode', label: 'Postal Code' },
      { field: 'postalCodeFL', label: `Postal Code (${FLLanguage})` }
    ];

    requiredFields.forEach(({ field, label }) => {
      if (!formData[field] || formData[field].trim() === '') {
        newErrors[field] = `${label} is required`;
      }
    });

    if (formData.branchName && formData.branchName.trim().length > 0 && formData.branchName.trim().length < 5) {
      newErrors.branchName = 'Branch Name must be at least 5 characters long';
    }

    if (formData.email && formData.email.trim() !== '') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        newErrors.email = 'Please enter a valid email address';
      }
    }

    if (formData.web && formData.web.trim() !== '') {
      const urlRegex = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
      if (!urlRegex.test(formData.web)) {
        newErrors.web = 'Please enter a valid URL';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateFieldOnBlur = (fieldName) => {
    const newErrors = { ...errors };

    const requiredFields = [
      'branchName', 'branchNameFL', 'address', 'addressFL', 'streetName',
      'streetNameFL', 'buildingNo', 'buildingNoFL', 'cityName', 'cityNameFL',
      'district', 'districtFL', 'country', 'countryFL', 'postalCode', 'postalCodeFL'
    ];

    if (requiredFields.includes(fieldName)) {
      if (!formData[fieldName] || formData[fieldName].trim() === '') {
        const fieldLabels = {
          branchName: 'Branch Name',
          branchNameFL: `Branch Name (${FLLanguage})`,
          address: 'Address',
          addressFL: `Address (${FLLanguage})`,
          streetName: 'Street Name',
          streetNameFL: `Street Name (${FLLanguage})`,
          buildingNo: 'Building Number',
          buildingNoFL: `Building Number (${FLLanguage})`,
          cityName: 'City Name',
          cityNameFL: `City Name (${FLLanguage})`,
          district: 'District',
          districtFL: `District (${FLLanguage})`,
          country: 'Country',
          countryFL: `Country (${FLLanguage})`,
          postalCode: 'Postal Code',
          postalCodeFL: `Postal Code (${FLLanguage})`
        };
        newErrors[fieldName] = `${fieldLabels[fieldName]} is required`;
      } else {
        delete newErrors[fieldName];
      }
    }

    if (fieldName === 'email' && formData.email && formData.email.trim() !== '') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        newErrors.email = 'Please enter a valid email address';
      } else {
        delete newErrors.email;
      }
    }

    if (fieldName === 'web' && formData.web && formData.web.trim() !== '') {
      const urlRegex = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
      if (!urlRegex.test(formData.web)) {
        newErrors.web = 'Please enter a valid URL';
      } else {
        delete newErrors.web;
      }
    }

    setErrors(newErrors);
  };

  const handleSelectChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      const newErrors = { ...errors };
      delete newErrors[name];
      setErrors(newErrors);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (errors[name]) {
      const newErrors = { ...errors };
      delete newErrors[name];
      setErrors(newErrors);
    }
  };

  const handleInputBlur = (e) => {
    const { name } = e.target;
    validateFieldOnBlur(name);
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const maxSize = 200 * 1024;

      if (file.size > maxSize) {
        showToast.error("File size must be 200KB or less. Please choose a smaller file.");
        e.target.value = "";
        return;
      }

      setFormData((prev) => ({
        ...prev,
        logo: file,
      }));

      const reader = new FileReader();
      reader.onload = (e) => setLogoPreview(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
 if (e?.preventDefault) e.preventDefault();

    if (!validateForm()) {
      showToast.error(t("pleaseFillRequiredFieldMsg"));
      return;
    }

    setSubmitLoading(true);

    if (!formData.companyId) {
      showToast.error("Company ID is missing");
      setSubmitLoading(false);
      return;
    }

    try {
      const data = new FormData();

      Object.keys(formData).forEach((key) => {
        if (key === "logo" && formData.logo instanceof File) {
          data.append("logo", formData.logo);
        } else if (key !== "logo") {
          data.append(key, formData[key] ?? "");
        }
      });

      const apiEndpoint = isEditMode ? `update-branch/${branchId}` : "save-branch";
      const method = "post";

      await axiosInstance[method](apiEndpoint, data, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      showToast.success(isEditMode ? "Branch updated successfully" : "Branch saved successfully");
      navigate('/all-branches');
    } catch (error) {
      console.error(error);
      showToast.error(isEditMode ? "Failed to update branch" : "Failed to save branch");
    } finally {
      setSubmitLoading(false);
    }
  };

  useCtrlSave(handleSubmit, [formData]);

  const [translating, setTranslating] = useState(false);

  const handleTranslate = async () => {
    const inputText = formData.branchName?.trim();

    if (!inputText) return;

    setTranslating(true);

    try {
      const toLang = "ar";
      const fromLang = "auto";
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${fromLang}&tl=${toLang}&dt=t&q=${encodeURIComponent(
        inputText
      )}`;

      const response = await fetch(url);
      const data = await response.json();

      const translatedText = data?.[0]?.[0]?.[0] || "";

      setFormData((prev) => ({
        ...prev,
        branchNameFL: translatedText,
      }));
    } catch (error) {
      console.error("Translation error:", error);
      showToast.error("Translation failed. Please try again.");
    } finally {
      setTranslating(false);
    }
  };

  const handleReset = () => {
    if (isEditMode) {
      fetchBranchData();
    } else {
      setFormData({
        companyId: 1,
        currencyId: "",
        branchName: "",
        branchNameFL: "",
        address: "",
        addressFL: "",
        streetName: "",
        streetNameFL: "",
        buildingNo: "",
        buildingNoFL: "",
        additionalNumber: "",
        additionalNumberFL: "",
        cityName: "",
        cityNameFL: "",
        district: "",
        districtFL: "",
        country: "",
        countryFL: "",
        postalCode: "",
        postalCodeFL: "",
        phoneNo: "",
        fax: "",
        mobile: "",
        email: "",
        web: "",
        taxNo: "",
        panNo: "",
        crNo: "",
        subscriptionNo: "",
        logo: null,
        mainBranch: true,
        startDate: "2025-08-01",
        activeStatus: true,
        createdDate: new Date().toISOString().slice(0, 19).replace("T", " "),
        createdUser: userId,
        modifiedDate: new Date().toISOString().slice(0, 19).replace("T", " "),
        modifiedUser: userId,
      });
      setLogoPreview(null);
    }
    setErrors({});
  };

  if (loading) {
    return (
      <div>
        <BreadCrumb
          routes={[
            { title: t('addBranch.breadcrumb.branch'), url: "#" },
            { title: isEditMode ? t('addBranch.breadcrumb.editBranch') : t('addBranch.breadcrumb.addBranch'), url: "#" },
          ]}
          heading={{
            icon: Building2,
            title: isEditMode ? t('addBranch.editTitle') : t('addBranch.title'),
          }}
          actions={[
            {
              label: isEditMode ? t('updateBtn') : t('submitBtn'),
              icon: SaveAll,
              type: "primary",
              onClick: handleSubmit,
              loading: submitLoading,
              loadingText: isEditMode ? t('addBranch.actions.updating') : t('addBranch.actions.adding')
            },
            {
              label: isEditMode ? t('resetBtn') : t('cancelBtn'),
              type: "secondary",
              icon: RefreshCcw,
              onClick: handleReset
            },
          ]}
        />
        <Preloader />
      </div>
    );
  }

  return (
    <div className="h-auto w-full">
      <BreadCrumb
        routes={[
          { title: t('addBranch.breadcrumb.branch'), url: "#" },
          { title: isEditMode ? t('addBranch.breadcrumb.editBranch') : t('addBranch.breadcrumb.addBranch'), url: "#" },
        ]}
        heading={{
          icon: Building2,
          title: isEditMode ? t('addBranch.editTitle') : t('addBranch.title'),
        }}
        actions={[
          {
            label: isEditMode ? t('updateBtn') : t('submitBtn'),
            icon: SaveAll,
            type: "primary",
            onClick: handleSubmit,
            loading: submitLoading,
            loadingText: isEditMode ? t('addBranch.actions.updating') : t('addBranch.actions.adding')
          },
          {
            label: isEditMode ? t('resetBtn') : t('cancelBtn'),
            type: "secondary",
            icon: RefreshCcw,
            onClick: handleReset
          },
        ]}
      />

      <Card className="w-full mx-auto p-2 border-none shadow-none">
        <CardContent className="px-0 sm:px-2 pb-2">
          <div className="space-y-4">

            {/*  First Row: Branch Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-end w-full gap-2">
                <div className="flex-1">
                  <Label htmlFor="branchName" className="text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">
                    {t('addBranch.fields.branchName')} <span className="text-red-500 dark:text-red-400">*</span>
                  </Label>

                  <div className="flex items-center w-full">
                    <Input
                      id="branchName"
                      name="branchName"
                      value={formData.branchName}
                      onChange={handleInputChange}
                      placeholder={t('addBranch.placeholders.branchName')}
                      className={`text-sm mr-1 ${errors.branchName ? 'border-red-500 dark:border-red-400' : ''}`}
                      onBlur={handleInputBlur}
                      required
                    />

                    <button
                      type="button"
                      onClick={handleTranslate}
                      disabled={translating}
                      className={`h-9 px-3 main-bg text-gray-200 rounded-md hover:main-bg transition-colors flex items-center justify-center ${translating ? "opacity-60 cursor-not-allowed" : ""}`}
                    >
                      <MdGTranslate className="w-4 h-4" />
                    </button>
                  </div>

                  {errors.branchName && (
                    <p className="text-xs text-red-500 dark:text-red-400 mt-1">{errors.branchName}</p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="branchNameFL" className="text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">
                  {t('addBranch.fields.branchNameFL')} <span className="text-red-500 dark:text-red-400">*</span>
                </Label>
                <Input
                  id="branchNameFL"
                  name="branchNameFL"
                  value={formData.branchNameFL}
                  onChange={handleInputChange}
                  placeholder={t('addBranch.placeholders.branchNameFL')}
                  className={`text-sm ${errors.branchNameFL ? 'border-red-500 dark:border-red-400' : ''}`}
                  onBlur={handleInputBlur}
                  required
                />
                {errors.branchNameFL && <p className="text-xs text-red-500 dark:text-red-400 mt-1">{errors.branchNameFL}</p>}
              </div>
            </div>

            {/*  Second Row: Address */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="address" className="text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">
                  {t('addBranch.fields.address')} <span className="text-red-500 dark:text-red-400">*</span>
                </Label>
                <Textarea
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder={t('addBranch.placeholders.address')}
                  className={`w-full resize-none ${errors.address ? 'border-red-500 dark:border-red-400' : ''}`}
                  onBlur={handleInputBlur}
                  rows={2}
                  required
                />
                {errors.address && <p className="text-xs text-red-500 dark:text-red-400 mt-1">{errors.address}</p>}
              </div>
              <div>
                <Label htmlFor="addressFL" className="text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">
                  {t('addBranch.fields.addressFL')} <span className="text-red-500 dark:text-red-400">*</span>
                </Label>
                <Textarea
                  id="addressFL"
                  name="addressFL"
                  value={formData.addressFL}
                  onChange={handleInputChange}
                  placeholder={t('addBranch.placeholders.addressFL')}
                  className={`w-full resize-none ${errors.addressFL ? 'border-red-500 dark:border-red-400' : ''}`}
                  onBlur={handleInputBlur}
                  rows={2}
                  required
                />
                {errors.addressFL && <p className="text-xs text-red-500 dark:text-red-400 mt-1">{errors.addressFL}</p>}
              </div>
            </div>

            <div className="flex gap-4">
              {/* ========== FULL ADDRESS SECTION ========== */}
              <div className="w-1/2 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  className="w-full flex items-center justify-between cursor-pointer pb-3 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 p-2 rounded-t-md transition-colors"
                  onClick={() => setIsFullAddressOpen(!isFullAddressOpen)}
                >
                  <h2 className="font-semibold text-sm text-gray-700 dark:text-gray-200">
                    {t('addBranch.sections.fullAddress')}
                  </h2>
                  {isFullAddressOpen ? (
                    <ChevronUp className="h-7 w-7 text-gray-600 dark:text-gray-400" />
                  ) : (
                    <ChevronDown className="h-7 w-7 text-gray-600 dark:text-gray-400" />
                  )}
                </button>

                {isFullAddressOpen && (
                  <div className="p-4 space-y-4 bg-gray-50 dark:bg-gray-900">
                    {/* Street Name Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="streetName" className="text-xs font-medium capitalize mb-1 text-gray-700 dark:text-gray-300">
                          {t('addBranch.fields.streetName')}<span className="text-red-500 dark:text-red-400">*</span>
                        </Label>
                        <Input
                          id="streetName"
                          name="streetName"
                          value={formData.streetName}
                          onChange={handleInputChange}
                          placeholder={t('addBranch.placeholders.streetName')}
                          className={`text-sm w-full ${errors.streetName ? 'border-red-500 dark:border-red-400' : ''}`}
                          onBlur={handleInputBlur}
                          required
                        />
                        {errors.streetName && <p className="text-xs text-red-500 dark:text-red-400 mt-1">{errors.streetName}</p>}
                      </div>
                      <div>
                        <Label htmlFor="streetNameFL" className="text-xs font-medium capitalize mb-1 text-gray-700 dark:text-gray-300">
                          {t('addBranch.fields.streetNameFL')} <span className="text-red-500 dark:text-red-400">*</span>
                        </Label>
                        <Input
                          id="streetNameFL"
                          name="streetNameFL"
                          value={formData.streetNameFL}
                          onBlur={handleInputBlur}
                          onChange={handleInputChange}
                          placeholder={t('addBranch.placeholders.streetNameFL')}
                          className={`text-sm w-full ${errors.streetNameFL ? 'border-red-500 dark:border-red-400' : ''}`}
                          required
                        />
                        {errors.streetNameFL && <p className="text-xs text-red-500 dark:text-red-400 mt-1">{errors.streetNameFL}</p>}
                      </div>
                    </div>

                    {/* Building Number Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="buildingNo" className="text-xs font-medium capitalize mb-1 text-gray-700 dark:text-gray-300">
                          {t('addBranch.fields.buildingNo')} <span className="text-red-500 dark:text-red-400">*</span>
                        </Label>
                        <Input
                          id="buildingNo"
                          name="buildingNo"
                          value={formData.buildingNo}
                          onChange={handleInputChange}
                          onBlur={handleInputBlur}
                          placeholder={t('addBranch.placeholders.buildingNo')}
                          className={`text-sm w-full ${errors.buildingNo ? 'border-red-500 dark:border-red-400' : ''}`}
                          required
                        />
                        {errors.buildingNo && <p className="text-xs text-red-500 dark:text-red-400 mt-1">{errors.buildingNo}</p>}
                      </div>
                      <div>
                        <Label htmlFor="buildingNoFL" className="text-xs font-medium capitalize mb-1 text-gray-700 dark:text-gray-300">
                          {t('addBranch.fields.buildingNoFL')} <span className="text-red-500 dark:text-red-400">*</span>
                        </Label>
                        <Input
                          id="buildingNoFL"
                          name="buildingNoFL"
                          value={formData.buildingNoFL}
                          onChange={handleInputChange}
                          onBlur={handleInputBlur}
                          placeholder={t('addBranch.placeholders.buildingNoFL')}
                          className={`text-sm w-full ${errors.buildingNoFL ? 'border-red-500 dark:border-red-400' : ''}`}
                          required
                        />
                        {errors.buildingNoFL && <p className="text-xs text-red-500 dark:text-red-400 mt-1">{errors.buildingNoFL}</p>}
                      </div>
                    </div>

                    {/* Additional Number Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="additionalNumber" className="text-xs font-medium capitalize mb-1 text-gray-700 dark:text-gray-300">
                          {t('addBranch.fields.additionalNumber')}
                        </Label>
                        <Input
                          id="additionalNumber"
                          name="additionalNumber"
                          value={formData.additionalNumber}
                          onChange={handleInputChange}
                          onBlur={handleInputBlur}
                          placeholder={t('addBranch.placeholders.additionalNumber')}
                          className="text-sm w-full"
                        />
                      </div>
                      <div>
                        <Label htmlFor="additionalNumberFL" className="text-xs font-medium capitalize mb-1 text-gray-700 dark:text-gray-300">
                          {t('addBranch.fields.additionalNumberFL')}
                        </Label>
                        <Input
                          id="additionalNumberFL"
                          name="additionalNumberFL"
                          value={formData.additionalNumberFL}
                          onChange={handleInputChange}
                          onBlur={handleInputBlur}
                          placeholder={t('addBranch.placeholders.additionalNumberFL')}
                          className="text-sm w-full"
                        />
                      </div>
                    </div>

                    {/* City Name Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="cityName" className="text-xs font-medium capitalize mb-1 text-gray-700 dark:text-gray-300">
                          {t('addBranch.fields.cityName')} <span className="text-red-500 dark:text-red-400">*</span>
                        </Label>
                        <Input
                          id="cityName"
                          name="cityName"
                          value={formData.cityName}
                          onChange={handleInputChange}
                          onBlur={handleInputBlur}
                          placeholder={t('addBranch.placeholders.cityName')}
                          className={`text-sm w-full ${errors.cityName ? 'border-red-500 dark:border-red-400' : ''}`}
                          required
                        />
                        {errors.cityName && <p className="text-xs text-red-500 dark:text-red-400 mt-1">{errors.cityName}</p>}
                      </div>
                      <div>
                        <Label htmlFor="cityNameFL" className="text-xs font-medium capitalize mb-1 text-gray-700 dark:text-gray-300">
                          {t('addBranch.fields.cityNameFL')} <span className="text-red-500 dark:text-red-400">*</span>
                        </Label>
                        <Input
                          id="cityNameFL"
                          name="cityNameFL"
                          value={formData.cityNameFL}
                          onChange={handleInputChange}
                          onBlur={handleInputBlur}
                          placeholder={t('addBranch.placeholders.cityNameFL')}
                          className={`text-sm w-full ${errors.cityNameFL ? 'border-red-500 dark:border-red-400' : ''}`}
                          required
                        />
                        {errors.cityNameFL && <p className="text-xs text-red-500 dark:text-red-400 mt-1">{errors.cityNameFL}</p>}
                      </div>
                    </div>

                    {/* District Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="district" className="text-xs font-medium capitalize mb-1 text-gray-700 dark:text-gray-300">
                          {t('addBranch.fields.district')} <span className="text-red-500 dark:text-red-400">*</span>
                        </Label>
                        <Input
                          id="district"
                          name="district"
                          value={formData.district}
                          onChange={handleInputChange}
                          onBlur={handleInputBlur}
                          placeholder={t('addBranch.placeholders.district')}
                          className={`text-sm w-full ${errors.district ? 'border-red-500 dark:border-red-400' : ''}`}
                          required
                        />
                        {errors.district && <p className="text-xs text-red-500 dark:text-red-400 mt-1">{errors.district}</p>}
                      </div>
                      <div>
                        <Label htmlFor="districtFL" className="text-xs font-medium capitalize mb-1 text-gray-700 dark:text-gray-300">
                          {t('addBranch.fields.districtFL')} <span className="text-red-500 dark:text-red-400">*</span>
                        </Label>
                        <Input
                          id="districtFL"
                          name="districtFL"
                          value={formData.districtFL}
                          onChange={handleInputChange}
                          onBlur={handleInputBlur}
                          placeholder={t('addBranch.placeholders.districtFL')}
                          className={`text-sm w-full ${errors.districtFL ? 'border-red-500 dark:border-red-400' : ''}`}
                          required
                        />
                        {errors.districtFL && <p className="text-xs text-red-500 dark:text-red-400 mt-1">{errors.districtFL}</p>}
                      </div>
                    </div>

                    {/* Country Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="country" className="text-xs font-medium capitalize mb-1 text-gray-700 dark:text-gray-300">
                          {t('addBranch.fields.country')} <span className="text-red-500 dark:text-red-400">*</span>
                        </Label>
                        <Input
                          id="country"
                          name="country"
                          value={formData.country}
                          onChange={handleInputChange}
                          onBlur={handleInputBlur}
                          placeholder={t('addBranch.placeholders.country')}
                          className={`text-sm w-full ${errors.country ? 'border-red-500 dark:border-red-400' : ''}`}
                          required
                        />
                        {errors.country && <p className="text-xs text-red-500 dark:text-red-400 mt-1">{errors.country}</p>}
                      </div>
                      <div>
                        <Label htmlFor="countryFL" className="text-xs font-medium capitalize mb-1 text-gray-700 dark:text-gray-300">
                          {t('addBranch.fields.countryFL')} <span className="text-red-500 dark:text-red-400">*</span>
                        </Label>
                        <Input
                          id="countryFL"
                          name="countryFL"
                          value={formData.countryFL}
                          onBlur={handleInputBlur}
                          onChange={handleInputChange}
                          placeholder={t('addBranch.placeholders.countryFL')}
                          className={`text-sm w-full ${errors.countryFL ? 'border-red-500 dark:border-red-400' : ''}`}
                          required
                        />
                        {errors.countryFL && <p className="text-xs text-red-500 dark:text-red-400 mt-1">{errors.countryFL}</p>}
                      </div>
                    </div>

                    {/* Postal Code Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="postalCode" className="text-xs font-medium capitalize mb-1 text-gray-700 dark:text-gray-300">
                          {t('addBranch.fields.postalCode')} <span className="text-red-500 dark:text-red-400">*</span>
                        </Label>
                        <Input
                          id="postalCode"
                          name="postalCode"
                          value={formData.postalCode}
                          onChange={handleInputChange}
                          onBlur={handleInputBlur}
                          placeholder={t('addBranch.placeholders.postalCode')}
                          className={`text-sm w-full ${errors.postalCode ? 'border-red-500 dark:border-red-400' : ''}`}
                          required
                        />
                        {errors.postalCode && <p className="text-xs text-red-500 dark:text-red-400 mt-1">{errors.postalCode}</p>}
                      </div>
                      <div>
                        <Label htmlFor="postalCodeFL" className="text-xs font-medium capitalize mb-1 text-gray-700 dark:text-gray-300">
                          {t('addBranch.fields.postalCodeFL')} <span className="text-red-500 dark:text-red-400">*</span>
                        </Label>
                        <Input
                          id="postalCodeFL"
                          name="postalCodeFL"
                          value={formData.postalCodeFL}
                          onChange={handleInputChange}
                          onBlur={handleInputBlur}
                          placeholder={t('addBranch.placeholders.postalCodeFL')}
                          className={`text-sm w-full ${errors.postalCodeFL ? 'border-red-500 dark:border-red-400' : ''}`}
                          required
                        />
                        {errors.postalCodeFL && <p className="text-xs text-red-500 dark:text-red-400 mt-1">{errors.postalCodeFL}</p>}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* ========== BRANCH DETAILS SECTION ========== */}
              <div className="w-1/2 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  className="w-full flex items-center justify-between cursor-pointer pb-3 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 p-2 rounded-t-md transition-colors"
                  onClick={() => setIsBranchDetailsOpen(!isBranchDetailsOpen)}
                >
                  <h2 className="font-semibold text-sm text-gray-700 dark:text-gray-200">
                    {t('addBranch.sections.branchDetails')}
                  </h2>
                  {isBranchDetailsOpen ? (
                    <ChevronUp className="h-7 w-7 text-gray-600 dark:text-gray-400" />
                  ) : (
                    <ChevronDown className="h-7 w-7 text-gray-600 dark:text-gray-400" />
                  )}
                </button>

                {isBranchDetailsOpen && (
                  <div className="p-4 space-y-4 bg-gray-50 dark:bg-gray-900">
                    {/* Phone & Mobile Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="phoneNo" className="text-xs font-medium capitalize mb-1 text-gray-700 dark:text-gray-300">
                          {t('addBranch.fields.phoneNo')}
                        </Label>
                        <Input
                          id="phoneNo"
                          name="phoneNo"
                          value={formData.phoneNo}
                          onChange={handleInputChange}
                          onBlur={handleInputBlur}
                          placeholder={t('addBranch.placeholders.phoneNo')}
                          className="text-sm w-full"
                        />
                      </div>
                      <div>
                        <Label htmlFor="mobile" className="text-xs font-medium capitalize mb-1 text-gray-700 dark:text-gray-300">
                          {t('addBranch.fields.mobile')}
                        </Label>
                        <Input
                          id="mobile"
                          name="mobile"
                          value={formData.mobile}
                          onChange={handleInputChange}
                          onBlur={handleInputBlur}
                          placeholder={t('addBranch.placeholders.mobile')}
                          className="text-sm w-full"
                        />
                      </div>
                    </div>

                    {/* Email & Web Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="email" className="text-xs font-medium capitalize mb-1 text-gray-700 dark:text-gray-300">
                          {t('addBranch.fields.email')}
                        </Label>
                        <Input
                          id="email"
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          onBlur={handleInputBlur}
                          placeholder={t('addBranch.placeholders.email')}
                          className={`text-sm w-full ${errors.email ? 'border-red-500 dark:border-red-400' : ''}`}
                          type="email"
                        />
                        {errors.email && <p className="text-xs text-red-500 dark:text-red-400 mt-1">{errors.email}</p>}
                      </div>
                      <div>
                        <Label htmlFor="web" className="text-xs font-medium capitalize mb-1 text-gray-700 dark:text-gray-300">
                          {t('addBranch.fields.web')}
                        </Label>
                        <Input
                          id="web"
                          name="web"
                          value={formData.web}
                          onChange={handleInputChange}
                          onBlur={handleInputBlur}
                          placeholder={t('addBranch.placeholders.web')}
                          className={`text-sm w-full ${errors.web ? 'border-red-500 dark:border-red-400' : ''}`}
                          type="url"
                        />
                        {errors.web && <p className="text-xs text-red-500 dark:text-red-400 mt-1">{errors.web}</p>}
                      </div>
                    </div>

                    {/* Fax & Tax Number Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="fax" className="text-xs font-medium capitalize mb-1 text-gray-700 dark:text-gray-300">
                          {t('addBranch.fields.fax')}
                        </Label>
                        <Input
                          id="fax"
                          name="fax"
                          value={formData.fax}
                          onChange={handleInputChange}
                          onBlur={handleInputBlur}
                          placeholder={t('addBranch.placeholders.fax')}
                          className="text-sm w-full"
                        />
                      </div>
                      <div>
                        <Label htmlFor="taxNo" className="text-xs font-medium capitalize mb-1 text-gray-700 dark:text-gray-300">
                          {t('addBranch.fields.taxNo')}
                        </Label>
                        <Input
                          id="taxNo"
                          name="taxNo"
                          value={formData.taxNo}
                          onChange={handleInputChange}
                          onBlur={handleInputBlur}
                          placeholder={t('addBranch.placeholders.taxNo')}
                          className="text-sm w-full"
                        />
                      </div>
                    </div>

                    {/* PAN & CR Number Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="panNo" className="text-xs font-medium capitalize mb-1 text-gray-700 dark:text-gray-300">
                          {t('addBranch.fields.panNo')}
                        </Label>
                        <Input
                          id="panNo"
                          name="panNo"
                          value={formData.panNo}
                          onChange={handleInputChange}
                          onBlur={handleInputBlur}
                          placeholder={t('addBranch.placeholders.panNo')}
                          className="text-sm w-full"
                        />
                      </div>
                      <div>
                        <Label htmlFor="crNo" className="text-xs font-medium capitalize mb-1 text-gray-700 dark:text-gray-300">
                          {t('addBranch.fields.crNo')}
                        </Label>
                        <Input
                          id="crNo"
                          name="crNo"
                          value={formData.crNo}
                          onChange={handleInputChange}
                          onBlur={handleInputBlur}
                          placeholder={t('addBranch.placeholders.crNo')}
                          className="text-sm w-full"
                        />
                      </div>
                    </div>

                    {/* Subscription & Currency Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="subscriptionNo" className="text-xs font-medium capitalize mb-1 text-gray-700 dark:text-gray-300">
                          {t('addBranch.fields.subscriptionNo')}
                        </Label>
                        <Input
                          id="subscriptionNo"
                          name="subscriptionNo"
                          value={formData.subscriptionNo}
                          onChange={handleInputChange}
                          onBlur={handleInputBlur}
                          placeholder={t('addBranch.placeholders.subscriptionNo')}
                          className="text-sm w-full"
                        />
                      </div>
                     <div>
  <Label htmlFor="currencyId" className="text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">
    {t('addBranch.fields.currency')}
  </Label>
  <SearchableDropdown
    id="currencyId"
    placeholder={t('addBranch.fields.currency')}
    searchPlaceholder="Search currency..."
    options={currency.map((data) => ({
      value: data.currencyId,
      label: data.label,
    }))}
    value={formData.currencyId}
    onChange={(value) => handleSelectChange("currencyId", value)}
    clearable
  />
</div>
                    </div>

                    {/* Active Status Row (only in edit mode) */}
                    {isEditMode && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="activeStatus" className="text-xs font-medium text-gray-700 dark:text-gray-300">{t('addBranch.fields.activeStatus')}</Label>
                          <Select
                            value={formData.activeStatus ? "true" : "false"}
                            onValueChange={(value) => handleSelectChange("activeStatus", value === "true")}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select Status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="true">{t('addBranch.status.active')}</SelectItem>
                              <SelectItem value="false">{t('addBranch.status.inactive')}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div></div>
                      </div>
                    )}

                    {/* Logo Upload Section */}
                    <div className="space-y-3 border-t border-gray-200 dark:border-gray-700 pt-4">
                      <Label htmlFor="logo" className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center space-x-2">
                        <FileText className="h-4 w-4" />
                        <span>Branch Logo</span>
                      </Label>

                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                        {isEditMode && logoPreview && formData.logo ? (
                          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full">
                            <div className="w-20 h-20 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-800">
                              <img src={logoPreview} alt="Logo preview" className="w-full h-full object-cover" />
                            </div>
                            <button
                              type="button"
                              onClick={() => setFormData(prev => ({ ...prev, logo: '' }))}
                              className="px-4 py-2 text-sm main-bg text-white rounded-md hover:bg-blue-700 dark:hover:main-bg transition-colors"
                            >
                              Change Branch Logo
                            </button>
                          </div>
                        ) : (
                          <>
                            {logoPreview && formData.logo ? (
                              <div className="w-20 h-20 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-800">
                                <img src={logoPreview} alt="Logo preview" className="w-full h-full object-cover" />
                              </div>
                            ) : (
                              <div className="w-20 h-20 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex items-center justify-center bg-gray-50 dark:bg-gray-800">
                                <Upload className="h-6 w-6 text-gray-400 dark:text-gray-500" />
                              </div>
                            )}
                            <div className="flex-1 w-full sm:w-auto">
                              <Input
                                id="logo"
                                name="logo"
                                type="file"
                                accept="image/*"
                                onChange={handleLogoChange}
                                className="text-sm"
                              />
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Upload PNG, JPG, SVG (Max 200KB)</p>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AddBranch;