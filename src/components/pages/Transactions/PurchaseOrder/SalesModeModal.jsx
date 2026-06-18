import React from 'react'
import SalesInvoiceModalWizard from './PurchaseOrderModalWizard'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'

const SalesModeModal = ({ open, handleClose, onSuccess, editId, formData, handleChange }) => {
    const { t } = useTranslation()
   
    return (
        <div>
            <SalesInvoiceModalWizard
                open={open}
                handleClose={handleClose}
                title={'Sales Mode'}
            >
              
                <div className="flex justify-end gap-3">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleClose}
                    // disabled={loading}
                    >
                        {t("cancelBtn")}
                    </Button>
                    <Button type="submit" className="main-bg" >
                        {t("submitBtn")}
                    </Button>
                </div>
            </SalesInvoiceModalWizard>

        </div>
    )
}

export default SalesModeModal