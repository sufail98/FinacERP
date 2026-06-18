import TextArea from '@/components/elements/theme/TextArea';
import TextInput from '@/components/elements/theme/TextInput';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Box, Fade, Modal, useMediaQuery } from '@mui/material';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import DateInput from '@/components/elements/theme/DateInput';

const EditProductDetailsModal = ({
    open,
    handleClose,
    onSuccess,
    rowData
}) => {
    const { t } = useTranslation();
    const isMobile = useMediaQuery('(max-width:600px)');
    const { generalSettings } = useSelector((state) => state.settings);

    const [formData, setFormData] = useState({
        chequeNo: '',
        chequeDate: null,
        narration: '',
    });

    useEffect(() => {
        if (open && rowData) {
            setFormData({
                chequeNo: rowData.chequeNo || '',
                chequeDate: rowData.chequeDate || null,
                narration: rowData.narration || '',
            });
        }
    }, [open, rowData]);

    const style = {
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: isMobile ? '95%' : '400px',
        bgcolor: 'background.paper',
        border: '1px solid #d3d3d3',
        boxShadow: 24,
        borderRadius: 3,
        display: 'flex',
        flexDirection: 'column',
    };

    const handleInputChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (onSuccess) {
            onSuccess({
                chequeNo: formData.chequeNo,
                chequeDate: formData.chequeDate,
                narration: formData.narration,
            });
        }
        handleClose();
    };

    const handleCancel = () => {
        setFormData({
            chequeNo: '',
            chequeDate: null,
            narration: '',
        });
        handleClose();
    };

    return (
        <Modal
            open={open}
            onClose={handleCancel}
            closeAfterTransition
            style={{ zIndex: '99999999999999999' }}
        >
            <Fade in={open}>
                <Box sx={style}>
                    <div className="p-4">
                        <h2 className="text-center font-bold text-xl mb-4 border-b pb-2">
                            {t('payableVoucher.form.gridSection.editModal.title') || 'Edit Ledger Details'}
                        </h2>

                        <form onSubmit={handleSubmit} className="space-y-3">
                            {/* Ledger Name - Read Only */}
                            {rowData?.ledgerName && (
                                <div>
                                    <Label className="text-xs font-medium text-gray-700">
                                        {t('payableVoucher.form.gridSection.editModal.ledgerName') || 'Ledger Name'}
                                    </Label>
                                    <div className="mt-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-sm font-medium text-gray-700">
                                        {rowData.ledgerName}
                                    </div>
                                </div>
                            )}

                            {/* Cheque Number */}
                            <TextInput
                                name="chequeNo"
                                label={t('payableVoucher.form.gridSection.editModal.chequeNo') || 'Cheque Number'}
                                value={formData.chequeNo}
                                onChange={(e) => handleInputChange('chequeNo', e.target.value)}
                                placeholder={t('payableVoucher.form.gridSection.editModal.chequeNoPlaceholder') || 'Enter Cheque Number'}
                            />

                            {/* Cheque Date */}
                            <div>
                             
                                <DateInput
                                    label= {t('payableVoucher.form.gridSection.editModal.chequeDate')}
                                    format={generalSettings.dateformat}
                                    value={formData.chequeDate}
                                    onChange={(value) => handleInputChange('chequeDate', value)}
                                    className="w-full"
                                />
                            </div>

                            {/* Narration */}
                            <TextArea
                                name="narration"
                                label={t('payableVoucher.form.gridSection.editModal.narration') || 'Narration'}
                                value={formData.narration}
                                onChange={(e) => handleInputChange('narration', e.target.value)}
                                placeholder={t('payableVoucher.form.gridSection.editModal.narrationPlaceholder') || 'Enter Narration'}
                                rows={3}
                            />

                            {/* Action Buttons */}
                            <div className="flex justify-end gap-3 pt-3 border-t">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleCancel}
                                >
                                    {t('cancelBtn') || 'Cancel'}
                                </Button>
                                <Button
                                    type="submit"
                                    className="main-bg"
                                >
                                    {t('submitBtn') || 'Submit'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </Box>
            </Fade>
        </Modal>
    );
};

export default EditProductDetailsModal;