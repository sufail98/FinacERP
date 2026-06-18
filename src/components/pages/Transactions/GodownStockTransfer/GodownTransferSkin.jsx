import BreadCrumb from '@/components/common/BreadCrumb';
import { Archive, ArchiveRestore, Eraser, Printer, PrinterIcon, ReceiptText, SquarePen, Table } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import FormSectionMain from './FormSectionMain';
import { useCallback, useEffect, useRef, useState } from 'react';
import axiosInstance from '@/lib/axiosConfig';
import useAuth from '@/redux/hook/auth/useAuth';
import Swal from 'sweetalert2';
import { useSelector } from 'react-redux';
import AlertBox from '@/components/common/AlertBox';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import Preloader from '@/components/common/Preloader';
import useFormValidation from '@/lib/hooks/useFormValidation';
import printInvoiceOne, { generateQRCodeData } from '@/utils/prints/salesInvoicePrints/InvoicePrintOne';
import printThermalInvoice from '@/utils/prints/salesInvoicePrints/thermal/printThermalInvoiceOne';
import { formatDateWithTime } from '@/lib/dateFormat';
import { showToast } from '@/utils/toast';
import PopupPreloader from '@/components/common/PopupPreloader';

const GodownTransferSkin = () => {
    const location = useLocation();
    const { approveMode } = location.state || {};
    const { errors, validateForm, handleBlur, setErrors } = useFormValidation();
    const { transferMasterId } = useParams();
    const editMode = Boolean(transferMasterId);
    const [fetchLoading, setFetchLoading] = useState(false)
    const navigate = useNavigate()
    const [existingInvoiceNo, setExistingInvoiceNo] = useState('')
    const { t } = useTranslation();
    const [isSaving, setIsSaving] = useState(false);
    const [Fromgodowns, setFromGodowns] = useState([]);
    const [Togodowns, setToGodowns] = useState([]);
    const [invoiceId, setInvoiceId] = useState('');
    const [alert, setAlert] = useState(null);
    const { selectedBranchDetails, userId, selectedBranchId, currentFinancialYear, currentCurrencyConversion, currentCurrency } = useAuth();
    const [time, setTime] = useState("");
    const { generalSettings, saleSettings, financeSettings } = useSelector((state) => state.settings);
    const [resetTableKey, setResetTableKey] = useState(0);
    const [heldInvoices, setHeldInvoices] = useState([]);
    const [showHeldInvoices, setShowHeldInvoices] = useState(false);
    const [restoredHeldInvoiceId, setRestoredHeldInvoiceId] = useState(null);
    const printType = localStorage.getItem('printType');
    // Hold setup
    const [formData, setFormData] = useState({
        voucherType: "Stock Transfer",
        yearId: currentFinancialYear?.yearId,
        date: new Date(),
        currencyConversionId: currentCurrencyConversion?.currencyConversionId,
        printAfterSave: true,
        status: true,
        printType: printType || 'thermal',
        BatchId: 1,
        branchIdFrom: Number(selectedBranchId),
        branchIdTo: '',
        godownIdFrom: '',
        godownIdTo: '',
        grandTotal: '',
        exchangeRate: currentCurrencyConversion?.rate,
        exchangeDate: currentCurrencyConversion?.date,
        transportCompany: "",
        narration: "",
        postedStatus: generalSettings?.AccountPosting ? "No" : "Yes",
        postedBy: generalSettings?.AccountPosting ? null : userId,
        postedDate: generalSettings?.AccountPosting ? null : new Date(),
        branchId: selectedBranchId,
        CreatedUser: userId,

        transferDetails: [
            {
                productCode: "",
                quantity: null,
                rate: null,
                unitId: null,
                ConversionFactor: null,
                barcode: "",
                amount: null,
                rackIdFrom: 'NA',
                rackIdTo: 'NA',
                branchId: selectedBranchId,
                productName: '',
                productNameArb: ''
            }
        ]
    });
    const [baseDataloading, setBaseDataloading] = useState(false)
    const [branches, setBranches] = useState([])
    const [currencies, setCurrency] = useState([])



    useEffect(() => {
        const getSalesRequiredData = async () => {
            setBaseDataloading(true)
            try {
                const res = await axiosInstance.post('all-inventory-data', {
                    voucherType: "Stock Transfer",
                    branchId: selectedBranchId,
                    yearId: currentFinancialYear.yearId,
                    ledgerTypes: ["Supplier"],
                    ledgerId: formData.ledgerId,
                    currencyId: currentCurrency?.currencyId
                })
                const data = res?.data?.data;

                setInvoiceId(data?.voucherdata?.voucherCode)
                setBranches(data?.branches)
                setCurrency(data?.currencies)

            } catch (error) {
                console.error('error fetching default data', error)
            } finally {
                setBaseDataloading(false)
            }
        }
        getSalesRequiredData()
    }, [])

    const handleListNavigate = async () => {
        if (generalSettings?.askConfirmationClose) {
            const result = await Swal.fire({
                title: t('ConfirmCloseTitle'),
                text: t('ConfirmCloseText'),
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: t('YesClose'),
                cancelButtonText: t('Cancel'),
            });
            if (!result.isConfirmed) return;
        }
        navigate("/transaction/godown-transfer/list");
    };

    
    const holdCurrentInvoice = useCallback(() => {
        const hasData = formData.transferDetails.some(
            detail => detail.productCode && detail.quantity > 0
        );
        if (!hasData) {
            showToast.warning("No data to hold. Please add products with quantity first.");
            return;
        }
        const heldInvoice = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            invoiceId: invoiceId,
            branchIdFrom: formData.branchIdFrom,
            branchIdTo: formData.branchIdTo,
            itemCount: formData.transferDetails.filter(d => d.productCode).length,
            grandTotal: formData.grandTotal || 0,
            branchId: selectedBranchId,
            formData: { ...formData }
        };
        setHeldInvoices(prev => [...prev, heldInvoice]);
        showToast.success(`Transfer held successfully. Total held: ${heldInvoices.length + 1}`);
        clearForm(true);
    }, [formData, invoiceId, heldInvoices.length, selectedBranchId]);
    // Load held invoices from localStorage on mount
    useEffect(() => {
        const savedHeldInvoices = localStorage.getItem('heldGodownTransfers');
        if (savedHeldInvoices) {
            const allHeld = JSON.parse(savedHeldInvoices);
            const branchHeld = allHeld.filter(inv => inv.branchId === selectedBranchId);
            setHeldInvoices(branchHeld);
        }
    }, [selectedBranchId]);

    // Sync held invoices to localStorage
    useEffect(() => {
        const savedHeldInvoices = localStorage.getItem('heldGodownTransfers');
        const allHeld = savedHeldInvoices ? JSON.parse(savedHeldInvoices) : [];
        const otherBranch = allHeld.filter(inv => inv.branchId !== selectedBranchId);
        const updated = [...otherBranch, ...heldInvoices];
        if (updated.length > 0) {
            localStorage.setItem('heldGodownTransfers', JSON.stringify(updated));
        } else {
            localStorage.removeItem('heldGodownTransfers');
        }
    }, [heldInvoices, selectedBranchId]);

    // Ctrl+H keyboard shortcut
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'h') {
                e.preventDefault();
                holdCurrentInvoice();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [holdCurrentInvoice]);


    const restoreHeldInvoice = (heldInvoice) => {
        const hasValidProducts = formData.transferDetails.some(
            detail => detail.productCode && detail.quantity > 0
        );
        if (hasValidProducts) {
            const currentHeld = {
                id: Date.now(),
                timestamp: new Date().toISOString(),
                invoiceId: invoiceId,
                branchIdFrom: formData.branchIdFrom,
                branchIdTo: formData.branchIdTo,
                itemCount: formData.transferDetails.filter(d => d.productCode && d.quantity > 0).length,
                grandTotal: formData.grandTotal || 0,
                branchId: selectedBranchId,
                formData: { ...formData }
            };
            setHeldInvoices(prev => [...prev.filter(inv => inv.id !== heldInvoice.id), currentHeld]);
        } else {
            setHeldInvoices(prev => prev.filter(inv => inv.id !== heldInvoice.id));
        }
        setFormData(heldInvoice.formData);
        setInvoiceId(heldInvoice.invoiceId);
        setResetTableKey(prev => prev + 1);
        setShowHeldInvoices(false);
        setRestoredHeldInvoiceId(heldInvoice.id);
        showToast.success("Transfer restored successfully");
    };

    const deleteHeldInvoice = (id) => {
        setHeldInvoices(prev => prev.filter(inv => inv.id !== id));
        showToast.success("Held transfer deleted");
    };
    const HeldInvoicesPanel = () => {
        if (!showHeldInvoices || heldInvoices.length === 0) return null;
        return (
            <div className="fixed top-20 right-4 z-50 w-96 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 max-h-[70vh] overflow-hidden flex flex-col">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900">
                    <h3 className="font-semibold text-lg text-gray-800 dark:text-gray-200">
                        Held Transfers ({heldInvoices.length})
                    </h3>
                    <button onClick={() => setShowHeldInvoices(false)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">✕</button>
                </div>
                <div className="overflow-y-auto p-4 space-y-3">
                    {heldInvoices.map((invoice) => (
                        <div key={invoice.id} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex-1">
                                    <p className="font-semibold text-gray-800 dark:text-gray-200">
                                        Transfer: {invoice.invoiceId}
                                    </p>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        From: {invoice.branchIdFrom} → To: {invoice.branchIdTo}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-blue-600 dark:text-blue-400">
                                        {parseFloat(invoice.grandTotal || 0).toFixed(2)}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        {invoice.itemCount} items
                                    </p>
                                </div>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                                {new Date(invoice.timestamp).toLocaleString()}
                            </p>
                            <div className="flex gap-2">
                                <button onClick={() => restoreHeldInvoice(invoice)} className="flex-1 px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm font-medium transition-colors">Restore</button>
                                <button onClick={() => deleteHeldInvoice(invoice.id)} className="px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600 text-sm font-medium transition-colors">Delete</button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const clearForm = async (skipConfirmation = false) => {
        if (!skipConfirmation && generalSettings?.askConfirmationClear) {
            const result = await Swal.fire({
                title: t('ConfirmClearTitle'),
                text: t('ConfirmClearText'),
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: t('YesClear'),
                cancelButtonText: t('Cancel'),
            });
            if (!result.isConfirmed) return;
        }
        setFormData({
            voucherType: "Stock Transfer",
            yearId: currentFinancialYear?.yearId,
            date: new Date(),
            currencyConversionId: currentCurrencyConversion?.currencyConversionId,
            printAfterSave: true,
            status: true,
            printType: printType || 'thermal',
            BatchId: 1,
            branchIdFrom: Number(selectedBranchId),
            branchIdTo: '',
            godownIdFrom: '',
            godownIdTo: '',
            grandTotal: '',
            exchangeRate: currentCurrencyConversion?.rate,
            exchangeDate: currentCurrencyConversion?.date,
            transportCompany: "",
            narration: "",
            postedStatus: generalSettings?.AccountPosting ? "No" : "Yes",
            postedBy: generalSettings?.AccountPosting ? null : userId,
            postedDate: generalSettings?.AccountPosting ? null : new Date(),
            branchId: selectedBranchId,
            CreatedUser: userId,

            transferDetails: [
                {
                    productCode: "",
                    quantity: null,
                    rate: null,
                    unitId: null,
                    discountPercentage: null,
                    ConversionFactor: null,
                    barcode: "",
                    amount: null,
                    rackIdFrom: 'NA',
                    rackIdTo: 'NA',
                    branchId: selectedBranchId,
                    productName: '',
                    productNameArb: ''
                }
            ]
        });

        setResetTableKey(prev => prev + 1);
    };

    useEffect(() => {
        if (!Fromgodowns || Fromgodowns.length === 0) return;

        const defaultGodown = Fromgodowns.find(g => g.IsDefault === true);

        if (!defaultGodown) return;

        setFormData(prev => ({
            ...prev,
            godownIdFrom: defaultGodown.GodownId
        }));
    }, [Fromgodowns]);


    useEffect(() => {
        const updateTime = () => {
            const now = new Date();
            const formatted = now.toLocaleTimeString("en-US", {
                hour12: true,
                hour: "2-digit",
                minute: "2-digit",
            });
            setTime(formatted);
        };

        updateTime();
        const interval = setInterval(updateTime, 1000);

        return () => clearInterval(interval);
    }, []);


    useEffect(() => {
        if (editMode) {
            getSalesById()
        }
    }, [editMode])
    useEffect(() => {
        if (formData.branchIdTo) {
            fetchTransferToGodown()
        }
        if (formData.branchIdFrom) {
            fetchTransferFromGodown()
        }

    }, [formData.branchIdTo, formData.branchIdFrom])
    const fetchTransferToGodown = async () => {
        try {
            const { data } = await axiosInstance.get(`godowns/${formData.branchIdTo}`);

            setToGodowns(data.data);
        } catch (err) {
            console.error("Failed to fetch godowns:", err);
        }
    };
    const fetchTransferFromGodown = async () => {
        try {
            const { data } = await axiosInstance.get(`godowns/${formData.branchIdFrom}`);

            setFromGodowns(data.data);
        } catch (err) {
            console.error("Failed to fetch godowns:", err);
        }
    };


    const getSalesById = async () => {
        setFetchLoading(true)
        try {
            const response = await axiosInstance.get(`get-stock-transfer-byId/${transferMasterId}/${selectedBranchId}`);
            const data = response.data.data;


            setExistingInvoiceNo(data.transferNo)

            const taxResponse = await axiosInstance.get("tax-masters");
            const taxData = taxResponse.data.data || [];

            const transferDetailsWithProducts = await Promise.all(
                (data.transferDetails || []).map(async (item) => {
                    let productName = '';
                    let availableUnits = [];
                    let productDetails = {
                        productCode: item.productCode || '',
                        barcode: item.barcode || '',
                        partNo: '',
                        brand: '',
                        mrp: '',
                        purchase: item.PurchaseRate || '',
                        productDescription: item.productDescription || '',
                        UnitName: ''
                    };

                    const taxInfo = taxData.find(t => t.taxId === item.taxId);
                    const taxRate = taxInfo ? parseFloat(taxInfo.rate) : 0;

                    if (item.productCode) {
                        try {
                            const productResponse = await axiosInstance.get(
                                `get-product-unit-sales-details-byId/${item.productCode}`
                            );
                            const productData = productResponse.data.data;

                            productName = productData.productname || '';
                            availableUnits = productData.units || [];

                            const selectedUnit = availableUnits.find(u => u.unitid === item.unitId);

                            productDetails = {
                                productCode: item.productCode,
                                barcode: selectedUnit?.barcode || item.barcode || '',
                                partNo: productData.partNo || '',
                                brand: productData.brand || '',
                                mrp: productData.mrp || '',
                                purchase: item.PurchaseRate || '',
                                productDescription: item.productDescription || '',
                                UnitName: selectedUnit?.unitname || ''
                            };
                        } catch (err) {
                            console.error(`Error fetching product ${item.productCode}:`, err);
                        }
                    }

                    return {
                        SlNo: item.SlNo,
                        productCode: item.productCode,
                        productName: productName,
                        quantity: parseFloat(item.quantity) || 0,
                        receivedQuantity: parseFloat(item.quantity) || 0,
                        freeQty: item.freeQty ? parseFloat(item.freeQty) : null,
                        rate: parseFloat(item.rate) || 0,
                        unitId: item.unitId,
                        ConversionFactor: item.ConversionFactor,
                        barcode: item.barcode,
                        amount: parseFloat(item.amount) || 0,
                        branchId: item.branchId,
                        CreatedDate: item.CreatedDate,
                        CreatedUser: item.CreatedUser,
                        ModifiedDate: item.ModifiedDate,
                        ModifiedUser: item.ModifiedUser,
                        availableUnits: availableUnits,
                        productDetails: productDetails
                    };
                })
            );

            setFormData((prev) => ({
                ...prev,
                voucherType: "Stock Transfer",
                yearId: currentFinancialYear?.yearId,
                date: new Date(data.date),
                currencyConversionId: data.currencyConversionId,
                BatchId: data.BatchId,
                exchangeRate: data.exchangeRate,
                exchangeDate: data.exchangeDate ? new Date(data.exchangeDate) : "",
                transportCompany: data.transportCompany,
                narration: data.narration,
                godownIdFrom: data.godownIdFrom,
                godownIdTo: data.godownIdTo,
                branchIdTo: data.branchIdTo,
                branchIdFrom: data.branchIdFrom,
                status: data.status,
                grandTotal: data.grandTotal,
                postedStatus: data.postedStatus,
                postedBy: data.postedBy,
                postedDate: data.postedDate ? new Date(data.postedDate) : "",
                branchId: data.branchId,
                CreatedUser: data.CreatedUser,
                vatLedgerId: data.vatLedgerId,
                transferDetails: transferDetailsWithProducts,
            }));

            setResetTableKey((prev) => prev + 1);

        } catch (error) {
            console.error("Error fetching sale data", error);
        } finally {
            setFetchLoading(false)
        }
    };



    const [voucherNoGenarating, setVoucherNumberGenarating] = useState(false)

    const genarateSalesInvoiceId = async () => {
        setVoucherNumberGenarating(true)
        try {
            const response = await axiosInstance.get(`get-generated-voucherNo?voucherType=Stock Transfer&branchId=${selectedBranchId}&yearId=${currentFinancialYear.yearId}`);
            setInvoiceId(response.data.voucherCode);
            suffixPrefixIdRef.current = response.data.table_pk;   // ✅ ref always fresh
            setFormData(prev => ({
                ...prev,
                suffixPrefixId: response.data.table_pk,
            }));
        } catch (error) {
            console.error(error);
        } finally {
            setVoucherNumberGenarating(false)
        }
    }

    const validateFormData = () => {
        const errors = [];

        if (!formData.date) errors.push('Please select invoice date');
        if (!formData.branchIdFrom) errors.push('Please select "From Branch"');
        if (!formData.godownIdFrom) errors.push('Please select "From Godown"');
        if (!formData.branchIdTo) errors.push('Please select "To Branch"');
        if (!formData.godownIdTo) errors.push('Please select "To Godown"');
        if (!formData.transferDetails || formData.transferDetails.length === 0) {
            errors.push('Please add at least one product');
        }

        const hasValidProducts = formData.transferDetails.some(
            detail => detail.productCode && detail.quantity > 0
        );
        if (!hasValidProducts) errors.push('Please add valid products with quantity');

        return errors;
    };

    const validationRules = {
        // ledgerId: { required: true, label: t("requiredFieldsError") },
        date: { required: true, label: t("requiredFieldsError") },
    };

    const handleApprove = async () => {

        try {
            const payload = {
                approvedstatus: "Accepted",
                approvedUser: userId,
                transferDetails: formData.transferDetails.map(detail => ({
                    productCode: detail.productCode,
                    quantity: detail.quantity,
                    unitId: detail.unitId,
                    rate: detail.rate,
                    amount: detail.amount,
                    rackIdFrom: detail.rackIdFrom,
                    rackIdTo: detail.rackIdTo,
                    ConversionFactor: detail.ConversionFactor,
                    barcode: detail.barcode,
                    branchId: detail.branchId,
                    receivedQuantity: detail.receivedQuantity || 0
                }))
            }

            const res = await axiosInstance.post(`accept-stock-transfer/${transferMasterId}`, payload);
            setAlert({
                id: Date.now(),
                type: "success",
                message: t("saveSuccess"),
            });
            navigate('/transaction/godown-transfer/list');

        } catch (error) {
            console.error("Error approving stock transfer", error);
        }
    }

    const handleSave = useCallback(async () => {
        if (!validateForm(formData, validationRules)) return;

        if (formData.BillBalanceAmount < 0) {
            setAlert({
                id: Date.now(),
                type: "error",
                message: t("salesInvoice.alert.billBalanceAmtError"),
            });
            return;
        }
        if (formData.paymentMode === 'credit' && formData.BillBalanceAmount <= 0) {
            setAlert({
                id: Date.now(),
                type: "error",
                message: t("salesInvoice.alert.creditPaymentModeError"),
            });
            return;
        }

        const validationErrors = validateFormData();
        if (validationErrors.length > 0) {
            const errorMessage = validationErrors.join('\n');
            setAlert({
                id: Date.now(),
                type: "error",
                message: errorMessage,
            });
            return;
        }

        if (editMode && generalSettings?.askConfirmationEdit) {
            const result = await Swal.fire({
                title: t("ConfirmUpdateTitle"),
                text: t("ConfirmUpdateText"),
                icon: 'question',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: t("YesUpdate"),
                cancelButtonText: t('Cancel'),
            });
            if (!result.isConfirmed) return;
        } else if (!editMode && generalSettings?.askConfirmationSave) {
            const result = await Swal.fire({
                title: t('ConfirmSaveTitle'),
                text: t('ConfirmSaveText'),
                icon: 'question',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: t('YesSave'),
                cancelButtonText: t('Cancel'),
            });
            if (!result.isConfirmed) return;
        }


        setIsSaving(true);
        try {
            // Generate QR code data and add to formData before saving
            const qrCodeBase64 = generateQRCodeData(
                formData,
                selectedBranchDetails?.branchName || '',
                selectedBranchDetails?.taxNo || '',
                time
            );

            // Create updated formData with QR code
            const dataToSave = {
                ...formData,
                date: formatDateWithTime(formData.date),
                billTime: time,
                qr_link: qrCodeBase64  // Store the base64 QR code string
            };

            const api = editMode ? `update-stock-transfer/${transferMasterId}` : 'save-stock-transfer';
            const response = await axiosInstance.post(api, dataToSave);

            if (!response.data.error) {
                setAlert({
                    id: Date.now(),
                    type: "success",
                    message: t("saveSuccess"),
                });

                // Get the saved invoice data
                const savedInvoiceData = dataToSave;
                const invoiceNumber = invoiceId;

                // Print invoice if enabled
                if (formData.printAfterSave) {
                    // Prepare invoice data for printing
                    const invoiceDataForPrint = {
                        ...savedInvoiceData,
                        invoiceNo: invoiceNumber,
                        date: savedInvoiceData.date || formData.date,
                        salesDetails: savedInvoiceData.salesDetails || formData.salesDetails
                    };

                    // Call print function
                    // setTimeout(() => {
                    //     if (formData.printType === 'a4') {
                    //         printInvoiceOne(invoiceDataForPrint, selectedBranchDetails, time);
                    //     } else if (formData.printType === 'thermal') {
                    //         printThermalInvoice(invoiceDataForPrint, selectedBranchDetails, time);
                    //     }
                    // }, 500);
                }

                if (saleSettings.CloseAfterSave) {
                    setTimeout(() => {
                        navigate('/transaction/godown-transfer/list');
                    }, formData.printAfterSave ? 1500 : 500);
                }



                // Update invoice ID for next entry (but don't clear yet)
                await clearForm(true);                // ✅ clear first, both modes
                await genarateSalesInvoiceId();
            }
        } catch (error) {
            console.error('Error saving sales:', error);
            Swal.fire({
                icon: 'error',
                title: t('Error') || 'Error',
                text: error.response?.data?.message || t('SaveFailed') || 'Failed to save sales invoice',
            });
        } finally {
            setIsSaving(false);
        }
    }, [formData, time, saleSettings, generalSettings, editMode, selectedBranchDetails,]);

    const breadcrumbActions = [
        {
            label: t("listBtn"),
            icon: Table,
            type: "secondary",
            onClick: handleListNavigate,
        },
        // After the list button entry, add:
        !editMode && {
            label: `Hold Transfer${heldInvoices.length > 0 ? ` (${heldInvoices.length})` : ''}`,
            icon: Archive,
            type: "secondary",
            onClick: holdCurrentInvoice,
            title: "Hold the current transfer (CTRL + H)",
        },
        heldInvoices.length > 0 && !editMode && {
            label: "Restore",
            icon: ArchiveRestore,
            type: "secondary",
            title: "View and restore held transfers",
            onClick: () => setShowHeldInvoices(!showHeldInvoices),
        },
        !editMode && {
            label: t("clearBtn"),
            icon: Eraser,
            type: "secondary",
            onClick: () => clearForm(),  // ← clean call, no args
        },
        // editMode && {
        //     label: t("printBtn"),
        //     icon: PrinterIcon,
        //     type: "secondary",
        //     onClick: reprintInvoice,
        // },
        {
            label: approveMode
                ? t("approveBtn")
                : editMode
                    ? t("updateBtn")
                    : t("submitBtn"),

            icon: approveMode ? ArchiveRestore : SquarePen,
            type: "primary",
            onClick: approveMode ? handleApprove : handleSave,
            loading: isSaving,
            loadingText: t("loadingText"),
        },
    ].filter(Boolean);
    useEffect(() => {
        if (!editMode) {
            const handleKeyDown = (e) => {
                if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
                    e.preventDefault();
                    handleSave();
                }
            };

            window.addEventListener('keydown', handleKeyDown);

            return () => {
                window.removeEventListener('keydown', handleKeyDown);
            };
        }
    }, [handleSave]);

    if (fetchLoading || baseDataloading) {
        return (
            <div className="bg-primary dark:bg-primary ">
                <BreadCrumb
                    routes={[
                        { title: t("stockTransfer.breadCrumb.master"), url: "#" },
                        { title: t("stockTransfer.breadCrumb.title"), url: "#" },
                    ]}
                    heading={{ icon: ReceiptText, title: t("stockTransfer.breadCrumb.title") }}
                    actions={breadcrumbActions}
                />

                <Preloader />
            </div>
        );
    }

    return (
        <div className='bg-primary dark:bg-primary '>
            <PopupPreloader
                isOpen={isSaving}
                state="loading"
                title={t("loadingText")}
                subtitle={t("loadingDesc")}
            />
            <HeldInvoicesPanel />
            {alert && <AlertBox key={alert.id} message={alert.message} type={alert.type} />}

            <BreadCrumb
                routes={[
                    { title: t("stockTransfer.breadCrumb.master"), url: "#" },
                    { title: t("stockTransfer.breadCrumb.title"), url: "#" },
                ]}
                heading={{ icon: ReceiptText, title: t("stockTransfer.breadCrumb.title") }}
                actions={breadcrumbActions}
            />

            <FormSectionMain
                validationRules={validationRules}
                handleBlur={handleBlur}
                setErrors={setErrors}
                errors={errors}
                existingInvoiceNo={existingInvoiceNo}
                editMode={editMode}
                key={resetTableKey}
                time={time}
                invoiceId={invoiceId}
                setFormData={setFormData}
                formData={formData}
                Togodowns={Togodowns}
                Fromgodowns={Fromgodowns}
                rows={formData?.transferDetails}
                setRows={(updatedRows) => setFormData((prev) => ({ ...prev, transferDetails: updatedRows }))}
                approveMode={approveMode}

                branches={branches}
                currencies={currencies}
            />

        </div>
    )
}

export default GodownTransferSkin