import React from 'react'
import MaterialReceiptModalWizard from './MaterialReceiptModalWizard'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'

const PurchaseModeModal = ({ open, handleClose, onSuccess, editId, formData, handleChange }) => {
    const { t } = useTranslation()
   
    return (
        <div>
            <MaterialReceiptModalWizard
                open={open}
                handleClose={handleClose}
                title={'Purchase Mode'}
            >
              
                <div className="flex justify-end gap-3">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleClose}
                    >
                        {t("cancelBtn")}
                    </Button>
                    <Button type="submit" className="main-bg" >
                        {t("submitBtn")}
                    </Button>
                </div>
            </MaterialReceiptModalWizard>

        </div>
    )
}

export default PurchaseModeModal