import { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, Plus } from 'lucide-react';
import useAuth from '@/redux/hook/auth/useAuth';
import usePrivileges from '@/lib/hooks/usePrivileges';
import axiosInstance from '@/lib/axiosConfig';
import Preloader from '@/components/common/Preloader';
import DepartmentForm from '../../Master/multiMasterForms/Department/DepartmentForm';
import AddDesignation from '../../Master/multiMasterForms/Designation/AddDesignation';
import WorkLocationForm from '../../Master/singleMaster/WorkLocation/WorkLocationForm';
import AddMasterModal from '../../Master/singleMaster/AddMasterModal';
import { useSelector } from 'react-redux';
// ── NEW: import the shared DateInput ──────────────────────────────────────────
import DateInput from '@/components/elements/theme/DateInput';
import { sanitize } from '@/lib/inputSanitizer';

/* ──────────────────────────────────────────────
   Helper Components (same style as Customer form)
   ────────────────────────────────────────────── */

const InputRow = ({ label, required, children, error }) => (
    <div className="grid grid-cols-[140px_1fr] items-center gap-3">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {label} {required && <span className="text-red-500">*</span>}
        </label>
        <div>
            {children}
            {error && (
                <p className="text-xs text-red-500 dark:text-red-400 mt-0.5">{error}</p>
            )}
        </div>
    </div>
);

const UnderlineInput = ({
    name, value, onChange, onBlur, placeholder,
    type = "text", required, disabled, accept,
}) => (
    <input
        type={type}
        name={name}
        value={type === 'file' ? undefined : (value || "")}
        onChange={onChange}
        onBlur={onBlur}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        accept={accept}
        className="w-full px-0 py-1.5 bg-transparent border-0 border-b border-gray-300 dark:border-gray-600
                 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500
                 focus:outline-none focus:border-gray-900 dark:focus:border-gray-300 text-sm transition-colors
                 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
    />
);

const CustomDropdown = ({ value, options = [], onChange, placeholder, addButton }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const ref = useRef(null);

    useEffect(() => {
        const handler = (e) => {
            if (ref.current && !ref.current.contains(e.target)) {
                setIsOpen(false);
                setSearch('');
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const selectedLabel = options?.find(
        (opt) => String(opt.value) === String(value)
    )?.label || '';

    const filtered = search
        ? options?.filter((opt) =>
            opt.label?.toLowerCase().includes(search.toLowerCase())
        )
        : options;

    return (
        <div className="flex items-center gap-2">
            <div className="relative flex-1" ref={ref}>
                <div className="relative flex items-center">
                    <input
                        type="text"
                        value={selectedLabel}
                        readOnly
                        placeholder={placeholder || 'Select'}
                        className="w-full px-0 py-1.5 bg-transparent border-0 border-b border-gray-300
                                 dark:border-gray-600 text-gray-900 dark:text-gray-100
                                 placeholder:text-gray-400 focus:outline-none focus:border-gray-900
                                 dark:focus:border-gray-300 pr-8 text-sm transition-colors cursor-pointer"
                        onClick={() => setIsOpen((prev) => !prev)}
                    />
                    <div className="absolute right-0">
                        <button
                            type="button"
                            onClick={() => setIsOpen((prev) => !prev)}
                            className="text-gray-400 hover:text-gray-600 p-0.5"
                        >
                            <ChevronDown
                                size={14}
                                className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
                            />
                        </button>
                    </div>
                </div>
                {isOpen && (
                    <div className="absolute z-50 mt-1 w-full bg-white dark:bg-[#242424] border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-52 overflow-y-auto">
                        {options?.length > 5 && (
                            <div className="sticky top-0 p-1.5 bg-white dark:bg-[#242424] border-b border-gray-200 dark:border-gray-600">
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search..."
                                    className="w-full px-2 py-1 text-sm rounded border border-gray-300
                                             dark:border-gray-600 bg-white dark:bg-[#1e1e1e]
                                             text-gray-900 dark:text-gray-100 focus:outline-none
                                             focus:ring-1 focus:ring-teal-500"
                                    onClick={(e) => e.stopPropagation()}
                                    autoFocus
                                />
                            </div>
                        )}
                        {filtered?.length > 0 ? (
                            filtered.map((opt) => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => {
                                        onChange(opt.value);
                                        setIsOpen(false);
                                        setSearch('');
                                    }}
                                    className={`w-full text-left px-3 py-2 text-sm hover:bg-teal-50
                                              dark:hover:bg-teal-900/30 text-gray-900 dark:text-gray-100
                                              ${String(value) === String(opt.value)
                                            ? 'bg-teal-50 dark:bg-teal-900/20 font-medium'
                                            : ''
                                        }`}
                                >
                                    {opt.label}
                                </button>
                            ))
                        ) : (
                            <div className="px-3 py-2 text-sm text-gray-500">No results found</div>
                        )}
                    </div>
                )}
            </div>
            {addButton}
        </div>
    );
};

/* ──────────────────────────────────────────────
   Main Form Component
   ────────────────────────────────────────────── */

const FormComponent = ({
    editMode = false,
    employeeId,
    onSubmit,
    isSubmitting = false,
    designations,
    deprtments,
    worklocations,
    routes,
    area,
    market,
    maritalStatusOptions,
    genderOptions,
    bloodGroupOptions,
    fetchDepartments,
    fetchDesignations,
    fetchWorkLocations,
    fetchRoutes,
    fetchArea,
    fetchMarket,
}) => {
    const { t } = useTranslation();
    const { selectedBranchId, userId, currentFinancialYear } = useAuth();

    const { privileges: departmentPrevilage } = usePrivileges("Department");
    const { privileges: designtionPrevilage } = usePrivileges("Designation");
    const { privileges: workLocationPrevilage } = usePrivileges("Work Location");
    const { privileges: routePrevilage } = usePrivileges("Route");
    const { privileges: areaPrevilage } = usePrivileges("Area");
    const { privileges: marketPrevilage } = usePrivileges("Market");

    const [activeTab, setActiveTab] = useState('personal');
    const [fetchLoading, setFetchLoading] = useState(false);
    const [error, setError] = useState(null);

    // Modal states
    const [activeMasterForm, setActiveMasterForm] = useState(null);
    const [departmentModalIsOpen, setDepartmentModlIsOpen] = useState(false);
    const [designationModalIsOpen, setDesignationModalIsOpen] = useState(false);
    const [workLocationModalIsOpen, setWorkLocationModalIsOpen] = useState(false);
    const [masterModalIsOpen, setMasterModalIsOpen] = useState(false);
    const { generalSettings } = useSelector((state) => state.settings);

    // Form state
    const [formData, setFormData] = useState({
        branchId: selectedBranchId,
        employeeCode: '',
        employeeName: '',
        designationId: '',
        DepartmentId: '',
        workLocationId: '',
        dob: '',
        meritalStatus: '',
        gender: '',
        qualification: '',
        PermenentAddress: '',
        CurrentAddress: '',
        Nationality: '',
        whatsAppNumber: '',
        phoneNo: '',
        mobileNo: '',
        email: '',
        emergencyContactName: '',
        emergencyContactNumber: '',
        joiningDate: '',
        terminationDate: '',
        active: true,
        narration: '',
        bloodGroup: '',
        routeId: '',
        areaId: '',
        marketId: '',
        passportNo: '',
        passportIssueDate: '',
        passportExpDate: '',
        visaType: '',
        labourCardNo: '',
        labourCardIssueDate: '',
        labourCardExpDate: '',
        visaNo: '',
        visaExpDate: '',
        OTHourlyAmount: '',
        InsuranceNumber: '',
        InsuranceExpirydate: '',
        MOLContractNumber: '',
        SponsorName: '',
        GOSI_SSOnumber: '',
        WPScompliance: true,
        BankName: '',
        BankAccountNo: '',
        IBAN: '',
        SwiftCode: '',
        BankBranch: '',
        documentuploadOptionNeeded: false,
        CreatedUser: userId,
        ModifiedUser: editMode ? userId : null,
        employeephoto: null,
        voucherType: "Employee",
        yearId: currentFinancialYear?.yearId,
    });

    const [errors, setErrors] = useState({});

    /* ── Data Fetching ─────────────────────── */

    useEffect(() => {
        if (editMode && employeeId) {
            fetchEmployeeData();
        } else {
            getEmployeeCode();
        }
    }, [editMode, employeeId]);

    const fetchEmployeeData = async () => {
        setFetchLoading(true);
        try {
            const response = await axiosInstance.get(`get-employee-byId/${employeeId}`);
            const data = response.data.data;
            const formatDate = (dateString) => {
                if (!dateString) return '';
                return dateString.split(' ')[0];
            };
            setFormData({
                branchId: data.branchId || selectedBranchId,
                employeeCode: data.employeeCode || '',
                employeeName: data.employeeName || '',
                designationId: data.designationId || '',
                DepartmentId: data.DepartmentId || '',
                workLocationId: data.workLocationId || '',
                dob: formatDate(data.dob),
                meritalStatus: data.meritalStatus || '',
                gender: data.gender || '',
                qualification: data.qualification || '',
                PermenentAddress: data.PermenentAddress || '',
                CurrentAddress: data.CurrentAddress || '',
                Nationality: data.Nationality || '',
                whatsAppNumber: data.whatsAppNumber || '',
                phoneNo: data.phoneNo || '',
                mobileNo: data.mobileNo || '',
                email: data.email || '',
                emergencyContactName: data.emergencyContactName || '',
                emergencyContactNumber: data.emergencyContactNumber || '',
                joiningDate: formatDate(data.joiningDate),
                terminationDate: formatDate(data.terminationDate),
                active: data.active !== undefined ? data.active : true,
                narration: data.narration || '',
                bloodGroup: data.bloodGroup || '',
                routeId: data.routeId || '',
                areaId: data.areaId || '',
                marketId: data.marketId || '',
                passportNo: data.passportNo || '',
                passportIssueDate: formatDate(data.passportIssueDate),
                passportExpDate: formatDate(data.passportExpDate),
                visaType: data.visaType || '',
                labourCardNo: data.labourCardNo || '',
                labourCardIssueDate: formatDate(data.labourCardIssueDate),
                labourCardExpDate: formatDate(data.labourCardExpDate),
                visaNo: data.visaNo || '',
                visaExpDate: formatDate(data.visaExpDate),
                OTHourlyAmount: data.OTHourlyAmount || '',
                InsuranceNumber: data.InsuranceNumber || '',
                InsuranceExpirydate: formatDate(data.InsuranceExpirydate),
                MOLContractNumber: data.MOLContractNumber || '',
                SponsorName: data.SponsorName || '',
                GOSI_SSOnumber: data.GOSI_SSOnumber || '',
                WPScompliance: data.WPScompliance || true,
                BankName: data.BankName || '',
                BankAccountNo: data.BankAccountNo || '',
                IBAN: data.IBAN || '',
                SwiftCode: data.SwiftCode || '',
                BankBranch: data.BankBranch || '',
                documentuploadOptionNeeded: data.documentuploadOptionNeeded || false,
                CreatedUser: data.CreatedUser || userId,
                ModifiedUser: editMode ? userId : null,
                employeephoto: null,
                voucherType: "Employee",
                yearId: currentFinancialYear?.yearId,
            });
        } catch (err) {
            console.error('Error fetching employee data:', err);
        } finally {
            setFetchLoading(false);
        }
    };

    const getEmployeeCode = async () => {
        try {
            const response = await axiosInstance.get(
                `get-generated-voucherNo?voucherType=Employee&branchId=${selectedBranchId}&yearId=${currentFinancialYear?.yearId}`
            );
            setFormData((prev) => ({ ...prev, employeeCode: response?.data?.voucherCode }));
        } catch (err) {
            console.error(err);
        }
    };

    /* ── Handlers ──────────────────────────── */

    const handleChange = (e) => {
        const { name, value, type, checked, files } = e.target;
        let fieldValue = value;
       
        if (type === 'checkbox') fieldValue = checked;
        else if (type === 'file') fieldValue = files[0];

         if(["employeeName"].includes(name)){
            fieldValue = sanitize.alphaNumericSpace(value)
             if (fieldValue.length > 0) {
                  fieldValue =
                fieldValue.charAt(0).toUpperCase() + fieldValue.slice(1);
            }
        }
        if(["Nationality","qualification","emergencyContactName","BankName","BankBranch"].includes(name)){
            fieldValue = sanitize.alphaNumericSpace(value)
        }
        if(["whatsAppNumber","mobileNo","phoneNo","emergencyContactNumber"].includes(name)){
            fieldValue = sanitize.numbers(value).slice(0,15)
        }
        if(["email"].includes(name)){
            fieldValue = value.replace(/[^a-zA-Z0-9@._-]/g, "");
        }
        if (name === "OTHourlyAmount") {
        // Allow empty value so user can clear the field
        if (value === "" || /^\d*\.?\d{0,2}$/.test(value)) {
            setFormData((prev) => ({ ...prev, [name]: value }));
        }
        return;
        }
        if(["passportNo"].includes(name)){
            fieldValue = sanitize.alphaNumeric(value).slice(0,12)
        }
        if(["visaNo"].includes(name)){
            fieldValue = sanitize.alphaNumeric(value).slice(0,20)
        }
        if(["BankAccountNo","IBAN"].includes(name)){
            fieldValue = sanitize.uppercaseAlphaNumeric(value).slice(0,34)
        }
         if(["SwiftCode",].includes(name)){
            fieldValue = sanitize.uppercaseAlphaNumeric(value).slice(0,11)
        }

         // Auto-set Passport Expiry = Issue Date + 10 years
    if (name === "passportIssueDate" && fieldValue) {
        const issueDate = new Date(fieldValue);

        // Add 10 years
        issueDate.setFullYear(issueDate.getFullYear() + 10);

        const expiryDate = issueDate.toISOString().split("T")[0];

        setFormData((prev) => ({
            ...prev,
            passportIssueDate: fieldValue,
            passportExpDate: expiryDate,
        }));

        if (errors[name]) {
            setErrors((prev) => ({ ...prev, [name]: "" }));
        }

        return;
    }

         setFormData((prev) => ({
        ...prev,
        [name]: fieldValue,
    }));


        if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
    };

    const handleDropdownChange = (name, value) => {
        setFormData((prev) => ({ ...prev, [name]: value }));
        if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
    };

    /* ── Validation ────────────────────────── */

    const validateForm = () => {
        const newErrors = {};
        if (!formData.employeeName) newErrors.employeeName = 'Employee name is required';
        if (!formData.designationId) newErrors.designationId = 'Designation is required';
        if (!formData.DepartmentId) newErrors.DepartmentId = 'Department is required';
        if (!formData.workLocationId) newErrors.workLocationId = 'Work location is required';
        if (!formData.dob) { newErrors.dob = 'Date of birth is required'; setActiveTab('personal'); }
        if (!formData.gender) { newErrors.gender = 'Gender is required'; if (!newErrors.dob) setActiveTab('personal'); }
        if (!formData.joiningDate) { newErrors.joiningDate = 'Joining date is required'; if (!newErrors.dob && !newErrors.gender) setActiveTab('employment'); }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    /* ── Submit ─────────────────────────────── */

    const handleSubmit = (e) => {
        if (e) e.preventDefault();
        if (!validateForm()) return;

        const submitData = new FormData();
        Object.keys(formData).forEach((key) => {
            if (key === 'employeephoto' && formData[key]) {
                submitData.append(key, formData[key]);
            } else if (formData[key] !== null && formData[key] !== '') {
                submitData.append(key, formData[key]);
            }
        });
        onSubmit(submitData);
    };

    /* ── Tabs Config ───────────────────────── */

    const tabs = [
        { id: 'personal', label: t("employee.employeeForm.headings.personalInfo") || "Personal Info" },
        { id: 'contact', label: t("employee.employeeForm.headings.contactInfo") || "Contact Details" },
        { id: 'employment', label: t("employee.employeeForm.headings.employmentInfo") || "Employment" },
        { id: 'documents', label: t("employee.employeeForm.headings.documentInfo") || "Documents & ID" },
        { id: 'banking', label: t("employee.employeeForm.headings.bankingInfo") || "Banking" },
    ];

    /* ── Loading / Error States ─────────────── */

    if (fetchLoading) return <Preloader />;

    //DOB 
    const today = new Date();
const maxDOB = new Date(
  today.getFullYear() - 18,
  today.getMonth(),
  today.getDate()
)
  .toISOString()
  .split("T")[0];
    /* ── Render ─────────────────────────────── */

    return (
        <div className="mx-auto px-4 py-2">
            <div className="max-w-6xl mx-auto bg-white dark:bg-[#1e1e1e] rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
                <div className="px-4 py-3">
                    <form onSubmit={handleSubmit}>

                        {/* ─── Employee Name (Large Input) ─── */}
                        <div className="mb-4">
                            <label className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1 block">
                                {t("employee.employeeForm.labels.employeeName") || "Employee Name"}
                            </label>
                            <input
                                type="text"
                                name="employeeName"
                                value={formData.employeeName}
                                onChange={handleChange}
                                placeholder={t("employee.employeeForm.placeholders.employeeName") || "Enter Employee Name"}
                                required
                                className="flex-1 w-full text-2xl font-bold bg-transparent border-0 border-b-2
                                         border-gray-800 dark:border-gray-300 text-gray-900 dark:text-gray-100
                                         placeholder:text-gray-400 dark:placeholder:text-gray-500
                                         focus:outline-none focus:border-teal-600 dark:focus:border-teal-400
                                         pb-1.5 transition-colors"
                            />
                            {errors.employeeName && (
                                <p className="text-xs text-red-500 mt-0.5">{errors.employeeName}</p>
                            )}
                        </div>

                        {/* ─── Basic Information Grid ─── */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-2 mb-4">
                            {/* Left Column */}
                            <div className="space-y-2">
                                <InputRow
                                    label={t("employee.employeeForm.labels.employeeCode") || "Employee Code"}
                                    required
                                    error={errors.employeeCode}
                                >
                                    <UnderlineInput
                                        name="employeeCode"
                                        value={formData.employeeCode}
                                        onChange={handleChange}
                                        placeholder={t("employee.employeeForm.placeholders.employeeCode") || "Employee code"}
                                        disabled
                                        required
                                    />
                                </InputRow>

                                <InputRow
                                    label={t("employee.employeeForm.labels.designationId") || "Designation"}
                                    required
                                    error={errors.designationId}
                                >
                                    <CustomDropdown
                                        value={formData.designationId}
                                        onChange={(val) => handleDropdownChange('designationId', val)}
                                        options={designations?.map((d) => ({
                                            value: d.designationId,
                                            label: d.designationName,
                                        }))}
                                        placeholder={t("employee.employeeForm.placeholders.designationId") || "Select Designation"}
                                        addButton={
                                            designtionPrevilage?.can_add && (
                                                <button
                                                    type="button"
                                                    onClick={() => setDesignationModalIsOpen(true)}
                                                    className="h-7 w-7 flex items-center justify-center rounded-md
                                                             main-bg text-white hover:opacity-90 transition-opacity flex-shrink-0"
                                                    title="Add Designation"
                                                >
                                                    <Plus size={14} />
                                                </button>
                                            )
                                        }
                                    />
                                </InputRow>
                            </div>

                            {/* Right Column */}
                            <div className="space-y-2">
                                <InputRow
                                    label={t("employee.employeeForm.labels.departmentId") || "Department"}
                                    required
                                    error={errors.DepartmentId}
                                >
                                    <CustomDropdown
                                        value={formData.DepartmentId}
                                        onChange={(val) => handleDropdownChange('DepartmentId', val)}
                                        options={deprtments?.map((d) => ({
                                            value: d.departmentId,
                                            label: d.departmentName,
                                        }))}
                                        placeholder={t("employee.employeeForm.placeholders.departmentId") || "Select Department"}
                                        addButton={
                                            departmentPrevilage?.can_add && (
                                                <button
                                                    type="button"
                                                    onClick={() => setDepartmentModlIsOpen(true)}
                                                    className="h-7 w-7 flex items-center justify-center rounded-md
                                                             main-bg text-white hover:opacity-90 transition-opacity flex-shrink-0"
                                                    title="Add Department"
                                                >
                                                    <Plus size={14} />
                                                </button>
                                            )
                                        }
                                    />
                                </InputRow>

                                <InputRow
                                    label={t("employee.employeeForm.labels.workLocationId") || "Work Location"}
                                    required
                                    error={errors.workLocationId}
                                >
                                    <CustomDropdown
                                        value={formData.workLocationId}
                                        onChange={(val) => handleDropdownChange('workLocationId', val)}
                                        options={worklocations?.map((d) => ({
                                            value: d.workLocationId,
                                            label: d.workLocationName,
                                        }))}
                                        placeholder={t("employee.employeeForm.placeholders.workLocationId") || "Select Work Location"}
                                        addButton={
                                            workLocationPrevilage?.can_add && (
                                                <button
                                                    type="button"
                                                    onClick={() => setWorkLocationModalIsOpen(true)}
                                                    className="h-7 w-7 flex items-center justify-center rounded-md
                                                             main-bg text-white hover:opacity-90 transition-opacity flex-shrink-0"
                                                    title="Add Work Location"
                                                >
                                                    <Plus size={14} />
                                                </button>
                                            )
                                        }
                                    />
                                </InputRow>
                            </div>
                        </div>

                        {/* ─── Tab Bar ─── */}
                        <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                            <div className="flex border-b border-gray-300 dark:border-gray-600 overflow-x-auto">
                                {tabs.map((tab, index) => (
                                    <div key={tab.id} className="flex items-center flex-shrink-0">
                                        <button
                                            type="button"
                                            onClick={() => setActiveTab(activeTab === tab.id ? null : tab.id)}
                                            className={`px-4 py-2 text-sm font-medium transition-all whitespace-nowrap ${activeTab === tab.id
                                                    ? "bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400 border-b-2 border-teal-600"
                                                    : "bg-white dark:bg-[#1e1e1e] text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                                                }`}
                                        >
                                            {tab.label}
                                        </button>
                                        {index < tabs.length - 1 && (
                                            <div className="h-6 w-px bg-gray-300 dark:bg-gray-600"></div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* ─── Tab Content ─── */}
                        {activeTab && (
                            <div className="border border-gray-200 dark:border-gray-700 border-t-0 rounded-b-lg p-4 bg-gray-50 dark:bg-[#242424] min-h-[420px]">

                                {/* ══ PERSONAL INFO TAB ══ */}
                                {activeTab === 'personal' && (
                                    <div className="space-y-4">
                                        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 pb-2 border-b border-gray-200 dark:border-gray-600">
                                            {t("employee.employeeForm.headings.personalInfo") || "Personal Information"}
                                        </h3>
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-2">
                                            <div className="space-y-2">
                                                <InputRow
                                                    label={t("employee.employeeForm.labels.dob") || "Date of Birth"}
                                                    required
                                                    error={errors.dob}
                                                >
                                                    <DateInput
                                                        underline
                                                        name="dob"
                                                        value={formData.dob}
                                                        onChange={handleChange}
                                                        required
                                                        error={errors.dob}
                                                          max={maxDOB}
                                                    />
                                                </InputRow>

                                                <InputRow
                                                    label={t("employee.employeeForm.labels.gender") || "Gender"}
                                                    required
                                                    error={errors.gender}
                                                >
                                                    <CustomDropdown
                                                        value={formData.gender}
                                                        onChange={(val) => handleDropdownChange('gender', val)}
                                                        options={genderOptions}
                                                        placeholder={t("employee.employeeForm.placeholders.gender") || "Select Gender"}
                                                    />
                                                </InputRow>

                                                <InputRow
                                                    label={t("employee.employeeForm.labels.maritalStatus") || "Marital Status"}
                                                    error={errors.meritalStatus}
                                                >
                                                    <CustomDropdown
                                                        value={formData.meritalStatus}
                                                        onChange={(val) => handleDropdownChange('meritalStatus', val)}
                                                        options={maritalStatusOptions}
                                                        placeholder={t("employee.employeeForm.placeholders.maritalStatus") || "Select Status"}
                                                    />
                                                </InputRow>

                                                <InputRow
                                                    label={t("employee.employeeForm.labels.bloodGroup") || "Blood Group"}
                                                    error={errors.bloodGroup}
                                                >
                                                    <CustomDropdown
                                                        value={formData.bloodGroup}
                                                        onChange={(val) => handleDropdownChange('bloodGroup', val)}
                                                        options={bloodGroupOptions}
                                                        placeholder={t("employee.employeeForm.placeholders.bloodGroup") || "Select Blood Group"}
                                                    />
                                                </InputRow>
                                            </div>

                                            <div className="space-y-2">
                                                <InputRow
                                                    label={t("employee.employeeForm.labels.nationality") || "Nationality"}
                                                    error={errors.Nationality}
                                                >
                                                    <UnderlineInput
                                                        name="Nationality"
                                                        value={formData.Nationality}
                                                        onChange={handleChange}
                                                        placeholder={t("employee.employeeForm.placeholders.nationality") || "Enter nationality"}
                                                    />
                                                </InputRow>

                                                <InputRow
                                                    label={t("employee.employeeForm.labels.qualification") || "Qualification"}
                                                    error={errors.qualification}
                                                >
                                                    <UnderlineInput
                                                        name="qualification"
                                                        value={formData.qualification}
                                                        onChange={handleChange}
                                                        placeholder={t("employee.employeeForm.placeholders.qualification") || "Enter qualification"}
                                                    />
                                                </InputRow>

                                                <InputRow
                                                    label={t("employee.employeeForm.labels.permanentAddress") || "Permanent Address"}
                                                    error={errors.PermenentAddress}
                                                >
                                                    <textarea
                                                        name="PermenentAddress"
                                                        value={formData.PermenentAddress || ""}
                                                        onChange={handleChange}
                                                        placeholder={t("employee.employeeForm.placeholders.permanentAddress") || "Enter permanent address"}
                                                        rows={2}
                                                        className="w-full px-0 py-1.5 bg-transparent border-0 border-b border-gray-300
                                                                 dark:border-gray-600 text-gray-900 dark:text-gray-100
                                                                 placeholder:text-gray-400 focus:outline-none focus:border-gray-900
                                                                 dark:focus:border-gray-300 text-sm resize-none"
                                                    />
                                                </InputRow>

                                                <InputRow
                                                    label={t("employee.employeeForm.labels.currentAddress") || "Current Address"}
                                                    error={errors.CurrentAddress}
                                                >
                                                    <textarea
                                                        name="CurrentAddress"
                                                        value={formData.CurrentAddress || ""}
                                                        onChange={handleChange}
                                                        placeholder={t("employee.employeeForm.placeholders.currentAddress") || "Enter current address"}
                                                        rows={2}
                                                        className="w-full px-0 py-1.5 bg-transparent border-0 border-b border-gray-300
                                                                 dark:border-gray-600 text-gray-900 dark:text-gray-100
                                                                 placeholder:text-gray-400 focus:outline-none focus:border-gray-900
                                                                 dark:focus:border-gray-300 text-sm resize-none"
                                                    />
                                                </InputRow>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* ══ CONTACT DETAILS TAB ══ */}
                                {activeTab === 'contact' && (
                                    <div className="space-y-4">
                                        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 pb-2 border-b border-gray-200 dark:border-gray-600">
                                            {t("employee.employeeForm.headings.contactInfo") || "Contact Details"}
                                        </h3>
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-2">
                                            <div className="space-y-2">
                                                <InputRow
                                                    label={t("employee.employeeForm.labels.phoneNo") || "Phone"}
                                                    error={errors.phoneNo}
                                                >
                                                    <UnderlineInput
                                                        name="phoneNo"
                                                        value={formData.phoneNo}
                                                        onChange={handleChange}
                                                        placeholder={t("employee.employeeForm.placeholders.phoneNo") || "Enter phone number"}
                                                    />
                                                </InputRow>

                                                <InputRow
                                                    label={t("employee.employeeForm.labels.mobileNo") || "Mobile"}
                                                    error={errors.mobileNo}
                                                >
                                                    <UnderlineInput
                                                        name="mobileNo"
                                                        value={formData.mobileNo}
                                                        onChange={handleChange}
                                                        placeholder={t("employee.employeeForm.placeholders.mobileNo") || "Enter mobile number"}
                                                    />
                                                </InputRow>

                                                <InputRow
                                                    label={t("employee.employeeForm.labels.whatsAppNumber") || "WhatsApp"}
                                                    error={errors.whatsAppNumber}
                                                >
                                                    <UnderlineInput
                                                        name="whatsAppNumber"
                                                        value={formData.whatsAppNumber}
                                                        onChange={handleChange}
                                                        placeholder={t("employee.employeeForm.placeholders.whatsAppNumber") || "Enter WhatsApp number"}
                                                    />
                                                </InputRow>
                                            </div>

                                            <div className="space-y-2">
                                                <InputRow
                                                    label={t("employee.employeeForm.labels.email") || "Email"}
                                                    error={errors.email}
                                                >
                                                    <UnderlineInput
                                                        name="email"
                                                        type="email"
                                                        value={formData.email}
                                                        onChange={handleChange}
                                                        placeholder={t("employee.employeeForm.placeholders.email") || "Enter email address"}
                                                    />
                                                </InputRow>

                                                <InputRow
                                                    label={t("employee.employeeForm.labels.emergencyContactName") || "Emergency Contact"}
                                                    error={errors.emergencyContactName}
                                                >
                                                    <UnderlineInput
                                                        name="emergencyContactName"
                                                        value={formData.emergencyContactName}
                                                        onChange={handleChange}
                                                        placeholder={t("employee.employeeForm.placeholders.emergencyContactName") || "Enter contact name"}
                                                    />
                                                </InputRow>

                                                <InputRow
                                                    label={t("employee.employeeForm.labels.emergencyContactNumber") || "Emergency Phone"}
                                                    error={errors.emergencyContactNumber}
                                                >
                                                    <UnderlineInput
                                                        name="emergencyContactNumber"
                                                        value={formData.emergencyContactNumber}
                                                        onChange={handleChange}
                                                        placeholder={t("employee.employeeForm.placeholders.emergencyContactNumber") || "Enter emergency number"}
                                                    />
                                                </InputRow>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* ══ EMPLOYMENT TAB ══ */}
                                {activeTab === 'employment' && (
                                    <div className="space-y-4">
                                        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 pb-2 border-b border-gray-200 dark:border-gray-600">
                                            {t("employee.employeeForm.headings.employmentInfo") || "Employment & Location Details"}
                                        </h3>
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-2">
                                            <div className="space-y-2">
                                                <InputRow
                                                    label={t("employee.employeeForm.labels.joiningDate") || "Joining Date"}
                                                    required
                                                    error={errors.joiningDate}
                                                >
                                                    <DateInput
                                                        underline
                                                        name="joiningDate"
                                                        value={formData.joiningDate}
                                                        onChange={handleChange}
                                                        required
                                                        error={errors.joiningDate}
                                                    />
                                                </InputRow>

                                                <InputRow
                                                    label={t("employee.employeeForm.labels.terminationDate") || "Termination Date"}
                                                    error={errors.terminationDate}
                                                >
                                                    <DateInput
                                                        underline
                                                        name="terminationDate"
                                                        value={formData.terminationDate}
                                                        onChange={handleChange}
                                                    />
                                                </InputRow>

                                                <InputRow
                                                    label={t("employee.employeeForm.labels.routeId") || "Route"}
                                                    error={errors.routeId}
                                                >
                                                    <CustomDropdown
                                                        value={formData.routeId}
                                                        onChange={(val) => handleDropdownChange('routeId', val)}
                                                        options={routes?.map((d) => ({
                                                            value: d.RouteId,
                                                            label: d.RouteName,
                                                        }))}
                                                        placeholder={t("employee.employeeForm.placeholders.routeId") || "Select Route"}
                                                        addButton={
                                                            routePrevilage?.can_add && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setMasterModalIsOpen(true);
                                                                        setActiveMasterForm(t("route.breadcrumb.title"));
                                                                    }}
                                                                    className="h-7 w-7 flex items-center justify-center rounded-md
                                                                             main-bg text-white hover:opacity-90 transition-opacity flex-shrink-0"
                                                                    title="Add Route"
                                                                >
                                                                    <Plus size={14} />
                                                                </button>
                                                            )
                                                        }
                                                    />
                                                </InputRow>

                                                <InputRow
                                                    label={t("employee.employeeForm.labels.otHourlyAmount") || "OT Hourly Amount"}
                                                    error={errors.OTHourlyAmount}
                                                >
                                                    <UnderlineInput
                                                        name="OTHourlyAmount"
                                                        type="number"
                                                        value={formData.OTHourlyAmount}
                                                        onChange={handleChange}
                                                        placeholder={t("employee.employeeForm.placeholders.otHourlyAmount") || "0.00"}
                                                    />
                                                </InputRow>
                                            </div>

                                            <div className="space-y-2">
                                                <InputRow
                                                    label={t("employee.employeeForm.labels.areaId") || "Area"}
                                                    error={errors.areaId}
                                                >
                                                    <CustomDropdown
                                                        value={formData.areaId}
                                                        onChange={(val) => handleDropdownChange('areaId', val)}
                                                        options={area?.map((d) => ({
                                                            value: d.AreaId,
                                                            label: d.AreaName,
                                                        }))}
                                                        placeholder={t("employee.employeeForm.placeholders.areaId") || "Select Area"}
                                                        addButton={
                                                            areaPrevilage?.can_add && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setMasterModalIsOpen(true);
                                                                        setActiveMasterForm(t("area.breadcrumb.title"));
                                                                    }}
                                                                    className="h-7 w-7 flex items-center justify-center rounded-md
                                                                             main-bg text-white hover:opacity-90 transition-opacity flex-shrink-0"
                                                                    title="Add Area"
                                                                >
                                                                    <Plus size={14} />
                                                                </button>
                                                            )
                                                        }
                                                    />
                                                </InputRow>

                                                <InputRow
                                                    label={t("employee.employeeForm.labels.marketId") || "Market"}
                                                    error={errors.marketId}
                                                >
                                                    <CustomDropdown
                                                        value={formData.marketId}
                                                        onChange={(val) => handleDropdownChange('marketId', val)}
                                                        options={market?.map((d) => ({
                                                            value: d.MarketId,
                                                            label: d.MarketName,
                                                        }))}
                                                        placeholder={t("employee.employeeForm.placeholders.marketId") || "Select Market"}
                                                        addButton={
                                                            marketPrevilage?.can_add && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setMasterModalIsOpen(true);
                                                                        setActiveMasterForm(t("market.breadcrumb.title"));
                                                                    }}
                                                                    className="h-7 w-7 flex items-center justify-center rounded-md
                                                                             main-bg text-white hover:opacity-90 transition-opacity flex-shrink-0"
                                                                    title="Add Market"
                                                                >
                                                                    <Plus size={14} />
                                                                </button>
                                                            )
                                                        }
                                                    />
                                                </InputRow>

                                                <InputRow
                                                    label={t("employee.employeeForm.labels.narration") || "Narration"}
                                                    error={errors.narration}
                                                >
                                                    <textarea
                                                        name="narration"
                                                        value={formData.narration || ""}
                                                        onChange={handleChange}
                                                        placeholder={t("employee.employeeForm.placeholders.narration") || "Enter narration"}
                                                        rows={2}
                                                        className="w-full px-0 py-1.5 bg-transparent border-0 border-b border-gray-300
                                                                 dark:border-gray-600 text-gray-900 dark:text-gray-100
                                                                 placeholder:text-gray-400 focus:outline-none focus:border-gray-900
                                                                 dark:focus:border-gray-300 text-sm resize-none"
                                                    />
                                                </InputRow>

                                                <div className="flex items-center gap-3 pt-2">
                                                    <input
                                                        type="checkbox"
                                                        id="active"
                                                        name="active"
                                                        checked={formData.active}
                                                        onChange={handleChange}
                                                        className="h-4 w-4 rounded border-gray-300 text-teal-600
                                                                 focus:ring-teal-500"
                                                    />
                                                    <label htmlFor="active" className="text-sm text-gray-700 dark:text-gray-300">
                                                        Active Employee
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* ══ DOCUMENTS & ID TAB ══ */}
                                {activeTab === 'documents' && (
                                    <div className="space-y-4">
                                        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 pb-2 border-b border-gray-200 dark:border-gray-600">
                                            {t("employee.employeeForm.headings.documentInfo") || "Documents & Card Details"}
                                        </h3>
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-2">
                                            {/* Left Column - Passport & Visa */}
                                            <div className="space-y-2">
                                                <InputRow label={t("employee.employeeForm.labels.passportNo") || "Passport No"} error={errors.passportNo}>
                                                    <UnderlineInput name="passportNo" value={formData.passportNo} onChange={handleChange}
                                                        placeholder={t("employee.employeeForm.placeholders.passportNo") || "Enter passport number"} />
                                                </InputRow>

                                                <InputRow label={t("employee.employeeForm.labels.passportIssueDate") || "Passport Issue"} error={errors.passportIssueDate}>
                                                    <DateInput
                                                        underline
                                                        name="passportIssueDate"
                                                        value={formData.passportIssueDate}
                                                        onChange={handleChange}
                                                    />
                                                </InputRow>

                                                <InputRow label={t("employee.employeeForm.labels.passportExpDate") || "Passport Expiry"} error={errors.passportExpDate}>
                                                    <DateInput
                                                        underline
                                                        name="passportExpDate"
                                                        value={formData.passportExpDate}
                                                        onChange={handleChange}
                                                          min={formData.passportIssueDate || undefined}
                                                    />
                                                </InputRow>

                                                <InputRow label={t("employee.employeeForm.labels.visaType") || "Visa Type"} error={errors.visaType}>
                                                    <UnderlineInput name="visaType" value={formData.visaType} onChange={handleChange}
                                                        placeholder={t("employee.employeeForm.placeholders.visaType") || "Enter visa type"} />
                                                </InputRow>

                                                <InputRow label={t("employee.employeeForm.labels.visaNo") || "Visa No"} error={errors.visaNo}>
                                                    <UnderlineInput name="visaNo" value={formData.visaNo} onChange={handleChange}
                                                        placeholder={t("employee.employeeForm.placeholders.visaNo") || "Enter visa number"} />
                                                </InputRow>

                                                <InputRow label={t("employee.employeeForm.labels.visaExpDate") || "Visa Expiry"} error={errors.visaExpDate}>
                                                    <DateInput
                                                        underline
                                                        name="visaExpDate"
                                                        value={formData.visaExpDate}
                                                        onChange={handleChange}
                                                    />
                                                </InputRow>

                                                <InputRow label={t("employee.employeeForm.labels.labourCardNo") || "Labour Card No"} error={errors.labourCardNo}>
                                                    <UnderlineInput name="labourCardNo" value={formData.labourCardNo} onChange={handleChange}
                                                        placeholder={t("employee.employeeForm.placeholders.labourCardNo") || "Enter labour card number"} />
                                                </InputRow>

                                                <InputRow label={t("employee.employeeForm.labels.labourCardIssueDate") || "Card Issue Date"} error={errors.labourCardIssueDate}>
                                                    <DateInput
                                                        underline
                                                        name="labourCardIssueDate"
                                                        value={formData.labourCardIssueDate}
                                                        onChange={handleChange}
                                                    />
                                                </InputRow>

                                                <InputRow label={t("employee.employeeForm.labels.labourCardExpDate") || "Card Expiry Date"} error={errors.labourCardExpDate}>
                                                    <DateInput
                                                        underline
                                                        name="labourCardExpDate"
                                                        value={formData.labourCardExpDate}
                                                        onChange={handleChange}
                                                        min={formData.labourCardIssueDate || undefined}
                                                    />
                                                </InputRow>
                                            </div>

                                            {/* Right Column - Insurance, GOSI, etc */}
                                            <div className="space-y-2">
                                                <InputRow label={t("employee.employeeForm.labels.insuranceNumber") || "Insurance No"} error={errors.InsuranceNumber}>
                                                    <UnderlineInput name="InsuranceNumber" value={formData.InsuranceNumber} onChange={handleChange}
                                                        placeholder={t("employee.employeeForm.placeholders.insuranceNumber") || "Enter insurance number"} />
                                                </InputRow>

                                                <InputRow label={t("employee.employeeForm.labels.insuranceExpiryDate") || "Insurance Expiry"} error={errors.InsuranceExpirydate}>
                                                    <DateInput
                                                        underline
                                                        name="InsuranceExpirydate"
                                                        value={formData.InsuranceExpirydate}
                                                        onChange={handleChange}
                                                    />
                                                </InputRow>

                                                <InputRow label={t("employee.employeeForm.labels.molContractNumber") || "MOL Contract No"} error={errors.MOLContractNumber}>
                                                    <UnderlineInput name="MOLContractNumber" value={formData.MOLContractNumber} onChange={handleChange}
                                                        placeholder="Enter MOL contract number" />
                                                </InputRow>

                                                <InputRow label={t("employee.employeeForm.labels.sponsorName") || "Sponsor Name"} error={errors.SponsorName}>
                                                    <UnderlineInput name="SponsorName" value={formData.SponsorName} onChange={handleChange}
                                                        placeholder={t("employee.employeeForm.placeholders.sponsorName") || "Enter sponsor name"} />
                                                </InputRow>

                                                <InputRow label={t("employee.employeeForm.labels.gosi") || "GOSI / SSO No"} error={errors.GOSI_SSOnumber}>
                                                    <UnderlineInput name="GOSI_SSOnumber" value={formData.GOSI_SSOnumber} onChange={handleChange}
                                                        placeholder={t("employee.employeeForm.placeholders.gosi") || "Enter GOSI/SSO number"} />
                                                </InputRow>

                                                <InputRow label={t("employee.employeeForm.labels.employeephoto") || "Employee Photo"}>
                                                    <UnderlineInput
                                                        name="employeephoto"
                                                        type="file"
                                                        onChange={handleChange}
                                                        accept="image/*"
                                                    />
                                                </InputRow>

                                                <div className="flex flex-col gap-3 pt-2">
                                                    <div className="flex items-center gap-3">
                                                        <input
                                                            type="checkbox"
                                                            id="WPScompliance"
                                                            name="WPScompliance"
                                                            checked={formData.WPScompliance}
                                                            onChange={handleChange}
                                                            className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                                                        />
                                                        <label htmlFor="WPScompliance" className="text-sm text-gray-700 dark:text-gray-300">
                                                            {t("employee.employeeForm.labels.wpsCompliance") || "WPS Compliance"}
                                                        </label>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <input
                                                            type="checkbox"
                                                            id="documentuploadOptionNeeded"
                                                            name="documentuploadOptionNeeded"
                                                            checked={formData.documentuploadOptionNeeded}
                                                            onChange={handleChange}
                                                            className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                                                        />
                                                        <label htmlFor="documentuploadOptionNeeded" className="text-sm text-gray-700 dark:text-gray-300">
                                                            {t("employee.employeeForm.labels.documentuploadOptionNeeded") || "Document Upload Needed"}
                                                        </label>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* ══ BANKING TAB ══ */}
                                {activeTab === 'banking' && (
                                    <div className="space-y-4">
                                        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 pb-2 border-b border-gray-200 dark:border-gray-600">
                                            {t("employee.employeeForm.headings.bankingInfo") || "Banking Details"}
                                        </h3>
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-2">
                                            <div className="space-y-2">
                                                <InputRow label={t("employee.employeeForm.labels.bankName") || "Bank Name"} error={errors.BankName}>
                                                    <UnderlineInput name="BankName" value={formData.BankName} onChange={handleChange}
                                                        placeholder={t("employee.employeeForm.placeholders.bankName") || "Enter bank name"} />
                                                </InputRow>

                                                <InputRow label={t("employee.employeeForm.labels.bankAccountNo") || "Account No"} error={errors.BankAccountNo}>
                                                    <UnderlineInput name="BankAccountNo" value={formData.BankAccountNo} onChange={handleChange}
                                                        placeholder={t("employee.employeeForm.placeholders.bankAccountNo") || "Enter account number"} />
                                                </InputRow>

                                                <InputRow label={t("employee.employeeForm.labels.iban") || "IBAN"} error={errors.IBAN}>
                                                    <UnderlineInput name="IBAN" value={formData.IBAN} onChange={handleChange}
                                                        placeholder={t("employee.employeeForm.placeholders.iban") || "Enter IBAN"} />
                                                </InputRow>
                                            </div>

                                            <div className="space-y-2">
                                                <InputRow label={t("employee.employeeForm.labels.swiftCode") || "SWIFT Code"} error={errors.SwiftCode}>
                                                    <UnderlineInput name="SwiftCode" value={formData.SwiftCode} onChange={handleChange}
                                                        placeholder={t("employee.employeeForm.placeholders.swiftCode") || "Enter SWIFT code"} />
                                                </InputRow>

                                                <InputRow label={t("employee.employeeForm.labels.bankBranch") || "Bank Branch"} error={errors.BankBranch}>
                                                    <UnderlineInput name="BankBranch" value={formData.BankBranch} onChange={handleChange}
                                                        placeholder={t("employee.employeeForm.placeholders.bankBranch") || "Enter bank branch"} />
                                                </InputRow>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ─── Error Display ─── */}
                        {error && (
                            <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded px-2 py-1.5 mt-3">
                                {error}
                            </div>
                        )}
                    </form>
                </div>
            </div>

            {/* ─── Modals ─── */}
            <DepartmentForm
                open={departmentModalIsOpen}
                handleClose={() => setDepartmentModlIsOpen(false)}
                onSuccess={fetchDepartments}
            />
            <AddDesignation
                open={designationModalIsOpen}
                handleClose={() => setDesignationModalIsOpen(false)}
                onSuccess={fetchDesignations}
            />
            <WorkLocationForm
                open={workLocationModalIsOpen}
                handleClose={() => setWorkLocationModalIsOpen(false)}
                onSuccess={fetchWorkLocations}
            />
            <AddMasterModal
                open={masterModalIsOpen}
                handleClose={() => setMasterModalIsOpen(false)}
                title={activeMasterForm || ""}
                onSaved={() => {
                    fetchRoutes();
                    fetchArea();
                    fetchMarket();
                    setActiveMasterForm(null);
                }}
            />
        </div>
    );
};

export default FormComponent;