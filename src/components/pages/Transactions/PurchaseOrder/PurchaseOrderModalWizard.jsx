import { Modal, Fade, Box, useMediaQuery, Backdrop } from "@mui/material";
import { Card, CardContent } from "@/components/ui/card";

const PurchaseOrderModalWizard = ({ open, handleClose, title, children, width = "300px" }) => {
  const isMobile = useMediaQuery("(max-width:600px)");

  // ✅ Removed bgcolor and border - will use classes instead
  const style = {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: isMobile ? "90%" : width,
    boxShadow: 24,
    borderRadius: 4,
    p: 2,
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      closeAfterTransition
      slots={{ backdrop: Backdrop }}
      slotProps={{ backdrop: { timeout: 300 } }}
      style={{ zIndex: "99999999999999999" }}
    >
      <Fade in={open}>
        {/* ✅ Added dark mode classes */}
        <Box 
          sx={style}
          className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600"
        >
          {/* ✅ Added dark mode classes */}
          <Card className="border-none shadow-none bg-transparent dark:bg-transparent">
            <CardContent className="p-0 space-y-2 bg-transparent dark:bg-transparent">
              {/* ✅ Added dark mode text color */}
              {title && (
                <h2 className="font-bold text-lg mb-4 text-center text-gray-800 dark:text-gray-100">
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

export default PurchaseOrderModalWizard;