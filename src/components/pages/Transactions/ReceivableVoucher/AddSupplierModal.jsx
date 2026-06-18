import { Modal, Fade, Box, useMediaQuery } from "@mui/material";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import axiosInstance from "@/lib/axiosConfig";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import TextInput from "@/components/elements/theme/TextInput";
import useAuth from "@/redux/hook/auth/useAuth";

const AddSupplierModal = ({ open, handleClose, onSuccess }) => {
    const { currentFinancialYear, currentCurrencyConversion, selectedBranchId, userId } = useAuth();

    const isMobile = useMediaQuery("(max-width:600px)");
    const style = {
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: isMobile ? "95%" : "30%",
        height: "auto",
        bgcolor: "background.paper",
        border: "1px solid #d3d3d3",
        boxShadow: 24,
        borderRadius: 3,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
    };

    const { t } = useTranslation();
    const [alert, setAlert] = useState(null);
    const [errors, setErrors] = useState({});
    const [submitError, setSubmitError] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        supplierName: "",
        nameFL: "",
        ledgerType: "Supplier",
        phoneNo: "",
        vatNumber: "",
        crNumber: "",
        CreatedUser: userId,
        branchId: selectedBranchId,
        exchangeDate: currentCurrencyConversion?.date,
        exchangeRate: currentCurrencyConversion?.rate,
        currencyConversionId: currentCurrencyConversion?.currencyConversionId,
        activeFinancialYear_fromDate: currentFinancialYear?.fromDate,
    });

    const clearForm = () => {
        setFormData({
            supplierName: "",
            nameFL: "",
            ledgerType: "Supplier",
            phoneNo: "",
            vatNumber: "",
            crNumber: "",
            CreatedUser: userId,
            exchangeDate: currentCurrencyConversion?.date,
            exchangeRate: currentCurrencyConversion?.rate,
            currencyConversionId: currentCurrencyConversion?.currencyConversionId,
            activeFinancialYear_fromDate: currentFinancialYear?.fromDate
        });
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;

        if (formData.ShippingAddress && name in formData.ShippingAddress) {
            setFormData((prev) => ({
                ...prev,
                ShippingAddress: {
                    ...prev.ShippingAddress,
                    [name]: type === "checkbox" ? checked : value,
                },
            }));
        } else {
            setFormData((prev) => ({ ...prev, [name]: value }));
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();

        try {
            setIsSubmitting(true);
            setSubmitError(null);

            const response = await axiosInstance.post("save-account-ledger",
                {
                    ...formData,
                    ledgerName: formData.supplierName,
                    name: formData.nameFL,
                    tinNumber: formData.vatNumber,
                    cstNumber: formData.crNumber
                });

            setAlert({ key: new Date(), type: "success", message: "Supplier saved successfully" });

            if (onSuccess) onSuccess();
            clearForm();
            handleClose();
            setAlert(null);

        } catch (error) {
            console.error("Error saving supplier:", error);
            const errorMessage = error.response?.data?.message || error.message || "Failed to save supplier";
            setSubmitError(errorMessage);
            setAlert({ key: new Date(), type: "error", message: errorMessage });
        } finally {
            setIsSubmitting(false);
        }
    };

    useEffect(() => {
        if (open) {
            clearForm();
            setSubmitError(null);
            setAlert(null);
            setErrors({});
        }
    }, [open]);

    return (
        <Modal
            open={open}
            onClose={handleClose}
            closeAfterTransition
            slotProps={{ backdrop: { timeout: 300 } }}
            style={{ zIndex: "99999999999999999" }}
        >
            <Fade in={open}>
                <Box sx={style}>
                    <Card className="border-none shadow-none h-full">
                        <CardContent className="p-2 flex flex-col h-full">
                            {/* Header */}
                            <div className="mb-2 border-b text-center font-bold text-lg">
                                {t("supplier.form.breadcrumb.addSupplier")}
                            </div>
                            {/* Scrollable body */}
                            <form id="supplier-form" onSubmit={handleSave} className="space-y-2">
                                <TextInput
                                    label={t("supplier.form.supplierName") || "Supplier Name"}
                                    placeholder={t("supplier.form.supplierNamePlaceholder") || "Enter supplier name"}
                                    name="supplierName"
                                    value={formData.supplierName}
                                    onChange={handleChange}
                                    required
                                    error={errors.supplierName}
                                />
                                <TextInput
                                    label={t("supplier.form.nameFL") || "Full Name"}
                                    placeholder={t("supplier.form.nameFLPlaceholder") || "Enter full name"}
                                    name="nameFL"
                                    value={formData.nameFL}
                                    onChange={handleChange}
                                    error={errors.nameFL}
                                />
                                <TextInput
                                    label={t("supplier.form.phoneNo") || "Phone Number"}
                                    placeholder={t("supplier.form.phoneNoPlaceholder") || "Enter phone number"}
                                    name="phoneNo"
                                    value={formData.phoneNo}
                                    onChange={handleChange}
                                    error={errors.phoneNo}
                                />
                                <TextInput
                                    label={t("supplier.form.vatNumber") || "VAT Number"}
                                    placeholder={t("supplier.form.vatNumberPlaceholder") || "Enter VAT number"}
                                    name="vatNumber"
                                    value={formData.vatNumber}
                                    onChange={handleChange}
                                    error={errors.vatNumber}
                                />
                                <TextInput
                                    label={t("supplier.form.crNumber") || "CR Number"}
                                    placeholder={t("supplier.form.crNumberPlaceholder") || "Enter CR number"}
                                    name="crNumber"
                                    value={formData.crNumber}
                                    onChange={handleChange}
                                    error={errors.crNumber}
                                />
                                {submitError && (
                                    <div className="text-red-600 text-sm mt-2">{submitError}</div>
                                )}
                            </form>

                            {/* Footer */}
                            <div className="flex pt-3 justify-end gap-3 pr-4 mt-auto">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleClose}
                                    disabled={isSubmitting}
                                >
                                    {t("cancelBtn") || "Cancel"}
                                </Button>
                                <Button
                                    type="submit"
                                    className="main-bg"
                                    form="supplier-form"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting
                                        ? (t("loadingText") || "Submitting...")
                                        : (t("submitBtn") || "Submit")
                                    }
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </Box>
            </Fade>
        </Modal>
    );
};

export default AddSupplierModal;