import React, { useEffect, useState } from 'react'
import PayableVoucherModalWizard from './ReceivableVoucherModalWizard'
import { Button } from '@/components/ui/button'
import { useTranslation } from 'react-i18next'
import useAuth from '@/redux/hook/auth/useAuth'
import TextInput from '@/components/elements/theme/TextInput'
import TextArea from '@/components/elements/theme/TextArea'
import axiosInstance from '@/lib/axiosConfig'
import { sanitize } from '@/lib/inputSanitizer'

const ShippingAddressModal = ({ open, handleClose, editId, onSuccess }) => {
    const { currentFinancialYear, currentCurrencyConversion,userId } = useAuth()
    const [errors, setErrors] = useState({})
    const [loadingData, setLoadingData] = useState(false)
    const [loading, setLoading] = useState(false)
    const { t } = useTranslation()

    const [formData, setFormData] = useState({
        supplierName: "",
        phoneNo: "",
        vatNo: "",
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
    })

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target
        let updatedValue = value
                if(["vatNo","phoneNo"].includes(name)){
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

                    const shippingAddresses = ledger.shipping_address || []
                    const defaultAddress = shippingAddresses.find(addr => addr.Isdefault === true) || {}

                    setFormData({
                        supplierName: ledger.ledgerName || "",
                        phoneNo: ledger.phoneNo || "",
                        vatNo: ledger.tinNumber || "",
                        ShippingAddress: {
                            address1: defaultAddress.address1 || "",
                            address2: defaultAddress.address2 || "",
                            address3: defaultAddress.address3 || "",
                            address4: defaultAddress.address4 || "",
                            Isdefault: defaultAddress.Isdefault ?? false,
                        },
                        exchangeDate: currentCurrencyConversion?.date,
                        exchangeRate: currentCurrencyConversion?.rate,
                        currencyConversionId: currentCurrencyConversion?.currencyConversionId,
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

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setErrors({})

        try {
            const payload = {
                supplierName: formData.supplierName,
                ledgerName: formData.supplierName,
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

            const { data } = await axiosInstance.post(
                `update-account-ledger/${editId}`,
                payload
            )

            if (!data.error) {
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
        <PayableVoucherModalWizard
            open={open}
            handleClose={handleClose}
            title={"Update Shipping Address"}
            width={"600px"}
        >
            <form onSubmit={handleSubmit}>
                <div className="space-y-2">
                    <TextInput
                        name="supplierName"
                        label="Supplier Name"
                        value={formData.supplierName}
                        onChange={handleInputChange}
                        error={errors.supplierName}
                        className="w-full"
                    />
                    <TextInput
                    type="text"
                    maxLength = {10}
                        name="phoneNo"
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
        </PayableVoucherModalWizard>
    )
}

export default ShippingAddressModal