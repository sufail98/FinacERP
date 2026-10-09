// src/components/pages/Transactions/RecieptVoucher/ReciptVoucherFormHeader.jsx
import AddNewBtn from '@/components/common/AddNewBtn';
import SearchableDropdown from '@/components/elements/theme/SearchableDropdown';
import TextInput from '@/components/elements/theme/TextInput';
import axiosInstance from '@/lib/axiosConfig';
import useAuth from '@/redux/hook/auth/useAuth';
import { Plus } from 'lucide-react';
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import AddEmployeeModal from '../SalesInvoice/AddEmployeeModal';
import SelecteCurrecyModal from '../SalesInvoice/SelecteCurrecyModal';
import AddBankModal from './AddBankModal';
import DateInput from '@/components/elements/theme/DateInput';
import DocumentUpload from '../../../common/DocumentUpload'
import usePrivileges from '@/lib/hooks/usePrivileges';


const ReciptVoucherFormHeader = ({ voucherNo, errors, formData, setFormData, editMode, handleFormChange, existingReciptNo, bankCash, setBankCash, employees, setEmplyees, costCenters ,documents, setDocuments, existingDocuments, setExistingDocuments,
    removedDocuments, setRemovedDocuments, currency = [], currencyConvertionData = [], financeSettings }) => {
    const [employeeModalOpen, setEmployeeModalOpen] = useState(false);
    const [bankModalOpen, setBankModalOpen] = useState(false);
    const [currencyModalOpen, setCurrencyModalOpen] = useState(false);
    const [loadingBankCash, setLoadingBankCash] = useState(false);
    const [loadingEmployees, setLoadingEmployees] = useState(false);
    const [loadingCostCenters, setLoadingCostCenters] = useState(false);
    const { generalSettings, financeSettings: financeSettingsFromStore } = useSelector((state) => state.settings);
    const effectiveFinanceSettings = financeSettings ?? financeSettingsFromStore;
    const { t } = useTranslation();
    const { selectedBranchId, currentCurrency, currentCurrencyConversion,currentFinancialYear } = useAuth();
    const [ledgerBalance, setLedgerBalance] = useState(null);
    const { organizationData } = useSelector((state) => state.organization);
    const isBsicPlan = Number(organizationData?.subscriptionPlan === 'Basic');
    const { hasAccess: hasEmployeeAccess, } =usePrivileges(isBsicPlan ? "Sales Man" : "Employee");


    const fetchLedgerBalance = async (ledgerId) => {
        if (!ledgerId) {
            setLedgerBalance(null);
            return;
        }
        try {
            const res = await axiosInstance.get(
                `get-ledger-balance?ledgerId=${ledgerId}&branchId=${selectedBranchId}&currencyId=${currentCurrency?.currencyId}`
            );
            setLedgerBalance(res.data?.data?.currentbal ?? 0);
        } catch (error) {
            console.error("Error fetching ledger balance:", error);
            setLedgerBalance(null);
        }
    };

    useEffect(() => {
        fetchLedgerBalance(formData.ledgerId);
    }, [formData.ledgerId]);


    const fetchBrankCash = async () => {
        setLoadingBankCash(true);
        try {
            const res = await axiosInstance.post("bank-account-ledgers", { group_ids: [5, 8], branchId: selectedBranchId });
            setBankCash(res.data.data);
        } catch (err) {
            console.error("Error fetching Account Ledgers:", err);
        } finally {
            setLoadingBankCash(false);
        }
    };

    const fetchEmbloyees = async () => {
        setLoadingEmployees(true);
        try {
            const response = await axiosInstance.get('employees');
            setEmplyees(response.data.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoadingEmployees(false);
        }
    };



    return (
        <div>
            {/* Responsive grid: 1 col on mobile, 2 on small tablets, 4 on large screens */}
            <div className='grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'>
                <div>
                    <TextInput
                        label={t('recieptVoucher.form.label.RecieptNo')}
                        value={editMode ? existingReciptNo : voucherNo}
                        required
                        className='w-full text-red-600 font-bold'
                    />
                    <div className='w-full'>
                        <DateInput
                            label={t('recieptVoucher.form.label.date')}
                            name='date'
                            required
                            value={formData.date}
                            onChange={(value) => handleFormChange('date', value)}
                            className="w-full"
                            format={generalSettings.dateformat}
                            error={errors.date}
                            min={currentFinancialYear?.fromDate}
                            max={currentFinancialYear?.toDate}
                        />
                    </div>
                    <div className='flex gap-1 sm:gap-0.5 lg:gap-1 items-end'>
                        <div className='flex-1 min-w-0'>
                            <SearchableDropdown
                                name="ledgerId"
                                label={t('recieptVoucher.form.label.bankOrCash')}
                                options={bankCash?.map((data) => ({
                                    value: data.ledgerId,
                                    label: data.ledgerName,
                                }))}
                                value={formData.ledgerId}
                                onChange={(value) => handleFormChange('ledgerId', value)}
                                placeholder={t('recieptVoucher.form.placeholders.bankOrCash')}
                                searchPlaceholder={t('recieptVoucher.form.placeholders.bankOrCash')}
                                clearable={true}
                                className='w-full mb-0.5'
                                required
                                error={errors.ledgerId}
                                loading={loadingBankCash}
                            />
                            {financeSettings?.showLedgerbalance && formData.ledgerId && ledgerBalance !== null && (
                                <div className="flex flex-wrap text-[10px] sm:text-xs lg:text-sm text-secondary dark:text-secondary mt-1">
                                    {t('contraVoucher.form.label.ledgerBalance') || 'Balance'}:{" "}
                                    <span className="font-semibold text-primary dark:text-primary ml-1">
                                        {Number(ledgerBalance).toFixed(generalSettings?.decimalPart ?? 2)}
                                    </span>
                                </div>
                            )}

                        </div>
                        <div className='mb-0.5 flex-shrink-0'>
                            <AddNewBtn
                                icon={Plus}
                                onClick={() => setBankModalOpen(true)}
                            />
                        </div>
                    </div>
                </div>

                <div>
                  {hasEmployeeAccess&&(
                      <div className='flex gap-1 sm:gap-0.5 lg:gap-1 items-end'>
                        <div className='flex-1 min-w-0'>
                            <SearchableDropdown
                                name="employeeId"
                                label={t('recieptVoucher.form.label.employeeId')}
                                options={employees?.map((data) => ({
                                    value: data.employeeId,
                                    label: data.employeeName,
                                }))}
                                value={formData.employeeId}
                                onChange={(value) => handleFormChange('employeeId', value)}
                                placeholder={t('recieptVoucher.form.placeholders.employeeId')}
                                searchPlaceholder={t('recieptVoucher.form.placeholders.employeeId')}
                                clearable={true}
                                className='w-full mb-0.5'
                                loading={loadingEmployees}
                            />
                        </div>
                        <div className='mb-0.5 flex-shrink-0'>
                            <AddNewBtn
                                icon={Plus}
                                onClick={() => setEmployeeModalOpen(true)}
                            />
                        </div>
                    </div>
                  )}

                    {generalSettings?.costCentre && (
                        <SearchableDropdown
                            name="costCentreId"
                            label={t('Cost Centre')}
                            options={costCenters?.map((data) => ({
                                value: data.costCentreId,
                                label: data.CostCentre,
                            }))}
                            value={formData.costCentreId}
                            onChange={(value) => handleFormChange('costCentreId', value)}
                            placeholder={t('Select Cost Centre')}
                            searchPlaceholder={t('Search Cost Centre')}
                            clearable={true}
                            className='w-full'
                            loading={loadingCostCenters}
                        />
                    )}

                    <TextInput
                        name='ReferenceNo'
                        label={t('recieptVoucher.form.label.ReferenceNo')}
                        value={formData.ReferenceNo}
                        onChange={(e) => handleFormChange('ReferenceNo', e)}
                        placeholder={t('recieptVoucher.form.placeholders.ReferenceNo')}
                        className='w-full'
                    />
                </div>

                <div className='sm:col-span-2 lg:col-span-2'>
                    <div className='w-full'>
                        <DateInput
                            label={t('recieptVoucher.form.label.ReferenceDate')}
                            name='ReferenceDate'
                            value={formData.ReferenceDate}
                            onChange={(value) => handleFormChange('ReferenceDate', value)}
                            className="w-full"
                            format={generalSettings.dateformat}
                        />
                    </div>
                    <div className='w-full mt-1'>
                        <DocumentUpload
                            documents={documents}
                            setDocuments={setDocuments}
                            existingDocuments={existingDocuments}
                            setExistingDocuments={setExistingDocuments}
                            removedDocuments={removedDocuments}
                            setRemovedDocuments={setRemovedDocuments}
                        />
                    </div>
                </div>
            </div>

            {/* Currency Link */}
            {effectiveFinanceSettings?.multiCurrency && (
                <div className='flex flex-wrap gap-2 text-xs mt-2'>
                    <p
                        className='text-blue-600 border-b border-blue-600 w-fit cursor-pointer hover:text-blue-700'
                        onClick={() => setCurrencyModalOpen(true)}
                    >
                        Currency: {formData?.currencyName || currentCurrency?.currencyName || 'Select Currency'}
                    </p>
                </div>
            )}

            <AddEmployeeModal
                open={employeeModalOpen}
                handleClose={() => setEmployeeModalOpen(false)}
                onSuccess={fetchEmbloyees}
            />
            <AddBankModal
                open={bankModalOpen}
                handleClose={() => setBankModalOpen(false)}
                onSuccess={fetchBrankCash}
            />
            {effectiveFinanceSettings?.multiCurrency && (
                <SelecteCurrecyModal
                    open={currencyModalOpen}
                    handleClose={() => setCurrencyModalOpen(false)}
                    formData={formData}
                    currency={currency}
                    handleChange={(field, value) => handleFormChange(field, value)}
                    currencyConvertionData={currencyConvertionData}
                />
            )}
        </div>
    )
}

export default ReciptVoucherFormHeader;