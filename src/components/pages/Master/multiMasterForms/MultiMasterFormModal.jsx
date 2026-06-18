import { Modal, Fade, Box, useMediaQuery } from "@mui/material";
import { Card, CardContent } from "@/components/ui/card";

const MultiMasterFormModal = ({ open, handleClose, title, children, width = "600px", maxHeight }) => {
  const isMobile = useMediaQuery("(max-width:600px)");

 
  const style = {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: isMobile ? "90%" : width,
    ...(maxHeight && { maxHeight: isMobile ? "90vh" : maxHeight, overflowY: "auto" }),
    boxShadow: 24,
    borderRadius: 4,
    p: 2,
  };
  return (
    <Modal
      open={open}
      onClose={handleClose}
      closeAfterTransition
      slotProps={{ 
        backdrop: { 
          timeout: 300,
          sx: {
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            '.dark &': {
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
            }
          }
        } 
      }}
      style={{ zIndex: "99999999999999999" }}
    >
      <Fade in={open}>
        <Box 
          sx={style}
          className="bg-white dark:bg-[#1e1e1e] border border-gray-300 dark:border-gray-600 transition-colors"
        >
          <Card className="border-none shadow-none bg-transparent dark:bg-transparent">
            <CardContent className="p-0 space-y-2 bg-transparent dark:bg-transparent">
              {title && (
                <h2 className="font-bold text-lg mb-4 text-center text-gray-900 dark:text-gray-100 transition-colors">
                  {title}
                </h2>
              )}
              {children}
            </CardContent>
          </Card>
        </Box>
      </Fade>
    </Modal>
  );
};

export default MultiMasterFormModal;