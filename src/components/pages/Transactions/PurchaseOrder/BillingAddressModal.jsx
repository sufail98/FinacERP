import React, { useEffect, useState } from "react";
import SalesInvoiceModalWizard from "./PurchaseOrderModalWizard";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import useAuth from "@/redux/hook/auth/useAuth";
import TextInput from "@/components/elements/theme/TextInput";
import TextArea from "@/components/elements/theme/TextArea";
import axiosInstance from "@/lib/axiosConfig";

const BillingAddressModal = ({ open, handleClose, onSuccess, editId }) => {
    const { currentFinancialYear, currentCurrencyConversion, selectedBranchId,userId } = useAuth();
    const { t } = useTranslation();
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [loadingData, setLoadingData] = useState(false);

    const [formData, setFormData] = useState({
        customerName: "",
        address: "",
        phoneNo: "",
        vatNo: "",
        brachId: selectedBranchId,
        exchangeDate: currentCurrencyConversion?.date,
        exchangeRate: currentCurrencyConversion?.rate,
        currencyConversionId: currentCurrencyConversion?.currencyConversionId,
        activeFinancialYear_fromDate: currentFinancialYear?.fromDate,
    });

    useEffect(() => {
        const fetchLedger = async () => {
            if (!editId) return;
            setLoadingData(true);
            try {
                const response = await axiosInstance.get(
                    `get-account-ledger-byId/${editId}`
                );

                if (response?.data?.data) {
                    const ledger = response.data.data;

                    setFormData({
                        customerName: ledger.ledgerName || "",
                        address: ledger.address || "",
                        phoneNo: ledger.phoneNo || "",
                        vatNo: ledger.tinNumber || "",
                    });
                }
            } catch (err) {
                console.error("Failed to fetch ledger:", err);
                setErrors({ api: "Failed to load billing address data" });
            } finally {
                setLoadingData(false);
            }
        };

        if (open) fetchLedger();
    }, [editId, open, currentCurrencyConversion, currentFinancialYear]);

    // Input handler
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    // Submit handler
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErrors({});

        try {
            const { data } = await axiosInstance.post(
                `update-account-ledger/${editId}`,
                {
                    ledgerName: formData.customerName,
                    address: formData.address,
                    phoneNo: formData.phoneNo,
                    tinNumber: formData.vatNo,
                    exchangeDate: formData.exchangeDate,
                    exchangeRate: formData.exchangeRate,
                    currencyConversionId: formData.currencyConversionId,
                    activeFinancialYear_fromDate: formData.activeFinancialYear_fromDate,
                    ModifiedUser: editId ? userId : null,
                }
            );

            if (!data.error) {
                onSuccess?.();
                handleClose();
            }
        } catch (err) {
            console.error("Billing update failed:", err);
            setErrors({ api: "Failed to update billing address" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <SalesInvoiceModalWizard
            open={open}
            handleClose={handleClose}
            title={"Update Billing Address"}
            width={"500px"}
        >

            <form onSubmit={handleSubmit}>
                <div className="space-y-2">
                    <TextInput
                        name="customerName"
                        label="Customer Name"
                        value={formData.customerName}
                        onChange={handleInputChange}
                        error={errors.customerName}
                        className="w-full"
                        disabled={loadingData}
                    />
                    <TextInput
                        name="phoneNo"
                        label="Phone Number"
                        value={formData.phoneNo}
                        onChange={handleInputChange}
                        error={errors.phoneNo}
                        className="w-full"
                        disabled={loadingData}

                    />
                    <TextArea
                        name="address"
                        label="Address"
                        value={formData.address}
                        onChange={handleInputChange}
                        error={errors.address}
                        className="w-full"
                        disabled={loadingData}

                    />
                    <TextInput
                        name="vatNo"
                        label="Vat Number"
                        value={formData.vatNo}
                        onChange={handleInputChange}
                        error={errors.vatNo}
                        className="w-full"
                        disabled={loadingData}

                    />

                    {errors.api && (
                        <p className="text-red-500 text-sm">{errors.api}</p>
                    )}
                </div>

                <div className="flex justify-end gap-3 mt-3">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleClose}
                        disabled={loading || loadingData}
                    >
                        {t("cancelBtn")}
                    </Button>
                    <Button type="submit" className="main-bg" disabled={loading || loadingData}>
                        {loading ? t("loadingText") : t("submitBtn")}
                    </Button>
                </div>
            </form>
        </SalesInvoiceModalWizard>
    );
};

export default BillingAddressModal;
