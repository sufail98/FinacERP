import { Modal, Fade, Box, useMediaQuery } from "@mui/material";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import axiosInstance from "@/lib/axiosConfig";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import TextInput from "@/components/elements/theme/TextInput";
import useAuth from "@/redux/hook/auth/useAuth";
import { useSelector } from "react-redux";
import { sanitize } from "@/lib/inputSanitizer";



const AddEmployeeModal = ({ open, handleClose, onSuccess }) => {
    const { currentFinancialYear } = useAuth();

    const isMobile = useMediaQuery("(max-width:600px)");
    const style = {
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: isMobile ? "95%" : "30%",
        height: "auto",
        bgcolor: "background.paper",
        border: "1px solid #d3d3d3",
        boxShadow: 24,
        borderRadius: 3,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden", // important
    };

    const { t } = useTranslation();
    const [alert, setAlert] = useState(null);
    const [errors, setErrors] = useState({});
    const [submitError, setSubmitError] = useState(null)


    const [isSubmitting, setIsSubmitting] = useState(false);
    const { selectedBranchId, userId } = useAuth();

    const [formData, setFormData] = useState({
        branchId: selectedBranchId,
        employeeCode: '',
        employeeName: '',
        phoneNo: '',
        CreatedUser: userId,
        voucherType: "Employee",
        yearId: currentFinancialYear?.yearId
    });

    const clearForm = () => {
        setFormData({
            employeeCode: '',
            employeeName: '',
            phoneNo: '',
            voucherType: "Employee",
        })
    }


    const handleInputChange = (e) => {
        const { name, value, type, checked, files } = e.target;
        let fieldValue = value;
        if(["phoneNo"].includes(name)){
            fieldValue = sanitize.numbers(value).slice(0,10)
        }
        if(["employeeName"].includes(name)){
            fieldValue = sanitize.alphaNumericSpace(value)
        }

        if (type === 'checkbox') {
            fieldValue = checked;
        } else if (type === 'file') {
            fieldValue = files[0];
        }

        setFormData(prev => ({
            ...prev,
            [name]: fieldValue
        }));

        // Clear error when user starts typing
        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }
    };
    useEffect(() => {
        if (open) {
            getEmployeeCode()

        }
    }, [open])
    const getEmployeeCode = async () => {

        try {
            const response = await axiosInstance.get(`get-generated-voucherNo?voucherType=Employee&branchId=${selectedBranchId}&yearId=${currentFinancialYear?.yearId}`);

            setFormData(prev => ({
                ...prev,
                employeeCode: response?.data?.voucherCode
            }));

        } catch (error) {
            console.error(error);
        }
    };

    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault(); // prevent page reload
        setIsSubmitting(true);

        try {
            const apiUrl = "save-employee";

            const response = await axiosInstance.post(apiUrl, formData);

            if (!response.data.error) {
                if (onSuccess) onSuccess();
                clearForm();
                // Generate new employee code after successful submission
                await getEmployeeCode();
                if (handleClose) handleClose();
            }
        } catch (error) {
            const errorMessage =
                error.response?.data?.message || "Error deleting Department";
            const finalMessage = errorMessage
                .toLowerCase()
                .includes("foreign key violation")
                ? t("foreeignKeyError")
                : errorMessage;

            setAlert({
                id: Date.now(),
                type: "error",
                message: finalMessage,
            });
            setSubmitError(error.response?.data?.message)
        } finally {
            setIsSubmitting(false);
        }
    };



    return (
        <Modal
            open={open}
            onClose={handleClose}
            closeAfterTransition
            slotProps={{ backdrop: { timeout: 300 } }}
            style={{ zIndex: "99999999999999999" }}
        >
            <Fade in={open}>
                <Box sx={style}>
                    <Card className="border-none shadow-none h-full">
                        <CardContent className="p-2 flex flex-col h-full">
                            {/* Header */}
                            <div className="mb-2 border-b text-center font-bold text-lg">
                                Add Employee
                            </div>

                            {/* Scrollable body */}
                            <form id="employee-form" onSubmit={handleSubmit}>
                                <TextInput
                                    name="employeeCode"
                                    label={t("employee.employeeForm.labels.employeeCode")}
                                    value={formData.employeeCode}
                                    onChange={handleInputChange}
                                    placeholder={t("employee.employeeForm.placeholders.employeeCode")}
                                    required
                                    error={errors.employeeCode}
                                    readOnly
                                />
                                <TextInput
                                    name="employeeName"
                                    label={t("employee.employeeForm.labels.employeeName")}
                                    value={formData.employeeName}
                                    onChange={handleInputChange}
                                    placeholder={t("employee.employeeForm.placeholders.employeeName")}
                                    required
                                    error={errors.employeeName}
                                />
                                <TextInput
                                    name="phoneNo"
                                    label={t("employee.employeeForm.labels.phoneNo")}
                                    value={formData.phoneNo}
                                    onChange={handleInputChange}
                                    placeholder={t("employee.employeeForm.placeholders.phoneNo")}
                                    error={errors.phoneNo}
                                />
                                {submitError && (<div className="text-red-600 text-sm">{submitError}</div>)}
                            </form>


                            {/* Footer */}
                            <div className="flex pt-3 justify-end gap-3 pr-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleClose}
                                // disabled={loading}
                                >
                                    {t("cancelBtn")}
                                </Button>
                                <Button
                                    type="submit"
                                    className="main-bg"
                                    form="employee-form"
                                    // onClick={handleSubmit}
                                    disabled={isSubmitting}
                                >
                                    {t("submitBtn")}
                                </Button>

                            </div>
                        </CardContent>
                    </Card>
                </Box>
            </Fade>
        </Modal >
    );
};

export default AddEmployeeModal;
