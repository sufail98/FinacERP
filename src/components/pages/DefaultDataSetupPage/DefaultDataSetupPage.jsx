import axiosInstance from '@/lib/axiosConfig';
import { Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField } from '@mui/material'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next';
import BranchSelectModal from './BranchSelectModal';
import AlertBox from '@/components/common/AlertBox';

const DefaultDataSetupPage = () => {
    const { t } = useTranslation();
    const [alert, setAlert] = useState(null);
    const [loading, setLoading] = useState(false);
    const [branchloading, setBranchLoading] = useState(false);
    const [openBranchModal, setOpenBranchModal] = useState(false);

    // 🔹 NEW STATE for main DB modal
    const [openMainModal, setOpenMainModal] = useState(false);
    const [dbName, setDbName] = useState('');

    // 🔹 Opens the modal instead of calling API directly
    const handleOpenMainModal = () => {
        setDbName('');
        setOpenMainModal(true);
    };

    // 🔹 Called when user submits the modal
    const handleSetDefaultMainDBData = async () => {
        if (!dbName.trim()) return;

        setLoading(true);
        setOpenMainModal(false);

        try {
            const response = await axiosInstance.get(`save-default-branchdb-data/${dbName.trim()}`);
            if (!response.data.error) {
                setAlert({
                    id: Date.now(),
                    type: "success",
                    message: t('saveSuccess'),
                });
            }
        } catch (error) {
            setAlert({
                id: Date.now(),
                type: "error",
                message: error.response?.data?.message || t('saveError'),
            });
        } finally {
            setLoading(false);
        }
    };

    const openBranchSelector = () => {
        setOpenBranchModal(true);
    };

    const handleBranchDbData = async (branchId) => {
        setBranchLoading(true);
        setOpenBranchModal(false);

        try {
            const response = await axiosInstance.get('save-default-branchdb-data');
            if (!response.data.error) {
                setAlert({
                    id: Date.now(),
                    type: "success",
                    message: t('saveSuccess'),
                });
            }
        } catch (error) {
            setAlert({
                id: Date.now(),
                type: "error",
                message: error.response?.data?.message || t('saveError'),
            });
        } finally {
            setBranchLoading(false);
        }
    };

    return (
        <div className='w-full h-[90vh] flex justify-center items-center gap-4 flex-wrap'>

            {alert && <AlertBox key={alert.id} message={alert.message} type={alert.type} />}

            <Button
                variant="contained"
                color="primary"
                size="large"
                sx={{
                    px: 4,
                    py: 1.5,
                    textTransform: 'none',
                    fontSize: '1rem',
                    fontWeight: 600,
                    borderRadius: 2,
                    boxShadow: 2,
                    '&:hover': { boxShadow: 4 }
                }}
                onClick={handleOpenMainModal}  // 🔹 Opens modal now
                disabled={loading}
            >
                {loading ? 'Loading...' : 'Set Default Main DB Data'}
            </Button>

            {/* 🔹 MAIN DB MODAL */}
            <Dialog
                open={openMainModal}
                onClose={() => setOpenMainModal(false)}
                fullWidth
                maxWidth="sm"
            >
                <DialogTitle sx={{ fontWeight: 600 }}>Set Default Main DB Data</DialogTitle>

                <DialogContent>
                    <TextField
                        autoFocus
                        fullWidth
                        label="Enter Value"
                        variant="outlined"
                        value={dbName}
                        onChange={(e) => setDbName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSetDefaultMainDBData()}
                        sx={{ mt: 1 }}
                    />
                </DialogContent>

                <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
                    <Button
                        onClick={() => setOpenMainModal(false)}
                        variant="outlined"
                        color="inherit"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSetDefaultMainDBData}
                        variant="contained"
                        color="primary"
                        disabled={!dbName.trim()}
                    >
                        Submit
                    </Button>
                </DialogActions>
            </Dialog>

            <BranchSelectModal
                open={openBranchModal}
                onClose={() => setOpenBranchModal(false)}
                onSelect={handleBranchDbData}
            />
        </div>
    );
};

export default DefaultDataSetupPage;