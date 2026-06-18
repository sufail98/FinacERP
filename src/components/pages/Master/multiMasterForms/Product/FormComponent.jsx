import { useEffect, useRef, useState, useCallback } from "react";
import { Plus, Upload, Star, ChevronDown, ImageIcon } from "lucide-react";
import { MdGTranslate } from "react-icons/md";
import { useTranslation } from "react-i18next";
import AddProdGroup from "../ProductMainGroup/AddProdMainGroup";
import usePrivileges from "@/lib/hooks/usePrivileges";
import AddProductGroup from "../ProductGroup/AddProductGroup";
import AddMasterModal from "../../singleMaster/AddMasterModal";
import AddTaxMatser from "../TaxMaster/AddTaxMatser";
import PropTypes from "prop-types";
import SalesPriceTable from "./SalesPriceTable";
import BarcodeTable from "./BarcodeTable";
import axiosInstance from "@/lib/axiosConfig";
import imageCompression from "browser-image-compression";
import AlertBox from "@/components/common/AlertBox";
import BOMComponent from "./BOMComponent";
import NutritionDetails from "./NutritionDetails";
import useAuth from "@/redux/hook/auth/useAuth";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { Button } from "@/components/ui/button";
import { refreshProductsByType } from "@/redux/slice/productSlice";
import GodownStockTab from "./GodownStockTab";

// Reusable Components matching Customer Form Style
const InputRow = ({ label, required, children, error }) => (
  <div className="grid grid-cols-[140px_1fr] items-center gap-3">
    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <div>
      {children}
      {error && <p className="text-xs text-red-500 dark:text-red-400 mt-0.5">{error}</p>}
    </div>
  </div>
);

const UnderlineInput = ({
  name,
  value,
  onChange,
  onBlur,
  placeholder,
  type = "text",
  required,
  disabled,
  readOnly
}) => (
  <input
    type={type}
    name={name}
    value={value || ""}
    onChange={onChange}
    onBlur={onBlur}
    placeholder={placeholder}
    required={required}
    disabled={disabled}
    readOnly={readOnly}
    className="w-full px-0 py-1.5 bg-transparent border-0 border-b border-gray-300 dark:border-gray-600 
             text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500
             focus:outline-none focus:border-gray-900 dark:focus:border-gray-300 text-sm transition-colors
             disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed
             read-only:bg-gray-50 dark:read-only:bg-gray-800/50 read-only:cursor-not-allowed"
  />
);

const UnderlineTextArea = ({
  name,
  value,
  onChange,
  placeholder,
  rows = 3,
  disabled,
  readOnly
}) => (
  <textarea
    name={name}
    value={value || ""}
    onChange={onChange}
    placeholder={placeholder}
    rows={rows}
    disabled={disabled}
    readOnly={readOnly}
    className="w-full px-0 py-1.5 bg-transparent border-0 border-b border-gray-300 dark:border-gray-600 
             text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500
             focus:outline-none focus:border-gray-900 dark:focus:border-gray-300 text-sm transition-colors
             resize-none disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed
             read-only:bg-gray-50 dark:read-only:bg-gray-800/50 read-only:cursor-not-allowed"
  />
);

const UnderlineDropdown = ({
  name,
  value,
  options,
  onChange,
  placeholder,
  loading,
  readOnly,
  showDropdown,
  setShowDropdown,
  dropdownRef
}) => {
  const selectedOption = options?.find(opt => opt.value?.toString() === value?.toString());

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="relative flex items-center">
        <input
          type="text"
          value={selectedOption?.label || ""}
          readOnly
          placeholder={placeholder}
          disabled={readOnly || loading}
          className="w-full px-0 py-1.5 bg-transparent border-0 border-b border-gray-300 dark:border-gray-600 
                   text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500
                   focus:outline-none focus:border-gray-900 dark:focus:border-gray-300 pr-8 text-sm transition-colors cursor-pointer
                   disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => !readOnly && !loading && setShowDropdown(prev => !prev)}
        />
        <div className="absolute right-0 flex items-center">
          <button
            type="button"
            onClick={() => !readOnly && !loading && setShowDropdown(prev => !prev)}
            disabled={readOnly || loading}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronDown size={14} className={`transition-transform duration-200 ${showDropdown ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>
      {showDropdown && !readOnly && !loading && (
        <div className="absolute z-50 mt-1 w-full bg-white dark:bg-[#242424] border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-52 overflow-y-auto">
          {options?.length > 0 ? (
            options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setShowDropdown(false);
                }}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-teal-50 dark:hover:bg-teal-900/30 
                         text-gray-900 dark:text-gray-100 transition-colors
                         ${value?.toString() === opt.value?.toString() ? 'bg-teal-50 dark:bg-teal-900/20 font-medium' : ''}`}
              >
                {opt.label}
              </button>
            ))
          ) : (
            <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">No options available</div>
          )}
        </div>
      )}
    </div>
  );
};

const UnderlineMultiSelect = ({
  name,
  value = [],
  options,
  onChange,
  placeholder,
  loading,
  readOnly,
  showDropdown,
  setShowDropdown,
  dropdownRef
}) => {
  const selectedLabels = value
    ?.map(v => options?.find(opt => opt.value?.toString() === v?.toString())?.label)
    .filter(Boolean)
    .join(', ') || '';

  const toggleOption = (optValue) => {
    const valueArray = Array.isArray(value) ? value : [];
    const optValueStr = optValue?.toString();

    if (valueArray.some(v => v?.toString() === optValueStr)) {
      onChange(valueArray.filter(v => v?.toString() !== optValueStr));
    } else {
      onChange([...valueArray, optValue]);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="relative flex items-center">
        <input
          type="text"
          value={selectedLabels}
          readOnly
          placeholder={placeholder}
          disabled={readOnly || loading}
          className="w-full px-0 py-1.5 bg-transparent border-0 border-b border-gray-300 dark:border-gray-600 
                   text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500
                   focus:outline-none focus:border-gray-900 dark:focus:border-gray-300 pr-8 text-sm transition-colors cursor-pointer
                   disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => !readOnly && !loading && setShowDropdown(prev => !prev)}
        />
        <div className="absolute right-0 flex items-center">
          <button
            type="button"
            onClick={() => !readOnly && !loading && setShowDropdown(prev => !prev)}
            disabled={readOnly || loading}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronDown size={14} className={`transition-transform duration-200 ${showDropdown ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>
      {showDropdown && !readOnly && !loading && (
        <div className="absolute z-50 mt-1 w-full bg-white dark:bg-[#242424] border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-52 overflow-y-auto">
          {options?.length > 0 ? (
            options.map((opt) => {
              const isSelected = Array.isArray(value) && value.some(v => v?.toString() === opt.value?.toString());
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => toggleOption(opt.value)}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-teal-50 dark:hover:bg-teal-900/30 
                           text-gray-900 dark:text-gray-100 transition-colors flex items-center gap-2
                           ${isSelected ? 'bg-teal-50 dark:bg-teal-900/20 font-medium' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    readOnly
                    className="h-3.5 w-3.5 rounded border-gray-300 text-teal-600 pointer-events-none"
                  />
                  {opt.label}
                </button>
              );
            })
          ) : (
            <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">No options available</div>
          )}
        </div>
      )}
    </div>
  );
};

const Cb = ({ id, name, checked, onChange, label, disabled }) => (
  <div className="flex items-center gap-2">
    <input
      type="checkbox"
      id={id}
      name={name}
      checked={checked}
      onChange={onChange}
      className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
      disabled={disabled}
    />
    <label htmlFor={id} className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
  </div>
);

const FormComponent = ({
  modalCloase,
  productMainGroups,
  loadings,
  getProdMainGroup,
  getProdSubGroupByCatOne,
  prodSubGroupByCatOne,
  getProdSubGroupByCatTwo,
  prodSubGroupByCatTwo,
  getProdSubGroupByCatThree,
  getProdSubGroupByCatFour,
  prodSubGroupByCatThree,
  prodSubGroupByCatFour,
  brands,
  fetchBrands,
  fetchUnit,
  units,
  fetchTaxes,
  tax,
  onSubmitStateChange,
  onClearFormData,
  editData,
  isEditMode = false,
  viewMode = false,
  onSuccess,
  modalMode = false,
}) => {

  const { selectedBranchId, userId, currentFinancialYear } = useAuth();
  const { inventorySettings, generalSettings, saleSettings } = useSelector((state) => state.settings);
  const navigate = useNavigate();
  const [errors, setErrors] = useState({});
  const [alert, setAlert] = useState(null);
  const [activeTab, setActiveTab] = useState('general');
  const { t } = useTranslation();
  const [prodMainGroupIsOpen, setProdMainGroupOpen] = useState(false);
  const [prodGroupIsOpen, setProdGroupOpen] = useState(false);
  const [brandModalIsOpen, setBrandModalIsOpen] = useState(false);
  const [taxMasterIsOpen, setTaxMasterIsOpen] = useState(false);
  const [selectedCategoryGrp, setSelectedCatgoryGrp] = useState(null);
  const [activeMasterForm, setActiveMasterForm] = useState(null);
  const dispatch = useDispatch();
  const [barcodeData, setBarcodeData] = useState([{ id: 1, unit: '', conversion: 1, barcode: '' }]);
  const [salePriceData, setSalePriceData] = useState([
    { salespriceId: null, id: 1, branchId: '', unit: '', pricingLevel: '', mrp: 0, discPercent: '', discAmount: '', salesPrice: 0, lowestSellingPrice: 0, deleted: false }
  ]);
  const [selectedUnits, setSelectedUnits] = useState([]);
  const [nutritionData, setNutritionData] = useState([]);
  const [bomData, setBomData] = useState([]);
const handleSubmitRef = useRef(null);
useEffect(() => {
  handleSubmitRef.current = handleSubmit;
});
useEffect(() => {
  const handleKeyDown = (e) => {
    if (e.ctrlKey && e.key === "s") {
      e.preventDefault();
      handleSubmitRef.current?.(e); // always calls latest version
    }
  };
  window.addEventListener("keydown", handleKeyDown);
  return () => window.removeEventListener("keydown", handleKeyDown);
}, []); // ← empty deps is now safe because we use the ref
  // Dropdown visibility states
  const [showGroupCodeDropdown, setShowGroupCodeDropdown] = useState(false);
  const [showGroup1Dropdown, setShowGroup1Dropdown] = useState(false);
  const [showGroup2Dropdown, setShowGroup2Dropdown] = useState(false);
  const [showGroup3Dropdown, setShowGroup3Dropdown] = useState(false);
  const [showGroup4Dropdown, setShowGroup4Dropdown] = useState(false);
  const [showBrandDropdown, setShowBrandDropdown] = useState(false);
  const [showUnitDropdown, setShowUnitDropdown] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showSalesTaxDropdown, setShowSalesTaxDropdown] = useState(false);
  const [showPurchaseTaxDropdown, setShowPurchaseTaxDropdown] = useState(false);

  // Dropdown refs
  const groupCodeDropdownRef = useRef(null);
  const group1DropdownRef = useRef(null);
  const group2DropdownRef = useRef(null);
  const group3DropdownRef = useRef(null);
  const group4DropdownRef = useRef(null);
  const brandDropdownRef = useRef(null);
  const unitDropdownRef = useRef(null);
  const categoryDropdownRef = useRef(null);
  const salesTaxDropdownRef = useRef(null);
  const purchaseTaxDropdownRef = useRef(null);

  // MEMOIZED CALLBACKS
  const handleBOMDataChange = useCallback((data) => setBomData(data), []);
  const handleNutritionDataChange = useCallback((data) => setNutritionData(data), []);
  const handleBarcodeDataChange = useCallback((data) => setBarcodeData(data), []);
  const handleSelectedUnitsChange = useCallback((units) => setSelectedUnits(units), []);
  const handleSalePriceDataChange = useCallback((data) => setSalePriceData(data), []);

  const getInitialFormData = ({
    mainGroups = productMainGroups,
    unitList = units,
    taxList = tax,
    settings = generalSettings,
    subGrp1 = prodSubGroupByCatOne,
    subGrp2 = prodSubGroupByCatTwo,
    subGrp3 = prodSubGroupByCatThree,
    subGrp4 = prodSubGroupByCatFour,
  } = {}) => ({
    productCode: '',
    productName: '',
    productNameArb: '',
    EnableSales: true,
    EnablePurchase: true,
    EnableInventory: true,
    CustomerLeadTime: '',
    favourite: false,
    pointOfSale: false,
    group1Id: subGrp1[0]?.groupId ?? '',
    group2Id: subGrp2[0]?.groupId ?? '',
    group3Id: subGrp3[0]?.groupId ?? '',
    group4Id: subGrp4[0]?.groupId ?? '',
    brandId: 1,
    unitId: unitList[0]?.unitId ?? '',
    partNo: '',
    costPrice: 0,
    salesTaxId: settings?.ActivateTax
      ? taxList?.length > 0 ? [taxList[taxList.length - 1]?.taxId] : []
      : [],
    PurchaseTaxId: settings?.ActivateTax
      ? taxList?.length > 0 ? [taxList[taxList.length - 1]?.taxId] : []
      : [],
    taxType: !settings?.taxincluded ? 'Excluded' : 'Included',
    minimumStock: '',
    maximumStock: '',
    reorderLevel: '',
    openingStock: '',
    narration: '',
    productImage: null,
    active: true,
    bom: false,
    showReminder: true,
    category: 'Inventory',
    NutritionName: '',
    NutritionFact: '',
    Ingredients: '',
    NutritionDetails: '',
    Location: '',
    AlternativeNo: '',
    purchaseRate: '',
    groupCode: mainGroups[0]?.groupCode ?? '',
    ShowExpiry: false,
    ExpiryDays: '',
    PurchaseRatePer: 0,
  });
  const [formData, setFormData] = useState(getInitialFormData);

  const clearForm = async () => {
    if (generalSettings && generalSettings.askConfirmationClear && !saleSettings.CloseAfterSave) {
      const result = await Swal.fire({
        title: t("clearData.title"),
        text: t("clearData.text"),
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#3085d6",
        cancelButtonColor: "#d33",
        confirmButtonText: t("clearData.confirm"),
        cancelButtonText: t("clearData.cancel"),
      });
      if (!result.isConfirmed) return;
    }
    hasInitializedEditData.current = false; // ✅ Reset the ref
    resetFormData();
  };

  // Click outside handler for dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {

      if (groupCodeDropdownRef.current && !groupCodeDropdownRef.current.contains(event.target)) {
        setShowGroupCodeDropdown(false);
      }

      if (group1DropdownRef.current && !group1DropdownRef.current.contains(event.target)) {
        setShowGroup1Dropdown(false);
      }

      if (group2DropdownRef.current && !group2DropdownRef.current.contains(event.target)) {
        setShowGroup2Dropdown(false);
      }

      if (group3DropdownRef.current && !group3DropdownRef.current.contains(event.target)) {
        setShowGroup3Dropdown(false);
      }

      if (group4DropdownRef.current && !group4DropdownRef.current.contains(event.target)) {
        setShowGroup4Dropdown(false);
      }

      if (brandDropdownRef.current && !brandDropdownRef.current.contains(event.target)) {
        setShowBrandDropdown(false);
      }

      if (unitDropdownRef.current && !unitDropdownRef.current.contains(event.target)) {
        setShowUnitDropdown(false);
      }

      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target)) {
        setShowCategoryDropdown(false);
      }

      if (salesTaxDropdownRef.current && !salesTaxDropdownRef.current.contains(event.target)) {
        setShowSalesTaxDropdown(false);
      }

      if (purchaseTaxDropdownRef.current && !purchaseTaxDropdownRef.current.contains(event.target)) {
        setShowPurchaseTaxDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);

  }, []);

  const resetFormData = () => {
    // Pass currently-loaded dropdown data so defaults are correct
    setFormData(getInitialFormData({
      mainGroups: productMainGroups,
      unitList: units,
      taxList: tax,
      settings: generalSettings,
      subGrp1: prodSubGroupByCatOne,
      subGrp2: prodSubGroupByCatTwo,
      subGrp3: prodSubGroupByCatThree,
      subGrp4: prodSubGroupByCatFour,
    }));

    setBarcodeData([{ id: 1, unit: units[0]?.unitId ?? '', conversion: 1, barcode: '' }]);
    setSalePriceData([{
      salespriceId: null,
      id: 1,
      branchId: '',
      unit: units[0]?.unitId ?? '',
      pricingLevel: '',
      mrp: 0,
      discPercent: 0,
      discAmount: 0,
      salesPrice: 0,
      lowestSellingPrice: 0,
      deleted: false,
    }]);
    setSelectedUnits([]);
    setBomData([]);
    setNutritionData([]);

    // Use current main group for code generation (not stale first element)
    const currentGroupCode = productMainGroups[0]?.groupCode;
    if (!editData && currentGroupCode) fetchProductCode(currentGroupCode);
  };

  useEffect(() => {
    if (productMainGroups.length && units.length) {
      setFormData(prev => ({
        ...prev,
        groupCode: prev.groupCode || productMainGroups[0]?.groupCode,  // ← don't overwrite if already set
        unitId: prev.unitId || units[0]?.unitId                        // ← only set if not already set
      }));
      if (!editData) fetchProductCode(productMainGroups[0]?.groupCode);
    }
  }, [productMainGroups, units]);

  useEffect(() => {
    if (tax?.length && generalSettings?.ActivateTax) {
      setFormData(prev => ({
        ...prev,
        // Convert to string
        salesTaxId: prev.salesTaxId?.length > 0 ? prev.salesTaxId : [tax[tax.length - 1].taxId.toString()],
        PurchaseTaxId: prev.PurchaseTaxId?.length > 0 ? prev.PurchaseTaxId : [tax[tax.length - 1].taxId.toString()]
      }));
    }
  }, [tax, generalSettings?.ActivateTax]);

  useEffect(() => {
    if (!isEditMode && !editData) {
      setFormData(prev => ({
        ...prev,
        group1Id: prev.group1Id || prodSubGroupByCatOne[0]?.groupId || '',
        group2Id: prev.group2Id || prodSubGroupByCatTwo[0]?.groupId || '',
        group3Id: prev.group3Id || prodSubGroupByCatThree[0]?.groupId || '',
        group4Id: prev.group4Id || prodSubGroupByCatFour[0]?.groupId || '',
      }));
    }
  }, [prodSubGroupByCatOne, prodSubGroupByCatTwo, prodSubGroupByCatThree, prodSubGroupByCatFour, isEditMode, editData]);

  useEffect(() => { onClearFormData(() => clearForm); }, []);

  const hasInitializedEditData = useRef(false);

  useEffect(() => {
    if (!editData || !units.length) return;
    if (hasInitializedEditData.current) return;

    hasInitializedEditData.current = true; // ✅ Move this BEFORE the setFormData

    if (editData) {
      setFormData({
        productCode: editData.productCode || "",
        productName: editData.productName || "",
        productNameArb: editData.productNameArb || "",
        EnableSales: editData.EnableSales,
        EnablePurchase: editData.EnablePurchase,
        EnableInventory: editData.EnableInventory,
        CustomerLeadTime: editData.CustomerLeadTime || '',
        favourite: editData.favourite || false,
        pointOfSale: editData.pointOfSale || false,
        group1Id: editData.group1Id || "",
        group2Id: editData.group2Id || "",
        group3Id: editData.group3Id || "",
        group4Id: editData.group4Id || "",
        brandId: editData.brandId || "",
        unitId: editData.unitId || "",
        partNo: editData.partNo || "",
        costPrice: editData.purchaseRate || "",
        // Handle both old taxId format and new array format
        salesTaxId: editData.salesTaxId?.map(id => id.toString()) ||
          (editData.taxId ? [editData.taxId.toString()] : []),
        PurchaseTaxId: editData.PurchaseTaxId?.map(id => id.toString()) ||
          (editData.taxId ? [editData.taxId.toString()] : []),
        minimumStock: editData.minimumStock || "",
        maximumStock: editData.maximumStock || "",
        reorderLevel: editData.reorderLevel || "",
        openingStock: editData.openingStock || "",
        taxType: editData.taxType || "",
        narration: editData.narration || "",
        active: editData.active,
        bom: editData.bom,
        showReminder: editData.showReminder,
        category: editData.category,
        groupCode: editData.groupCode,
        ShowExpiry: editData.ShowExpiry,
        ExpiryDays: editData.ExpiryDays,
        Location: editData.Location || "",
        AlternativeNo: editData.AlternativeNo || "",
        Ingredients: editData.Ingredients || "",
        NutritionFact: editData.NutritionFact,
        NutritionName: editData.NutritionName || "",
        PurchaseRatePer: editData.PurchaseRatePer || "",
      });

      const mappedBarcodeData = editData.unit_conversions?.map((u, idx) => ({
        id: idx + 1,
        unit: u.unitId,
        conversion: u.conversionRate,
        barcode: u.barcode || '',
      })) || [{ id: 1, unit: "", conversion: 1, barcode: "" }];
      setBarcodeData(mappedBarcodeData);

      // ✅ FIXED: Properly map sales prices with correct field names
      const mappedSalesPriceData = editData.salesPrices?.map((s, idx) => ({
        salespriceId: s.salespriceId,
        id: idx + 1,
        branchId: s.branchId?.toString() || '', // ✅ Convert to string
        unit: s.unitId,
        pricingLevel: s.PricingLevelId,
        mrp: parseFloat(s.amount) || 0, // ✅ Parse the amount
        discPercent: parseFloat(s.discPercentage) || 0, // ✅ Use discPercentage
        discAmount: parseFloat(s.discAmount) || 0,
        salesPrice: parseFloat(s.salesPrice) || 0,
        lowestSellingPrice: parseFloat(s.lowestSellingPrice) || 0,
        deleted: false
      })) || [{
        salespriceId: null,
        id: 1,
        branchId: '',
        unit: '',
        pricingLevel: '',
        mrp: 0,
        discPercent: 0,
        discAmount: 0,
        salesPrice: 0,
        lowestSellingPrice: 0,
        deleted: false
      }];

      setSalePriceData(mappedSalesPriceData);

      const allUnitIds = new Set();
      mappedBarcodeData.forEach(row => { if (row.unit) allUnitIds.add(row.unit); });
      mappedSalesPriceData.forEach(row => { if (row.unit) allUnitIds.add(row.unit); });
      const extractedUnits = Array.from(allUnitIds)
        .map(unitId => {
          const unit = units.find(u => u.unitId === unitId);
          return unit ? { unitId: unit.unitId, UnitName: unit.UnitName } : null;
        })
        .filter(Boolean);
      setSelectedUnits(extractedUnits);

      try {
        setNutritionData(JSON.parse(editData.NutritionDetails || "[]"));
      } catch {
        setNutritionData([]);
      }

      setBomData(
        editData?.bill_of_materials?.map((bom, idx) => ({
          id: idx + 1,
          bomId: bom.bomId,
          rawMaterial: bom.rowMaterialId,
          qty: bom.Quantity,
          unit: bom.UnitId,
        })) || [{ id: 1, rawMaterial: "", qty: "", unit: "" }]
      );
    }
  }, [editData, units]);

  useEffect(() => {
    if (formData.unitId) {
      const baseUnitDetails = units.find(unit => unit.unitId === formData.unitId);
      setBarcodeData(prevData => {
        if (prevData.length === 1 && !prevData[0].unit) return [{ ...prevData[0], unit: formData.unitId, conversion: 1, barcode: '' }];
        const baseUnitExists = prevData.some(row => row.unit === formData.unitId);
        if (!baseUnitExists) return prevData.map((row, index) => index === 0 ? { ...row, unit: formData.unitId, conversion: 1 } : row);
        return prevData;
      });
      setSalePriceData(prevData => prevData.map((row, index) =>
        index === 0 && !row.unit ? { ...row, unit: formData.unitId } : row
      ));
      if (baseUnitDetails) {
        setSelectedUnits(prevSelected => {
          const isBaseUnitAlreadySelected = prevSelected.some(unit => unit.unitId === formData.unitId);
          if (!isBaseUnitAlreadySelected) return [{ unitId: baseUnitDetails.unitId, UnitName: baseUnitDetails.UnitName }, ...prevSelected];
          return prevSelected;
        });
      }
    }
  }, [formData.unitId, units]);

  useEffect(() => { onClearFormData(() => clearForm); }, []);

  // Clear barcode error as soon as a valid row exists
  useEffect(() => {
    const valid = barcodeData.filter(row => row.unit && row.conversion);
    if (valid.length > 0 && errors.barcodeData) {
      setErrors(prev => ({ ...prev, barcodeData: undefined }));
    }
  }, [barcodeData]);

  // Clear sales price error as soon as a valid row exists
  useEffect(() => {
    const valid = salePriceData.filter(row => !row.deleted && row.unit && (row.mrp || row.salesPrice));
    if (valid.length > 0 && errors.salePriceData) {
      setErrors(prev => ({ ...prev, salePriceData: undefined }));
    }
  }, [salePriceData]);

  const { hasAccess: ProdMainGroupHasAccess, canAdd: canAddProdMainGroup, canEdit: canEditProdMainGroup } = usePrivileges("Product Main Group");
  const { hasAccess: ProdGroupHasAccess, canAdd: canAddProdGroup, canEdit: canEditProdGroup } = usePrivileges("Product Group");

  const fetchProductCode = async (productCodeId) => {
    try {
      const response = await axiosInstance.get(`product-code-generation-byId/${productCodeId}`);
      if (response.data?.data?.productCode) setFormData(prev => ({ ...prev, productCode: response.data?.data?.productCode }));
    } catch (error) { console.error("Error generating product code:", error); }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === "productCode") {
      setFormData((prev) => ({ ...prev, [name]: value.replace(/[\\/:*?"<>|]/g, "") }));
      return;
    }
    if (name === "CustomerLeadTime") {
      setFormData((prev) => ({ ...prev, [name]: value.replace(/[^0-9]/g, "") }));
      if (errors[name]) setErrors(prev => ({ ...prev, [name]: undefined }));
      return;
    }
    setFormData((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: undefined }));
  };

  const handleInputBlur = (e) => validateFieldOnBlur(e.target.name);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const maxSize = 10 * 1024;
      const options = { maxWidthOrHeight: 150, initialQuality: 0.3, fileType: "image/jpeg", useWebWorker: true };
      let compressedBlob = await imageCompression(file, options);
      let quality = 0.3;
      while (compressedBlob.size > maxSize && quality > 0.05) {
        quality -= 0.05;
        compressedBlob = await imageCompression(file, { ...options, initialQuality: quality });
      }
      if (compressedBlob.size > maxSize) {
        setAlert({ id: Date.now(), type: "error", message: `Unable to compress below 10 KB. Current size: ${(compressedBlob.size / 1024).toFixed(2)} KB` });
        return;
      }
      setFormData((prev) => ({ ...prev, productImage: new File([compressedBlob], file.name, { type: compressedBlob.type, lastModified: Date.now() }) }));
    } catch (error) {
      console.error("Image compression error:", error);
      setAlert({ id: Date.now(), type: "error", message: "Error compressing image" });
    }
  };

  const prepareApiPayload = () => {
    const nutritionDetails = nutritionData.map(item => ({ name: item.name, value: item.value }));
    return {
      productCode: formData.productCode, productName: formData.productName,
      activeFinancialYear_fromDate: currentFinancialYear?.fromDate,
      EnableSales: formData.EnableSales !== undefined ? formData.EnableSales : true,
      EnablePurchase: formData.EnablePurchase !== undefined ? formData.EnablePurchase : true,
      EnableInventory: formData.EnableInventory !== undefined ? formData.EnableInventory : true,
      CustomerLeadTime: formData.CustomerLeadTime ? Number(formData.CustomerLeadTime) : 0,
      favourite: formData.favourite ? 1 : 0,
      pointOfSale: formData.pointOfSale ? 1 : 0,
      productNameArb: formData.productNameArb,
      group1Id: formData.group1Id, group2Id: formData.group2Id, group3Id: formData.group3Id, group4Id: formData.group4Id,
      brandId: formData.brandId, unitId: formData.unitId, partNo: formData.partNo, purchaseRate: formData.costPrice || 0,
      salesTaxId: formData.salesTaxId || [], PurchaseTaxId: formData.PurchaseTaxId || [],
      minimumStock: formData.minimumStock, maximumStock: formData.maximumStock,
      reorderLevel: formData.reorderLevel, openingStock: formData.openingStock,
      taxType: formData.taxType, narration: formData.narration, productImage: formData.productImage,
      active: formData.active, bom: Boolean(formData.bom), showReminder: formData.showReminder,
      category: formData.category, groupCode: formData.groupCode, ShowExpiry: formData.ShowExpiry, ExpiryDays: formData.ExpiryDays,
      Location: formData.Location, AlternativeNo: formData.AlternativeNo, Ingredients: formData.Ingredients,
      NutritionFact: formData.NutritionFact, NutritionName: formData.NutritionName,
      NutritionDetails: JSON.stringify(nutritionDetails) || null, allowBatch: true,
      PurchaseRatePer: formData.PurchaseRatePer || 0, branchId: selectedBranchId, CreatedUser: userId,
      unitConversions: barcodeData
        .filter(row => row.unit && row.conversion)  // ← just needs unit + conversion
        .map(row => ({
          unitId: row.unit,
          conversionRate: parseFloat(row.conversion) || 1,
          barcode: row.barcode || ''
        })),
      salesPrices: salePriceData.map(row => ({
        salespriceId: row.salespriceId, branchId: row.branchId, unitId: row.unit,
        amount: parseFloat(row.mrp) || 0, discPercentage: parseFloat(row.discPercent) || 0,
        discAmount: parseFloat(row.discAmount) || 0, salesPrice: parseFloat(row.salesPrice),
        PricingLevelId: row.pricingLevel, lowestSellingPrice: parseFloat(row.lowestSellingPrice) || 0, deleted: row.deleted || false
      })),
      billOfMaterials: bomData
        .filter(row => row.rawMaterial && row.qty !== '' && row.qty !== null && row.unit)
        .map(row => ({ rowMaterialId: row.rawMaterial, UnitId: row.unit, Quantity: parseFloat(row.qty) }))
    };
  };


  // AFTER
  const validateForm = () => {
    const newErrors = {};

    // Field-level required checks
    const requiredFields = [
      { field: "productCode", label: t("product.form.productCode") },
      { field: "productName", label: t("product.form.productName") },
      { field: "groupCode", label: t("product.form.mainGroup") },
      { field: "unitId", label: t("product.form.baseUnit") },
      { field: "group4Id", label: t("product.form.subGroup4") },
    ];
    requiredFields.forEach(({ field, label }) => {
      const value = formData[field];
      if (!value || String(value).trim() === "") newErrors[field] = `${label} is required`;
    });

    // At least one valid unit conversion row (has unit + conversion)
    const validBarcodeRows = barcodeData.filter(row => row.unit && row.conversion);
    if (validBarcodeRows.length === 0) {
      newErrors.barcodeData = t("product.validation.unitConversionRequired") || "At least one unit conversion row is required";
    }

    const baseUnitId = formData.unitId;
    const hasBaseUnit = validBarcodeRows.some(row => row.unit?.toString() === baseUnitId?.toString());
    if (baseUnitId && !hasBaseUnit) {
      newErrors.barcodeData = t("product.validation.baseUnitRequired") || `Base unit must be included in unit conversions`;
    }



    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateFieldOnBlur = (fieldName) => {
    const newErrors = { ...errors };
    const requiredFields = ['productCode', 'productName', 'groupCode', 'unitId', 'group4Id'];
    if (requiredFields.includes(fieldName)) {
      if (!formData[fieldName] || formData[fieldName].trim() === '') {
        const fieldLabels = {
          productCode: t("product.form.productCode"), productName: t("product.form.productName"),
          groupCode: t("product.form.mainGroup"), unitId: t("product.form.baseUnit"), group4Id: t("product.form.baseUnit"),
        };
        newErrors[fieldName] = `${fieldLabels[fieldName]} is required`;
      } else delete newErrors[fieldName];
    }
    setErrors(newErrors);
  };

  const submitProduct = async (payload) => {
    

    try {
      onSubmitStateChange?.(true);
      const url = isEditMode ? `update-product/${formData.productCode}` : "save-product";
      const response = await axiosInstance.post(url, payload, { headers: { "Content-Type": "multipart/form-data" } });
      if (!response.data.error) {
        dispatch(refreshProductsByType('sales'))
        dispatch(refreshProductsByType('purchase'))
        dispatch(refreshProductsByType('inventory'))
        setAlert({ id: Date.now(), type: "success", message: isEditMode ? t("product.messages.updateSuccess") : t("product.messages.addSuccess") });
        if (onSuccess) onSuccess();
        if (inventorySettings?.CloseAfterSave || isEditMode) {
          resetFormData();          // silent reset
          navigate('/master/product-list');
        } else {
          resetFormData();          // silent reset, stay on page
        }
      }
      return response.data;
    } catch (error) {
      setAlert({ id: Date.now(), type: "error", message: error.response?.data?.message || (isEditMode ? t("product.messages.updateError") : t("product.messages.addError")) });
      throw error;
    } finally { onSubmitStateChange?.(false); }
  };

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      setAlert({ id: new Date(), type: "error", message: t("pleaseFillRequiredFieldMsg") });
      setTimeout(() => setAlert(null), 5000);
      return;
    }
    setSubmitting(true);
    if ((!isEditMode && generalSettings?.askConfirmationSave) || (isEditMode && generalSettings?.askConfirmationEdit)) {
      const result = await Swal.fire({
        title: t("saveData.title"), text: t("saveData.text"), icon: "warning", showCancelButton: true,
        confirmButtonColor: "#3085d6", cancelButtonColor: "#d33",
        confirmButtonText: isEditMode ? t("common.yesUpdate") : t("saveData.confirm"),
        cancelButtonText: t("saveData.cancel"),
        customClass: { container: 'swal-container-class' },
        didOpen: () => { const c = document.querySelector('.swal2-container'); if (c) c.style.zIndex = '9999'; }
      });
      if (!result.isConfirmed) { setSubmitting(false); return; }
    }
    if (formData.minimumStock > formData.maximumStock) {
      setAlert({ id: Date.now(), type: "error", message: t("product.messages.stockValidation") });
      setSubmitting(false);
      return;
    }
    try { await submitProduct(prepareApiPayload()); } catch { console.error("error") } finally { setSubmitting(false); }
  };



  const [translating, setTranslating] = useState(false);

  const handleTranslate = async () => {
    const inputText = formData.productName?.trim();
    if (!inputText) return;
    setTranslating(true);
    try {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=ar&dt=t&q=${encodeURIComponent(inputText)}`;
      const response = await fetch(url);
      const data = await response.json();
      setFormData((prev) => ({ ...prev, productNameArb: data?.[0]?.[0]?.[0] || "" }));
    } catch (error) { console.error("Translation error:", error); } finally { setTranslating(false); }
  };

  const AddBtn = ({ onClick, title }) => !viewMode && (
    <button type="button" className="h-9 px-3 main-bg text-white rounded-md hover:main-bg dark:hover:bg-blue-500 transition-colors flex items-center justify-center flex-shrink-0" onClick={onClick} title={title}>
      <Plus className="w-4 h-4" />
    </button>
  );

  // Updated tabs - merged "groups" and "details" into "general"
  const tabs = [
    { id: "general", label: "General" },
    { id: "barcode", label: t("Barcode") || "Barcode" },
    { id: 'salesPrice', label: 'Sales Price' },
    { id: 'bom', label: 'BOM' },
    { id: 'nutrition', label: 'Nutrition' },
    ...(isEditMode ? [{ id: 'stock', label: 'Stock' }] : []),   // ← add this line
  ];

  // Helper to get image preview URL
  const getImagePreview = () => {
    if (formData.productImage && formData.productImage instanceof File) {
      return URL.createObjectURL(formData.productImage);
    }
    if (editData?.productImage) {
      return editData.productImage;
    }
    return null;
  };

  return (
    <>
      {alert && <AlertBox key={alert.id} message={alert.message} type={alert.type} />}
      <div className="mx-auto px-4 py-2">
        <div className="max-w-6xl mx-auto bg-white dark:bg-[#1e1e1e] rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="px-4 py-3">
            <form onSubmit={handleSubmit}>

              {/* ═══════════════════════════════════════════════════════════ */}
              {/* MAIN SECTION - Always Visible                              */}
              {/* ═══════════════════════════════════════════════════════════ */}
              <div className="flex gap-6 mb-4">

                {/* Left Side - Core Fields */}
                <div className="flex-1 space-y-2">

                  {/* Product Name - Large Title with Favourite Star */}
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-0.5 block">
                      {t("product.form.productName")} <span className="text-red-500">*</span>
                    </label>
                    <div className="flex items-center gap-2">
                      {!viewMode && (
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, favourite: !prev.favourite }))}
                          className={`flex-shrink-0 p-1 rounded transition-colors ${formData.favourite
                            ? 'text-yellow-500 hover:text-yellow-600'
                            : 'text-gray-400 hover:text-gray-500'
                            }`}
                          title={formData.favourite ? t("product.form.removeFromFavourite") : t("product.form.addToFavourite")}
                        >
                          <Star className={`w-5 h-5 ${formData.favourite ? 'fill-current' : ''}`} />
                        </button>
                      )}
                      {viewMode && formData.favourite && (
                        <Star className="w-5 h-5 text-yellow-500 fill-current flex-shrink-0" />
                      )}
                      <input
                        type="text"
                        name="productName"
                        value={formData.productName}
                        onChange={handleInputChange}
                        onBlur={handleInputBlur}
                        placeholder={t("product.placeholders.productName")}
                        required
                        readOnly={viewMode}
                        className="flex-1 text-xl font-bold bg-transparent border-0 border-b-2 border-gray-800 dark:border-gray-300 
                                 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500
                                 focus:outline-none focus:border-teal-600 dark:focus:border-teal-400 pb-1 transition-colors
                                 read-only:border-gray-500"
                      />
                    </div>
                    {errors.productName && (
                      <p className="text-xs text-red-500 dark:text-red-400 mt-0.5">{errors.productName}</p>
                    )}
                  </div>

                  {/* Product Name FL (Arabic) - Right below product name */}
                  <InputRow label={t("product.form.productNameFL")}>
                    <div className="flex gap-2 items-center">
                      <div className="flex-1">
                        <UnderlineInput
                          name="productNameArb"
                          value={formData.productNameArb}
                          onChange={handleInputChange}
                          placeholder={t("product.placeholders.productNameFL")}
                          readOnly={viewMode}
                        />
                      </div>
                      {!viewMode && (
                        <button
                          type="button"
                          onClick={handleTranslate}
                          disabled={translating || !formData.productName?.trim()}
                          className={`h-8 px-2.5 main-bg text-gray-200 rounded-md hover:main-bg dark:hover:bg-blue-500 transition-colors flex items-center justify-center flex-shrink-0 ${translating || !formData.productName?.trim() ? "opacity-60 cursor-not-allowed" : ""}`}
                          title={t("product.buttons.translate")}
                        >
                          <MdGTranslate className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </InputRow>

                  {/* Product Code, Main Group, Base Unit - All in one line */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                    {/* Product Code */}
                    <div>
                      <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-0.5 block">
                        {t("product.form.productCode")} <span className="text-red-500">*</span>
                      </label>
                      <UnderlineInput
                        name="productCode"
                        value={formData.productCode}
                        onChange={handleInputChange}
                        onBlur={handleInputBlur}
                        placeholder={t("product.placeholders.productCode")}
                        required
                        readOnly={viewMode || isEditMode}
                      />
                      {errors.productCode && <p className="text-xs text-red-500 dark:text-red-400 mt-0.5">{errors.productCode}</p>}
                    </div>

                    {/* Main Group */}
                    <div>
                      <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-0.5 block">
                        {t("product.form.mainGroup")} <span className="text-red-500">*</span>
                      </label>
                      <div className="flex gap-2 items-center">
                        <div className="flex-1">
                          <UnderlineDropdown
                            name="groupCode"
                            value={formData.groupCode}
                            options={productMainGroups.map(d => ({ value: d.groupCode, label: d.groupName }))}
                            onChange={(value) => {
                              setFormData(prev => ({ ...prev, groupCode: value }));
                              if (value) fetchProductCode(value);
                              if (errors.groupCode) setErrors(prev => ({ ...prev, groupCode: undefined }));
                            }}
                            placeholder={t("product.form.mainGroup")}
                            loading={loadings.prodMain}
                            readOnly={viewMode}
                            showDropdown={showGroupCodeDropdown}
                            setShowDropdown={setShowGroupCodeDropdown}
                            dropdownRef={groupCodeDropdownRef}
                          />
                        </div>
                        <AddBtn onClick={() => setProdMainGroupOpen(true)} title={t('product.buttons.addMainGroup')} />
                      </div>
                      {errors.groupCode && <p className="text-xs text-red-500 dark:text-red-400 mt-0.5">{errors.groupCode}</p>}
                    </div>

                    {/* Base Unit */}
                    <div>
                      <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-0.5 block">
                        {t("product.form.baseUnit")} <span className="text-red-500">*</span>
                      </label>
                      <div className="flex gap-2 items-center">
                        <div className="flex-1">
                          <UnderlineDropdown
                            name="unitId"
                            value={Number(formData.unitId)}
                            options={units.map(d => ({ value: d.unitId, label: d.UnitName }))}
                            onChange={(value) => {
                              setFormData(prev => ({ ...prev, unitId: value }));
                              if (errors.unitId) setErrors(prev => ({ ...prev, unitId: undefined }));
                            }}
                            placeholder={t("product.placeholders.baseUnit")}
                            loading={loadings.unit}
                            readOnly={viewMode}
                            showDropdown={showUnitDropdown}
                            setShowDropdown={setShowUnitDropdown}
                            dropdownRef={unitDropdownRef}
                          />
                        </div>
                        <AddBtn onClick={() => { setActiveMasterForm(t("unit.breadcrumb.title")); setBrandModalIsOpen(true); }} title={t('product.buttons.addUnit')} />
                      </div>
                      {errors.unitId && <p className="text-xs text-red-500 dark:text-red-400 mt-0.5">{errors.unitId}</p>}
                    </div>
                  </div>
                </div>

                {/* Right Side - Product Image */}
                <div className="flex-shrink-0">
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">
                    {t("product.form.logo")}
                  </label>
                  <div className="w-36 h-36 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg 
                                flex flex-col items-center justify-center relative overflow-hidden
                                hover:border-teal-400 dark:hover:border-teal-500 transition-colors group bg-gray-50 dark:bg-[#242424]">
                    {getImagePreview() ? (
                      <>
                        <img
                          src={getImagePreview()}
                          alt="Product"
                          className="w-full h-full object-cover rounded-lg"
                        />
                        {!viewMode && (
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 rounded-lg">
                            <label
                              htmlFor="product-image-upload"
                              className="p-2 bg-white/90 rounded-full cursor-pointer hover:bg-white transition-colors"
                              title="Change image"
                            >
                              <Upload className="w-4 h-4 text-gray-700" />
                            </label>
                            <button
                              type="button"
                              onClick={() => setFormData(prev => ({ ...prev, productImage: null }))}
                              className="p-2 bg-red-500/90 rounded-full hover:bg-red-500 transition-colors"
                              title="Remove image"
                            >
                              <span className="text-white text-sm font-bold leading-none">×</span>
                            </button>
                          </div>
                        )}
                      </>
                    ) : (
                      <label
                        htmlFor="product-image-upload"
                        className={`flex flex-col items-center justify-center w-full h-full ${!viewMode ? 'cursor-pointer' : 'cursor-default'}`}
                      >
                        <ImageIcon className="w-8 h-8 text-gray-400 dark:text-gray-500 mb-1" />
                        {!viewMode && (
                          <span className="text-xs text-gray-400 dark:text-gray-500 text-center px-2">
                            Click to upload
                          </span>
                        )}
                      </label>
                    )}
                    {!viewMode && (
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                        id="product-image-upload"
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* ═══════════════════════════════════════════════════════════ */}
              {/* CHECKBOXES - Reordered: Active, Show Reminder, POS, rest   */}
              {/* ═══════════════════════════════════════════════════════════ */}
              <div className="mb-4 py-2.5 px-3 bg-gray-50 dark:bg-[#242424] rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                  <Cb id="active" name="active" checked={formData.active} onChange={handleInputChange} label={t("product.form.active")} disabled={viewMode} />
                  <div className="h-4 w-px bg-gray-300 dark:bg-gray-600 hidden sm:block"></div>
                  <Cb id="showReminder" name="showReminder" checked={formData.showReminder} onChange={handleInputChange} label={t("product.form.showReminder")} disabled={viewMode} />
                  <div className="h-4 w-px bg-gray-300 dark:bg-gray-600 hidden sm:block"></div>
                  <Cb id="pointOfSale" name="pointOfSale" checked={formData.pointOfSale} onChange={handleInputChange} label={t("product.form.pointOfSale")} disabled={viewMode} />
                  <div className="h-4 w-px bg-gray-300 dark:bg-gray-600 hidden sm:block"></div>
                  <Cb id="EnableSales" name="EnableSales" checked={formData.EnableSales} onChange={handleInputChange} label={t("product.form.enableSales")} disabled={viewMode} />
                  <div className="h-4 w-px bg-gray-300 dark:bg-gray-600 hidden sm:block"></div>
                  <Cb id="EnablePurchase" name="EnablePurchase" checked={formData.EnablePurchase} onChange={handleInputChange} label={t("product.form.enablePurchase")} disabled={viewMode} />
                  <div className="h-4 w-px bg-gray-300 dark:bg-gray-600 hidden sm:block"></div>
                  <Cb id="EnableInventory" name="EnableInventory" checked={formData.EnableInventory} onChange={handleInputChange} label={t("product.form.enableInventory")} disabled={viewMode} />
                  <div className="h-4 w-px bg-gray-300 dark:bg-gray-600 hidden sm:block"></div>

                  {/* Show Expiry with inline days input */}
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="ShowExpiry"
                      name="ShowExpiry"
                      checked={formData.ShowExpiry}
                      onChange={handleInputChange}
                      className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                      disabled={viewMode}
                    />
                    <label htmlFor="ShowExpiry" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t("product.form.ShowExpiry")}
                    </label>
                    {formData.ShowExpiry && (
                      <input
                        type="number"
                        name="ExpiryDays"
                        value={formData.ExpiryDays || ""}
                        onChange={handleInputChange}
                        placeholder={t("product.placeholders.ExpiryDays")}
                        readOnly={viewMode}
                        className="w-20 px-2 py-0.5 text-sm border border-gray-300 dark:border-gray-600 rounded 
                                 bg-white dark:bg-[#1e1e1e] text-gray-900 dark:text-gray-100
                                 focus:outline-none focus:border-teal-500 transition-colors"
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* ═══════════════════════════════════════════════════════════ */}
              {/* TAB NAVIGATION                                             */}
              {/* ═══════════════════════════════════════════════════════════ */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                <div className="flex border-b border-gray-300 dark:border-gray-600 overflow-x-auto">
                  {tabs.map((tab, index) => {

                    // Which tabs have errors
                    const tabHasError =
                      (tab.id === 'barcode' && errors.barcodeData) ||
                      (tab.id === 'salesPrice' && errors.salePriceData);

                    return (
                      <div key={tab.id} className="flex items-center flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => setActiveTab(tab.id)}
                          className={`px-4 py-2 text-sm font-medium transition-all relative whitespace-nowrap flex items-center gap-1.5
              ${activeTab === tab.id
                              ? 'bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400 border-b-2 border-teal-600 dark:border-teal-400'
                              : tabHasError
                                ? 'bg-white dark:bg-[#1e1e1e] text-red-500 dark:text-red-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                                : 'bg-white dark:bg-[#1e1e1e] text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                            }`}
                        >
                          {tab.label}
                          {tabHasError && (
                            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 text-xs leading-none">
                              !
                            </span>
                          )}
                        </button>
                        {index < tabs.length - 1 && (
                          <div className="h-6 w-px bg-gray-300 dark:bg-gray-600"></div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Tab-level error messages shown below the tab bar */}
                {(errors.barcodeData || errors.salePriceData) && (
                  <div className="flex flex-col gap-1 mt-1.5 px-1">
                    {errors.barcodeData && (
                      <p className="text-xs text-red-500 dark:text-red-400 flex items-center gap-1">
                        <span className="font-medium">Barcode:</span> {errors.barcodeData}
                      </p>
                    )}
                    {errors.salePriceData && (
                      <p className="text-xs text-red-500 dark:text-red-400 flex items-center gap-1">
                        <span className="font-medium">Sales Price:</span> {errors.salePriceData}
                      </p>
                    )}
                  </div>
                )}
              </div>
              {/* ═══════════════════════════════════════════════════════════ */}
              {/* TAB CONTENT                                                */}
              {/* ═══════════════════════════════════════════════════════════ */}
              {activeTab && (
                <div className="border border-gray-200 dark:border-gray-700 border-t-0 rounded-b-lg p-4 bg-gray-50 dark:bg-[#242424] min-h-[380px]">

                  {/* ─── GENERAL TAB (Merged Groups + Details) ─── */}
                  {activeTab === "general" && (
                    <div className="space-y-4">

                      {/* Product Groups Fields */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-2">

                        {/* Sub Group 1 */}
                        <InputRow label={t("product.form.subGroup1")}>
                          <div className="flex gap-2 items-center">
                            <div className="flex-1">
                              <UnderlineDropdown
                                name="group1Id"
                                value={formData.group1Id}
                                options={prodSubGroupByCatOne.map(d => ({ value: d.groupId, label: d.groupName }))}
                                onChange={(value) => {
                                  setFormData(prev => ({ ...prev, group1Id: value }));
                                }}
                                placeholder={t("product.form.subGroup1")}
                                loading={loadings.subGrpByCatOne}
                                readOnly={viewMode}
                                showDropdown={showGroup1Dropdown}
                                setShowDropdown={setShowGroup1Dropdown}
                                dropdownRef={group1DropdownRef}
                              />
                            </div>
                            <AddBtn onClick={() => { setProdGroupOpen(true); setSelectedCatgoryGrp('category-1'); }} title={t('product.buttons.addSubGroup')} />
                          </div>
                        </InputRow>

                        {/* Sub Group 2 */}
                        <InputRow label={t("product.form.subGroup2")}>
                          <div className="flex gap-2 items-center">
                            <div className="flex-1">
                              <UnderlineDropdown
                                name="group2Id"
                                value={formData.group2Id}
                                options={prodSubGroupByCatTwo.map(d => ({ value: d.groupId, label: d.groupName }))}
                                onChange={(value) => {
                                  setFormData(prev => ({ ...prev, group2Id: value }));
                                }}
                                placeholder={t("product.form.subGroup2")}
                                loading={loadings.subGrpByCatTwo}
                                readOnly={viewMode}
                                showDropdown={showGroup2Dropdown}
                                setShowDropdown={setShowGroup2Dropdown}
                                dropdownRef={group2DropdownRef}
                              />
                            </div>
                            <AddBtn onClick={() => { setProdGroupOpen(true); setSelectedCatgoryGrp('category-2'); }} title={t('product.buttons.addSubGroup')} />
                          </div>
                        </InputRow>

                        {/* Sub Group 3 */}
                        <InputRow label={t("product.form.subGroup3")}>
                          <div className="flex gap-2 items-center">
                            <div className="flex-1">
                              <UnderlineDropdown
                                name="group3Id"
                                value={formData.group3Id}
                                options={prodSubGroupByCatThree.map(d => ({ value: d.groupId, label: d.groupName }))}
                                onChange={(value) => {
                                  setFormData(prev => ({ ...prev, group3Id: value }));
                                }}
                                placeholder={t("product.form.subGroup3")}
                                loading={loadings.subGrpByCatThree}
                                readOnly={viewMode}
                                showDropdown={showGroup3Dropdown}
                                setShowDropdown={setShowGroup3Dropdown}
                                dropdownRef={group3DropdownRef}
                              />
                            </div>
                            <AddBtn onClick={() => { setProdGroupOpen(true); setSelectedCatgoryGrp('category-3'); }} title={t('product.buttons.addSubGroup')} />
                          </div>
                        </InputRow>

                        {/* Sub Group 4 */}
                        <InputRow label={t("product.form.subGroup4")} required error={errors.group4Id}>
                          <div className="flex gap-2 items-center">
                            <div className="flex-1">
                              <UnderlineDropdown
                                name="group4Id"
                                value={formData.group4Id}
                                options={prodSubGroupByCatFour.map(d => ({ value: d.groupId, label: d.groupName }))}
                                onChange={(value) => {
                                  setFormData(prev => ({ ...prev, group4Id: value }));
                                  if (errors.group4Id) setErrors(prev => ({ ...prev, group4Id: undefined }));
                                }}
                                placeholder={t("product.form.subGroup4")}
                                loading={loadings.subGrpByCatFour}
                                readOnly={viewMode}
                                showDropdown={showGroup4Dropdown}
                                setShowDropdown={setShowGroup4Dropdown}
                                dropdownRef={group4DropdownRef}
                              />
                            </div>
                            <AddBtn onClick={() => { setProdGroupOpen(true); setSelectedCatgoryGrp('category-4'); }} title={t('product.buttons.addSubGroup')} />
                          </div>
                        </InputRow>

                        {/* Brand */}
                        <InputRow label={t("product.form.brand")}>
                          <div className="flex gap-2 items-center">
                            <div className="flex-1">
                              <UnderlineDropdown
                                name="brandId"
                                value={formData.brandId}
                                options={brands.map(d => ({ value: d.brandId, label: d.brandName }))}
                                onChange={(value) => {
                                  setFormData(prev => ({ ...prev, brandId: value }));
                                }}
                                placeholder={t("product.form.brand")}
                                loading={loadings.brand}
                                readOnly={viewMode}
                                showDropdown={showBrandDropdown}
                                setShowDropdown={setShowBrandDropdown}
                                dropdownRef={brandDropdownRef}
                              />
                            </div>
                            <AddBtn onClick={() => { setActiveMasterForm("Brand"); setBrandModalIsOpen(true); }} title={t('product.buttons.addBrand')} />
                          </div>
                        </InputRow>

                        {/* Category */}
                        <InputRow label={t("product.form.category")}>
                          <UnderlineDropdown
                            name="category"
                            value={formData.category}
                            options={[
                              { value: "Inventory", label: "Inventory" },
                              { value: "Non Inventory", label: "Non Inventory" }
                            ]}
                            onChange={(value) => {
                              setFormData(prev => ({ ...prev, category: value }));
                            }}
                            placeholder={t("product.placeholders.category")}
                            readOnly={viewMode}
                            showDropdown={showCategoryDropdown}
                            setShowDropdown={setShowCategoryDropdown}
                            dropdownRef={categoryDropdownRef}
                          />
                        </InputRow>

                        {/* Part Number */}
                        <InputRow label={t("product.form.partNumber")}>
                          <UnderlineInput
                            name="partNo"
                            value={formData.partNo}
                            onChange={handleInputChange}
                            placeholder={t("product.placeholders.partNumber")}
                            readOnly={viewMode}
                          />
                        </InputRow>

                        {/* Cost Price */}
                        <InputRow label={t("product.form.costPrice")}>
                          <div className="grid grid-cols-2 gap-2">
                            <UnderlineInput
                              name="costPrice"
                              value={formData.costPrice}
                              onChange={handleInputChange}
                              placeholder={t("product.placeholders.costPrice")}
                              type="number"
                              readOnly={viewMode}
                            />
                            <UnderlineInput
                              name="PurchaseRatePer"
                              value={formData.PurchaseRatePer}
                              onChange={handleInputChange}
                              placeholder="%"
                              type="number"
                              readOnly={viewMode}
                            />
                          </div>
                        </InputRow>

                        {/* Sales Tax */}
                        {generalSettings?.ActivateTax && (
                          <InputRow label={t("product.form.salesTax")}>
                            <div className="flex gap-2 items-center">
                              <div className="flex-1">
                                <UnderlineMultiSelect
                                  name="salesTaxId"
                                  value={formData.salesTaxId}
                                  options={tax.map(d => ({ value: d.taxId.toString(), label: d.taxName }))}
                                  onChange={(values) => {
                                    setFormData(prev => ({ ...prev, salesTaxId: values }));
                                  }}
                                  placeholder={t("product.form.salesTax")}
                                  loading={loadings.tax}
                                  readOnly={viewMode}
                                  showDropdown={showSalesTaxDropdown}
                                  setShowDropdown={setShowSalesTaxDropdown}
                                  dropdownRef={salesTaxDropdownRef}
                                />
                              </div>
                              <AddBtn onClick={() => setTaxMasterIsOpen(true)} title={t('product.buttons.addTax')} />
                            </div>
                          </InputRow>
                        )}

                        {/* Purchase Tax */}
                        {generalSettings?.ActivateTax && (
                          <InputRow label={t("product.form.purchaseTax")}>
                            <div className="flex gap-2 items-center">
                              <div className="flex-1">
                                <UnderlineMultiSelect
                                  name="PurchaseTaxId"
                                  value={formData.PurchaseTaxId}
                                  options={tax.map(d => ({ value: d.taxId.toString(), label: d.taxName }))}
                                  onChange={(values) => {
                                    setFormData(prev => ({ ...prev, PurchaseTaxId: values }));
                                  }}
                                  placeholder={t("product.placeholders.purchaseTax")}
                                  loading={loadings.tax}
                                  readOnly={viewMode}
                                  showDropdown={showPurchaseTaxDropdown}
                                  setShowDropdown={setShowPurchaseTaxDropdown}
                                  dropdownRef={purchaseTaxDropdownRef}
                                />
                              </div>
                              <AddBtn onClick={() => setTaxMasterIsOpen(true)} title={t('product.buttons.addTax')} />
                            </div>
                          </InputRow>
                        )}

                        {/* Stock Information */}
                        <InputRow label={t("product.form.minimumStock")}>
                          <div className="grid grid-cols-3 gap-2">
                            <UnderlineInput
                              name="minimumStock"
                              value={formData.minimumStock}
                              onChange={handleInputChange}
                              placeholder="Min"
                              type="number"
                              readOnly={viewMode}
                            />
                            <UnderlineInput
                              name="maximumStock"
                              value={formData.maximumStock}
                              onChange={handleInputChange}
                              placeholder="Max"
                              type="number"
                              readOnly={viewMode}
                            />
                            <UnderlineInput
                              name="reorderLevel"
                              value={formData.reorderLevel}
                              onChange={handleInputChange}
                              placeholder="Reorder"
                              type="number"
                              readOnly={viewMode}
                            />
                          </div>
                        </InputRow>

                        <InputRow label={t("product.placeholders.openingStock")}>
                          <UnderlineInput
                            name="openingStock"
                            value={formData.openingStock}
                            onChange={handleInputChange}
                            placeholder={t("product.placeholders.openingStock")}
                            type="number"
                            readOnly={viewMode}
                          />
                        </InputRow>

                        <InputRow label={t("product.form.location")}>
                          <UnderlineInput
                            name="Location"
                            value={formData.Location}
                            onChange={handleInputChange}
                            placeholder={t("product.placeholders.location")}
                            readOnly={viewMode}
                          />
                        </InputRow>

                        <InputRow label={t("product.form.CustomerLeadTime")}>
                          <UnderlineInput
                            name="CustomerLeadTime"
                            value={formData.CustomerLeadTime}
                            onChange={handleInputChange}
                            placeholder={t("product.form.CustomerLeadTime")}
                            readOnly={viewMode}
                          />
                        </InputRow>

                        {/* Narration */}
                        <InputRow label={t("product.form.narration")}>
                          <UnderlineTextArea
                            name="narration"
                            value={formData.narration}
                            onChange={handleInputChange}
                            placeholder={t("product.placeholders.narration")}
                            readOnly={viewMode}
                          />
                        </InputRow>

                        {/* Alternative Number */}
                        <InputRow label={t("product.form.alternateNo")}>
                          <UnderlineTextArea
                            name="AlternativeNo"
                            value={formData.AlternativeNo}
                            onChange={handleInputChange}
                            placeholder={t("product.placeholders.alternateNo")}
                            readOnly={viewMode}
                          />
                        </InputRow>
                      </div>
                    </div>
                  )}

                  {/* ─── BARCODE TAB ─── */}
                  {activeTab === 'barcode' && (
                    <BarcodeTable
                      units={units}
                      loadings={loadings}
                      onDataChange={handleBarcodeDataChange}
                      onSelectedUnitsChange={handleSelectedUnitsChange}
                      initialData={barcodeData}
                      viewMode={viewMode}
                      baseUnitId={formData.unitId}
                    />
                  )}

                  {/* ─── SALES PRICE TAB ─── */}
                  {activeTab === 'salesPrice' && (
                    <SalesPriceTable
                      units={units}
                      isEditMode={isEditMode}
                      selectedUnits={selectedUnits}
                      loadings={loadings}
                      onDataChange={handleSalePriceDataChange}
                      initialData={salePriceData}
                      viewMode={viewMode}
                      taxList={tax}
                      selectedTaxIds={formData.salesTaxId}
                      taxType={formData.taxType}
                      costPrice={formData.costPrice}           // ← add this
                      purchaseRatePer={formData.PurchaseRatePer} // ← add this
                    />
                  )}

                  {/* ─── BOM TAB ─── */}
                  {activeTab === 'bom' && (
                    <BOMComponent
                      formData={formData}
                      handleInputChange={handleInputChange}
                      onBOMDataChange={handleBOMDataChange}
                      initialBomData={bomData}
                      viewMode={viewMode}
                    />
                  )}

                  {/* ─── NUTRITION TAB ─── */}
                  {activeTab === 'nutrition' && (
                    <NutritionDetails
                      formData={formData}
                      handleInputChange={handleInputChange}
                      onNutritionDataChange={handleNutritionDataChange}
                      initialBomData={nutritionData}
                      viewMode={viewMode}
                    />
                  )}
                  {/* ─── STOCK TAB (Only in Edit Mode) ─── */}
                  {activeTab === 'stock' && (
                    <GodownStockTab productCode={formData.productCode} />
                  )}
                </div>
              )}
            </form>
          </div>
        </div>
      </div>

      {/* Modals */}
      {(ProdMainGroupHasAccess || canAddProdMainGroup || canEditProdMainGroup) && (
        <AddProdGroup open={prodMainGroupIsOpen} handleClose={() => setProdMainGroupOpen(false)} onSuccess={getProdMainGroup} />
      )}

      {(ProdGroupHasAccess || canAddProdGroup || canEditProdGroup) && (
        <AddProductGroup
          open={prodGroupIsOpen}
          handleClose={() => setProdGroupOpen(false)}
          onSuccess={() => {
            getProdSubGroupByCatOne();
            getProdSubGroupByCatTwo();
            getProdSubGroupByCatThree();
            getProdSubGroupByCatFour();
          }}
          selectedCategory={selectedCategoryGrp}
        />
      )}

      <AddMasterModal
        open={brandModalIsOpen}
        handleClose={() => setBrandModalIsOpen(false)}
        title={activeMasterForm || ""}
        onSaved={() => { fetchBrands(); fetchUnit(); setActiveMasterForm(null); }}
      />

      <AddTaxMatser open={taxMasterIsOpen} handleClose={() => setTaxMasterIsOpen(false)} onSuccess={fetchTaxes} />

      {modalMode && (
        <div className="flex justify-end p-4 border-t sticky bottom-0 bg-white dark:bg-[#1e1e1e] gap-2">
          <Button onClick={modalCloase} variant="outline" className="px-6">
            {t("cancelBtn")}
          </Button>
          <Button onClick={handleSubmit} disabled={submitting} className="main-bg text-white px-6">
            {submitting ? t("saving") : t("save")}
          </Button>
        </div>
      )}
    </>
  );
};

export default FormComponent;

FormComponent.propTypes = {
  productMainGroups: PropTypes.array,
  loadings: PropTypes.object,
  getProdMainGroup: PropTypes.func.isRequired,
  getProdSubGroupByCatOne: PropTypes.func,
  prodSubGroupByCatOne: PropTypes.array,
  getProdSubGroupByCatTwo: PropTypes.func,
  prodSubGroupByCatTwo: PropTypes.array,
  getProdSubGroupByCatThree: PropTypes.func,
  getProdSubGroupByCatFour: PropTypes.func,
  prodSubGroupByCatThree: PropTypes.array,
  prodSubGroupByCatFour: PropTypes.array,
  brands: PropTypes.array,
  fetchBrands: PropTypes.func,
  fetchUnit: PropTypes.func,
  units: PropTypes.array,
  fetchTaxes: PropTypes.func,
  tax: PropTypes.array,
  onSubmitStateChange: PropTypes.func,
  onClearFormData: PropTypes.func,
  editData: PropTypes.object,
  isEditMode: PropTypes.bool,
  viewMode: PropTypes.bool,
  modalCloase: PropTypes.func,
  onSuccess: PropTypes.func,
  modalMode: PropTypes.bool,
};