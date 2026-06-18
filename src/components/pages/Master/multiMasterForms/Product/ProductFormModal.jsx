import React, { useState } from 'react';
import { Modal, Box, IconButton } from '@mui/material';
import { X } from 'lucide-react';
import ProductForm from './ProductForm';

const ProductFormModal = ({ modalMode, open, onClose, productCode = null, viewMode = false, onSuccess }) => {
  const modalStyle = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '90vw',
    maxWidth: '1400px',
    height: '85vh',
    bgcolor: 'background.paper',
    boxShadow: 24,
    borderRadius: 2,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    zIndex: '70',
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      aria-labelledby="product-form-modal"
      aria-describedby="modal-to-display-product-form"
      closeAfterTransition
      slotProps={{
        backdrop: {
          sx: {
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
          },
        },
      }}
    >
      <Box sx={modalStyle}>
        {/* Close Button */}
        <Box
          sx={{
            position: 'absolute',
            top: 16,
            right: 16,
            zIndex: 10,
          }}
        >
          {/* <IconButton
            onClick={onClose}
            sx={{
              bgcolor: 'background.paper',
              boxShadow: 2,
              '&:hover': {
                bgcolor: 'grey.100',
              },
            }}
          >
            <X size={20} />
          </IconButton> */}
        </Box>

        {/* Modal Content */}
        <Box
          sx={{
            flex: 1,
            overflow: 'auto',
            '&::-webkit-scrollbar': {
              width: '8px',
            },
            '&::-webkit-scrollbar-track': {
              backgroundColor: 'grey.200',
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: 'grey.400',
              borderRadius: '4px',
              '&:hover': {
                backgroundColor: 'grey.500',
              },
            },
          }}
        >
          <ProductForm 
            viewMode={viewMode} 
            productCode={productCode} 
            modalMode={modalMode}
            modalCloase={onClose}
            onSuccess={onSuccess} // Pass onSuccess to ProductForm
          />
        </Box>
      </Box>
    </Modal>
  );
};

export default ProductFormModal;
