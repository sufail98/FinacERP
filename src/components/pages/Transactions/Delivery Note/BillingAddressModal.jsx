import React, { useEffect, useState } from "react";
import SalesInvoiceModalWizard from "./SalesInvoiceModalWizard";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import TextInput from "@/components/elements/theme/TextInput";
import TextArea from "@/components/elements/theme/TextArea";
import { sanitize } from "@/lib/inputSanitizer";

const BillingAddressModal = ({ open, handleClose, onSave, billingData }) => {
    const { t } = useTranslation();
    const [errors, setErrors] = useState({});

    const [formData, setFormData] = useState({
        name: "",
        address: "",
        phoneNo: "",
        email: "",
        vatNo: "",
    });

    // Sync form data whenever modal opens or billingData changes
    useEffect(() => {
        if (open && billingData) {
            setFormData({
                name: billingData.name || "",
                address: billingData.address || "",
                phoneNo: billingData.phoneNo || "",
                email: billingData.email || "",
                vatNo: billingData.vatNo || "",
            });
            setErrors({});
        }
    }, [open, billingData]);

    // Input handler
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        let updatedValue  = value
        if(["phoneNo","vatNo"].includes(name)){
            updatedValue = sanitize.numbers(value)
        }
        if(["name"].includes(name)){
            updatedValue = sanitize.alphaNumericSpace(value)
        }
        setFormData((prev) => ({
            ...prev,
            [name]: updatedValue,
        }));
    };

    // Submit handler — local state update only, no API call
    const handleSubmit = (e) => {
        e.preventDefault();

        // Optional: add validation here
        // if (!formData.name) {
        //     setErrors({ name: "Customer name is required" });
        //     return;
        // }

        // Pass updated data back to parent via callback
        onSave?.({
            name: formData.name,
            address: formData.address,
            phoneNo: formData.phoneNo,
            email: formData.email,
            vatNo: formData.vatNo,
        });

        handleClose();
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
                        name="name"
                        label="Customer Name"
                        value={formData.name}
                        onChange={handleInputChange}
                        error={errors.name}
                        className="w-full"
                    />
                    <TextInput
                        name="phoneNo"
                        type = "text"
                        maxLength = {10}
                        label="Phone Number"
                        value={formData.phoneNo}
                        onChange={handleInputChange}
                        error={errors.phoneNo}
                        className="w-full"
                    />
                    <TextArea
                        name="address"
                        label="Address"
                        value={formData.address}
                        onChange={handleInputChange}
                        error={errors.address}
                        className="w-full"
                    />
                    <TextInput
                        name="vatNo"
                        label="Vat Number"
                        value={formData.vatNo}
                        onChange={handleInputChange}
                        error={errors.vatNo}
                        className="w-full"
                    />
                </div>

                <div className="flex justify-end gap-3 mt-3">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleClose}
                    >
                        {t("cancelBtn")}
                    </Button>
                    <Button type="submit" className="main-bg">
                        {t("submitBtn")}
                    </Button>
                </div>
            </form>
        </SalesInvoiceModalWizard>
    );
};

export default BillingAddressModal;