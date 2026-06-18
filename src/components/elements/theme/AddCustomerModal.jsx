import { Modal, Fade, Box, useMediaQuery } from "@mui/material";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import axiosInstance from "@/lib/axiosConfig";
import { useEffect, useState, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import useAuth from "@/redux/hook/auth/useAuth";
import { useSelector } from "react-redux";
import Swal from "sweetalert2";
import {
  ChevronDown,
  Paperclip,
  Trash2,
  Plus,
  FileText,
  Upload,
  Eye,
  RefreshCw,
} from "lucide-react";
import { MdGTranslate } from "react-icons/md";
import { AllCountries } from "../../../../public/assets/js/voucherTypes";

/* ─── tiny helpers ─────────────────────────────────────────────────────────── */
const getFileViewUrl = (filePath) => {
  if (!filePath) return "";
  if (filePath.startsWith("http")) return filePath;
  const base = (axiosInstance.defaults.baseURL || "").replace(/\/api\/?$/, "");
  return `${base}/storage/${filePath}`;
};

const UnderlineInput = ({ name, value, onChange, onBlur, onKeyDown, placeholder, type = "text", required, disabled }) => (
  <input
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
);

const InputRow = ({ label, required, children, error }) => (
  <div className="grid grid-cols-[150px_1fr] items-center gap-3">
    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <div>
      {children}
      {error && <p className="text-xs text-red-500 mt-0.5">{error}</p>}
    </div>
  </div>
);

/* ─── custom dropdown ───────────────────────────────────────────────────────── */
const CustomDropdown = ({ dropdownRef, value, options, onChange, placeholder, show, setShow }) => (
  <div className="relative" ref={dropdownRef}>
    <div className="relative flex items-center">
      <input
        type="text"
        value={options?.find((o) => o.value?.toString() === value?.toString())?.label || ""}
        readOnly
        placeholder={placeholder}
        className="w-full px-0 py-1.5 bg-transparent border-0 border-b border-gray-300 dark:border-gray-600
                   text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none
                   focus:border-gray-900 dark:focus:border-gray-300 pr-8 text-sm transition-colors cursor-pointer"
        onClick={() => setShow((p) => !p)}
      />
      <button type="button" onClick={() => setShow((p) => !p)} className="absolute right-0 text-gray-400 hover:text-gray-600 p-0.5">
        <ChevronDown size={14} className={`transition-transform ${show ? "rotate-180" : ""}`} />
      </button>
    </div>
    {show && (
      <div className="absolute z-50 mt-1 w-full bg-white dark:bg-[#242424] border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-52 overflow-y-auto">
        {options?.map((opt) => (
          <button
            key={opt.value?.toString()}
            type="button"
            onClick={() => { onChange(opt.value); setShow(false); }}
            className={`w-full text-left px-3 py-2 text-sm hover:bg-teal-50 dark:hover:bg-teal-900/30 text-gray-900 dark:text-gray-100
                        ${value?.toString() === opt.value?.toString() ? "bg-teal-50 dark:bg-teal-900/20 font-medium" : ""}`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    )}
  </div>
);

/* ═══════════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════════════════════════════════ */
const AddCustomerModal = ({
  open,
  handleClose,
  onSuccess,
  editMode = false,
  customerId = null,
  type = "customer",
  currency = [],
  accountGroups = [],
  pricingLevel = [],
}) => {
  const { t } = useTranslation();
  const {
    selectedBranchId,
    userId,
    currentFinancialYear,
    currentCurrencyConversion,
    branches,
    currentCurrency,
  } = useAuth();
  const { financeSettings, generalSettings } = useSelector((s) => s.settings);

  const isMobile = useMediaQuery("(max-width:600px)");
  const isCustomer = type === "customer";
  const isEditMode = Boolean(customerId) && editMode;

  /* ── abort refs ── */
  const abortRef = useRef(null);
  const translateAbortRef = useRef(null);
  const isMountedRef = useRef(true);
  const vatFileInputRef = useRef(null);
  const crFileInputRef = useRef(null);
  const nameFlInputRef = useRef(null);
  const replaceFileInputRefs = useRef({});

  /* ── dropdown refs ── */
  const groupDropdownRef = useRef(null);
  const ledgerTypeDropdownRef = useRef(null);
  const creditStatusDropdownRef = useRef(null);
  const billByBillDropdownRef = useRef(null);
  const pricingLevelDropdownRef = useRef(null);
  const currencyDropdownRef = useRef(null);
  const crDrDropdownRef = useRef(null);
  const countryDropdownRef = useRef(null);

  /* ── dropdown visibility ── */
  const [showGroup, setShowGroup] = useState(false);
  const [showLedgerType, setShowLedgerType] = useState(false);
  const [showCreditStatus, setShowCreditStatus] = useState(false);
  const [showBillByBill, setShowBillByBill] = useState(false);
  const [showPricingLevel, setShowPricingLevel] = useState(false);
  const [showCurrency, setShowCurrency] = useState(false);
  const [showCrDr, setShowCrDr] = useState(false);
  const [showCountry, setShowCountry] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");

  /* ── ui state ── */
  const [activeTab, setActiveTab] = useState("address");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [errors, setErrors] = useState({});
  const [translating, setTranslating] = useState(false);

  /* ── shipping addresses ── */
  const [shippingAddresses, setShippingAddresses] = useState([]);
  const [addModeShippingAddresses, setAddModeShippingAddresses] = useState([]);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);

  /* ── branch state ── */
  const [selectedBranches, setSelectedBranches] = useState([]);
  const [branchDetails, setBranchDetails] = useState({});

  /* ── document state ── */
  const [documents, setDocuments] = useState([]);
  const [vatDocument, setVatDocument] = useState(null);
  const [crDocument, setCrDocument] = useState(null);
  const [existingDocuments, setExistingDocuments] = useState([]);
  const [replacementFiles, setReplacementFiles] = useState({});
  const [deletedDocumentIds, setDeletedDocumentIds] = useState([]);

  /* ── form data ── */
  const buildInitialForm = useCallback(() => ({
    ledgerCode: "",
    customerName: "",
    nameFL: "",
    ledgerType: isCustomer ? "Customer" : "Supplier",
    groupId: isCustomer ? "44" : "43",
    additionalNo: "",
    postboxNo: "",
    cityName: "",
    country: currentCurrency?.currencySymbol === "SAR" ? "Saudi Arabia" : "",
    countryArb: currentCurrency?.currencySymbol === "SAR" ? "المملكة العربية السعودية" : "",
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
    BuildingNo: "",
    StreetName: "",
    District: "",
    buildingNoArb: "",
    streetNameArb: "",
    cityNameArb: "",
    districtArb: "",
    additionalNoArb: "",
    postboxNoArb: "",
    addressArabic: "",
    latitude: "",
    longitude: "",
    state: "",
    postalCode: "",
    routeId: "",
    areaId: "",
    exchangeDate: currentCurrencyConversion?.date,
    exchangeRate: currentCurrencyConversion?.rate,
    currencyConversionId: currentCurrencyConversion?.currencyConversionId,
    activeFinancialYear_fromDate: currentFinancialYear?.fromDate,
    ShippingAddress: { address1: "", address2: "", address3: "", address4: "", Isdefault: false },
  }), [isCustomer, currentCurrency, financeSettings, currentCurrencyConversion, currentFinancialYear]);

  const [formData, setFormData] = useState(buildInitialForm);

  /* ── close outside dropdowns ── */
  useEffect(() => {
    const handle = (e) => {
      const pairs = [
        [groupDropdownRef, setShowGroup],
        [ledgerTypeDropdownRef, setShowLedgerType],
        [creditStatusDropdownRef, setShowCreditStatus],
        [billByBillDropdownRef, setShowBillByBill],
        [pricingLevelDropdownRef, setShowPricingLevel],
        [currencyDropdownRef, setShowCurrency],
        [crDrDropdownRef, setShowCrDr],
        [countryDropdownRef, setShowCountry],
      ];
      pairs.forEach(([ref, setter]) => {
        if (ref.current && !ref.current.contains(e.target)) setter(false);
      });
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  /* ── generate ledger code ── */
  const generateLedgerCode = useCallback(async (signal) => {
    if (!selectedBranchId || isEditMode) return;
    try {
      const res = await axiosInstance.post(
        "generate-ledger-code",
        { branchId: selectedBranchId, groupId: isCustomer ? "44" : "43" },
        { signal }
      );
      if (!signal?.aborted && res.data?.data)
        setFormData((p) => ({ ...p, ledgerCode: res.data.data }));
    } catch (err) {
      if (err.name !== "AbortError" && err.name !== "CanceledError") console.error(err);
    }
  }, [selectedBranchId, isCustomer, isEditMode]);

  /* ── fetch customer for edit ── */
  const fetchCustomerData = useCallback(async (signal) => {
    if (!customerId) return;
    try {
      const res = await axiosInstance.get(`get-account-ledger-byId/${customerId}`, { signal });
      if (signal?.aborted) return;
      const data = res.data?.data;
      if (!data) throw new Error("No data");

      /* branches */
      if (Array.isArray(data.branchId)) {
        const ids = data.branchId.map((b) => String(b.branchId));
        setSelectedBranches(ids);
        const details = {};
        data.branchId.forEach((b) => {
          details[String(b.branchId)] = {
            openingBalance: b.openingBalance?.toString() || "",
            crOrDr: b.crOrDr === "Cr" ? "1" : "2",
          };
        });
        setBranchDetails(details);
      }

      /* addresses */
      const addresses = data.shipping_address || [];
      setShippingAddresses(addresses);
      const defaultAddr = addresses.find((a) => a.Isdefault) || {};

      /* documents */
      const rawDocs = data.ledger_documents || data.document || data.documents || [];
      setExistingDocuments(
        rawDocs.map((doc, i) => {
          const filePath = doc.file || doc.filePath || doc.file_path || "";
          return {
            documentId: doc.id || doc.documentId || `existing-${i}`,
            document_name: doc.document_name || doc.documentName || doc.name || "",
            fileName: filePath ? filePath.split("/").pop() : doc.fileName || "",
            filePath,
            branchId: doc.branchId || null,
          };
        })
      );
      setReplacementFiles({});
      setDeletedDocumentIds([]);

      setFormData({
        ledgerCode: data.ledgerCode || "",
        customerName: data.ledgerName || "",
        nameFL: data.nameArb || "",
        ledgerType: isCustomer ? "Customer" : "Supplier",
        groupId: data.groupId?.toString() || (isCustomer ? "44" : "43"),
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
        buildingNoArb: data.BuildingNoArb || "",
        streetNameArb: data.StreetNameArb || "",
        cityNameArb: data.CityNameArb || "",
        districtArb: data.DistrictArb || "",
        District: data.District || "",
        countryArb: data.CountryArb || "",
        additionalNoArb: data.AdditionalNoArb || "",
        postboxNoArb: data.PostboxNoArb || "",
        addressArabic: data.AddressArabic || "",
        latitude: data.latitude?.toString() || "",
        longitude: data.longitude?.toString() || "",
        state: data.state || "",
        postalCode: data.postal_code || data.postalCode || "",
        routeId: data.routeId?.toString() || "",
        areaId: data.areaId || "",
        exchangeDate: currentCurrencyConversion?.date,
        exchangeRate: currentCurrencyConversion?.rate,
        currencyConversionId: currentCurrencyConversion?.currencyConversionId,
        activeFinancialYear_fromDate: currentFinancialYear?.fromDate,
        ShippingAddress: {
          address1: defaultAddr.address1 || "",
          address2: defaultAddr.address2 || "",
          address3: defaultAddr.address3 || "",
          address4: defaultAddr.address4 || "",
          Isdefault: defaultAddr.Isdefault ?? false,
        },
      });
    } catch (err) {
      if (err.name === "AbortError" || err.name === "CanceledError") return;
      setSubmitError(t("AddNewLedgerModal.messages.loadDataFailed"));
    }
  }, [customerId, isCustomer, currentCurrency, currentCurrencyConversion, currentFinancialYear, t]);

  /* ── open effect ── */
  useEffect(() => {
    if (!open) return;
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();
    const signal = abortRef.current.signal;

    setSubmitError(null);
    setErrors({});
    setActiveTab("address");

    const init = async () => {
      setIsLoading(true);
      try {
        if (isEditMode) {
          await fetchCustomerData(signal);
        } else {
          setFormData(buildInitialForm());
          setShippingAddresses([]);
          setAddModeShippingAddresses([]);
          setDocuments([]);
          setVatDocument(null);
          setCrDocument(null);
          setExistingDocuments([]);

          /* auto-select all branches */
          if (branches?.length) {
            const ids = branches.map((b) => String(b.branchId));
            setSelectedBranches(ids);
            const d = {};
            ids.forEach((id) => {
              d[id] = { openingBalance: "", crOrDr: isCustomer ? "2" : "1" };
            });
            setBranchDetails(d);
          }
          await generateLedgerCode(signal);
        }
      } finally {
        if (!signal.aborted) setIsLoading(false);
      }
    };
    init();

    return () => { if (abortRef.current) abortRef.current.abort(); };
  }, [open, isEditMode, customerId]);

  /* ── handlers ── */
  const handleChange = (e) => {
    const { name, value, type: t2, checked } = e.target;
    setFormData((prev) => {
      if (name in prev.ShippingAddress)
        return { ...prev, ShippingAddress: { ...prev.ShippingAddress, [name]: t2 === "checkbox" ? checked : value } };
      if (name === "customerName" && value.length > 0)
        return { ...prev, [name]: value.charAt(0).toUpperCase() + value.slice(1) };
      return { ...prev, [name]: value };
    });
  };

  const handleSelect = (name, value) => setFormData((p) => ({ ...p, [name]: value }));

  const handleTranslate = useCallback(async () => {
    const text = formData.customerName?.trim();
    if (!text) return;
    if (translateAbortRef.current) translateAbortRef.current.abort();
    translateAbortRef.current = new AbortController();
    setTranslating(true);
    try {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=ar&dt=t&q=${encodeURIComponent(text)}`;
      const res = await fetch(url, { signal: translateAbortRef.current.signal });
      const data = await res.json();
      setFormData((p) => ({ ...p, nameFL: data?.[0]?.[0]?.[0] || "" }));
      setTimeout(() => nameFlInputRef.current?.focus(), 100);
    } catch (e) {
      if (e.name !== "AbortError") console.error(e);
    } finally {
      setTranslating(false);
    }
  }, [formData.customerName]);

  const handleAddressTranslate = useCallback(async (engField, arbField) => {
    const text = formData[engField]?.trim();
    if (!text) return;
    if (translateAbortRef.current) translateAbortRef.current.abort();
    translateAbortRef.current = new AbortController();
    try {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=ar&dt=t&q=${encodeURIComponent(text)}`;
      const res = await fetch(url, { signal: translateAbortRef.current.signal });
      const data = await res.json();
      setFormData((p) => ({ ...p, [arbField]: data?.[0]?.[0]?.[0] || "" }));
    } catch (e) {
      if (e.name !== "AbortError") console.error(e);
    }
  }, [formData]);

  /* ── document handlers ── */
  const handleVatDocumentChange = (e) => {
    const f = e.target.files?.[0];
    if (f) setVatDocument({ file: f, fileName: f.name, document_name: "VAT Document" });
  };
  const handleCrDocumentChange = (e) => {
    const f = e.target.files?.[0];
    if (f) setCrDocument({ file: f, fileName: f.name, document_name: "CR Document" });
  };
  const handleRemoveVatDocument = () => { setVatDocument(null); if (vatFileInputRef.current) vatFileInputRef.current.value = ""; };
  const handleRemoveCrDocument = () => { setCrDocument(null); if (crFileInputRef.current) crFileInputRef.current.value = ""; };
  const handleAddDocument = () => setDocuments((p) => [...p, { document_name: "", file: null }]);
  const handleDocumentNameChange = (idx, val) =>
    setDocuments((p) => { const u = [...p]; u[idx] = { ...u[idx], document_name: val }; return u; });
  const handleDocumentFileChange = (idx, e) => {
    const f = e.target.files?.[0];
    if (f) setDocuments((p) => { const u = [...p]; u[idx] = { ...u[idx], file: f, fileName: f.name }; return u; });
  };
  const handleRemoveDocument = (idx) => setDocuments((p) => p.filter((_, i) => i !== idx));
  const handleDeleteExistingDocument = (id) => setDeletedDocumentIds((p) => [...p, id]);
  const handleUndoDeleteExistingDocument = (id) => setDeletedDocumentIds((p) => p.filter((x) => x !== id));
  const handleReplaceExistingDocument = (id, e) => {
    const f = e.target.files?.[0];
    if (f) setReplacementFiles((p) => ({ ...p, [id]: { file: f, fileName: f.name } }));
  };
  const handleRemoveReplacement = (id) => {
    setReplacementFiles((p) => { const u = { ...p }; delete u[id]; return u; });
    if (replaceFileInputRefs.current[id]) replaceFileInputRefs.current[id].value = "";
  };
  const handleViewDocument = (fp) => { const url = getFileViewUrl(fp); if (url) window.open(url, "_blank"); };

  /* ── branch handlers ── */
  const handleBranchToggle = (branchId) => {
    const id = String(branchId);
    setSelectedBranches((prev) => {
      if (prev.includes(id)) {
        setBranchDetails((d) => { const u = { ...d }; delete u[id]; return u; });
        return prev.filter((x) => x !== id);
      }
      setBranchDetails((d) => ({ ...d, [id]: { openingBalance: "", crOrDr: isCustomer ? "2" : "1" } }));
      return [...prev, id];
    });
  };
  const handleBranchDetailChange = (id, field, val) =>
    setBranchDetails((p) => ({ ...p, [id]: { ...p[id], [field]: val } }));
  const handleBranchDetailBlur = (id, field) => {
    if (field === "openingBalance")
      setBranchDetails((p) => ({
        ...p,
        [id]: { ...p[id], [field]: p[id]?.[field] ? parseFloat(p[id][field]).toFixed(generalSettings?.decimalPart ?? 2) : "" },
      }));
  };

  /* ── shipping address handlers ── */
  const handleSaveShippingAddress = useCallback(async (addressData) => {
    if (!addressData) return;
    const isEditing = Boolean(editingAddress?.addressId);
    const url = isEditing ? `update-shipping-address/${editingAddress.addressId}` : `save-shipping-address`;
    try {
      const res = await axiosInstance.post(url, { ledgerId: customerId, ...addressData, CreatedUser: userId, ModifiedUser: userId });
      if (!res.data?.error) {
        await fetchCustomerData(new AbortController().signal);
        setShowAddressForm(false);
        setEditingAddress(null);
      }
    } catch (e) { console.error(e); }
  }, [editingAddress, customerId, userId, fetchCustomerData]);

  const handleDeleteShippingAddress = async (addressId) => {
    try {
      await axiosInstance.get(`delete-shipping-address/${addressId}`);
      await fetchCustomerData(new AbortController().signal);
    } catch (e) { console.error(e); }
  };

  /* ── ZATCA validation ── */
  const isZatcaPhase2Customer =
    generalSettings?.zatcaType === "Phase 2" && isCustomer && formData.vatNumber !== "";

  /* ── submit ── */
  const handleSave = async (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!formData.customerName?.trim()) newErrors.customerName = t("requiredFieldsError") || "Required";
    if (!formData.ledgerCode?.trim()) newErrors.ledgerCode = t("requiredFieldsError") || "Required";
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }

    if (!selectedBranches.length) { setSubmitError("Please select at least one branch"); return; }

    if (editMode && generalSettings?.askConfirmationEdit) {
      const r = await Swal.fire({ title: "Update?", icon: "question", showCancelButton: true, confirmButtonText: "Yes, update", didOpen: () => { const c = document.querySelector(".swal2-container"); if (c) c.style.cssText += "; z-index: 2147483647 !important;"; } });
      if (!r.isConfirmed) return;
    } else if (!editMode && generalSettings?.askConfirmationSave) {
      const r = await Swal.fire({ title: "Save?", icon: "question", showCancelButton: true, confirmButtonText: "Yes, save", didOpen: () => { const c = document.querySelector(".swal2-container"); if (c) c.style.cssText += "; z-index: 2147483647 !important;"; } });
      if (!r.isConfirmed) return;
    }

    try {
      setIsSubmitting(true);
      setSubmitError(null);

      const branchDetailsArray = selectedBranches.map((id) => ({
        branchId: parseInt(id),
        openingBalance: parseFloat((parseFloat(branchDetails[id]?.openingBalance) || 0).toFixed(generalSettings?.decimalPart ?? 2)),
        crOrDr: branchDetails[id]?.crOrDr === "1" ? "Cr" : "Dr",
      }));

      /* build document metadata */
      const allDocMeta = [];
      const allDocFiles = [];

      existingDocuments.forEach((doc) => {
        const isDeleted = deletedDocumentIds.includes(doc.documentId);
        const replacement = replacementFiles[doc.documentId];
        if (isDeleted) return;
        if (replacement) {
          allDocMeta.push({ fileName: replacement.fileName, document_name: doc.document_name, branchId: doc.branchId || Number(selectedBranchId), hasNewFile: "1" });
          allDocFiles.push(replacement.file);
        } else {
          allDocMeta.push({ fileName: doc.filePath || doc.fileName, document_name: doc.document_name, branchId: doc.branchId || Number(selectedBranchId), hasNewFile: "0" });
        }
      });
      if (vatDocument?.file) { allDocMeta.push({ fileName: vatDocument.fileName, document_name: "VAT Document", branchId: Number(selectedBranchId), hasNewFile: "1" }); allDocFiles.push(vatDocument.file); }
      if (crDocument?.file) { allDocMeta.push({ fileName: crDocument.fileName, document_name: "CR Document", branchId: Number(selectedBranchId), hasNewFile: "1" }); allDocFiles.push(crDocument.file); }
      documents.forEach((doc) => {
        if (doc.file && doc.document_name) {
          allDocMeta.push({ fileName: doc.fileName, document_name: doc.document_name, branchId: Number(selectedBranchId), hasNewFile: "1" });
          allDocFiles.push(doc.file);
        }
      });

      const apiData = {
        ledgerName: formData.customerName, ledgerCode: formData.ledgerCode,
        groupId: parseInt(formData.groupId) || 0, billBybill: formData.billBybill === true,
        branchDetails: branchDetailsArray, nameArb: formData.nameFL || "",
        accountNo: formData.accountNo || "", address: formData.address || "",
        phoneNo: formData.phoneNo || "", faxNo: formData.faxNo || "", email: formData.email || "",
        creditPeriod: formData.creditPeriod ? parseInt(formData.creditPeriod) : 0,
        creditLimit: formData.creditLimit ? parseFloat(formData.creditLimit) : 0,
        pricingLevelId: formData.pricingLevelId ? parseInt(formData.pricingLevelId) : 1,
        currencyId: parseInt(formData.currencyId) || 0, branchId: parseInt(selectedBranchId) || 0,
        tinNumber: formData.vatNumber || "", cstNumber: formData.crNumber || "",
        BuildingNo: formData.BuildingNo || "", AdditionalNo: formData.additionalNo || "",
        StreetName: formData.StreetName || "", PostboxNo: formData.postboxNo || "",
        CityName: formData.cityName || "", Country: formData.country || "",
        creditLimitStatus: formData.creditLimitStatus || "Ignore", District: formData.District || "",
        StreetNameArb: formData.streetNameArb || "", BuildingNoArb: formData.buildingNoArb || "",
        CityNameArb: formData.cityNameArb || "", DistrictArb: formData.districtArb || "",
        CountryArb: formData.countryArb || "", AdditionalNoArb: formData.additionalNoArb || "",
        PostboxNoArb: formData.postboxNoArb || "", AddressArabic: formData.addressArabic || "",
        ledgerType: formData.ledgerType, CreatedUser: userId, ModifiedUser: isEditMode ? userId : null,
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
        state: formData.state || "", postal_code: formData.postalCode || "",
        ShippingAddress: isEditMode ? shippingAddresses : addModeShippingAddresses,
        ...(allDocFiles.length && { document: allDocMeta }),
      };

      let response;
      if (allDocFiles.length) {
        const fd = new FormData();
        Object.entries(apiData).forEach(([key, val]) => {
          if (key === "branchDetails" && Array.isArray(val))
            val.forEach((b, i) => Object.entries(b).forEach(([k, v]) => fd.append(`branchDetails[${i}][${k}]`, v != null ? String(v) : "")));
          else if (key === "ShippingAddress" && Array.isArray(val))
            val.forEach((a, i) => Object.entries(a).forEach(([k, v]) => fd.append(`ShippingAddress[${i}][${k}]`, v != null ? String(v) : "")));
          else if (key === "document" && Array.isArray(val))
            val.forEach((d, i) => Object.entries(d).forEach(([k, v]) => fd.append(`document[${i}][${k}]`, v != null ? String(v) : "")));
          else if (val !== null && val !== undefined)
            fd.append(key, typeof val === "boolean" ? (val ? "1" : "0") : String(val));
        });
        allDocFiles.forEach((f) => fd.append("documents", f));
        response = isEditMode
          ? await axiosInstance.post(`update-account-ledger/${customerId}`, fd)
          : await axiosInstance.post("save-account-ledger", fd);
      } else {
        response = isEditMode
          ? await axiosInstance.post(`update-account-ledger/${customerId}`, apiData)
          : await axiosInstance.post("save-account-ledger", apiData);
      }

      if (onSuccess) onSuccess(response.data);
      handleClose();
    } catch (err) {
      setSubmitError(err.response?.data?.message || err.message || "Error saving");
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ── computed ── */
  const activeExistingDocs = existingDocuments.filter((d) => !deletedDocumentIds.includes(d.documentId));
  const newDocCount = (vatDocument ? 1 : 0) + (crDocument ? 1 : 0) + documents.filter((d) => d.file).length;
  const totalDocCount = activeExistingDocs.length + newDocCount;
  const existingVatDoc = existingDocuments.find((d) => d.document_name?.toLowerCase().includes("vat"));
  const existingCrDoc = existingDocuments.find((d) => d.document_name?.toLowerCase().includes("cr"));

  const ledgerTypeOptions = isCustomer
    ? [{ value: "Customer", label: "Customer" }, { value: "Customer&Supplier", label: "Customer & Supplier" }]
    : [{ value: "Supplier", label: "Supplier" }, { value: "Customer&Supplier", label: "Customer & Supplier" }];
  const creditStatusOptions = [{ value: "Ignore", label: "Ignore" }, { value: "Warn", label: "Warn" }, { value: "Block", label: "Block" }];
  const billByBillOptions = [{ value: true, label: "Yes" }, { value: false, label: "No" }];
  const crDrOptions = [{ value: "1", label: "Cr" }, { value: "2", label: "Dr" }];

  const tabs = [
    { id: "address", label: "Address" },
    { id: "shipping", label: "Shipping Address" },
    { id: "registration", label: "Registration" },
    { id: "contact", label: "Contact" },
    { id: "opening", label: "Opening" },
    { id: "documents", label: "Documents", count: totalDocCount },
  ];

  /* ═══════════════════════════ RENDER ═══════════════════════════════════════ */
  return (
    <Modal open={open} onClose={handleClose} closeAfterTransition slotProps={{ backdrop: { timeout: 300 } }} style={{ zIndex: 9999 }}>
      <Fade in={open}>
        <Box sx={{
          position: "absolute", top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          width: isMobile ? "95%" : "90%", 
          maxHeight: "85vh",
          bgcolor: "background.paper",
          border: "1px solid #d3d3d3", 
          boxShadow: 24, 
          borderRadius: 3,
         overflow: "auto",
        }}>
          <Card className="border-none shadow-none h-full flex flex-col relative">
            <CardContent className="p-0 flex flex-col h-full">

              {/* ── FIXED HEADER ── */}
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0 bg-white dark:bg-[#1e1e1e]">
                <h2 className="text-center font-bold text-lg text-gray-900 dark:text-gray-100">
                  {isEditMode
                    ? `Edit ${isCustomer ? "Customer" : "Supplier"}`
                    : `Add ${isCustomer ? "Customer" : "Supplier"}`}
                </h2>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
                  <span className="ml-3 text-sm text-gray-500">Loading...</span>
                </div>
              ) : (
                <>
                  {/* ── SCROLLABLE CONTENT ── */}
                  <div className="flex-1 overflow-y-auto px-6 py-4">
                    <form id="ledger-form" onSubmit={handleSave}>

                      {/* ── Name row ── */}
                      <div className="mb-4">
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1 block">
                          {isCustomer ? "Customer Name" : "Supplier Name"} <span className="text-red-500">*</span>
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            name="customerName"
                            value={formData.customerName}
                            onChange={handleChange}
                            onKeyDown={(e) => { if (e.key === "&") e.preventDefault(); if (e.key === "Enter") handleTranslate(); }}
                            placeholder={isCustomer ? "Enter Customer Name" : "Enter Supplier Name"}
                            className="flex-1 text-2xl font-bold bg-transparent border-0 border-b-2 border-gray-800 dark:border-gray-300 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:border-teal-600 pb-1.5 transition-colors"
                          />
                          <button type="button" onClick={handleTranslate} disabled={translating || !formData.customerName?.trim()}
                            className={`h-9 px-3 main-bg text-gray-200 rounded-md flex items-center justify-center flex-shrink-0 ${translating || !formData.customerName?.trim() ? "opacity-60 cursor-not-allowed" : ""}`}
                            title="Translate to Arabic">
                            <MdGTranslate className="w-5 h-5" />
                          </button>
                        </div>
                        {errors.customerName && <p className="text-xs text-red-500 mt-0.5">{errors.customerName}</p>}
                      </div>

                      {/* ── Top grid: Group / Code / NameAr / VATNumber / LedgerType / CRNumber ── */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-2 mb-4">
                        {/* LEFT */}
                        <div className="space-y-2">
                          <InputRow label="Group">
                            <div className="relative" ref={groupDropdownRef}>
                              <div className="relative flex items-center">
                                <input type="text" readOnly placeholder="Select group"
                                  value={accountGroups?.find((g) => g.groupId?.toString() === formData.groupId)?.accountGroupName || ""}
                                  className="w-full px-0 py-1.5 bg-transparent border-0 border-b border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none pr-8 text-sm cursor-pointer"
                                  onClick={() => setShowGroup((p) => !p)} />
                                <button type="button" onClick={() => setShowGroup((p) => !p)} className="absolute right-0 text-gray-400 hover:text-gray-600 p-0.5">
                                  <ChevronDown size={14} className={`transition-transform ${showGroup ? "rotate-180" : ""}`} />
                                </button>
                              </div>
                              {showGroup && (
                                <div className="absolute z-50 mt-1 w-full bg-white dark:bg-[#242424] border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-52 overflow-y-auto">
                                  {accountGroups?.map((g) => (
                                    <button key={g.groupId} type="button"
                                      onClick={() => { handleSelect("groupId", g.groupId?.toString()); setShowGroup(false); }}
                                      className={`w-full text-left px-3 py-2 text-sm hover:bg-teal-50 dark:hover:bg-teal-900/30 text-gray-900 dark:text-gray-100 ${formData.groupId === g.groupId?.toString() ? "bg-teal-50 font-medium" : ""}`}>
                                      {g.accountGroupName}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          </InputRow>
                          <InputRow label="Name (Arabic)">
                            <input ref={nameFlInputRef} type="text" name="nameFL" value={formData.nameFL} onChange={handleChange}
                              placeholder="الاسم بالعربية"
                              className="w-full px-0 py-1.5 bg-transparent border-0 border-b border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:border-gray-900 text-sm" />
                          </InputRow>
                          <InputRow label="Ledger Type">
                            <CustomDropdown dropdownRef={ledgerTypeDropdownRef} value={formData.ledgerType} options={ledgerTypeOptions}
                              onChange={(v) => handleSelect("ledgerType", v)} placeholder="Select type" show={showLedgerType} setShow={setShowLedgerType} />
                          </InputRow>
                        </div>
                        {/* RIGHT */}
                        <div className="space-y-2">
                          <InputRow label={isCustomer ? "Customer Code" : "Supplier Code"} required error={errors.ledgerCode}>
                            <UnderlineInput name="ledgerCode" value={formData.ledgerCode} onChange={handleChange} placeholder={isCustomer ? "Customer code" : "Supplier code"} required />
                          </InputRow>
                          <InputRow label="VAT Number" required={isZatcaPhase2Customer} error={errors.vatNumber}>
                            <div className="flex items-center gap-2">
                              <div className="flex-1">
                                <UnderlineInput name="vatNumber" value={formData.vatNumber} onChange={handleChange} placeholder="Enter VAT number" />
                              </div>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <input ref={vatFileInputRef} type="file" className="hidden" onChange={handleVatDocumentChange} accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" />
                                <button type="button" onClick={() => vatFileInputRef.current?.click()}
                                  className={`p-1.5 rounded-md transition-all ${vatDocument || existingVatDoc ? "text-teal-600 bg-teal-50 dark:bg-teal-900/30" : "text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"}`}
                                  title={vatDocument ? `New: ${vatDocument.fileName}` : existingVatDoc ? `Saved: ${existingVatDoc.fileName}` : "Attach VAT document"}>
                                  <Paperclip size={16} />
                                </button>
                                {vatDocument && <button type="button" onClick={handleRemoveVatDocument} className="p-1 rounded-md text-red-400 hover:text-red-600"><Trash2 size={14} /></button>}
                                {!vatDocument && existingVatDoc && <button type="button" onClick={() => handleViewDocument(existingVatDoc.filePath)} className="p-1 rounded-md text-blue-500 hover:text-blue-700"><Eye size={14} /></button>}
                              </div>
                            </div>
                            {vatDocument && <p className="text-xs text-teal-600 mt-0.5 truncate">📎 New: {vatDocument.fileName}</p>}
                            {!vatDocument && existingVatDoc && <p className="text-xs text-blue-600 mt-0.5 truncate">📎 Saved: {existingVatDoc.fileName}</p>}
                          </InputRow>
                          <InputRow label="CR Number" required={isZatcaPhase2Customer} error={errors.crNumber}>
                            <div className="flex items-center gap-2">
                              <div className="flex-1">
                                <UnderlineInput name="crNumber" value={formData.crNumber} onChange={handleChange} placeholder="Enter CR number" />
                              </div>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <input ref={crFileInputRef} type="file" className="hidden" onChange={handleCrDocumentChange} accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" />
                                <button type="button" onClick={() => crFileInputRef.current?.click()}
                                  className={`p-1.5 rounded-md transition-all ${crDocument || existingCrDoc ? "text-teal-600 bg-teal-50 dark:bg-teal-900/30" : "text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"}`}>
                                  <Paperclip size={16} />
                                </button>
                                {crDocument && <button type="button" onClick={handleRemoveCrDocument} className="p-1 rounded-md text-red-400 hover:text-red-600"><Trash2 size={14} /></button>}
                                {!crDocument && existingCrDoc && <button type="button" onClick={() => handleViewDocument(existingCrDoc.filePath)} className="p-1 rounded-md text-blue-500 hover:text-blue-700"><Eye size={14} /></button>}
                              </div>
                            </div>
                            {crDocument && <p className="text-xs text-teal-600 mt-0.5 truncate">📎 New: {crDocument.fileName}</p>}
                            {!crDocument && existingCrDoc && <p className="text-xs text-blue-600 mt-0.5 truncate">📎 Saved: {existingCrDoc.fileName}</p>}
                          </InputRow>
                        </div>
                      </div>

                      {/* ── Tabs ── */}
                      <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                        <div className="flex border-b border-gray-300 dark:border-gray-600 overflow-x-auto">
                          {tabs.map((tab, idx) => (
                            <div key={tab.id} className="flex items-center flex-shrink-0">
                              <button type="button" onClick={() => setActiveTab(activeTab === tab.id ? null : tab.id)}
                                className={`px-4 py-2 text-sm font-medium transition-all whitespace-nowrap ${activeTab === tab.id ? "bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400 border-b-2 border-teal-600" : "bg-white dark:bg-[#1e1e1e] text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"}`}>
                                <span className="flex items-center gap-1.5">
                                  {tab.label}
                                  {tab.count > 0 && <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-teal-600 rounded-full">{tab.count}</span>}
                                </span>
                              </button>
                              {idx < tabs.length - 1 && <div className="h-6 w-px bg-gray-300 dark:bg-gray-600" />}
                            </div>
                          ))}
                        </div>
                      </div>

                      {activeTab && (
                        <div className="border border-gray-200 dark:border-gray-700 border-t-0 rounded-b-lg p-4 bg-gray-50 dark:bg-[#242424] min-h-[320px]">

                          {/* ══ ADDRESS TAB ══ */}
                          {activeTab === "address" && (
                            <div className="space-y-4">
                              {isZatcaPhase2Customer && (
                                <div className="text-xs text-amber-700 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded px-3 py-2">
                                  ⚠️ ZATCA Phase 2 requires all address fields to be filled.
                                </div>
                              )}
                              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 pb-2 border-b border-gray-200 dark:border-gray-600">Address Details</h3>
                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-2">
                                {/* English column */}
                                <div className="space-y-2">
                                  {[
                                    { label: "Building No", name: "BuildingNo", arbField: "buildingNoArb", ph: "Enter building no" },
                                    { label: "Additional No", name: "additionalNo", arbField: "additionalNoArb", ph: "Enter additional no" },
                                    { label: "Street Name", name: "StreetName", arbField: "streetNameArb", ph: "Enter street name" },
                                    { label: "City Name", name: "cityName", arbField: "cityNameArb", ph: "Enter city name" },
                                    { label: "District", name: "District", arbField: "districtArb", ph: "Enter district" },
                                    { label: "Post Box No", name: "postboxNo", arbField: "postboxNoArb", ph: "Enter post box number" },
                                  ].map(({ label, name, arbField, ph }) => (
                                    <InputRow key={name} label={label} required={isZatcaPhase2Customer} error={errors[name]}>
                                      <UnderlineInput name={name} value={formData[name]} onChange={handleChange}
                                        onKeyDown={(e) => { if (e.key === "Enter") handleAddressTranslate(name, arbField); }}
                                        placeholder={ph} required={isZatcaPhase2Customer} />
                                    </InputRow>
                                  ))}

                                  {/* Country dropdown */}
                                  <InputRow label="Country" required={isZatcaPhase2Customer} error={errors.country}>
                                    <div className="relative" ref={countryDropdownRef}>
                                      <div className="relative flex items-center">
                                        <input type="text"
                                          value={showCountry ? countrySearch : (formData.country || "")}
                                          onChange={(e) => { setCountrySearch(e.target.value); if (!showCountry) setShowCountry(true); }}
                                          onFocus={() => { setCountrySearch(""); setShowCountry(true); }}
                                          placeholder="Select or search country"
                                          className="w-full px-0 py-1.5 bg-transparent border-0 border-b border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none text-sm pr-8" />
                                        <button type="button" onClick={() => { setCountrySearch(""); setShowCountry((p) => !p); }} className="absolute right-0 text-gray-400 hover:text-gray-600 p-0.5">
                                          <ChevronDown size={14} className={`transition-transform ${showCountry ? "rotate-180" : ""}`} />
                                        </button>
                                      </div>
                                      {showCountry && (
                                        <div className="absolute z-50 mt-1 w-full bg-white dark:bg-[#242424] border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-52 overflow-y-auto">
                                          {AllCountries.filter((c) => c.country.toLowerCase().includes(countrySearch.toLowerCase())).map((c) => (
                                            <button key={c.countryCode} type="button"
                                              onClick={() => { handleSelect("country", c.country); setShowCountry(false); setCountrySearch(""); setTimeout(() => handleAddressTranslate("country", "countryArb"), 100); }}
                                              className={`w-full text-left px-3 py-2 text-sm hover:bg-teal-50 dark:hover:bg-teal-900/30 text-gray-900 dark:text-gray-100 flex items-center gap-2 ${formData.country === c.country ? "bg-teal-50 dark:bg-teal-900/20 font-medium" : ""}`}>
                                              <img src={`https://flagcdn.com/16x12/${c.countryCode.toLowerCase()}.png`} alt={c.countryCode} className="w-4 h-3 object-cover flex-shrink-0" onError={(e) => { e.target.style.display = "none"; }} />
                                              {c.country}
                                            </button>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </InputRow>

                                  <InputRow label="Address">
                                    <textarea name="address" value={formData.address || ""} onChange={handleChange}
                                      onKeyDown={(e) => { if (e.key === "Enter" && e.ctrlKey) handleAddressTranslate("address", "addressArabic"); }}
                                      placeholder="Enter full address" rows={3}
                                      className="w-full px-0 py-1.5 bg-transparent border-0 border-b border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none text-sm resize-none" />
                                  </InputRow>
                                </div>

                                {/* Arabic column */}
                                <div className="space-y-2">
                                  {[
                                    { label: "Building No (Ar)", name: "buildingNoArb", ph: "رقم المبنى" },
                                    { label: "Additional No (Ar)", name: "additionalNoArb", ph: "الرقم الإضافي" },
                                    { label: "Street Name (Ar)", name: "streetNameArb", ph: "الشارع" },
                                    { label: "City Name (Ar)", name: "cityNameArb", ph: "المدينة" },
                                    { label: "District (Ar)", name: "districtArb", ph: "الحي" },
                                    { label: "Post Box No (Ar)", name: "postboxNoArb", ph: "صندوق البريد" },
                                    { label: "Country (Ar)", name: "countryArb", ph: "البلد" },
                                  ].map(({ label, name, ph }) => (
                                    <InputRow key={name} label={label}>
                                      <UnderlineInput name={name} value={formData[name]} onChange={handleChange} placeholder={ph} />
                                    </InputRow>
                                  ))}
                                  <InputRow label="Address (Ar)">
                                    <textarea name="addressArabic" value={formData.addressArabic || ""} onChange={handleChange}
                                      placeholder="العنوان الكامل" rows={3}
                                      className="w-full px-0 py-1.5 bg-transparent border-0 border-b border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none text-sm resize-none" />
                                  </InputRow>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* ══ SHIPPING TAB ══ */}
                          {activeTab === "shipping" && (
                            <div className="space-y-4">
                              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 pb-2 border-b border-gray-200 dark:border-gray-600">Shipping Address</h3>
                              {/* Use same edit/add-mode logic as CustomerAndSupplierForm */}
                              {isEditMode ? (
                                <>
                                  {shippingAddresses.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                      {shippingAddresses.map((addr) => (
                                        <div key={addr.addressId} className="border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-[#1e1e1e]">
                                          {[addr.address1, addr.address2, addr.address3, addr.address4].filter(Boolean).map((a, i) => (
                                            <p key={i} className="text-sm text-gray-700 dark:text-gray-300">{a}</p>
                                          ))}
                                          <div className="flex justify-between items-center mt-2">
                                            {addr.Isdefault && <span className="main-bg px-2 py-0.5 rounded-full text-white text-xs">Default</span>}
                                            <div className="flex gap-2 ml-auto">
                                              <button type="button" onClick={() => { setEditingAddress(addr); setShowAddressForm(true); }} className="text-blue-600 text-xs hover:underline">Edit</button>
                                              <button type="button" onClick={() => handleDeleteShippingAddress(addr.addressId)} className="text-red-600 text-xs hover:underline">Delete</button>
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  ) : <p className="text-gray-500 text-sm">No shipping addresses available.</p>}
                                  <button type="button" onClick={() => { setEditingAddress(null); setShowAddressForm(true); }} className="px-3 py-1.5 bg-teal-600 text-white text-sm rounded hover:bg-teal-700">+ Add New Address</button>
                                  {showAddressForm && (
                                    <div className="border-t border-gray-300 dark:border-gray-600 pt-3 mt-3">
                                      <h4 className="text-sm font-medium mb-3 text-gray-800 dark:text-gray-200">{editingAddress ? "Edit Address" : "Add Address"}</h4>
                                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-2">
                                        {["address1", "address2", "address3", "address4"].map((field) => (
                                          <InputRow key={field} label={field}>
                                            <UnderlineInput name={field} value={editingAddress?.[field] || ""} onChange={(e) => setEditingAddress((p) => ({ ...p, [e.target.name]: e.target.value }))} placeholder={`Enter ${field}`} />
                                          </InputRow>
                                        ))}
                                      </div>
                                      <div className="flex items-center gap-2 mt-3">
                                        <input type="checkbox" id="Isdefault" checked={editingAddress?.Isdefault || false} onChange={(e) => setEditingAddress((p) => ({ ...p, Isdefault: e.target.checked }))} className="h-4 w-4 rounded border-gray-300" />
                                        <label htmlFor="Isdefault" className="text-sm text-gray-700 dark:text-gray-300">Set as default</label>
                                      </div>
                                      <div className="mt-3 flex gap-2">
                                        <button type="button" onClick={() => handleSaveShippingAddress(editingAddress)} className="px-3 py-1.5 bg-teal-600 text-white text-sm rounded hover:bg-teal-700">Save</button>
                                        <button type="button" onClick={() => { setShowAddressForm(false); setEditingAddress(null); }} className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded">Cancel</button>
                                      </div>
                                    </div>
                                  )}
                                </>
                              ) : (
                                <div className="space-y-4">
                                  {addModeShippingAddresses.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                      {addModeShippingAddresses.map((addr) => (
                                        <div key={addr.addressId} className="border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-[#1e1e1e]">
                                          {[addr.address1, addr.address2, addr.address3, addr.address4].filter(Boolean).map((a, i) => <p key={i} className="text-sm text-gray-700 dark:text-gray-300">{a}</p>)}
                                          <div className="flex justify-between items-center mt-2">
                                            {addr.Isdefault && <span className="main-bg px-2 py-0.5 rounded-full text-white text-xs">Default</span>}
                                            <div className="flex gap-2 ml-auto">
                                              <button type="button" onClick={() => { setEditingAddress(addr); setShowAddressForm(true); }} className="text-blue-600 text-xs hover:underline">Edit</button>
                                              <button type="button" onClick={() => setAddModeShippingAddresses((p) => p.filter((a) => a.addressId !== addr.addressId))} className="text-red-600 text-xs hover:underline">Delete</button>
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  ) : <p className="text-gray-500 text-sm">No shipping addresses added yet.</p>}
                                  <button type="button" onClick={() => { setEditingAddress({ address1: "", address2: "", address3: "", address4: "", Isdefault: false }); setShowAddressForm(true); }} className="px-3 py-1.5 bg-teal-600 text-white text-sm rounded hover:bg-teal-700">+ Add New Address</button>
                                  {showAddressForm && (
                                    <div className="border-t border-gray-300 dark:border-gray-600 pt-3 mt-3">
                                      <h4 className="text-sm font-medium mb-3 text-gray-800 dark:text-gray-200">{editingAddress?.addressId && addModeShippingAddresses.some((a) => a.addressId === editingAddress.addressId) ? "Edit Address" : "Add Address"}</h4>
                                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-2">
                                        {["address1", "address2", "address3", "address4"].map((field) => (
                                          <InputRow key={field} label={field}>
                                            <UnderlineInput name={field} value={editingAddress?.[field] || ""} onChange={(e) => setEditingAddress((p) => ({ ...(p || {}), [e.target.name]: e.target.value }))} placeholder={`Enter ${field}`} />
                                          </InputRow>
                                        ))}
                                      </div>
                                      <div className="flex items-center gap-2 mt-3">
                                        <input type="checkbox" id="Isdefault2" checked={editingAddress?.Isdefault || false} onChange={(e) => setEditingAddress((p) => ({ ...(p || {}), Isdefault: e.target.checked }))} className="h-4 w-4 rounded border-gray-300" />
                                        <label htmlFor="Isdefault2" className="text-sm text-gray-700 dark:text-gray-300">Set as default</label>
                                      </div>
                                      <div className="mt-3 flex gap-2">
                                        <button type="button" onClick={() => {
                                          if (!editingAddress) return;
                                          const isUpdating = editingAddress.addressId && addModeShippingAddresses.some((a) => a.addressId === editingAddress.addressId);
                                          if (isUpdating) {
                                            setAddModeShippingAddresses((p) => p.map((a) => a.addressId === editingAddress.addressId ? { ...editingAddress, addressId: a.addressId } : a));
                                          } else {
                                            setAddModeShippingAddresses((p) => [...p, { ...editingAddress, addressId: Date.now() }]);
                                          }
                                          setShowAddressForm(false); setEditingAddress(null);
                                        }} className="px-3 py-1.5 bg-teal-600 text-white text-sm rounded hover:bg-teal-700">Save</button>
                                        <button type="button" onClick={() => { setShowAddressForm(false); setEditingAddress(null); }} className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded">Cancel</button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}

                          {/* ══ REGISTRATION TAB ══ */}
                          {activeTab === "registration" && (
                            <div className="space-y-4">
                              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 pb-2 border-b border-gray-200 dark:border-gray-600">Registration Details</h3>
                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-2">
                                <InputRow label="Credit Period">
                                  <UnderlineInput name="creditPeriod" value={formData.creditPeriod} onChange={handleChange} placeholder="Enter credit period (days)" type="number" />
                                </InputRow>
                                <InputRow label="Credit Limit">
                                  <UnderlineInput name="creditLimit" value={formData.creditLimit} onChange={handleChange} placeholder="Enter credit limit" type="number" />
                                </InputRow>
                                <InputRow label="Credit Status">
                                  <CustomDropdown dropdownRef={creditStatusDropdownRef} value={formData.creditLimitStatus} options={creditStatusOptions}
                                    onChange={(v) => handleSelect("creditLimitStatus", v)} placeholder="Select" show={showCreditStatus} setShow={setShowCreditStatus} />
                                </InputRow>
                                {financeSettings?.MaintainBillbyBill && (
                                  <InputRow label="Bill by Bill">
                                    <CustomDropdown dropdownRef={billByBillDropdownRef} value={formData.billBybill} options={billByBillOptions}
                                      onChange={(v) => handleSelect("billBybill", v)} placeholder="Select" show={showBillByBill} setShow={setShowBillByBill} />
                                  </InputRow>
                                )}
                                <InputRow label="Pricing Level">
                                  <div className="relative" ref={pricingLevelDropdownRef}>
                                    <div className="relative flex items-center">
                                      <input type="text" readOnly placeholder="Select"
                                        value={pricingLevel?.find((p) => p.PricingLevelId?.toString() === formData.pricingLevelId?.toString())?.PricingLevelName || ""}
                                        className="w-full px-0 py-1.5 bg-transparent border-0 border-b border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none pr-8 text-sm cursor-pointer"
                                        onClick={() => setShowPricingLevel((p) => !p)} />
                                      <button type="button" onClick={() => setShowPricingLevel((p) => !p)} className="absolute right-0 text-gray-400 hover:text-gray-600 p-0.5">
                                        <ChevronDown size={14} className={`transition-transform ${showPricingLevel ? "rotate-180" : ""}`} />
                                      </button>
                                    </div>
                                    {showPricingLevel && (
                                      <div className="absolute z-50 mt-1 w-full bg-white dark:bg-[#242424] border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-52 overflow-y-auto">
                                        {pricingLevel?.map((d) => (
                                          <button key={d.PricingLevelId} type="button"
                                            onClick={() => { handleSelect("pricingLevelId", d.PricingLevelId?.toString()); setShowPricingLevel(false); }}
                                            className={`w-full text-left px-3 py-2 text-sm hover:bg-teal-50 dark:hover:bg-teal-900/30 text-gray-900 dark:text-gray-100 ${formData.pricingLevelId?.toString() === d.PricingLevelId?.toString() ? "bg-teal-50 font-medium" : ""}`}>
                                            {d.PricingLevelName}
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </InputRow>
                                <InputRow label="Currency">
                                  <div className="relative" ref={currencyDropdownRef}>
                                    <div className="relative flex items-center">
                                      <input type="text" readOnly placeholder="Select"
                                        value={currency?.find((c) => c.currencyId?.toString() === formData.currencyId?.toString())?.currencyName || ""}
                                        className="w-full px-0 py-1.5 bg-transparent border-0 border-b border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none pr-8 text-sm cursor-pointer"
                                        onClick={() => setShowCurrency((p) => !p)} />
                                      <button type="button" onClick={() => setShowCurrency((p) => !p)} className="absolute right-0 text-gray-400 hover:text-gray-600 p-0.5">
                                        <ChevronDown size={14} className={`transition-transform ${showCurrency ? "rotate-180" : ""}`} />
                                      </button>
                                    </div>
                                    {showCurrency && (
                                      <div className="absolute z-50 mt-1 w-full bg-white dark:bg-[#242424] border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-52 overflow-y-auto">
                                        {currency?.map((c) => (
                                          <button key={c.currencyId} type="button"
                                            onClick={() => { handleSelect("currencyId", c.currencyId?.toString()); setShowCurrency(false); }}
                                            className={`w-full text-left px-3 py-2 text-sm hover:bg-teal-50 dark:hover:bg-teal-900/30 text-gray-900 dark:text-gray-100 ${formData.currencyId?.toString() === c.currencyId?.toString() ? "bg-teal-50 font-medium" : ""}`}>
                                            {c.currencyName}
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </InputRow>
                                <InputRow label="Account No">
                                  <UnderlineInput name="accountNo" value={formData.accountNo} onChange={handleChange} placeholder="Enter account number" />
                                </InputRow>
                              </div>
                            </div>
                          )}

                          {/* ══ CONTACT TAB ══ */}
                          {activeTab === "contact" && (
                            <div className="space-y-4">
                              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 pb-2 border-b border-gray-200 dark:border-gray-600">Contact Details</h3>
                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-2">
                                <InputRow label="Phone">
                                  <UnderlineInput name="phoneNo" value={formData.phoneNo} onChange={handleChange} placeholder="Enter phone number" />
                                </InputRow>
                                <InputRow label="Fax">
                                  <UnderlineInput name="faxNo" value={formData.faxNo} onChange={handleChange} placeholder="Enter fax number" />
                                </InputRow>
                                <InputRow label="Email">
                                  <UnderlineInput name="email" value={formData.email} onChange={handleChange} placeholder="Enter email address" type="email" />
                                </InputRow>
                              </div>
                            </div>
                          )}

                          {/* ══ OPENING TAB ══ */}
                          {activeTab === "opening" && (
                            <div className="space-y-4">
                              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 pb-2 border-b border-gray-200 dark:border-gray-600">Opening Details</h3>
                              {branches && branches.length > 1 ? (
                                <div className="border border-gray-300 dark:border-gray-600 rounded overflow-hidden">
                                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
                                    <thead className="bg-gray-100 dark:bg-[#1e1e1e]">
                                      <tr>
                                        <th className="px-3 py-1.5 text-left text-xs font-medium text-gray-600 uppercase w-10">
                                          <input type="checkbox"
                                            checked={branches && selectedBranches.length === branches.length}
                                            onChange={(e) => {
                                              if (e.target.checked && branches) {
                                                const all = branches.map((b) => String(b.branchId));
                                                setSelectedBranches(all);
                                                const d = {};
                                                all.forEach((id) => { d[id] = branchDetails[id] || { openingBalance: "", crOrDr: isCustomer ? "2" : "1" }; });
                                                setBranchDetails(d);
                                              } else { setSelectedBranches([]); setBranchDetails({}); }
                                            }}
                                            className="h-3.5 w-3.5 rounded border-gray-300 text-teal-600" />
                                        </th>
                                        <th className="px-3 py-1.5 text-left text-xs font-medium text-gray-600 uppercase">Branch</th>
                                        <th className="px-3 py-1.5 text-left text-xs font-medium text-gray-600 uppercase">Opening Balance</th>
                                        <th className="px-3 py-1.5 text-left text-xs font-medium text-gray-600 uppercase w-28">Cr/Dr</th>
                                      </tr>
                                    </thead>
                                    <tbody className="bg-white dark:bg-[#242424] divide-y divide-gray-200 dark:divide-gray-600">
                                      {branches?.map((branch) => {
                                        const bid = String(branch.branchId);
                                        const sel = selectedBranches.includes(bid);
                                        return (
                                          <tr key={branch.branchId} className={sel ? "bg-teal-50 dark:bg-teal-900/20" : "hover:bg-gray-50 dark:hover:bg-gray-700"}>
                                            <td className="px-3 py-1.5"><input type="checkbox" checked={sel} onChange={() => handleBranchToggle(branch.branchId)} className="h-3.5 w-3.5 rounded border-gray-300 text-teal-600" /></td>
                                            <td className="px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100">{branch.branchCode}</td>
                                            <td className="px-3 py-1.5">
                                              <input type="number" value={branchDetails[bid]?.openingBalance || ""} disabled={!sel}
                                                onChange={(e) => handleBranchDetailChange(bid, "openingBalance", e.target.value)}
                                                onBlur={() => handleBranchDetailBlur(bid, "openingBalance")}
                                                className="w-full px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#1e1e1e] text-gray-900 dark:text-gray-100 disabled:bg-gray-100 disabled:cursor-not-allowed"
                                                placeholder={(0).toFixed(generalSettings?.decimalPart ?? 2)} />
                                            </td>
                                            <td className="px-3 py-1.5">
                                              <select value={branchDetails[bid]?.crOrDr || ""} disabled={!sel}
                                                onChange={(e) => handleBranchDetailChange(bid, "crOrDr", e.target.value)}
                                                className="w-full px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#1e1e1e] disabled:bg-gray-100 disabled:cursor-not-allowed">
                                                <option value="">Select</option>
                                                <option value="1">Credit</option>
                                                <option value="2">Debit</option>
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
                                  <InputRow label="Opening Balance">
                                    <input type="text" value={branchDetails[String(branches[0].branchId)]?.openingBalance || ""}
                                      onChange={(e) => handleBranchDetailChange(String(branches[0].branchId), "openingBalance", e.target.value)}
                                      onBlur={() => handleBranchDetailBlur(String(branches[0].branchId), "openingBalance")}
                                      placeholder={(0).toFixed(generalSettings?.decimalPart ?? 2)}
                                      className="w-full px-0 py-1.5 bg-transparent border-0 border-b border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none text-sm" />
                                  </InputRow>
                                  <InputRow label="Credit/Debit">
                                    <CustomDropdown dropdownRef={crDrDropdownRef}
                                      value={branchDetails[String(branches[0].branchId)]?.crOrDr}
                                      options={crDrOptions}
                                      onChange={(v) => handleBranchDetailChange(String(branches[0].branchId), "crOrDr", v)}
                                      placeholder="Select" show={showCrDr} setShow={setShowCrDr} />
                                  </InputRow>
                                </div>
                              ) : null}
                              {selectedBranches.length === 0 && branches && branches.length > 1 && (
                                <p className="text-xs text-red-500">Please select at least one branch</p>
                              )}
                            </div>
                          )}

                          {/* ══ DOCUMENTS TAB ══ */}
                          {activeTab === "documents" && (
                            <div className="space-y-4">
                              <div className="flex items-center justify-between pb-2 border-b border-gray-200 dark:border-gray-600">
                                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                  Documents {totalDocCount > 0 && <span className="ml-2 text-xs font-normal text-gray-500">({totalDocCount} document{totalDocCount !== 1 ? "s" : ""})</span>}
                                </h3>
                                <button type="button" onClick={handleAddDocument}
                                  className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-teal-700 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 dark:text-teal-400 dark:bg-teal-900/20 dark:border-teal-800 transition-colors">
                                  <Plus size={14} /> Add New
                                </button>
                              </div>
                              <div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
                                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
                                  <thead className="bg-gray-100 dark:bg-[#1e1e1e]">
                                    <tr>
                                      <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase w-8">#</th>
                                      <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">Document Name</th>
                                      <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">File</th>
                                      <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase w-36">Action</th>
                                    </tr>
                                  </thead>
                                  <tbody className="bg-white dark:bg-[#242424] divide-y divide-gray-200 dark:divide-gray-600">
                                    {existingDocuments.map((doc, index) => {
                                      const isDeleted = deletedDocumentIds.includes(doc.documentId);
                                      const replacement = replacementFiles[doc.documentId];
                                      return (
                                        <tr key={`existing-${doc.documentId}`} className={isDeleted ? "bg-red-50/50 opacity-60" : replacement ? "bg-amber-50/50" : "hover:bg-gray-50 dark:hover:bg-gray-700/30"}>
                                          <td className="px-4 py-3 text-sm text-gray-500">{index + 1}</td>
                                          <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                              <FileText size={16} className={`flex-shrink-0 ${isDeleted ? "text-red-400" : "text-blue-500"}`} />
                                              <span className={`text-sm font-medium ${isDeleted ? "line-through text-gray-400" : "text-gray-900 dark:text-gray-100"}`}>{doc.document_name || "Unnamed"}</span>
                                            </div>
                                          </td>
                                          <td className="px-4 py-3">
                                            {isDeleted ? <span className="text-sm text-red-400 italic">Will be deleted</span>
                                              : replacement ? (
                                                <div className="flex items-center gap-2">
                                                  <span className="text-sm text-amber-700 truncate max-w-[200px]">🔄 {replacement.fileName}</span>
                                                  <button type="button" onClick={() => handleRemoveReplacement(doc.documentId)} className="text-xs text-gray-500 hover:text-gray-700 underline">Undo</button>
                                                </div>
                                              ) : (
                                                <div className="flex items-center gap-2">
                                                  <span className="text-sm text-gray-600 dark:text-gray-300 truncate max-w-[200px]">📎 {doc.fileName || "File"}</span>
                                                  {doc.filePath && <button type="button" onClick={() => handleViewDocument(doc.filePath)} className="p-1 rounded text-blue-500 hover:text-blue-700"><Eye size={14} /></button>}
                                                </div>
                                              )}
                                          </td>
                                          <td className="px-4 py-3">
                                            {isDeleted ? (
                                              <button type="button" onClick={() => handleUndoDeleteExistingDocument(doc.documentId)} className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md text-blue-600 hover:bg-blue-50 font-medium">Undo</button>
                                            ) : (
                                              <div className="flex items-center gap-1">
                                                <input ref={(el) => (replaceFileInputRefs.current[doc.documentId] = el)} type="file" className="hidden"
                                                  onChange={(e) => handleReplaceExistingDocument(doc.documentId, e)} accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" />
                                                <button type="button" onClick={() => replaceFileInputRefs.current[doc.documentId]?.click()} className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md text-amber-600 hover:bg-amber-50 transition-colors" title="Replace">
                                                  <RefreshCw size={13} /> Replace
                                                </button>
                                                <button type="button" onClick={() => handleDeleteExistingDocument(doc.documentId)} className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md text-red-600 hover:bg-red-50 transition-colors">
                                                  <Trash2 size={13} /> Delete
                                                </button>
                                              </div>
                                            )}
                                          </td>
                                        </tr>
                                      );
                                    })}

                                    {/* VAT Row */}
                                    {[
                                      { key: "vat", doc: vatDocument, existingDoc: existingVatDoc, label: "VAT Document", onChange: handleVatDocumentChange, onRemove: handleRemoveVatDocument, index: existingDocuments.length + 1 },
                                      { key: "cr", doc: crDocument, existingDoc: existingCrDoc, label: "CR Document", onChange: handleCrDocumentChange, onRemove: handleRemoveCrDocument, index: existingDocuments.length + 2 },
                                    ].map(({ key, doc, existingDoc: _ed, label, onChange, onRemove, index }) => (
                                      <tr key={key} className={doc ? "bg-teal-50/50 dark:bg-teal-900/10" : ""}>
                                        <td className="px-4 py-3 text-sm text-gray-500">{index}</td>
                                        <td className="px-4 py-3">
                                          <div className="flex items-center gap-2">
                                            <FileText size={16} className="text-teal-600 flex-shrink-0" />
                                            <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">{label}</span>
                                          </div>
                                        </td>
                                        <td className="px-4 py-3">
                                          {doc ? (
                                            <div className="flex items-center gap-2">
                                              <span className="text-sm text-teal-700 truncate max-w-[200px]">📎 {doc.fileName}</span>
                                              <label className="cursor-pointer text-xs text-blue-600 hover:underline">Change<input type="file" className="hidden" onChange={onChange} accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" /></label>
                                            </div>
                                          ) : (
                                            <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 text-sm border border-dashed border-gray-300 dark:border-gray-600 rounded-md text-gray-500 hover:border-teal-400 hover:text-teal-600 hover:bg-teal-50 transition-all">
                                              <Upload size={14} /><span>Choose file</span><input type="file" className="hidden" onChange={onChange} accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" />
                                            </label>
                                          )}
                                        </td>
                                        <td className="px-4 py-3">
                                          {doc && <button type="button" onClick={onRemove} className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md text-red-600 hover:bg-red-50 transition-colors"><Trash2 size={13} /> Delete</button>}
                                        </td>
                                      </tr>
                                    ))}

                                    {/* Custom documents */}
                                    {documents.map((doc, index) => (
                                      <tr key={`new-${index}`} className={doc.file ? "bg-teal-50/50 dark:bg-teal-900/10" : ""}>
                                        <td className="px-4 py-3 text-sm text-gray-500">{existingDocuments.length + 3 + index}</td>
                                        <td className="px-4 py-3">
                                          <div className="flex items-center gap-2">
                                            <FileText size={16} className="text-gray-400 flex-shrink-0" />
                                            <input type="text" value={doc.document_name} onChange={(e) => handleDocumentNameChange(index, e.target.value)} placeholder="Enter document name"
                                              className="w-full px-2 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#1e1e1e] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-teal-500" />
                                          </div>
                                        </td>
                                        <td className="px-4 py-3">
                                          {doc.file ? (
                                            <div className="flex items-center gap-2">
                                              <span className="text-sm text-teal-700 truncate max-w-[200px]">📎 {doc.fileName}</span>
                                              <label className="cursor-pointer text-xs text-blue-600 hover:underline">Change<input type="file" className="hidden" onChange={(e) => handleDocumentFileChange(index, e)} accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" /></label>
                                            </div>
                                          ) : (
                                            <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 text-sm border border-dashed border-gray-300 dark:border-gray-600 rounded-md text-gray-500 hover:border-teal-400 hover:text-teal-600 hover:bg-teal-50 transition-all">
                                              <Upload size={14} /><span>Choose file</span><input type="file" className="hidden" onChange={(e) => handleDocumentFileChange(index, e)} accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" />
                                            </label>
                                          )}
                                        </td>
                                        <td className="px-4 py-3">
                                          <button type="button" onClick={() => handleRemoveDocument(index)} className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md text-red-600 hover:bg-red-50 transition-colors"><Trash2 size={13} /> Delete</button>
                                        </td>
                                      </tr>
                                    ))}

                                    {existingDocuments.length === 0 && !vatDocument && !crDocument && documents.length === 0 && (
                                      <tr>
                                        <td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-500">No documents added yet. Click "Add New" to attach documents.</td>
                                      </tr>
                                    )}
                                  </tbody>
                                </table>
                              </div>
                              {deletedDocumentIds.length > 0 && (
                                <p className="text-xs text-amber-600 dark:text-amber-400">⚠️ {deletedDocumentIds.length} document{deletedDocumentIds.length !== 1 ? "s" : ""} marked for deletion. Changes will apply when you save.</p>
                              )}
                            </div>
                          )}

                        </div>
                      )}

                      {submitError && (
                        <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded px-2 py-1.5 mt-3">{submitError}</div>
                      )}
                    </form>
                  </div>

                  {/* ── FIXED FOOTER ── */}
                  <div className="absolute bottom-0 right-0 flex justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0 bg-white dark:bg-[#1e1e1e]">
                    <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>Cancel</Button>
                    <Button type="button" className="main-bg" onClick={handleSave} disabled={isSubmitting}>
                      {isSubmitting ? "Saving..." : isEditMode ? "Update" : "Save"}
                    </Button>
                  </div>
                </>
              )}

            </CardContent>
          </Card>
        </Box>
      </Fade>
    </Modal>
  );
};

export default AddCustomerModal;