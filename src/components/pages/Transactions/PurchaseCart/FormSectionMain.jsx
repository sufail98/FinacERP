import TextInput from '@/components/elements/theme/TextInput'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import { PencilIcon, Plus } from 'lucide-react'


import AddNewBtn from '@/components/common/AddNewBtn'
import axiosInstance from '@/lib/axiosConfig'
import useAuth from '@/redux/hook/auth/useAuth'
import SalesInvoiceTable from './PurchaseCartTable'
import DateInput from '@/components/elements/theme/DateInput'
import TextArea from '@/components/elements/theme/TextArea'
import { sanitize } from '@/lib/inputSanitizer'

const FormSectionMain = ({
  existingInvoiceNo,
  invoiceId,
  formData,
  setFormData,
  editMode,
  rows,
  setRows,
  setErrors,
  errors,
  otherChargeLedgers,
}) => {

  const { t } = useTranslation();
  const { generalSettings } = useSelector((state) => state.settings);
  const { currentFinancialYear } = useAuth();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    let updatedValue = value
    if(["CustomerName"].includes(name)){
      updatedValue = sanitize.lettersSpace(value)
    }
    if(["CustomerPhone"].includes(name)){
      updatedValue = sanitize.numbers(value).slice(0,10)
    }
    setFormData(prev => ({
      ...prev,
      [name]: updatedValue
    }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };




  return (
    <div className='p-2 space-y-0.5 bg-primary dark:bg-primary'>
      <div className='grid grid-cols-1 md:grid-cols-4 gap-1'>
        <TextInput
          label={t('purchaseCart.form.label.purchaseCartNo')}
          value={editMode ? existingInvoiceNo : invoiceId}
          required
          className='w-full text-red-600 dark:text-red-400 font-bold'
          readOnly={true}
        />
        <DateInput
          label={t('purchaseCart.form.label.date')}
          value={formData.date}
          name='date'
          onChange={handleInputChange}
          className="w-full"
          format={generalSettings.dateformat}
          error={errors.date}
          min={currentFinancialYear?.fromDate}
          max={currentFinancialYear?.toDate}
        />
        <TextInput
          label={t('purchaseCart.form.label.customerName')}
          name="CustomerName"
          value={formData.CustomerName || ''}
          onChange={handleInputChange}
          placeholder={t('purchaseCart.form.label.customerName')}
          error={errors.CustomerName}
        />
        <TextInput
          label={t('purchaseCart.form.label.customerPhone')}
          name="CustomerPhone"
          value={formData.CustomerPhone || ''}
          onChange={handleInputChange}
          placeholder={t('purchaseCart.form.label.customerPhone')}
          error={errors.CustomerPhone}
        />
        <div className='md:col-span-4'>
          <TextArea
            label={t("purchaseCart.form.label.narration")}
            name="Narration"
            value={formData.Narration || ''}
            onChange={handleInputChange}
            placeholder={t("purchaseCart.form.label.narration")}
          />

        </div>
      </div>


      {/* Sales Invoice Table */}
      <div className='mt-1.5 lg:mt-2 overflow-x-auto'>
        <SalesInvoiceTable
          formData={formData}
          setFormData={setFormData}
          editMode={editMode}
          rows={rows}
          setRows={setRows}
          otherChargeLedgers={otherChargeLedgers}
        />
      </div>




    </div>
  )
}

export default FormSectionMain