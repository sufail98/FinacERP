import TextArea from '@/components/elements/theme/TextArea';
import { Button } from '@/components/ui/button';
import { Box, Fade, Modal, useMediaQuery } from '@mui/material';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

const EditProuctDetailsModal = ({ open, handleClose, onSuccess, productCode, initialDescription }) => {
    const [narration, setNarration] = useState('');
    const { t } = useTranslation();
    const isMobile = useMediaQuery('(max-width:600px)');
        const textareaRef = useRef(null);

    useEffect(() => {
        if (open) {
            setNarration(initialDescription || '');
            setTimeout(() => {
                textareaRef.current?.focus();
            }, 100);  // small delay lets the Fade animation settle before focusing
        }
    }, [open, productCode, initialDescription]);

    const style = {
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: isMobile ? '95%' : '30%',
        bgcolor: 'background.paper',
        border: '1px solid #d3d3d3',
        boxShadow: 24,
        borderRadius: 3,
        display: 'flex',
        flexDirection: 'column',
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (onSuccess) {
            onSuccess(narration); // ✅ Send only the description
        }
        handleClose();
    };

    return (
      <Modal open={open} onClose={handleClose} closeAfterTransition>
            <Fade in={open}>
                <Box sx={style}>
                    <div className="p-2">
                        <h2 className="text-center font-bold text-2xl m-3">
                            Edit Product Description
                        </h2>
                        <form onSubmit={handleSubmit}>
                            <TextArea
                                ref={textareaRef}   // ← attach ref
                                name="narration"
                                label="Description"
                                value={narration}
                                onChange={(e) => setNarration(e.target.value)}
                                className="w-full"
                                placeholder="Enter Description"
                            />
                            <div className="flex pt-3 justify-end gap-3 pr-4">
                                <Button type="button" variant="outline" onClick={handleClose}>
                                    {t('cancelBtn')}
                                </Button>
                                <Button type="submit" className="main-bg">
                                    {t('submitBtn')}
                                </Button>
                            </div>
                        </form>
                    </div>
                </Box>
            </Fade>
        </Modal>
    );
};

export default EditProuctDetailsModal;