import React, { useEffect, useState } from 'react'
import SalesInvoiceModalWizard from './SalesInvoiceModalWizard'
import { Button } from '@/components/ui/button'
import { useTranslation } from 'react-i18next'
import useAuth from '@/redux/hook/auth/useAuth'
import TextInput from '@/components/elements/theme/TextInput'
import TextArea from '@/components/elements/theme/TextArea'
import axiosInstance from '@/lib/axiosConfig'
import { sanitize } from '@/lib/inputSanitizer'

const ShippingAddressModal = ({ open, handleClose, editId, onSuccess }) => {
    const { currentFinancialYear, currentCurrencyConversion, userId } = useAuth()
    const [errors, setErrors] = useState({})
    const [loadingData, setLoadingData] = useState(false)
    const [loading, setLoading] = useState(false)
    const { t } = useTranslation()

    const [formData, setFormData] = useState({
        customerName: "",
        phoneNo: "",
        vatNo: "",
        ShippingAddress: {
            address1: "",
            address2: "",
            address3: "",
            address4: "",
            Isdefault: false, // ✅ Ensure this is always present
        },
        exchangeDate: currentCurrencyConversion?.date,
        exchangeRate: currentCurrencyConversion?.rate,
        currencyConversionId: currentCurrencyConversion?.currecyConversionId,
        activeFinancialYear_fromDate: currentFinancialYear?.fromDate,
    })

    // Input handler (for both main fields and nested ShippingAddress)
    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target
        let updatedValue = value
        if (["customerName"].includes(name)) {
            updatedValue = sanitize.alphaNumericSpace(value)
        }
        if (["phoneNo", "vatNo"].includes(name)) {
            updatedValue = sanitize.numbers(value)
        }

        if (["address1", "address2", "address3", "address4"].includes(name)) {
            setFormData((prev) => ({
                ...prev,
                ShippingAddress: {
                    ...prev.ShippingAddress,
                    [name]: value,
                },
            }))
        } else if (name === "Isdefault") {
            setFormData((prev) => ({
                ...prev,
                ShippingAddress: {
                    ...prev.ShippingAddress,
                    Isdefault: checked,
                },
            }))
        } else {
            setFormData((prev) => ({
                ...prev,
                [name]: updatedValue,
            }))
        }
    }

    // Fetch Ledger Data
    useEffect(() => {
        const fetchLedger = async () => {
            if (!editId) return
            setLoadingData(true)
            try {
                const response = await axiosInstance.get(
                    `get-account-ledger-byId/${editId}`
                )

                if (response?.data?.data) {
                    const ledger = response.data.data

                    // ✅ FIX: shipping_address is an ARRAY, not an object
                    const shippingAddresses = ledger.shipping_address || []
                    const defaultAddress = shippingAddresses.find(addr => addr.Isdefault === true) || {}

                    setFormData({
                        customerName: ledger.ledgerName || "",
                        phoneNo: ledger.phoneNo || "",
                        vatNo: ledger.tinNumber || "",
                        ShippingAddress: {
                            address1: defaultAddress.address1 || "",
                            address2: defaultAddress.address2 || "",
                            address3: defaultAddress.address3 || "",
                            address4: defaultAddress.address4 || "",
                            Isdefault: defaultAddress.Isdefault ?? false, // ✅ Always include
                        },
                        exchangeDate: currentCurrencyConversion?.date,
                        exchangeRate: currentCurrencyConversion?.rate,
                        currencyConversionId: currentCurrencyConversion?.currecyConversionId,
                        activeFinancialYear_fromDate: currentFinancialYear?.fromDate,
                    })
                }
            } catch (err) {
                console.error("Failed to fetch ledger:", err)
                setErrors({ api: "Failed to load shipping address data" })
            } finally {
                setLoadingData(false)
            }
        }

        if (open) fetchLedger()
    }, [editId, open, currentCurrencyConversion, currentFinancialYear])

    // Submit handler
    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setErrors({})

        try {
            // ✅ Ensure Isdefault is always sent
            const payload = {
                customerName: formData.customerName,
                ledgerName: formData.customerName,
                phoneNo: formData.phoneNo,
                tinNumber: formData.vatNo,
                ShippingAddress: {
                    address1: formData.ShippingAddress.address1 || "",
                    address2: formData.ShippingAddress.address2 || "",
                    address3: formData.ShippingAddress.address3 || "",
                    address4: formData.ShippingAddress.address4 || "",
                    Isdefault: formData.ShippingAddress.Isdefault ?? false,
                },
                exchangeDate: formData.exchangeDate,
                exchangeRate: formData.exchangeRate,
                currencyConversionId: formData.currencyConversionId,
                activeFinancialYear_fromDate: formData.activeFinancialYear_fromDate,
                ModifiedUser: editId ? userId : null,
            }

            // API 1: update ledger (name, phone, vat, etc.)
            const { data } = await axiosInstance.post(
                `update-account-ledger/${editId}`,
                payload
            )

            // API 2: dedicated shipping address save/update
            const isEditingAddress = Boolean(formData.ShippingAddress.addressId)

            const shippingPayload = {
                ledgerId: editId,
                address1: formData.ShippingAddress.address1 || "",
                address2: formData.ShippingAddress.address2 || "",
                address3: formData.ShippingAddress.address3 || "",
                address4: formData.ShippingAddress.address4 || "",
                Isdefault: formData.ShippingAddress.Isdefault ?? false,
                CreatedUser: userId,
                ModifiedUser: userId,
            }

            const shippingApiUrl = isEditingAddress
                ? `update-shipping-address/${formData.ShippingAddress.addressId}`
                : `save-shipping-address`

            const shippingRes = await axiosInstance.post(shippingApiUrl, shippingPayload)

            if (!data.error && !shippingRes.data.error) {
                onSuccess?.()
                handleClose()
            }
        } catch (err) {
            console.error("Shipping update failed:", err)
            setErrors({ api: err.response?.data?.message || "Failed to update shipping address" })
        } finally {
            setLoading(false)
        }
    }

    return (
        <SalesInvoiceModalWizard
            open={open}
            handleClose={handleClose}
            title={"Update Shipping Address"}
            width={"600px"}
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
                    />
                    <TextInput
                        name="phoneNo"
                        type="text"
                        maxLength={10}
                        label="Phone Number"
                        value={formData.phoneNo}
                        onChange={handleInputChange}
                        error={errors.phoneNo}
                        className="w-full"
                    />

                    <div className="grid grid-cols-2 gap-1">
                        <TextArea
                            name="address1"
                            label="Address Line 1"
                            value={formData.ShippingAddress?.address1}
                            onChange={handleInputChange}
                            error={errors.address1}
                            className="w-full"
                        />
                        <TextArea
                            name="address2"
                            label="Address Line 2"
                            value={formData.ShippingAddress?.address2}
                            onChange={handleInputChange}
                            error={errors.address2}
                            className="w-full"
                        />
                        <TextArea
                            name="address3"
                            label="Address Line 3"
                            value={formData.ShippingAddress?.address3}
                            onChange={handleInputChange}
                            error={errors.address3}
                            className="w-full"
                        />
                        <TextArea
                            name="address4"
                            label="Address Line 4"
                            value={formData.ShippingAddress?.address4}
                            onChange={handleInputChange}
                            error={errors.address4}
                            className="w-full"
                        />
                    </div>

                    <TextInput
                        name="vatNo"
                        label="Vat Number"
                        value={formData.vatNo}
                        onChange={handleInputChange}
                        error={errors.vatNo}
                        className="w-full"
                    />

                    {/* ✅ Optional: Add checkbox to set as default */}
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="Isdefault"
                            name="Isdefault"
                            checked={formData.ShippingAddress.Isdefault}
                            onChange={handleInputChange}
                            className="w-4 h-4"
                        />
                        <label htmlFor="Isdefault" className="text-sm">
                            Set as default shipping address
                        </label>
                    </div>
                </div>

                {errors.api && (
                    <p className="text-red-500 text-sm mt-2">{errors.api}</p>
                )}

                <div className="flex justify-end gap-3 mt-3">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleClose}
                        disabled={loading}
                    >
                        {t("cancelBtn")}
                    </Button>
                    <Button type="submit" className="main-bg" disabled={loading}>
                        {loading ? t("loading") : t("submitBtn")}
                    </Button>
                </div>
            </form>
        </SalesInvoiceModalWizard>
    )
}

export default ShippingAddressModal