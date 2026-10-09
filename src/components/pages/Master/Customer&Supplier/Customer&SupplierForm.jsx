import { useEffect, useState, useCallback, useRef, forwardRef } from "react";
import { useTranslation } from "react-i18next";
import useAuth from "@/redux/hook/auth/useAuth";
import axiosInstance from "@/lib/axiosConfig";
import Preloader from "@/components/common/Preloader";
import useFormValidation from "@/lib/hooks/useFormValidation";
import { MdGTranslate } from "react-icons/md";
import { useSelector } from "react-redux";
import { sanitize } from "@/lib/inputSanitizer";
// AllCountries
import {
  ChevronDown,
  Paperclip,
  Trash2,
  Plus,
  FileText,
  Upload,
  Eye,
  RefreshCw,
  MapPin,
} from "lucide-react";
import LocationPicker from "@/components/LocationPicker/LocationPicker";
import { AllCountries } from "../../../../../public/assets/js/voucherTypes";

const InputRow = ({ label, required, children, error }) => (
  <div className="grid grid-cols-[140px_1fr] items-center gap-3">
    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <div>
      {children}
      {error && (
        <p className="text-xs text-red-500 dark:text-red-400 mt-0.5">
          {error}
        </p>
      )}
    </div>
  </div>
);

const UnderlineInput = forwardRef(({
  name,
  value,
  onChange,
  onBlur,
  onKeyDown,
  placeholder,
  type = "text",
  required,
  disabled,
}, ref) => (
  <input
    ref={ref}
    type={type}
    name={name}
    value={value || ""}
    onChange={onChange}
    onBlur={onBlur}
    onKeyDown={onKeyDown}
    placeholder={placeholder}
    required={required}
    disabled={disabled}
    className="w-full px-0 py-1.5 bg-transparent border-0 border-b border-gray-300 dark:border-gray-600 
             text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500
             focus:outline-none focus:border-gray-900 dark:focus:border-gray-300 text-sm transition-colors
             disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
  />
));
UnderlineInput.displayName = "UnderlineInput";

const getFileViewUrl = (filePath) => {
  if (!filePath) return "";
  if (filePath.startsWith("http")) return filePath;
  const baseUrl = axiosInstance.defaults.baseURL || "";
  const storageBase = baseUrl.replace(/\/api\/?$/, "");
  return `${storageBase}/storage/${filePath}`;
};

const CustomerAndSupplierForm = ({
  type = "customer",
  onSubmit,
  currency,
  accountGroups,
  pricingLevel,
  customerId = null,
}) => {
  const { t } = useTranslation();
  const { errors, validateForm, handleBlur, setErrors } = useFormValidation();
  const {
    selectedBranchId,
    userId,
    currentFinancialYear,
    currentCurrencyConversion,
    branches,
    currentCurrency,
  } = useAuth();

  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");
  const countryDropdownRef = useRef(null);
  const isEditMode = Boolean(customerId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [shippingAddresses, setShippingAddresses] = useState([]);
  const [addModeShippingAddresses, setAddModeShippingAddresses] = useState([]);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const { financeSettings, generalSettings } = useSelector((state) => state.settings);


  const [selectedBranches, setSelectedBranches] = useState([]);
  const [branchDetails, setBranchDetails] = useState({});
  const [activeTab, setActiveTab] = useState("address");
  const [translating, setTranslating] = useState(false);

  const isMountedRef = useRef(true);
  const abortControllerRef = useRef(null);
  const translateAbortRef = useRef(null);
  const vatFileInputRef = useRef(null);
  const crFileInputRef = useRef(null);
  const nameFlInputRef = useRef(null);

  const ledgerTypeDropdownRef = useRef(null);
  const groupDropdownRef = useRef(null);
  const creditStatusDropdownRef = useRef(null);
  const billByBillDropdownRef = useRef(null);
  const pricingLevelDropdownRef = useRef(null);
  const currencyDropdownRef = useRef(null);
  const crDrDropdownRef = useRef(null);

  const [showLedgerTypeDropdown, setShowLedgerTypeDropdown] = useState(false);
  const [showGroupDropdown, setShowGroupDropdown] = useState(false);
  const [showCreditStatusDropdown, setShowCreditStatusDropdown] =
    useState(false);
  const [showBillByBillDropdown, setShowBillByBillDropdown] = useState(false);
  const [showPricingLevelDropdown, setShowPricingLevelDropdown] =
    useState(false);
  const [showCurrencyDropdown, setShowCurrencyDropdown] = useState(false);
  const [showCrDrDropdown, setShowCrDrDropdown] = useState(false);

  const [formData, setFormData] = useState({
    ledgerCode: "",
    customerName: "",
    nameFL: "",
    ledgerType: type === "customer" ? "Customer" : "Supplier",
    groupId: type === "customer" ? "44" : "43",
    additionalNo: "",
    postboxNo: "",
    cityName: "",
    country: "",
    creditLimitStatus: "Ignore",
    billBybill: financeSettings?.MaintainBillbyBill ? true : false,
    accountNo: "",
    address: "",
    phoneNo: "",
    faxNo: "",
    email: "",
    creditPeriod: "",
    creditLimit: "",
    pricingLevelId: "",
    currencyId: currentCurrency?.currencyId?.toString() || "",
    vatNumber: "",
    crNumber: "",
    areaId: "",
    streetNameArb: "",
    buildingNoArb: "",
    BuildingNo: "",
    StreetName: "",
    District: "",
    cityNameArb: "",
    districtArb: "",
    countryArb: "",
    additionalNoArb: "",
    postboxNoArb: "",
    addressArabic: "",
    routeId: "",
    // Location fields
    latitude: "",
    longitude: "",
    state: "",
    postalCode: "",
    ShippingAddress: {
      address1: "",
      address2: "",
      address3: "",
      address4: "",
      Isdefault: false,
    },
    exchangeDate: currentCurrencyConversion?.date,
    exchangeRate: currentCurrencyConversion?.rate,
    currencyConversionId: currentCurrencyConversion?.currencyConversionId,
    activeFinancialYear_fromDate: currentFinancialYear?.fromDate,
  });

  const [documents, setDocuments] = useState([]);
  const [vatDocument, setVatDocument] = useState(null);
  const [crDocument, setCrDocument] = useState(null);
  const [existingDocuments, setExistingDocuments] = useState([]);
  const [replacementFiles, setReplacementFiles] = useState({});
  const [deletedDocumentIds, setDeletedDocumentIds] = useState([]);
  const replaceFileInputRefs = useRef({});

  useEffect(() => {
    const handleClickOutside = (event) => {
      // In your existing handleClickOutside useEffect, add:
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(event.target))
        setShowCountryDropdown(false);
      if (
        ledgerTypeDropdownRef.current &&
        !ledgerTypeDropdownRef.current.contains(event.target)
      )
        setShowLedgerTypeDropdown(false);
      if (
        groupDropdownRef.current &&
        !groupDropdownRef.current.contains(event.target)
      )
        setShowGroupDropdown(false);
      if (
        creditStatusDropdownRef.current &&
        !creditStatusDropdownRef.current.contains(event.target)
      )
        setShowCreditStatusDropdown(false);
      if (
        billByBillDropdownRef.current &&
        !billByBillDropdownRef.current.contains(event.target)
      )
        setShowBillByBillDropdown(false);
      if (
        pricingLevelDropdownRef.current &&
        !pricingLevelDropdownRef.current.contains(event.target)
      )
        setShowPricingLevelDropdown(false);
      if (
        currencyDropdownRef.current &&
        !currencyDropdownRef.current.contains(event.target)
      )
        setShowCurrencyDropdown(false);
      if (
        crDrDropdownRef.current &&
        !crDrDropdownRef.current.contains(event.target)
      )
        setShowCrDrDropdown(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) abortControllerRef.current.abort();
      if (translateAbortRef.current) translateAbortRef.current.abort();
    };
  }, []);

  useEffect(() => {
    if (!currentCurrency?.currencySymbol) return;
    setFormData((prev) => ({
      ...prev,
      country:
        currentCurrency.currencySymbol === "SAR"
          ? "Saudi Arabia"
          : prev.country,
      countryArb:
        currentCurrency.currencySymbol === "SAR"
          ? "المملكة العربية السعودية"
          : prev.countryArb,
    }));
  }, [currentCurrency?.currencySymbol]);

  const generateLedgerCode = useCallback(async () => {
    if (!selectedBranchId || isEditMode) return;
    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();
    try {
      const groupId = type === "customer" ? "44" : "43";
      const res = await axiosInstance.post(
        "generate-ledger-code",
        { branchId: selectedBranchId, groupId },
        { signal: abortControllerRef.current.signal }
      );
      if (isMountedRef.current && res.data?.data)
        setFormData((prev) => ({ ...prev, ledgerCode: res.data.data }));
    } catch (error) {
      if (error.name !== "AbortError" && error.name !== "CanceledError")
        console.error("Error generating ledger code", error);
    }
  }, [selectedBranchId, type, isEditMode]);

  useEffect(() => {
    if (formData.groupId && !isEditMode) generateLedgerCode();
  }, [formData.groupId, generateLedgerCode, isEditMode]);

  useEffect(() => {
    if (isEditMode || !branches?.length) return;

    // Auto-select ALL user-accessible branches
    const allBranchIds = branches.map((b) => String(b.branchId));
    setSelectedBranches(allBranchIds);

    const details = {};
    allBranchIds.forEach((id) => {
      details[id] = {
        openingBalance: "",
        crOrDr: type === "customer" ? "2" : "1",
      };
    });
    setBranchDetails(details);
  }, [isEditMode, branches, type]);

  const fetchCustomerData = useCallback(async () => {
    if (!customerId) return;
    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();

    try {
      setLoading(true);
      setError(null);

      const response = await axiosInstance.get(
        `get-account-ledger-byId/${customerId}`,
        { signal: abortControllerRef.current.signal }
      );
      if (!isMountedRef.current) return;


      if (response.data?.data) {
        const data = response.data.data;

        if (data.branchId && Array.isArray(data.branchId)) {
          const branchIds = data.branchId.map((bd) => String(bd.branchId));
          setSelectedBranches(branchIds);
          const details = {};
          data.branchId.forEach((bd) => {
            details[String(bd.branchId)] = {
              openingBalance: bd.openingBalance?.toString() || "",
              crOrDr: bd.crOrDr === "Cr" ? "1" : "2",
            };
          });
          setBranchDetails(details);
        } else if (data.branchId) {
          const branchArray = Array.isArray(data.branchId)
            ? data.branchId
            : [data.branchId];
          const branchIds = branchArray.map((id) => String(id));
          setSelectedBranches(branchIds);
          const details = {};
          branchIds.forEach((id) => {
            details[id] = {
              openingBalance: data.openingBalance?.toString() || "",
              crOrDr: data.crOrDr === "Cr" ? "1" : "2",
            };
          });
          setBranchDetails(details);
        }

        const addresses = data.shipping_address || [];
        const defaultAddress =
          addresses.find((addr) => addr.Isdefault === true) || {};
        setShippingAddresses(addresses);



        const rawDocs =
          data.ledger_documents || data.document || data.documents || [];

        if (Array.isArray(rawDocs) && rawDocs.length > 0) {


          const normalizedDocs = rawDocs.map((doc, i) => {
            const filePath = doc.file || doc.filePath || doc.file_path || "";
            const fileName = filePath
              ? filePath.split("/").pop()
              : doc.fileName || doc.file_name || "";
            const normalized = {
              documentId:
                doc.id ||
                doc.documentId ||
                doc.document_id ||
                `existing-${i}`,
              document_name:
                doc.document_name || doc.documentName || doc.name || "",
              fileName,
              filePath,
              branchId: doc.branchId || doc.branch_id || null,
            };

            return normalized;
          });

          setExistingDocuments(normalizedDocs);
        } else {
          console.error("No documents found in API response");
          setExistingDocuments([]);
        }


        setReplacementFiles({});
        setDeletedDocumentIds([]);

        setFormData({
          ledgerCode: data.ledgerCode || "",
          customerName: data.ledgerName || "",
          routeId: data.routeId?.toString() || "",
          nameFL: data.nameArb || "",
          ledgerType: type === "customer" ? "Customer" : "Supplier",
          groupId: data.groupId?.toString() || "",
          BuildingNo: data.BuildingNo || "",
          additionalNo: data.AdditionalNo || "",
          StreetName: data.StreetName || "",
          postboxNo: data.PostboxNo || "",
          cityName: data.CityName || "",
          country: data.Country || "",
          creditLimitStatus: data.creditLimitStatus || "Ignore",
          billBybill: data.billBybill || false,
          accountNo: data.accountNo || "",
          address: data.address || "",
          phoneNo: data.phoneNo || "",
          faxNo: data.faxNo || "",
          email: data.email || "",
          creditPeriod: data.creditPeriod?.toString() || "",
          creditLimit: data.creditLimit?.toString() || "",
          pricingLevelId: data.pricingLevelId?.toString() || "",
          currencyId: data.currencyId?.toString() || currentCurrency?.currencyId?.toString() || "",
          vatNumber: data.tinNumber || "",
          crNumber: data.cstNumber || "",
          areaId: data.areaId || "",
          District: data.District || "",
          streetNameArb: data.StreetNameArb || "",
          buildingNoArb: data.BuildingNoArb || "",
          cityNameArb: data.CityNameArb || "",
          districtArb: data.DistrictArb || "",
          countryArb: data.CountryArb || "",
          additionalNoArb: data.AdditionalNoArb || "",
          postboxNoArb: data.PostboxNoArb || "",
          addressArabic: data.AddressArabic || "",
          // Location fields from API
          latitude: data.latitude?.toString() || "",
          longitude: data.longitude?.toString() || "",
          state: data.state || "",
          postalCode: data.postal_code || data.postalCode || "",
          exchangeDate: currentCurrencyConversion?.date,
          exchangeRate: currentCurrencyConversion?.rate,
          currencyConversionId:
            currentCurrencyConversion?.currencyConversionId,
          activeFinancialYear_fromDate: currentFinancialYear?.fromDate,
          ShippingAddress: {
            address1: defaultAddress.address1 || "",
            address2: defaultAddress.address2 || "",
            address3: defaultAddress.address3 || "",
            address4: defaultAddress.address4 || "",
            Isdefault: defaultAddress.Isdefault ?? false,
          },
        });

      } else {
        setError("Failed to fetch customer data");
      }
      console.groupEnd();
    } catch (error) {
      if (error.name === "AbortError" || error.name === "CanceledError")
        return;
      if (isMountedRef.current) {
        console.error("❌ [FETCH] Error:", error);
        setError(
          error.response?.data?.message || "Error fetching customer data"
        );
      }
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, [customerId, type, currentCurrencyConversion, currentFinancialYear]);

  useEffect(() => {
    if (isEditMode && customerId) fetchCustomerData();
  }, [isEditMode, customerId, fetchCustomerData]);

  const handleTranslate = useCallback(async () => {
    const inputText = formData.customerName?.trim();
    if (!inputText) return;
    if (translateAbortRef.current) translateAbortRef.current.abort();
    translateAbortRef.current = new AbortController();
    setTranslating(true);
    try {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=ar&dt=t&q=${encodeURIComponent(inputText)}`;
      const response = await fetch(url, {
        signal: translateAbortRef.current.signal,
      });
      const data = await response.json();
      if (isMountedRef.current) {
        setFormData((prev) => ({
          ...prev,
          nameFL: data?.[0]?.[0]?.[0] || "",
        }));
        // Focus on nameFL input after translation
        setTimeout(() => {
          if (nameFlInputRef.current) {
            nameFlInputRef.current.focus();
          }
        }, 100);
      }
    } catch (error) {
      if (error.name !== "AbortError")
        console.error("Translation error:", error);
    } finally {
      if (isMountedRef.current) setTranslating(false);
    }
  }, [formData.customerName]);

  // Generic address field translation on Enter key
  const handleAddressTranslate = useCallback(async (englishField, arabicField) => {
    const inputText = formData[englishField]?.trim();
    if (!inputText) return;
    if (translateAbortRef.current) translateAbortRef.current.abort();
    translateAbortRef.current = new AbortController();
    try {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=ar&dt=t&q=${encodeURIComponent(inputText)}`;
      const response = await fetch(url, {
        signal: translateAbortRef.current.signal,
      });
      const data = await response.json();
      if (isMountedRef.current) {
        const translatedText = data?.[0]?.[0]?.[0] || "";
        setFormData((prev) => ({
          ...prev,
          [arabicField]: translatedText,
        }));
      }
    } catch (error) {
      if (error.name !== "AbortError")
        console.error("Translation error:", error);
    }
  }, [formData]);

  // Document handlers
  const handleVatDocumentChange = useCallback((e) => {
    const file = e.target.files?.[0];
    if (file) {
      setVatDocument({
        file,
        fileName: file.name,
        document_name: "VAT Document",
      });
    }
  }, []);

  const handleCrDocumentChange = useCallback((e) => {
    const file = e.target.files?.[0];
    if (file) {
      setCrDocument({
        file,
        fileName: file.name,
        document_name: "CR Document",
      });
    }
  }, []);

  const handleRemoveVatDocument = useCallback(() => {
    setVatDocument(null);
    if (vatFileInputRef.current) vatFileInputRef.current.value = "";
  }, []);

  const handleRemoveCrDocument = useCallback(() => {
    setCrDocument(null);
    if (crFileInputRef.current) crFileInputRef.current.value = "";
  }, []);

  const handleAddDocument = useCallback(() => {
    setDocuments((prev) => [...prev, { document_name: "", file: null }]);
  }, []);

  const handleDocumentNameChange = useCallback((index, value) => {
    setDocuments((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], document_name: value };
      return updated;
    });
  }, []);

  const handleDocumentFileChange = useCallback((index, e) => {
    const file = e.target.files?.[0];
    if (file) {
      setDocuments((prev) => {
        const updated = [...prev];
        updated[index] = { ...updated[index], file, fileName: file.name };
        return updated;
      });
    }
  }, []);

  const handleRemoveDocument = useCallback((index) => {
    setDocuments((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleDeleteExistingDocument = useCallback(
    (documentId) => {
      setDeletedDocumentIds((prev) => [...prev, documentId]);
      setReplacementFiles((prev) => {
        const updated = { ...prev };
        delete updated[documentId];
        return updated;
      });
    },
    []
  );

  const handleUndoDeleteExistingDocument = useCallback((documentId) => {
    setDeletedDocumentIds((prev) => prev.filter((id) => id !== documentId));
  }, []);

  const handleReplaceExistingDocument = useCallback(
    (documentId, e) => {
      const file = e.target.files?.[0];
      if (file) {
        setReplacementFiles((prev) => ({
          ...prev,
          [documentId]: { file, fileName: file.name },
        }));
      }
    },
    []
  );

  const handleRemoveReplacement = useCallback((documentId) => {
    setReplacementFiles((prev) => {
      const updated = { ...prev };
      delete updated[documentId];
      return updated;
    });
    if (replaceFileInputRefs.current[documentId]) {
      replaceFileInputRefs.current[documentId].value = "";
    }
  }, []);

  const handleViewDocument = useCallback((filePath) => {
    const url = getFileViewUrl(filePath);
    if (url) window.open(url, "_blank");
  }, []);

  const handleChange = (e) => {
    const { name, value, type: inputType, checked } = e.target;

    let updatedValue = value;
    if (name === "customerName") {
      updatedValue = sanitize.alphaNumericSpace(value)
    } else if (
      [
        "vatNumber",
        "crNumber",
        "BuildingNo",
        "additionalNo",
        "postboxNo",
        "postboxNoArb",
        "additionalNoArb",
        "buildingNoArb"
      ].includes(name)
    ) {
      updatedValue = sanitize.numbers(value).slice(0, 20)
    } else if (
      [
        "StreetName",
        "cityName",
        "streetNameArb",
        "cityNameArb",
      ].includes(name)
    ) {
      updatedValue = sanitize.alphaNumericSpace(value)
    } else if (["districtArb", "District"].includes(name)) {
      updatedValue = sanitize.lettersSpace(value)
    } else if (["faxNo", "phoneNo"].includes(name)) {
      updatedValue = sanitize.numbers(value).slice(0, 15)
    }
    // setFormData((prev) => {
    //   if (name in prev.ShippingAddress) {
    //     return {
    //       ...prev,
    //       ShippingAddress: {
    //         ...prev.ShippingAddress,
    //         [name]: inputType === "checkbox" ? checked : value,
    //       },
    //     };
    //   }
    //   if (name === "customerName" && value.length > 0) {
    //     return {
    //       ...prev,
    //       [name]: value.charAt(0).toUpperCase() + value.slice(1),
    //     };
    //   }
    //   return { ...prev, [name]: value };
    // });

    setFormData((prev) => ({
      ...prev,
      [name]: updatedValue,
    }));

    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const handleSelectChange = (name, value) =>
    setFormData((prev) => ({ ...prev, [name]: value }));

  // Location select handler
  const handleLocationSelect = useCallback((locationData) => {
    if (!locationData) return;
    setFormData((prev) => ({
      ...prev,
      latitude: locationData.lat?.toFixed(8) || "",
      longitude: locationData.lng?.toFixed(8) || "",
      state: locationData.address?.state || prev.state,
      postalCode: locationData.address?.postalCode || prev.postalCode,
      address: locationData.displayName || prev.address,
      cityName: locationData.address?.city || prev.cityName,
      country: locationData.address?.country || prev.country,
      StreetName: locationData.address?.street || prev.StreetName,
      District: locationData.address?.district || prev.District,
    }));
  }, []);

  const handleBranchToggle = useCallback(
    (branchId) => {
      const branchIdStr = String(branchId);
      setSelectedBranches((prev) => {
        if (prev.includes(branchIdStr)) {
          setBranchDetails((prevDetails) => {
            const d = { ...prevDetails };
            delete d[branchIdStr];
            return d;
          });
          return prev.filter((id) => id !== branchIdStr);
        } else {
          setBranchDetails((prevDetails) => ({
            ...prevDetails,
            [branchIdStr]: {
              openingBalance: "",
              crOrDr: type === "customer" ? "2" : "1",
            },
          }));
          return [...prev, branchIdStr];
        }
      });
    },
    [type]
  );

  const handleBranchDetailChange = useCallback((branchId, field, value) => {
    setBranchDetails((prev) => ({
      ...prev,
      [branchId]: { ...prev[branchId], [field]: value },
    }));
  }, []);

  const handleBranchDetailBlur = useCallback((branchId, field) => {
    if (field === "openingBalance") {
      setBranchDetails((prev) => ({
        ...prev,
        [branchId]: {
          ...prev[branchId],
          [field]: prev[branchId]?.[field]
            ? parseFloat(prev[branchId][field]).toFixed(generalSettings?.decimalPart ?? 2)
            : '',
        },
      }));
    }
  }, [generalSettings?.decimalPart]);

  const handleSaveShippingAddress = useCallback(
    async (addressData) => {
      if (!addressData) return;
      if (abortControllerRef.current) abortControllerRef.current.abort();
      abortControllerRef.current = new AbortController();
      try {
        const isEditing = Boolean(editingAddress?.addressId);

        const apiUrl = isEditing
          ? `update-shipping-address/${editingAddress.addressId}`
          : `save-shipping-address`;
        const payload = {
          ledgerId: customerId,
          ...addressData,
          CreatedUser: userId,
          ModifiedUser: userId,
          Isdefault: addressData.Isdefault || false,
        };

        const response = await axiosInstance.post(apiUrl, payload, {
          signal: abortControllerRef.current.signal,
        });

        if (!isMountedRef.current) return;
        if (!response.data?.error) {
          await fetchCustomerData();
          setShowAddressForm(false);
          setEditingAddress(null);
          setFormData((prev) => ({
            ...prev,
            ShippingAddress: {
              address1: "",
              address2: "",
              address3: "",
              address4: "",
              Isdefault: false,
            },
          }));
        }
      } catch (error) {
        if (error.name !== "AbortError" && error.name !== "CanceledError")
          console.error("Error saving shipping address:", error);
      }
    },
    [editingAddress, customerId, userId, fetchCustomerData]
  );

  const handleDeleteShippingAddress = useCallback(
    async (addressId) => {
      if (!addressId) return;
      try {
        await axiosInstance.get(`delete-shipping-address/${addressId}`);
        if (isMountedRef.current) await fetchCustomerData();
      } catch (error) {
        console.error("Error deleting shipping address:", error);
      }
    },
    [fetchCustomerData]
  );

  const handleAddAddressModeAddress = useCallback((addressData) => {
    if (!addressData) {
      console.error("Address data is null or undefined");
      return;
    }

    // Create new address with temporary ID
    const newAddress = {
      address1: addressData.address1 || "",
      address2: addressData.address2 || "",
      address3: addressData.address3 || "",
      address4: addressData.address4 || "",
      Isdefault: addressData.Isdefault || false,
      addressId: Date.now(),
    };

    // 1. Save locally for UI display
    setAddModeShippingAddresses((prev) => [...prev, newAddress]);

    // 2. Always save to DB via API (both add and edit mode)
    handleSaveShippingAddress(addressData);

    setShowAddressForm(false);
    setEditingAddress(null);
  }, [handleSaveShippingAddress]);

  const handleUpdateAddModeAddress = useCallback((addressData) => {
    if (!editingAddress) return;

    // 1. Update locally for UI display
    setAddModeShippingAddresses((prev) =>
      prev.map((addr) =>
        addr.addressId === editingAddress.addressId
          ? { ...addressData, addressId: addr.addressId }
          : addr
      )
    );

    // 2. Always save to DB via API (both add and edit mode)
    handleSaveShippingAddress(addressData);

    setShowAddressForm(false);
    setEditingAddress(null);
  }, [editingAddress, handleSaveShippingAddress]);

  const handleDeleteAddModeAddress = useCallback((addressId) => {
    setAddModeShippingAddresses((prev) =>
      prev.filter((addr) => addr.addressId !== addressId)
    );
  }, []);

  const mapFormDataToAPI = useCallback(() => {

    const branchDetailsArray = selectedBranches.map((branchId) => ({
      branchId: parseInt(branchId),
      openingBalance: parseFloat(
        (parseFloat(branchDetails[branchId]?.openingBalance) || 0)
          .toFixed(generalSettings?.decimalPart ?? 2)
      ),
      crOrDr: branchDetails[branchId]?.crOrDr === "1" ? "Cr" : "Dr",
    }));

    // Document building
    const allDocumentsMetadata = [];
    const allDocumentFiles = [];

    // 1. Existing documents
    existingDocuments.forEach((doc) => {
      const isDeleted = deletedDocumentIds.includes(doc.documentId);
      const replacement = replacementFiles[doc.documentId];

      if (isDeleted) {
        // skip
      } else if (replacement) {
        allDocumentsMetadata.push({
          fileName: replacement.fileName,
          document_name: doc.document_name,
          branchId: doc.branchId || Number(selectedBranchId),
          hasNewFile: "1",
        });
        allDocumentFiles.push(replacement.file);
      } else {
        allDocumentsMetadata.push({
          fileName: doc.filePath || doc.fileName,
          document_name: doc.document_name,
          branchId: doc.branchId || Number(selectedBranchId),
          hasNewFile: "0",
        });
      }
    });

    // 2. VAT document
    if (vatDocument?.file) {
      allDocumentsMetadata.push({
        fileName: vatDocument.fileName,
        document_name: vatDocument.document_name,
        branchId: Number(selectedBranchId),
        hasNewFile: "1",
      });
      allDocumentFiles.push(vatDocument.file);
    }

    // 3. CR document
    if (crDocument?.file) {
      allDocumentsMetadata.push({
        fileName: crDocument.fileName,
        document_name: crDocument.document_name,
        branchId: Number(selectedBranchId),
        hasNewFile: "1",
      });
      allDocumentFiles.push(crDocument.file);
    }

    // 4. Custom documents
    documents.forEach((doc) => {
      if (doc.file && doc.document_name) {
        allDocumentsMetadata.push({
          fileName: doc.fileName,
          document_name: doc.document_name,
          branchId: Number(selectedBranchId),
          hasNewFile: "1",
        });
        allDocumentFiles.push(doc.file);
      }
    });

    const hasDocumentChanges =
      deletedDocumentIds.length > 0 ||
      Object.keys(replacementFiles).length > 0 ||
      vatDocument?.file ||
      crDocument?.file ||
      documents.some((d) => d.file);

    const apiPayload = {
      ledgerName: formData.customerName,
      ledgerCode: formData.ledgerCode,
      groupId: parseInt(formData.groupId) || 0,
      billBybill: formData.billBybill === true,
      branchDetails: branchDetailsArray,
      nameArb: formData.nameFL || "",
      accountNo: formData.accountNo || "",
      address: formData.address || "",
      phoneNo: formData.phoneNo || "",
      cstNumber: formData.crNumber || "",
      faxNo: formData.faxNo || "",
      email: formData.email || "",
      creditPeriod: formData.creditPeriod
        ? parseInt(formData.creditPeriod)
        : 0,
      creditLimit: formData.creditLimit
        ? parseFloat(formData.creditLimit)
        : 0,
      pricingLevelId: formData.pricingLevelId
        ? parseInt(formData.pricingLevelId)
        : 1,
      currencyId: parseInt(formData.currencyId) || 0,
      branchId: parseInt(selectedBranchId) || 0,
      tinNumber: formData.vatNumber || "",
      BuildingNo: formData.BuildingNo || "",
      AdditionalNo: formData.additionalNo || "",
      StreetName: formData.StreetName || "",
      PostboxNo: formData.postboxNo || "",
      CityName: formData.cityName || "",
      Country: formData.country || "",
      creditLimitStatus: formData.creditLimitStatus || "Ignore",
      District: formData.District || "",
      StreetNameArb: formData.streetNameArb || "",
      BuildingNoArb: formData.buildingNoArb || "",
      CityNameArb: formData.cityNameArb || "",
      DistrictArb: formData.districtArb || "",
      CountryArb: formData.countryArb || "",
      AdditionalNoArb: formData.additionalNoArb || "",
      PostboxNoArb: formData.postboxNoArb || "",
      AddressArabic: formData.addressArabic || "",
      ledgerType: formData.ledgerType,
      CreatedUser: userId,
      ModifiedUser: isEditMode ? userId : null,
      // Location fields
      latitude: formData.latitude ? parseFloat(formData.latitude) : null,
      longitude: formData.longitude ? parseFloat(formData.longitude) : null,
      state: formData.state || "",
      postal_code: formData.postalCode || "",
      // AFTER
      ShippingAddress: isEditMode ? shippingAddresses : addModeShippingAddresses,
    };

    if (hasDocumentChanges) {
      apiPayload.document = allDocumentsMetadata;
    }

    console.groupEnd();

    return { apiPayload, allDocumentFiles };
  }, [
    selectedBranches,
    branchDetails,
    vatDocument,
    crDocument,
    documents,
    existingDocuments,
    deletedDocumentIds,
    replacementFiles,
    selectedBranchId,
    userId,
    isEditMode,
    shippingAddresses,
    addModeShippingAddresses,
    formData,
  ]);

  const isZatcaPhase2Customer =
    generalSettings?.zatcaType === "Phase 2" && type === "customer" && formData.vatNumber !== "";
  // Add this helper (near isZatcaPhase2Customer / validationRules)
  const zatcaRequiredFields = [
    "vatNumber",
    "crNumber",
    "BuildingNo",
    "additionalNo",
    "StreetName",
    "cityName",
    "District",
    "postboxNo",
    "country",
  ];

  const isZatcaAddressIncomplete =
    isZatcaPhase2Customer &&
    zatcaRequiredFields.some((field) => !formData[field]?.toString().trim());
  const vatValidationRule = (value) => {
    if (!value) return t("requiredFieldsError");
    if (!/^3\d{13}3$/.test(value)) return "VAT number must be 15 digits, starting and ending with 3";
    return null;
  };
  const validationRules = {
    ledgerCode: { required: true, label: t("requiredFieldsError") },
    customerName: { required: true, label: t("requiredFieldsError") },
    ...(isZatcaPhase2Customer && {
      vatNumber: { required: true, label: t("requiredFieldsError"), custom: vatValidationRule },
      crNumber: { required: true, label: t("requiredFieldsError") },
      BuildingNo: { required: true, label: t("requiredFieldsError") },
      additionalNo: { required: true, label: t("requiredFieldsError") },
      StreetName: { required: true, label: t("requiredFieldsError") },
      cityName: { required: true, label: t("requiredFieldsError") },
      District: { required: true, label: t("requiredFieldsError") },
      postboxNo: { required: true, label: t("requiredFieldsError") },
      country: { required: true, label: t("requiredFieldsError") },
    }),
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedBranches?.length) {
      setError(
        t("accountLedger.form.branchRequired") ||
        "Please select at least one branch"
      );
      console.groupEnd();
      return;
    }
    for (const branchId of selectedBranches) {
      if (!branchDetails[branchId]?.crOrDr) {
        setError(
          "Please select Credit/Debit for all selected branches"
        );
        console.groupEnd();
        return;
      }
    }
    if (!validateForm(formData, validationRules)) {
      console.groupEnd();
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const { apiPayload: apiData, allDocumentFiles } = mapFormDataToAPI();
      const hasFiles = allDocumentFiles.length > 0;

      if (hasFiles) {
        const formDataToSend = new FormData();

        Object.entries(apiData).forEach(([key, value]) => {
          if (key === "branchDetails" && Array.isArray(value)) {
            value.forEach((branch, i) => {
              Object.entries(branch).forEach(([bKey, bVal]) => {
                formDataToSend.append(
                  `branchDetails[${i}][${bKey}]`,
                  bVal != null ? String(bVal) : ""
                );
              });
            });
          } else if (key === "ShippingAddress" && Array.isArray(value)) {
            value.forEach((addr, i) => {
              Object.entries(addr).forEach(([sKey, sVal]) => {
                formDataToSend.append(
                  `ShippingAddress[${i}][${sKey}]`,
                  sVal != null ? String(sVal) : ""
                );
              });
            });
          } else if (key === "document" && Array.isArray(value)) {
            value.forEach((doc, i) => {
              Object.entries(doc).forEach(([dKey, dVal]) => {
                formDataToSend.append(
                  `document[${i}][${dKey}]`,
                  dVal != null ? String(dVal) : ""
                );
              });
            });
          } else if (value !== null && value !== undefined) {
            formDataToSend.append(
              key,
              typeof value === "boolean"
                ? value
                  ? "1"
                  : "0"
                : String(value)
            );
          }
        });

        allDocumentFiles.forEach((file) => {
          formDataToSend.append("documents", file);
        });

        onSubmit?.(formDataToSend, isEditMode ? "update" : "create");
      } else {
        onSubmit?.(apiData, isEditMode ? "update" : "create");
      }
    } catch (error) {
      console.error("❌ [SUBMIT] Error:", error);
      if (isMountedRef.current)
        setError(
          error.response?.data?.message || "Error submitting form"
        );
    } finally {
      if (isMountedRef.current) setLoading(false);
      console.groupEnd();
    }
  };

  if (loading && isEditMode && !formData.customerName) return <Preloader />;

  if (error && isEditMode && !formData.customerName) {
    return (
      <div className="mx-auto p-2">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-600 rounded-lg p-4">
          <div className="text-red-700 dark:text-red-400">
            <strong>Error:</strong> {error}
          </div>
          <button
            onClick={fetchCustomerData}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const codeLabelText =
    type === "customer"
      ? t("customer.form.customerCode") || "Customer Code"
      : t("customer.form.supplierCode") || "Supplier Code";

  const ledgerTypeOptions =
    type === "customer"
      ? [
        {
          value: "Customer",
          label: t("customer.form.customerOption") || "Customer",
        },
        {
          value: "Customer&Supplier",
          label:
            t("customer.form.customerandsupplieroption") ||
            "Customer & Supplier",
        },
      ]
      : [
        {
          value: "Supplier",
          label: t("customer.form.supplierOption") || "Supplier",
        },
        {
          value: "Customer&Supplier",
          label:
            t("customer.form.customerandsupplieroption") ||
            "Customer & Supplier",
        },
        {
          value: "Other",
          label:
            t("customer.form.other") ||
            "Customer & Supplier",
        },
      ];

  const creditStatusOptions = [
    { value: "Ignore", label: "Ignore" },
    { value: "Warn", label: "Warn" },
    { value: "Block", label: "Block" },
  ];
  const billByBillOptions = [
    { value: true, label: t("customer.form.yes") || "Yes" },
    { value: false, label: t("customer.form.no") || "No" },
  ];
  const crDrOptions = [
    { value: "1", label: t("customer.form.credit") || "Cr" },
    { value: "2", label: t("customer.form.debit") || "Dr" },
  ];

  const tabs = [
    { id: "address", label: t("customer.form.address") || "Address" },
    {
      id: "shipping",
      label: t("customer.form.shippingAdderess") || "Shipping Address",
    },
    {
      id: "registration",
      label:
        t("customer.form.registrationDetails") || "Registration Details",
    },
    {
      id: "contact",
      label: t("customer.form.contactDetails") || "Contact Details",
    },
    {
      id: "accounting",
      label: t("customer.form.opening") || "Opening",
    },
    { id: "documents", label: t("Documents") || "Documents" },

  ];

  const getOptionLabel = (options, value) =>
    options?.find((opt) => opt.value === value)?.label || "";

  const activeExistingDocs = existingDocuments.filter(
    (d) => !deletedDocumentIds.includes(d.documentId)
  );
  const newDocCount =
    (vatDocument ? 1 : 0) +
    (crDocument ? 1 : 0) +
    documents.filter((d) => d.file).length;
  const totalDocCount = activeExistingDocs.length + newDocCount;
  const existingVatDoc = existingDocuments.find((d) =>
    d.document_name?.toLowerCase().includes("vat")
  );
  const existingCrDoc = existingDocuments.find((d) =>
    d.document_name?.toLowerCase().includes("cr")
  );

  return (
    <div className="mx-auto px-4 py-2">
      <div className="max-w-6xl mx-auto bg-white dark:bg-[#1e1e1e] rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
        <div className="px-4 py-3">
          <form onSubmit={handleSubmit}>
            {/* Customer/Supplier Name */}
            <div className="mb-4">
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1 block">
                {type === "customer" ? "Customer Name" : "Supplier Name"} <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  name="customerName"
                  value={formData.customerName}
                  onChange={handleChange}
                  onBlur={(e) => handleBlur(e, validationRules)}
                  onKeyDown={(e) => {
                    if (e.key === '&') e.preventDefault();
                    if (e.key === 'Enter') handleTranslate();
                  }}

                  placeholder={
                    type === "customer"
                      ? "Enter Customer Name"
                      : "Enter Supplier Name"
                  }
                  required
                  className="flex-1 text-2xl font-bold bg-transparent border-0 border-b-2 border-gray-800 dark:border-gray-300 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:border-teal-600 dark:focus:border-teal-400 pb-1.5 transition-colors"
                />
                <button
                  type="button"
                  onClick={handleTranslate}
                  disabled={
                    translating || !formData.customerName?.trim()
                  }
                  className={`h-9 px-3 main-bg text-gray-200 rounded-md hover:main-bg transition-colors flex items-center justify-center flex-shrink-0 ${translating || !formData.customerName?.trim()
                    ? "opacity-60 cursor-not-allowed"
                    : ""
                    }`}
                  title="Translate to Arabic"
                >
                  <MdGTranslate className="w-5 h-5" />
                </button>
              </div>
              {errors.customerName && (
                <p className="text-xs text-red-500 mt-0.5">
                  {errors.customerName}
                </p>
              )}
            </div>

            {/* Basic Information */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-2 mb-4">
              <div className="space-y-2">
                <InputRow label={t("customer.form.group") || "Group"}>
                  <div className="relative" ref={groupDropdownRef}>
                    <div className="relative flex items-center">
                      <input
                        type="text"
                        value={
                          accountGroups?.find(
                            (g) =>
                              g.groupId?.toString() ===
                              formData.groupId
                          )?.accountGroupName || ""
                        }
                        readOnly
                        placeholder="Select group"
                        className="w-full px-0 py-1.5 bg-transparent border-0 border-b border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:border-gray-900 dark:focus:border-gray-300 pr-8 text-sm transition-colors cursor-pointer"
                        onClick={() =>
                          setShowGroupDropdown((prev) => !prev)
                        }
                      />
                      <div className="absolute right-0">
                        <button
                          type="button"
                          onClick={() =>
                            setShowGroupDropdown((prev) => !prev)
                          }
                          className="text-gray-400 hover:text-gray-600 p-0.5"
                        >
                          <ChevronDown
                            size={14}
                            className={`transition-transform ${showGroupDropdown ? "rotate-180" : ""}`}
                          />
                        </button>
                      </div>
                    </div>
                    {showGroupDropdown && (
                      <div className="absolute z-50 mt-1 w-full bg-white dark:bg-[#242424] border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-52 overflow-y-auto">
                        {accountGroups?.map((group) => (
                          <button
                            key={group.groupId}
                            type="button"
                            onClick={() => {
                              handleSelectChange(
                                "groupId",
                                group.groupId?.toString()
                              );
                              setShowGroupDropdown(false);
                            }}
                            className={`w-full text-left px-3 py-2 text-sm hover:bg-teal-50 dark:hover:bg-teal-900/30 text-gray-900 dark:text-gray-100 ${formData.groupId === group.groupId?.toString() ? "bg-teal-50 dark:bg-teal-900/20 font-medium" : ""}`}
                          >
                            {group.accountGroupName}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </InputRow>
                <InputRow
                  label={
                    t("customer.form.nameFL") || "Name (Arabic)"
                  }
                >
                  <UnderlineInput
                    ref={nameFlInputRef}
                    name="nameFL"
                    value={formData.nameFL}
                    onChange={handleChange}
                    placeholder="الاسم بالعربية"
                  />
                </InputRow>
                <InputRow
                  label={
                    t("customer.form.ledgerType") || "Ledger Type"
                  }
                >
                  <div className="relative" ref={ledgerTypeDropdownRef}>
                    <div className="relative flex items-center">
                      <input
                        type="text"
                        value={getOptionLabel(
                          ledgerTypeOptions,
                          formData.ledgerType
                        )}
                        readOnly
                        placeholder="Select type"
                        className="w-full px-0 py-1.5 bg-transparent border-0 border-b border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:border-gray-900 dark:focus:border-gray-300 pr-8 text-sm transition-colors cursor-pointer"
                        onClick={() =>
                          setShowLedgerTypeDropdown((prev) => !prev)
                        }
                      />
                      <div className="absolute right-0">
                        <button
                          type="button"
                          onClick={() =>
                            setShowLedgerTypeDropdown(
                              (prev) => !prev
                            )
                          }
                          className="text-gray-400 hover:text-gray-600 p-0.5"
                        >
                          <ChevronDown
                            size={14}
                            className={`transition-transform ${showLedgerTypeDropdown ? "rotate-180" : ""}`}
                          />
                        </button>
                      </div>
                    </div>
                    {showLedgerTypeDropdown && (
                      <div className="absolute z-50 mt-1 w-full bg-white dark:bg-[#242424] border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-52 overflow-y-auto">
                        {ledgerTypeOptions.map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => {
                              handleSelectChange(
                                "ledgerType",
                                opt.value
                              );
                              setShowLedgerTypeDropdown(false);
                            }}
                            className={`w-full text-left px-3 py-2 text-sm hover:bg-teal-50 dark:hover:bg-teal-900/30 text-gray-900 dark:text-gray-100 ${formData.ledgerType === opt.value ? "bg-teal-50 dark:bg-teal-900/20 font-medium" : ""}`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </InputRow>
              </div>

              <div className="space-y-2">
                <InputRow
                  label={codeLabelText}
                  required
                  error={errors.ledgerCode}
                >
                  <UnderlineInput
                    name="ledgerCode"
                    value={formData.ledgerCode}
                    onChange={handleChange}
                    onBlur={(e) => handleBlur(e, validationRules)}
                    placeholder={
                      type === "customer"
                        ? "Customer code"
                        : "Supplier code"
                    }
                    required
                  />
                </InputRow>
                <InputRow
                  label={
                    t("customer.form.vatNumber") || "VAT Number"
                  }
                  required={isZatcaPhase2Customer}        // ← add this
                  error={errors.vatNumber}
                >
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <UnderlineInput
                        name="vatNumber"
                        value={formData.vatNumber}
                        onChange={handleChange}
                        placeholder="Enter VAT number"
                        required={isZatcaPhase2Customer}        // ← add this
                      />
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <input
                        ref={vatFileInputRef}
                        type="file"
                        className="hidden"
                        onChange={handleVatDocumentChange}
                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          vatFileInputRef.current?.click()
                        }
                        className={`p-1.5 rounded-md transition-all ${vatDocument || existingVatDoc ? "text-teal-600 bg-teal-50 dark:bg-teal-900/30" : "text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"}`}
                        title={
                          vatDocument
                            ? `New: ${vatDocument.fileName}`
                            : existingVatDoc
                              ? `Saved: ${existingVatDoc.fileName}`
                              : "Attach VAT document"
                        }
                      >
                        <Paperclip size={16} />
                      </button>
                      {vatDocument && (
                        <button
                          type="button"
                          onClick={handleRemoveVatDocument}
                          className="p-1 rounded-md text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                      {!vatDocument && existingVatDoc && (
                        <button
                          type="button"
                          onClick={() =>
                            handleViewDocument(
                              existingVatDoc.filePath
                            )
                          }
                          className="p-1 rounded-md text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                          title="View document"
                        >
                          <Eye size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                  {vatDocument && (
                    <p className="text-xs text-teal-600 mt-0.5 truncate">
                      📎 New: {vatDocument.fileName}
                    </p>
                  )}
                  {!vatDocument && existingVatDoc && (
                    <p className="text-xs text-blue-600 mt-0.5 truncate">
                      📎 Saved: {existingVatDoc.fileName}
                    </p>
                  )}
                </InputRow>
                <InputRow
                  label={t("customer.form.crNumber") || "CR Number"}
                  required={isZatcaPhase2Customer}
                  error={errors.crNumber}
                >
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <UnderlineInput
                        name="crNumber"
                        value={formData.crNumber}
                        onChange={handleChange}
                        placeholder="Enter CR number"
                        required={isZatcaPhase2Customer}
                      />
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <input
                        ref={crFileInputRef}
                        type="file"
                        className="hidden"
                        onChange={handleCrDocumentChange}
                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          crFileInputRef.current?.click()
                        }
                        className={`p-1.5 rounded-md transition-all ${crDocument || existingCrDoc ? "text-teal-600 bg-teal-50 dark:bg-teal-900/30" : "text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"}`}
                        title={
                          crDocument
                            ? `New: ${crDocument.fileName}`
                            : existingCrDoc
                              ? `Saved: ${existingCrDoc.fileName}`
                              : "Attach CR document"
                        }
                      >
                        <Paperclip size={16} />
                      </button>
                      {crDocument && (
                        <button
                          type="button"
                          onClick={handleRemoveCrDocument}
                          className="p-1 rounded-md text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                      {!crDocument && existingCrDoc && (
                        <button
                          type="button"
                          onClick={() =>
                            handleViewDocument(
                              existingCrDoc.filePath
                            )
                          }
                          className="p-1 rounded-md text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                          title="View document"
                        >
                          <Eye size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                  {crDocument && (
                    <p className="text-xs text-teal-600 mt-0.5 truncate">
                      📎 New: {crDocument.fileName}
                    </p>
                  )}
                  {!crDocument && existingCrDoc && (
                    <p className="text-xs text-blue-600 mt-0.5 truncate">
                      📎 Saved: {existingCrDoc.fileName}
                    </p>
                  )}
                </InputRow>
              </div>
            </div>

            {/* Tabs */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
              <div className="flex border-b border-gray-300 dark:border-gray-600 overflow-x-auto">
                {tabs.map((tab, index) => (
                  <div
                    key={tab.id}
                    className="flex items-center flex-shrink-0"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setActiveTab(
                          activeTab === tab.id ? null : tab.id
                        )
                      }
                      className={`px-4 py-2 text-sm font-medium transition-all whitespace-nowrap ${activeTab === tab.id
                        ? "bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400 border-b-2 border-teal-600"
                        : "bg-white dark:bg-[#1e1e1e] text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                        }`}
                    >
                      <span className="flex items-center gap-1.5">
                        {tab.label}
                        {tab.id === "location" &&
                          formData.latitude && (
                            <span className="inline-flex items-center justify-center w-2 h-2 bg-teal-600 rounded-full"></span>
                          )}
                        {tab.id === "documents" &&
                          totalDocCount > 0 && (
                            <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-teal-600 rounded-full">
                              {totalDocCount}
                            </span>
                          )}
                      </span>
                    </button>
                    {index < tabs.length - 1 && (
                      <div className="h-6 w-px bg-gray-300 dark:bg-gray-600"></div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {activeTab && (
              <div className="border border-gray-200 dark:border-gray-700 border-t-0 rounded-b-lg p-4 bg-gray-50 dark:bg-[#242424] min-h-[420px]">
                {/* ADDRESS TAB */}
                {activeTab === "address" && (
                  <div className="space-y-4">
                    {isZatcaAddressIncomplete && (
                      <div className="text-xs text-amber-700 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded px-3 py-2">
                        ⚠️ ZATCA Phase 2 requires all address fields to be filled.
                      </div>
                    )}
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 pb-2 border-b border-gray-200 dark:border-gray-600">
                      {t("customer.form.address") ||
                        "Address Details"}
                    </h3>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-2">
                      <div className="space-y-2">
                        <InputRow
                          label={
                            t("customer.form.buildingNo") ||
                            "Building No"
                          }
                          required={isZatcaPhase2Customer}
                          error={errors.BuildingNo}
                        >
                          <UnderlineInput
                            name="BuildingNo"
                            value={formData.BuildingNo}
                            onChange={handleChange}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleAddressTranslate('BuildingNo', 'buildingNoArb');
                            }}
                            placeholder="Enter building no"
                            required={isZatcaPhase2Customer}
                          />
                        </InputRow>
                        <InputRow
                          label={
                            t("customer.form.additionalNo") ||
                            "Additional No"
                          }
                          required={isZatcaPhase2Customer}
                          error={errors.additionalNo}
                        >
                          <UnderlineInput
                            name="additionalNo"
                            value={formData.additionalNo}
                            onChange={handleChange}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleAddressTranslate('additionalNo', 'additionalNoArb');
                            }}
                            placeholder="Enter additional no"
                            required={isZatcaPhase2Customer}
                          />
                        </InputRow>
                        <InputRow
                          label={
                            t("customer.form.StreetName") ||
                            "Street Name"
                          }
                          required={isZatcaPhase2Customer}
                          error={errors.StreetName}
                        >
                          <UnderlineInput
                            name="StreetName"
                            value={formData.StreetName}
                            onChange={handleChange}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleAddressTranslate('StreetName', 'streetNameArb');
                            }}
                            placeholder="Enter street name"
                            required={isZatcaPhase2Customer}
                          />
                        </InputRow>
                        <InputRow
                          label={
                            t("customer.form.cityName") ||
                            "City Name"
                          }
                          required={isZatcaPhase2Customer}
                          error={errors.cityName}
                        >
                          <UnderlineInput
                            name="cityName"
                            value={formData.cityName}
                            onChange={handleChange}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleAddressTranslate('cityName', 'cityNameArb');
                            }}
                            placeholder="Enter city name"
                            required={isZatcaPhase2Customer}
                          />
                        </InputRow>
                        <InputRow
                          label={
                            t("customer.form.district") ||
                            "District"
                          }
                          required={isZatcaPhase2Customer}
                          error={errors.District}
                        >
                          <UnderlineInput
                            name="District"
                            value={formData.District}
                            onChange={handleChange}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleAddressTranslate('District', 'districtArb');
                            }}
                            placeholder="Enter district"
                            required={isZatcaPhase2Customer}
                          />
                        </InputRow>
                        <InputRow
                          label={
                            t("customer.form.postboxNo") ||
                            "Post Box No"
                          }
                          required={isZatcaPhase2Customer}
                          error={errors.postboxNo}
                        >
                          <UnderlineInput
                            name="postboxNo"
                            value={formData.postboxNo}
                            onChange={handleChange}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleAddressTranslate('postboxNo', 'postboxNoArb');
                            }}
                            placeholder="Enter post box number"
                            required={isZatcaPhase2Customer}
                          />
                        </InputRow>
                        <InputRow
                          label={t("customer.form.country") || "Country"}
                          required={isZatcaPhase2Customer}
                          error={errors.country}
                        >
                          <div className="relative" ref={countryDropdownRef}>
                            <div className="relative flex items-center">
                              <input
                                type="text"
                                value={showCountryDropdown ? countrySearch : (formData.country || "")}
                                onChange={(e) => {
                                  setCountrySearch(e.target.value);
                                  if (!showCountryDropdown) setShowCountryDropdown(true);
                                }}
                                onFocus={() => {
                                  setCountrySearch("");
                                  setShowCountryDropdown(true);
                                }}
                                placeholder="Select or search country"
                                className="w-full px-0 py-1.5 bg-transparent border-0 border-b border-gray-300 dark:border-gray-600 
                   text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none 
                   focus:border-gray-900 dark:focus:border-gray-300 text-sm transition-colors pr-8"
                              />
                              <div className="absolute right-0">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCountrySearch("");
                                    setShowCountryDropdown((prev) => !prev);
                                  }}
                                  className="text-gray-400 hover:text-gray-600 p-0.5"
                                >
                                  <ChevronDown
                                    size={14}
                                    className={`transition-transform ${showCountryDropdown ? "rotate-180" : ""}`}
                                  />
                                </button>
                              </div>
                            </div>
                            {showCountryDropdown && (
                              <div className="absolute z-50 mt-1 w-full bg-white dark:bg-[#242424] border border-gray-300 
                      dark:border-gray-600 rounded-md shadow-lg max-h-52 overflow-y-auto">
                                {AllCountries
                                  .filter((c) =>
                                    c.country.toLowerCase().includes(countrySearch.toLowerCase())
                                  )
                                  .map((c) => (
                                    <button
                                      key={c.countryCode}
                                      type="button"
                                      onClick={() => {
                                        handleSelectChange("country", c.country);
                                        setShowCountryDropdown(false);
                                        setCountrySearch("");
                                        // Auto-translate on select
                                        setTimeout(() => handleAddressTranslate("country", "countryArb"), 100);
                                      }}
                                      className={`w-full text-left px-3 py-2 text-sm hover:bg-teal-50 dark:hover:bg-teal-900/30 
                          text-gray-900 dark:text-gray-100 flex items-center gap-2
                          ${formData.country === c.country ? "bg-teal-50 dark:bg-teal-900/20 font-medium" : ""}`}
                                    >
                                      <img
                                        src={`https://flagcdn.com/16x12/${c.countryCode.toLowerCase()}.png`}
                                        alt={c.countryCode}
                                        className="w-4 h-3 object-cover flex-shrink-0"
                                        onError={(e) => { e.target.style.display = 'none'; }}
                                      />
                                      {c.country}
                                    </button>
                                  ))}
                                {AllCountries.filter((c) =>
                                  c.country.toLowerCase().includes(countrySearch.toLowerCase())
                                ).length === 0 && (
                                    <p className="px-3 py-2 text-sm text-gray-400">No countries found</p>
                                  )}
                              </div>
                            )}
                          </div>
                        </InputRow>
                        <InputRow
                          label={
                            t("customer.form.address") || "Address"
                          }
                        >
                          <textarea
                            name="address"
                            value={formData.address || ""}
                            onChange={handleChange}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && e.ctrlKey) handleAddressTranslate('address', 'addressArabic');
                            }}
                            placeholder="Enter full address"
                            rows={3}
                            className="w-full px-0 py-1.5 bg-transparent border-0 border-b border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:border-gray-900 text-sm resize-none"
                          />
                        </InputRow>
                      </div>
                      <div className="space-y-2">
                        <InputRow
                          label={
                            t("customer.form.buildingNoArabic") ||
                            "Building No (Ar)"
                          }
                        >
                          <UnderlineInput
                            name="buildingNoArb"
                            value={formData.buildingNoArb}
                            onChange={handleChange}
                            placeholder="رقم المبنى"
                          />
                        </InputRow>
                        <InputRow
                          label={
                            t(
                              "customer.form.additionalNoArabic"
                            ) || "Additional No (Ar)"
                          }
                        >
                          <UnderlineInput
                            name="additionalNoArb"
                            value={formData.additionalNoArb}
                            onChange={handleChange}
                            placeholder="الرقم الإضافي"
                          />
                        </InputRow>
                        <InputRow
                          label={
                            t(
                              "customer.form.streetNameArabic"
                            ) || "Street Name (Ar)"
                          }
                        >
                          <UnderlineInput
                            name="streetNameArb"
                            value={formData.streetNameArb}
                            onChange={handleChange}
                            placeholder="الشارع"
                          />
                        </InputRow>
                        <InputRow
                          label={
                            t("customer.form.cityNameArabic") ||
                            "City Name (Ar)"
                          }
                        >
                          <UnderlineInput
                            name="cityNameArb"
                            value={formData.cityNameArb}
                            onChange={handleChange}
                            placeholder="المدينة"
                          />
                        </InputRow>
                        <InputRow
                          label={
                            t("customer.form.districtArabic") ||
                            "District (Ar)"
                          }
                        >
                          <UnderlineInput
                            name="districtArb"
                            value={formData.districtArb}
                            onChange={handleChange}
                            placeholder="الحي"
                          />
                        </InputRow>
                        <InputRow
                          label={
                            t("customer.form.postboxNoArabic") ||
                            "Post Box No (Ar)"
                          }
                        >
                          <UnderlineInput
                            name="postboxNoArb"
                            value={formData.postboxNoArb}
                            onChange={handleChange}
                            placeholder="صندوق البريد"
                          />
                        </InputRow>
                        <InputRow
                          label={
                            t("customer.form.countryArabic") ||
                            "Country (Ar)"
                          }
                        >
                          <UnderlineInput
                            name="countryArb"
                            value={formData.countryArb}
                            onChange={handleChange}
                            placeholder="البلد"
                          />
                        </InputRow>
                        <InputRow
                          label={
                            t("customer.form.fullAddressArabic") ||
                            "Address (Ar)"
                          }
                        >
                          <textarea
                            name="addressArabic"
                            value={formData.addressArabic || ""}
                            onChange={handleChange}
                            placeholder="العنوان الكامل"
                            rows={3}
                            className="w-full px-0 py-1.5 bg-transparent border-0 border-b border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:border-gray-900 text-sm resize-none"
                          />
                        </InputRow>
                      </div>
                    </div>
                  </div>
                )}

                {/* LOCATION TAB */}
                {activeTab === "location" && (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <p className="text-lg font-semibold text-gray-500 dark:text-gray-400">
                      Coming Soon
                    </p>
                  </div>
                )}

                {/* SHIPPING TAB */}
                {activeTab === "shipping" && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 pb-2 border-b border-gray-200 dark:border-gray-600">
                      {t("customer.form.shippingAdderess") ||
                        "Shipping Address"}
                    </h3>
                    {isEditMode ? (
                      <>
                        {shippingAddresses.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {shippingAddresses.map((addr) => (
                              <div
                                key={addr.addressId}
                                className="border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-[#1e1e1e]"
                              >
                                <p className="text-sm text-gray-700 dark:text-gray-300">
                                  {addr.address1}
                                </p>
                                <p className="text-sm text-gray-700 dark:text-gray-300">
                                  {addr.address2}
                                </p>
                                <p className="text-sm text-gray-700 dark:text-gray-300">
                                  {addr.address3}
                                </p>
                                <p className="text-sm text-gray-700 dark:text-gray-300">
                                  {addr.address4}
                                </p>
                                <div className="flex justify-between items-center mt-2">
                                  <span className="text-xs">
                                    {addr.Isdefault && (
                                      <span className="main-bg px-2 py-0.5 rounded-full text-white text-xs">
                                        Default
                                      </span>
                                    )}
                                  </span>
                                  <div className="flex gap-2">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingAddress(
                                          addr
                                        );
                                        setShowAddressForm(
                                          true
                                        );
                                      }}
                                      className="text-blue-600 text-xs hover:underline"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleDeleteShippingAddress(
                                          addr.addressId
                                        )
                                      }
                                      className="text-red-600 text-xs hover:underline"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-gray-500 text-sm">
                            No shipping addresses available.
                          </p>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setEditingAddress(null);
                            setShowAddressForm(true);
                          }}
                          className="px-3 py-1.5 bg-teal-600 text-white text-sm rounded hover:bg-teal-700"
                        >
                          + Add New Address
                        </button>
                        {showAddressForm && (
                          <div className="border-t border-gray-300 dark:border-gray-600 pt-3 mt-3">
                            <h4 className="text-sm font-medium mb-3 text-gray-800 dark:text-gray-200">
                              {editingAddress
                                ? "Edit Address"
                                : "Add Address"}
                            </h4>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-2">
                              {[
                                "address1",
                                "address2",
                                "address3",
                                "address4",
                              ].map((field) => (
                                <InputRow
                                  key={field}
                                  label={
                                    t(
                                      `customer.form.${field}`
                                    ) || field
                                  }
                                >
                                  <UnderlineInput
                                    name={field}
                                    value={
                                      editingAddress?.[
                                      field
                                      ] || ""
                                    }
                                    onChange={(e) =>
                                      setEditingAddress(
                                        (prev) => ({
                                          ...prev,
                                          [e.target.name]:
                                            e.target.value,
                                        })
                                      )
                                    }
                                    placeholder={`Enter ${field}`}
                                  />
                                </InputRow>
                              ))}
                            </div>
                            <div className="flex items-center gap-2 mt-3">
                              <input
                                type="checkbox"
                                id="Isdefault"
                                checked={
                                  editingAddress?.Isdefault ||
                                  false
                                }
                                onChange={(e) =>
                                  setEditingAddress((prev) => ({
                                    ...prev,
                                    Isdefault: e.target.checked,
                                  }))
                                }
                                className="h-4 w-4 rounded border-gray-300"
                              />
                              <label
                                htmlFor="Isdefault"
                                className="text-sm text-gray-700 dark:text-gray-300"
                              >
                                Set as default
                              </label>
                            </div>
                            <div className="mt-3 flex gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  handleSaveShippingAddress(
                                    editingAddress
                                  )
                                }
                                className="px-3 py-1.5 bg-teal-600 text-white text-sm rounded hover:bg-teal-700"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setShowAddressForm(false);
                                  setEditingAddress(null);
                                }}
                                className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="space-y-4">
                        {addModeShippingAddresses.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {addModeShippingAddresses.map((addr) => (
                              <div
                                key={addr.addressId}
                                className="border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-[#1e1e1e]"
                              >
                                <p className="text-sm text-gray-700 dark:text-gray-300">
                                  {addr.address1}
                                </p>
                                <p className="text-sm text-gray-700 dark:text-gray-300">
                                  {addr.address2}
                                </p>
                                <p className="text-sm text-gray-700 dark:text-gray-300">
                                  {addr.address3}
                                </p>
                                <p className="text-sm text-gray-700 dark:text-gray-300">
                                  {addr.address4}
                                </p>
                                <div className="flex justify-between items-center mt-2">
                                  <span className="text-xs">
                                    {addr.Isdefault && (
                                      <span className="main-bg px-2 py-0.5 rounded-full text-white text-xs">
                                        Default
                                      </span>
                                    )}
                                  </span>
                                  <div className="flex gap-2">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingAddress(addr);
                                        setShowAddressForm(true);
                                      }}
                                      className="text-blue-600 text-xs hover:underline"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleDeleteAddModeAddress(
                                          addr.addressId
                                        )
                                      }
                                      className="text-red-600 text-xs hover:underline"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-gray-500 text-sm">
                            No shipping addresses added yet.
                          </p>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setEditingAddress({
                              address1: "",
                              address2: "",
                              address3: "",
                              address4: "",
                              Isdefault: false,
                            });
                            setShowAddressForm(true);
                          }}
                          className="px-3 py-1.5 bg-teal-600 text-white text-sm rounded hover:bg-teal-700"
                        >
                          + Add New Address
                        </button>
                        {showAddressForm && (
                          <div className="border-t border-gray-300 dark:border-gray-600 pt-3 mt-3">
                            <h4 className="text-sm font-medium mb-3 text-gray-800 dark:text-gray-200">
                              {editingAddress
                                ? "Edit Address"
                                : "Add Address"}
                            </h4>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-2">
                              {[
                                "address1",
                                "address2",
                                "address3",
                                "address4",
                              ].map((field) => (
                                <InputRow
                                  key={field}
                                  label={
                                    t(
                                      `customer.form.${field}`
                                    ) || field
                                  }
                                >
                                  <UnderlineInput
                                    name={field}
                                    value={
                                      editingAddress?.[
                                      field
                                      ] || ""
                                    }
                                    onChange={(e) => {
                                      setEditingAddress(
                                        (prev) => {
                                          const updated = {
                                            ...(prev || {}),
                                            [e.target.name]:
                                              e.target.value,
                                          };
                                          return updated;
                                        }
                                      )
                                    }}
                                    placeholder={`Enter ${field}`}
                                  />
                                </InputRow>
                              ))}
                            </div>
                            <div className="flex items-center gap-2 mt-3">
                              <input
                                type="checkbox"
                                id="Isdefault"
                                checked={
                                  editingAddress?.Isdefault ||
                                  false
                                }
                                onChange={(e) => {
                                  setEditingAddress((prev) => ({
                                    ...(prev || {}),
                                    Isdefault: e.target.checked,
                                  }))
                                }}
                                className="h-4 w-4 rounded border-gray-300"
                              />
                              <label
                                htmlFor="Isdefault"
                                className="text-sm text-gray-700 dark:text-gray-300"
                              >
                                Set as default
                              </label>
                            </div>
                            <div className="mt-3 flex gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  if (!editingAddress) {
                                    return;
                                  }
                                  // Check if this is an update (already in the list)
                                  const isUpdating = editingAddress?.addressId && addModeShippingAddresses.some(a => a.addressId === editingAddress.addressId);

                                  if (isUpdating) {
                                    handleUpdateAddModeAddress(editingAddress);
                                  } else {
                                    handleAddAddressModeAddress(editingAddress);
                                  }
                                }}
                                className="px-3 py-1.5 bg-teal-600 text-white text-sm rounded hover:bg-teal-700"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setShowAddressForm(false);
                                  setEditingAddress(null);
                                }}
                                className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* REGISTRATION TAB */}
                {activeTab === "registration" && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 pb-2 border-b border-gray-200 dark:border-gray-600">
                      {t("customer.form.registrationDetails") ||
                        "Registration Details"}
                    </h3>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-2">
                      <InputRow
                        label={
                          t("customer.form.creditPeriod") ||
                          "Credit Period"
                        }
                      >
                        <UnderlineInput
                          name="creditPeriod"
                          value={formData.creditPeriod}
                          onChange={handleChange}
                          placeholder="Enter credit period (days)"
                          type="number"
                        />
                      </InputRow>
                      <InputRow
                        label={
                          t("customer.form.creditLimit") ||
                          "Credit Limit"
                        }
                      >
                        <UnderlineInput
                          name="creditLimit"
                          value={formData.creditLimit}
                          onChange={handleChange}
                          placeholder="Enter credit limit"
                          type="number"
                        />
                      </InputRow>
                      <InputRow
                        label={
                          t("customer.form.creditLimitStatus") ||
                          "Credit Status"
                        }
                      >
                        <div
                          className="relative"
                          ref={creditStatusDropdownRef}
                        >
                          <div className="relative flex items-center">
                            <input
                              type="text"
                              value={getOptionLabel(
                                creditStatusOptions,
                                formData.creditLimitStatus
                              )}
                              readOnly
                              placeholder="Select"
                              className="w-full px-0 py-1.5 bg-transparent border-0 border-b border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 focus:outline-none pr-8 text-sm cursor-pointer"
                              onClick={() =>
                                setShowCreditStatusDropdown(
                                  (prev) => !prev
                                )
                              }
                            />
                            <div className="absolute right-0">
                              <button
                                type="button"
                                onClick={() =>
                                  setShowCreditStatusDropdown(
                                    (prev) => !prev
                                  )
                                }
                                className="text-gray-400 hover:text-gray-600 p-0.5"
                              >
                                <ChevronDown
                                  size={14}
                                  className={`transition-transform ${showCreditStatusDropdown ? "rotate-180" : ""}`}
                                />
                              </button>
                            </div>
                          </div>
                          {showCreditStatusDropdown && (
                            <div className="absolute z-50 mt-1 w-full bg-white dark:bg-[#242424] border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-52 overflow-y-auto">
                              {creditStatusOptions.map((opt) => (
                                <button
                                  key={opt.value}
                                  type="button"
                                  onClick={() => {
                                    handleSelectChange(
                                      "creditLimitStatus",
                                      opt.value
                                    );
                                    setShowCreditStatusDropdown(
                                      false
                                    );
                                  }}
                                  className={`w-full text-left px-3 py-2 text-sm hover:bg-teal-50 dark:hover:bg-teal-900/30 text-gray-900 dark:text-gray-100 ${formData.creditLimitStatus === opt.value ? "bg-teal-50 font-medium" : ""}`}
                                >
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </InputRow>
                      {financeSettings?.MaintainBillbyBill && (
                        <InputRow
                          label={
                            t("customer.form.affectInventory") ||
                            "Bill by Bill"
                          }
                        >
                          <div
                            className="relative"
                            ref={billByBillDropdownRef}
                          >
                            <div className="relative flex items-center">
                              <input
                                type="text"
                                value={getOptionLabel(
                                  billByBillOptions,
                                  formData.billBybill
                                )}
                                readOnly
                                placeholder="Select"
                                className="w-full px-0 py-1.5 bg-transparent border-0 border-b border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 focus:outline-none pr-8 text-sm cursor-pointer"
                                onClick={() =>
                                  setShowBillByBillDropdown(
                                    (prev) => !prev
                                  )
                                }
                              />
                              <div className="absolute right-0">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setShowBillByBillDropdown(
                                      (prev) => !prev
                                    )
                                  }
                                  className="text-gray-400 hover:text-gray-600 p-0.5"
                                >
                                  <ChevronDown
                                    size={14}
                                    className={`transition-transform ${showBillByBillDropdown ? "rotate-180" : ""}`}
                                  />
                                </button>
                              </div>
                            </div>
                            {showBillByBillDropdown && (
                              <div className="absolute z-50 mt-1 w-full bg-white dark:bg-[#242424] border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-52 overflow-y-auto">
                                {billByBillOptions.map((opt) => (
                                  <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => {
                                      handleSelectChange(
                                        "billBybill",
                                        opt.value
                                      );
                                      setShowBillByBillDropdown(
                                        false
                                      );
                                    }}
                                    className={`w-full text-left px-3 py-2 text-sm hover:bg-teal-50 dark:hover:bg-teal-900/30 text-gray-900 dark:text-gray-100 ${formData.billBybill?.toString() === opt.value ? "bg-teal-50 font-medium" : ""}`}
                                  >
                                    {opt.label}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </InputRow>
                      )}
                      <InputRow
                        label={
                          t("customer.form.pricingLevel") ||
                          "Pricing Level"
                        }
                      >
                        <div
                          className="relative"
                          ref={pricingLevelDropdownRef}
                        >
                          <div className="relative flex items-center">
                            <input
                              type="text"
                              value={
                                pricingLevel?.find(
                                  (p) =>
                                    p.PricingLevelId?.toString() ===
                                    formData.pricingLevelId?.toString()
                                )?.PricingLevelName || ""
                              }
                              readOnly
                              placeholder="Select"
                              className="w-full px-0 py-1.5 bg-transparent border-0 border-b border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 focus:outline-none pr-8 text-sm cursor-pointer"
                              onClick={() =>
                                setShowPricingLevelDropdown(
                                  (prev) => !prev
                                )
                              }
                            />
                            <div className="absolute right-0">
                              <button
                                type="button"
                                onClick={() =>
                                  setShowPricingLevelDropdown(
                                    (prev) => !prev
                                  )
                                }
                                className="text-gray-400 hover:text-gray-600 p-0.5"
                              >
                                <ChevronDown
                                  size={14}
                                  className={`transition-transform ${showPricingLevelDropdown ? "rotate-180" : ""}`}
                                />
                              </button>
                            </div>
                          </div>
                          {showPricingLevelDropdown && (
                            <div className="absolute z-50 mt-1 w-full bg-white dark:bg-[#242424] border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-52 overflow-y-auto">
                              {pricingLevel?.map((d) => (
                                <button
                                  key={d.PricingLevelId}
                                  type="button"
                                  onClick={() => {
                                    handleSelectChange(
                                      "pricingLevelId",
                                      d.PricingLevelId?.toString()
                                    );
                                    setShowPricingLevelDropdown(
                                      false
                                    );
                                  }}
                                  className={`w-full text-left px-3 py-2 text-sm hover:bg-teal-50 dark:hover:bg-teal-900/30 text-gray-900 dark:text-gray-100 ${formData.pricingLevelId?.toString() === d.PricingLevelId?.toString() ? "bg-teal-50 font-medium" : ""}`}
                                >
                                  {d.PricingLevelName}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </InputRow>
                      <InputRow
                        label={
                          t("customer.form.currency") || "Currency"
                        }
                      >
                        <div
                          className="relative"
                          ref={currencyDropdownRef}
                        >
                          <div className="relative flex items-center">
                            <input
                              type="text"
                              value={
                                currency?.find(
                                  (c) =>
                                    c.currencyId?.toString() ===
                                    formData.currencyId?.toString()
                                )?.currencyName || ""
                              }
                              readOnly
                              placeholder="Select"
                              className="w-full px-0 py-1.5 bg-transparent border-0 border-b border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 focus:outline-none pr-8 text-sm cursor-pointer"
                              onClick={() =>
                                setShowCurrencyDropdown(
                                  (prev) => !prev
                                )
                              }
                            />
                            <div className="absolute right-0">
                              <button
                                type="button"
                                onClick={() =>
                                  setShowCurrencyDropdown(
                                    (prev) => !prev
                                  )
                                }
                                className="text-gray-400 hover:text-gray-600 p-0.5"
                              >
                                <ChevronDown
                                  size={14}
                                  className={`transition-transform ${showCurrencyDropdown ? "rotate-180" : ""}`}
                                />
                              </button>
                            </div>
                          </div>
                          {showCurrencyDropdown && (
                            <div className="absolute z-50 mt-1 w-full bg-white dark:bg-[#242424] border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-52 overflow-y-auto">
                              {currency?.map((c) => (
                                <button
                                  key={c.currencyId}
                                  type="button"
                                  onClick={() => {
                                    handleSelectChange(
                                      "currencyId",
                                      c.currencyId?.toString()
                                    );
                                    setShowCurrencyDropdown(
                                      false
                                    );
                                  }}
                                  className={`w-full text-left px-3 py-2 text-sm hover:bg-teal-50 dark:hover:bg-teal-900/30 text-gray-900 dark:text-gray-100 ${formData.currencyId?.toString() === c.currencyId?.toString() ? "bg-teal-50 font-medium" : ""}`}
                                >
                                  {c.currencyName}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </InputRow>
                    </div>
                  </div>
                )}

                {/* CONTACT TAB */}
                {activeTab === "contact" && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 pb-2 border-b border-gray-200 dark:border-gray-600">
                      {t("customer.form.contactDetails") ||
                        "Contact Details"}
                    </h3>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-2">
                      <InputRow
                        label={
                          t("customer.form.phoneNo") || "Phone"
                        }
                      >
                        <UnderlineInput
                          name="phoneNo"
                          value={formData.phoneNo}
                          onChange={handleChange}
                          placeholder="Enter phone number"
                        />
                      </InputRow>
                      <InputRow
                        label={t("customer.form.faxNo") || "Fax"}
                      >
                        <UnderlineInput
                          name="faxNo"
                          value={formData.faxNo}
                          onChange={handleChange}
                          placeholder="Enter fax number"
                        />
                      </InputRow>
                      <InputRow
                        label={t("customer.form.email") || "Email"}
                      >
                        <UnderlineInput
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          placeholder="Enter email address"
                          type="email"
                        />
                      </InputRow>
                    </div>
                  </div>
                )}

                {/* ACCOUNTING TAB */}
                {activeTab === "accounting" && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 pb-2 border-b border-gray-200 dark:border-gray-600">
                      {t("customer.form.openingDetails") ||
                        "Opening Details"}
                    </h3>
                    {branches && branches.length > 1 ? (
                      <div className="border border-gray-300 dark:border-gray-600 rounded overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
                          <thead className="bg-gray-100 dark:bg-[#1e1e1e]">
                            <tr>
                              <th className="px-3 py-1.5 text-left text-xs font-medium text-gray-600 uppercase w-10">
                                <input
                                  type="checkbox"
                                  checked={
                                    branches &&
                                    selectedBranches.length ===
                                    branches.length
                                  }
                                  onChange={(e) => {
                                    if (
                                      e.target.checked &&
                                      branches
                                    ) {
                                      const all = branches.map(
                                        (b) =>
                                          String(b.branchId)
                                      );
                                      setSelectedBranches(all);
                                      const d = {};
                                      all.forEach((id) => {
                                        d[id] =
                                          branchDetails[id] || {
                                            openingBalance: "",
                                            crOrDr:
                                              type ===
                                                "customer"
                                                ? "2"
                                                : "1",
                                          };
                                      });
                                      setBranchDetails(d);
                                    } else {
                                      setSelectedBranches([]);
                                      setBranchDetails({});
                                    }
                                  }}
                                  className="h-3.5 w-3.5 rounded border-gray-300 text-teal-600"
                                />
                              </th>
                              <th className="px-3 py-1.5 text-left text-xs font-medium text-gray-600 uppercase">
                                Branch
                              </th>
                              <th className="px-3 py-1.5 text-left text-xs font-medium text-gray-600 uppercase">
                                Opening Balance
                              </th>
                              <th className="px-3 py-1.5 text-left text-xs font-medium text-gray-600 uppercase w-28">
                                Cr/Dr
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white dark:bg-[#242424] divide-y divide-gray-200 dark:divide-gray-600">
                            {branches?.map((branch) => {
                              const bid = String(
                                branch.branchId
                              );
                              const sel =
                                selectedBranches.includes(bid);
                              return (
                                <tr
                                  key={branch.branchId}
                                  className={
                                    sel
                                      ? "bg-teal-50 dark:bg-teal-900/20"
                                      : "hover:bg-gray-50 dark:hover:bg-gray-700"
                                  }
                                >
                                  <td className="px-3 py-1.5">
                                    <input
                                      type="checkbox"
                                      checked={sel}
                                      onChange={() =>
                                        handleBranchToggle(
                                          branch.branchId
                                        )
                                      }
                                      className="h-3.5 w-3.5 rounded border-gray-300 text-teal-600"
                                    />
                                  </td>
                                  <td className="px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100">
                                    {branch.branchCode}
                                  </td>
                                  <td className="px-3 py-1.5">
                                    <input
                                      type="number"
                                      value={branchDetails[bid]?.openingBalance || ""}
                                      onChange={(e) =>
                                        handleBranchDetailChange(
                                          bid,
                                          "openingBalance",
                                          e.target.value
                                        )
                                      }
                                      onBlur={() =>
                                        handleBranchDetailBlur(
                                          bid,
                                          "openingBalance"
                                        )
                                      }
                                      disabled={!sel}
                                      className="w-full px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#1e1e1e] text-gray-900 dark:text-gray-100 disabled:bg-gray-100 disabled:cursor-not-allowed"
                                      placeholder={(0).toFixed(generalSettings?.decimalPart ?? 2)}
                                    />
                                  </td>
                                  <td className="px-3 py-1.5">
                                    <select
                                      value={
                                        branchDetails[bid]
                                          ?.crOrDr || ""
                                      }
                                      onChange={(e) =>
                                        handleBranchDetailChange(
                                          bid,
                                          "crOrDr",
                                          e.target.value
                                        )
                                      }
                                      disabled={!sel}
                                      className="w-full px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#1e1e1e] disabled:bg-gray-100 disabled:cursor-not-allowed"
                                    >
                                      <option value="">
                                        Select
                                      </option>
                                      <option value="1">
                                        Credit
                                      </option>
                                      <option value="2">
                                        Debit
                                      </option>
                                    </select>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : branches && branches.length === 1 ? (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-2">
                        <InputRow
                          label={
                            t(
                              "customer.form.openingBalance"
                            ) || "Opening Balance"
                          }
                        >
                          <input
                            type="text"
                            value={branchDetails[String(branches[0].branchId)]?.openingBalance || ""}
                            onChange={(e) =>
                              handleBranchDetailChange(
                                String(branches[0].branchId),
                                "openingBalance",
                                e.target.value
                              )
                            }
                            onBlur={() =>
                              handleBranchDetailBlur(
                                String(branches[0].branchId),
                                "openingBalance"
                              )
                            }
                            placeholder={(0).toFixed(generalSettings?.decimalPart ?? 2)}
                            className="w-full px-0 py-1.5 bg-transparent border-0 border-b border-gray-300 dark:border-gray-600 
             text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500
             focus:outline-none focus:border-gray-900 dark:focus:border-gray-300 text-sm transition-colors"
                          />
                        </InputRow>
                        <InputRow
                          label={
                            t("customer.form.crOrDr") ||
                            "Credit/Debit"
                          }
                        >
                          <div
                            className="relative"
                            ref={crDrDropdownRef}
                          >
                            <div className="relative flex items-center">
                              <input
                                type="text"
                                value={getOptionLabel(
                                  crDrOptions,
                                  branchDetails[
                                    String(
                                      branches[0].branchId
                                    )
                                  ]?.crOrDr
                                )}
                                readOnly
                                placeholder="Select"
                                className="w-full px-0 py-1.5 bg-transparent border-0 border-b border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 focus:outline-none pr-8 text-sm cursor-pointer"
                                onClick={() =>
                                  setShowCrDrDropdown(
                                    (prev) => !prev
                                  )
                                }
                              />
                              <div className="absolute right-0">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setShowCrDrDropdown(
                                      (prev) => !prev
                                    )
                                  }
                                  className="text-gray-400 hover:text-gray-600 p-0.5"
                                >
                                  <ChevronDown
                                    size={14}
                                    className={`transition-transform ${showCrDrDropdown ? "rotate-180" : ""}`}
                                  />
                                </button>
                              </div>
                            </div>
                            {showCrDrDropdown && (
                              <div className="absolute z-50 mt-1 w-full bg-white dark:bg-[#242424] border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-52 overflow-y-auto">
                                {crDrOptions.map((opt) => (
                                  <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => {
                                      handleBranchDetailChange(
                                        String(
                                          branches[0]
                                            .branchId
                                        ),
                                        "crOrDr",
                                        opt.value
                                      );
                                      setShowCrDrDropdown(
                                        false
                                      );
                                    }}
                                    className={`w-full text-left px-3 py-2 text-sm hover:bg-teal-50 dark:hover:bg-teal-900/30 text-gray-900 dark:text-gray-100 ${branchDetails[String(branches[0].branchId)]?.crOrDr === opt.value ? "bg-teal-50 font-medium" : ""}`}
                                  >
                                    {opt.label}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </InputRow>
                      </div>
                    ) : null}
                    {selectedBranches.length === 0 &&
                      branches &&
                      branches.length > 1 && (
                        <p className="text-xs text-red-500">
                          Please select at least one branch
                        </p>
                      )}
                  </div>
                )}

                {/* DOCUMENTS TAB */}
                {activeTab === "documents" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-gray-200 dark:border-gray-600">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {t("Documents") || "Documents"}
                        {totalDocCount > 0 && (
                          <span className="ml-2 text-xs font-normal text-gray-500">
                            ({totalDocCount} document
                            {totalDocCount !== 1 ? "s" : ""})
                          </span>
                        )}
                      </h3>
                      <button
                        type="button"
                        onClick={handleAddDocument}
                        className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-teal-700 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 dark:text-teal-400 dark:bg-teal-900/20 dark:border-teal-800 dark:hover:bg-teal-900/40 transition-colors"
                      >
                        <Plus size={14} /> Add New
                      </button>
                    </div>

                    <div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
                      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
                        <thead className="bg-gray-100 dark:bg-[#1e1e1e]">
                          <tr>
                            <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase w-8">
                              #
                            </th>
                            <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">
                              Document Name
                            </th>
                            <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">
                              File
                            </th>
                            <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase w-36">
                              Action
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-[#242424] divide-y divide-gray-200 dark:divide-gray-600">
                          {/* Existing documents */}
                          {existingDocuments.map((doc, index) => {
                            const isDeleted =
                              deletedDocumentIds.includes(
                                doc.documentId
                              );
                            const replacement =
                              replacementFiles[doc.documentId];
                            return (
                              <tr
                                key={`existing-${doc.documentId}`}
                                className={`${isDeleted ? "bg-red-50/50 dark:bg-red-900/10 opacity-60" : replacement ? "bg-amber-50/50 dark:bg-amber-900/10" : "hover:bg-gray-50 dark:hover:bg-gray-700/30"}`}
                              >
                                <td className="px-4 py-3 text-sm text-gray-500">
                                  {index + 1}
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2">
                                    <FileText
                                      size={16}
                                      className={`flex-shrink-0 ${isDeleted ? "text-red-400" : "text-blue-500"}`}
                                    />
                                    <span
                                      className={`text-sm font-medium ${isDeleted ? "line-through text-gray-400" : "text-gray-900 dark:text-gray-100"}`}
                                    >
                                      {doc.document_name ||
                                        "Unnamed"}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  {isDeleted ? (
                                    <span className="text-sm text-red-400 italic">
                                      Will be deleted
                                    </span>
                                  ) : replacement ? (
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm text-amber-700 dark:text-amber-400 truncate max-w-[200px]">
                                        🔄{" "}
                                        {replacement.fileName}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleRemoveReplacement(
                                            doc.documentId
                                          )
                                        }
                                        className="text-xs text-gray-500 hover:text-gray-700 underline"
                                      >
                                        Undo
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm text-gray-600 dark:text-gray-300 truncate max-w-[200px]">
                                        📎{" "}
                                        {doc.fileName ||
                                          "File"}
                                      </span>
                                      {doc.filePath && (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleViewDocument(
                                              doc.filePath
                                            )
                                          }
                                          className="p-1 rounded text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                                          title="View"
                                        >
                                          <Eye size={14} />
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </td>
                                <td className="px-4 py-3">
                                  {isDeleted ? (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleUndoDeleteExistingDocument(
                                          doc.documentId
                                        )
                                      }
                                      className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors font-medium"
                                    >
                                      Undo
                                    </button>
                                  ) : (
                                    <div className="flex items-center gap-1">
                                      <input
                                        ref={(el) =>
                                        (replaceFileInputRefs.current[
                                          doc.documentId
                                        ] = el)
                                        }
                                        type="file"
                                        className="hidden"
                                        onChange={(e) =>
                                          handleReplaceExistingDocument(
                                            doc.documentId,
                                            e
                                          )
                                        }
                                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                      />
                                      <button
                                        type="button"
                                        onClick={() =>
                                          replaceFileInputRefs.current[
                                            doc.documentId
                                          ]?.click()
                                        }
                                        className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                                        title="Replace"
                                      >
                                        <RefreshCw
                                          size={13}
                                        />{" "}
                                        Replace
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleDeleteExistingDocument(
                                            doc.documentId
                                          )
                                        }
                                        className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                        title="Delete"
                                      >
                                        <Trash2 size={13} />{" "}
                                        Delete
                                      </button>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            );
                          })}

                          {/* VAT Row */}
                          <tr
                            className={
                              vatDocument
                                ? "bg-teal-50/50 dark:bg-teal-900/10"
                                : ""
                            }
                          >
                            <td className="px-4 py-3 text-sm text-gray-500">
                              {existingDocuments.length + 1}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <FileText
                                  size={16}
                                  className="text-teal-600 flex-shrink-0"
                                />
                                <input
                                  type="text"
                                  value="VAT Document"
                                  disabled
                                  className="w-full px-2 py-1.5 text-sm rounded border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 cursor-not-allowed"
                                />
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              {vatDocument ? (
                                <div className="flex items-center gap-2">
                                  <span className="text-sm text-teal-700 truncate max-w-[200px]">
                                    📎 {vatDocument.fileName}
                                  </span>
                                  <label className="cursor-pointer text-xs text-blue-600 hover:underline">
                                    Change
                                    <input
                                      type="file"
                                      className="hidden"
                                      onChange={
                                        handleVatDocumentChange
                                      }
                                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                    />
                                  </label>
                                </div>
                              ) : (
                                <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 text-sm border border-dashed border-gray-300 dark:border-gray-600 rounded-md text-gray-500 hover:border-teal-400 hover:text-teal-600 hover:bg-teal-50 transition-all">
                                  <Upload size={14} />
                                  <span>Choose file</span>
                                  <input
                                    type="file"
                                    className="hidden"
                                    onChange={
                                      handleVatDocumentChange
                                    }
                                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                  />
                                </label>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {vatDocument && (
                                <button
                                  type="button"
                                  onClick={
                                    handleRemoveVatDocument
                                  }
                                  className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                >
                                  <Trash2 size={13} /> Delete
                                </button>
                              )}
                            </td>
                          </tr>

                          {/* CR Row */}
                          <tr
                            className={
                              crDocument
                                ? "bg-teal-50/50 dark:bg-teal-900/10"
                                : ""
                            }
                          >
                            <td className="px-4 py-3 text-sm text-gray-500">
                              {existingDocuments.length + 2}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <FileText
                                  size={16}
                                  className="text-teal-600 flex-shrink-0"
                                />
                                <input
                                  type="number"
                                  value="CR Document"
                                  disabled
                                  className="w-full px-2 py-1.5 text-sm rounded border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 cursor-not-allowed"
                                />
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              {crDocument ? (
                                <div className="flex items-center gap-2">
                                  <span className="text-sm text-teal-700 truncate max-w-[200px]">
                                    📎 {crDocument.fileName}
                                  </span>
                                  <label className="cursor-pointer text-xs text-blue-600 hover:underline">
                                    Change
                                    <input
                                      type="file"
                                      className="hidden"
                                      onChange={
                                        handleCrDocumentChange
                                      }
                                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                    />
                                  </label>
                                </div>
                              ) : (
                                <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 text-sm border border-dashed border-gray-300 dark:border-gray-600 rounded-md text-gray-500 hover:border-teal-400 hover:text-teal-600 hover:bg-teal-50 transition-all">
                                  <Upload size={14} />
                                  <span>Choose file</span>
                                  <input
                                    type="file"
                                    className="hidden"
                                    onChange={
                                      handleCrDocumentChange
                                    }
                                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                  />
                                </label>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {crDocument && (
                                <button
                                  type="button"
                                  onClick={
                                    handleRemoveCrDocument
                                  }
                                  className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                >
                                  <Trash2 size={13} /> Delete
                                </button>
                              )}
                            </td>
                          </tr>

                          {/* Custom new docs */}
                          {documents.map((doc, index) => (
                            <tr
                              key={`new-${index}`}
                              className={
                                doc.file
                                  ? "bg-teal-50/50 dark:bg-teal-900/10"
                                  : ""
                              }
                            >
                              <td className="px-4 py-3 text-sm text-gray-500">
                                {existingDocuments.length +
                                  3 +
                                  index}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <FileText
                                    size={16}
                                    className="text-gray-400 flex-shrink-0"
                                  />
                                  <input
                                    type="text"
                                    value={doc.document_name}
                                    onChange={(e) =>
                                      handleDocumentNameChange(
                                        index,
                                        e.target.value
                                      )
                                    }
                                    placeholder="Enter document name"
                                    className="w-full px-2 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#1e1e1e] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-teal-500"
                                  />
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                {doc.file ? (
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm text-teal-700 truncate max-w-[200px]">
                                      📎 {doc.fileName}
                                    </span>
                                    <label className="cursor-pointer text-xs text-blue-600 hover:underline">
                                      Change
                                      <input
                                        type="file"
                                        className="hidden"
                                        onChange={(e) =>
                                          handleDocumentFileChange(
                                            index,
                                            e
                                          )
                                        }
                                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                      />
                                    </label>
                                  </div>
                                ) : (
                                  <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 text-sm border border-dashed border-gray-300 dark:border-gray-600 rounded-md text-gray-500 hover:border-teal-400 hover:text-teal-600 hover:bg-teal-50 transition-all">
                                    <Upload size={14} />
                                    <span>Choose file</span>
                                    <input
                                      type="file"
                                      className="hidden"
                                      onChange={(e) =>
                                        handleDocumentFileChange(
                                          index,
                                          e
                                        )
                                      }
                                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                    />
                                  </label>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleRemoveDocument(index)
                                  }
                                  className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                >
                                  <Trash2 size={13} /> Delete
                                </button>
                              </td>
                            </tr>
                          ))}

                          {existingDocuments.length === 0 &&
                            !vatDocument &&
                            !crDocument &&
                            documents.length === 0 && (
                              <tr>
                                <td
                                  colSpan={4}
                                  className="px-4 py-8 text-center text-sm text-gray-500"
                                >
                                  No documents added yet. Click
                                  "Add New" to attach documents.
                                </td>
                              </tr>
                            )}
                        </tbody>
                      </table>
                    </div>

                    {deletedDocumentIds.length > 0 && (
                      <p className="text-xs text-amber-600 dark:text-amber-400">
                        ⚠️ {deletedDocumentIds.length} document
                        {deletedDocumentIds.length !== 1
                          ? "s"
                          : ""}{" "}
                        marked for deletion. Changes will apply
                        when you save.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {error && (
              <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded px-2 py-1.5 mt-3">
                {error}
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default CustomerAndSupplierForm;