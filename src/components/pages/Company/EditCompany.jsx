import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Building2, Phone, MapPin, Image, SquarePen } from 'lucide-react';
import BreadCrumb from '@/components/common/BreadCrumb';
import axiosInstance from '@/lib/axiosConfig';
import Preloader from '@/components/common/Preloader';
import AlertBox from '@/components/common/AlertBox';
import SaveText from '@/components/common/SaveText';
import ErrorPage from '@/components/common/ErrorPage';
import { useTranslation } from 'react-i18next';
import { MdGTranslate } from 'react-icons/md';
import useCtrlSave from '@/lib/hooks/useCtrlSave';
import { Button } from '@/components/ui/button';
 
const EditCompany = () => {
  const [fetchLoading, setFetchLoading] = useState(false);
  const [alert, setAlert] = useState(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [showFileInput, setShowFileInput] = useState(false);

  const { t } = useTranslation();

  const [formData, setFormData] = useState({
    companyId: '',
    companyName: '',
    companyNameFL: '',
    companyAddress: '',
    phoneNo: '',
    AlternativePhoneNo: '',
    companyLogo: null
  });

  const [logoPreview, setLogoPreview] = useState(null);

  // Validation state for required fields
  const [fieldErrors, setFieldErrors] = useState({});

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear field error when user starts typing
    if (fieldErrors[name]) {
      setFieldErrors(prev => ({
        ...prev,
        [name]: false
      }));
    }
  };

  useEffect(() => {
    fetchCompanyDetails()
  }, []);

  const fetchCompanyDetails = async () => {
    setFetchLoading(true);
    setFetchError(false);
    try {
      const response = await axiosInstance.get('company');
      const companyData = response?.data?.data[0];
      
      setFormData({
        companyId: companyData?.id || companyData?.companyId,
        companyName: companyData?.companyName || '',
        companyAddress: companyData?.companyAddress || '',
        phoneNo: companyData?.phoneNo || '',
        AlternativePhoneNo: companyData?.AlternativePhoneNo || '',
        companyNameFL: companyData?.companyNameFL || '',
        companyLogo: companyData?.companyLogo || null,
      });

      if (companyData?.companyLogo) {
        setLogoPreview(companyData.companyLogo);
      }

    } catch (error) {
      setErrorMessage(`${error.response.data.message}, Line : ${error.response.data.line}, File : ${error.response.data.file}`);
      setFetchError(true);
    } finally {
      setFetchLoading(false);
    }
  }

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const maxSize = 200 * 1024;

      if (file.size > maxSize) {
        setAlert({ id: Date.now(), type: "error", message: t("fileSizeError") });
        e.target.value = '';
        return;
      }

      setFormData(prev => ({
        ...prev,
        companyLogo: file
      }));

      const reader = new FileReader();
      reader.onload = (e) => setLogoPreview(e.target.result);
      reader.readAsDataURL(file);

      // Clear logo error when file is selected
      if (fieldErrors.companyLogo) {
        setFieldErrors(prev => ({
          ...prev,
          companyLogo: false
        }));
      }
    }
  };

  // Validate required fields
  const validateRequiredFields = () => {
    const errors = {};
    const requiredFields = {
      companyName: t("companyName"),
      companyNameFL: t("companyNameFL"),
      companyAddress: t("address"),
      phoneNo: t("contactNumber"),
      companyLogo: t("companyLogo")
    };

    Object.keys(requiredFields).forEach(field => {
      if (field === 'companyLogo') {
        // Check if logo exists (either from server or newly uploaded)
        if (!formData.companyLogo && !logoPreview) {
          errors[field] = true;
        }
      } else {
        // Check if field is empty or just whitespace
        if (!formData[field] || formData[field].toString().trim() === '') {
          errors[field] = true;
        }
      }
    });

    return errors;
  };
  // Allow only digits in phone number fields
  const handleNumberInputChange = (e) => {
    const { name, value } = e.target;
    // Remove any non-digit characters
    const numericValue = value.replace(/\D/g, '');
    setFormData((prev) => ({
      ...prev,
      [name]: numericValue
    }));

    // Clear field error when user starts typing
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({
        ...prev,
        [name]: false
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate required fields before submission
    const validationErrors = validateRequiredFields();

    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      setAlert({ id: Date.now(), type: "error", message: t("pleaseFillRequiredFieldMsg") });
      setTimeout(() => setAlert(null), 3000);
      return;
    }

    setSubmitLoading(true);

    if (!formData.companyId) {
      setAlert({ id: Date.now(), type: "error", message: t("companyIdMissing") });
      setSubmitLoading(false);
      return;
    }

    try {
      const data = new FormData();
      data.append("companyName", formData.companyName);
      data.append("companyNameFL", formData.companyNameFL);
      data.append("companyAddress", formData.companyAddress);
      data.append("phoneNo", formData.phoneNo);
      data.append("AlternativePhoneNo", formData.AlternativePhoneNo);

      if (formData.companyLogo instanceof File) {
        data.append("companyLogo", formData.companyLogo);
      }

      await axiosInstance.post(`update-company/${formData.companyId}`, data, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      setAlert({ id: Date.now(), type: "success", message: t("companyUpdateSuccess") });
    } catch (error) {
      console.error(error);
      setAlert({ id: Date.now(), type: "error", message: t("companyUpdateFail") });
    } finally {
      setSubmitLoading(false);
    }
  };
  useCtrlSave(handleSubmit, [formData],);

  const [translating, setTranslating] = useState(false);

  const handleTranslate = async () => {
    const inputText = formData.companyName?.trim();

    if (!inputText) return;

    setTranslating(true);

    try {
      const toLang = "ar"; // Arabic
      const fromLang = "auto";
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${fromLang}&tl=${toLang}&dt=t&q=${encodeURIComponent(
        inputText
      )}`;

      const response = await fetch(url);
      const data = await response.json();

      // Extract translation
      const translatedText = data?.[0]?.[0]?.[0] || "";

      setFormData((prev) => ({
        ...prev,
        companyNameFL: translatedText,
      }));
    } catch (error) {
      console.error("Translation error:", error);
    } finally {
      setTranslating(false);
    }
  };
  if (fetchLoading) return <div>
    <BreadCrumb
      routes={[
        { title: t("breadcrumbUpdateCompany"), url: "#" },
      ]}
      heading={{
        icon: Building2,
        title: t("editCompanyHeading"),
      }}
      actions={[
        {
          label: t("submitBtn"),
          icon: SquarePen,
          type: "primary",
          onClick: handleSubmit,
          loading: submitLoading,
          loadingText: t("loadingText"),
        },
      ]}
    />

    <Preloader />
  </div>;
  if (fetchError) return <ErrorPage errorMessage={errorMessage} />;

  return (
    <div>
      {alert && <AlertBox key={alert.id} message={alert.message} type={alert.type} />}
      <BreadCrumb
        routes={[
          { title: t("breadcrumbUpdateCompany"), url: "#" },
        ]}
        heading={{
          icon: Building2,
          title: t("editCompanyHeading"),
        }}
        actions={[
          {
            label: t("submitBtn"),
            icon: SquarePen,
            type: "primary",
            onClick: handleSubmit,
            loading: submitLoading,
            loadingText: t("loadingText"),
          },
        ]}
      />

      <div className="h-auto flex items-center justify-center pt-2">
        <Card className="w-full h-full max-h-[95vh] flex flex-col border-none shadow-none p-0">
          <CardContent className="flex-1 overflow-auto">
            <div className="space-y-2">
              <div className="flex items-end gap-1">
                <div className="space-y-2 flex-1 min-w-0">
                  <Label htmlFor="companyName">
                    <Building2 className="h-4 w-4" />
                    <span>{t("companyName")}</span>
                    <span className='text-red-700'>*</span>
                  </Label>
                  <Input
                    id="companyName"
                    name="companyName"
                    type="text"
                    value={formData.companyName}
                    onChange={handleInputChange}
                    placeholder={t("companyNamePlaceholder")}
                    required
                    className={`${fieldErrors.companyName ? "border-red-500 focus:border-red-500" : ""} h-7`}
                  />
                  {fieldErrors.companyName && (
                    <p className="text-xs text-red-500">{t("companyName")} is required</p>
                  )}
                </div>
                <div className='flex-shrink-0'>
                  <button
                    type="button"
                    onClick={handleTranslate}
                    disabled={translating}
                    className={`h-7 px-3 main-bg text-gray-200 rounded-md hover:main-bg transition-colors flex items-center justify-center flex-shrink-0 ${translating ? "opacity-60 cursor-not-allowed" : ""
                      }`}
                  >
                    <MdGTranslate className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="companyNameFL">
                  <Building2 className="h-4 w-4" />
                  <span>{t("companyNameFL")}</span>
                  <span className='text-red-700'>*</span>
                </Label>
                <Input
                  id="companyNameFL"
                  name="companyNameFL"
                  type="text"
                  value={formData.companyNameFL}
                  onChange={handleInputChange}
                  placeholder={t("companyNameFLPlaceholder")}
                  required
                  className={`h-7 ${fieldErrors.companyNameFL ? "border-red-500 focus:border-red-500" : ""}`}
                />
                {fieldErrors.companyNameFL && (
                  <p className="text-xs text-red-500">{t("companyNameFL")} is required</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phoneNo">
                    <Phone className="h-4 w-4" />
                    <span>{t("contactNumber")}</span>
                    <span className='text-red-700'>*</span>
                  </Label>
                  <Input
                    id="phoneNo"
                    name="phoneNo"
                    type="tel"
                    value={formData.phoneNo}
                    onChange={handleNumberInputChange}
                    placeholder={t("primaryPhonePlaceholder")}
                    required
                    className={fieldErrors.phoneNo ? "border-red-500 focus:border-red-500" : ""}
                  />

                  {fieldErrors.phoneNo && (
                    <p className="text-xs text-red-500">{t("contactNumber")} is required</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="AlternativePhoneNo">
                    <Phone className="h-4 w-4" />
                    <span>{t("altContactNumber")}</span>
                  </Label>
                  <Input
                    id="AlternativePhoneNo"
                    name="AlternativePhoneNo"
                    type="tel"
                    value={formData.AlternativePhoneNo}
                    onChange={handleNumberInputChange}
                    placeholder={t("altPhonePlaceholder")}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="companyAddress">
                  <MapPin className="h-4 w-4" />
                  <span>{t("address")}</span>
                  <span className='text-red-700'>*</span>
                </Label>
                <Textarea
                  id="companyAddress"
                  name="companyAddress"
                  value={formData.companyAddress}
                  onChange={handleInputChange}
                  placeholder={t("addressPlaceholder")}
                  required
                  className={fieldErrors.companyAddress ? "border-red-500 focus:border-red-500" : ""}
                />
                {fieldErrors.companyAddress && (
                  <p className="text-xs text-red-500">{t("address")} is required</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="companyLogo">
                  <Image className="h-4 w-4" />
                  <span>{t("companyLogo")}</span>
                  <span className='text-red-700'>*</span>
                </Label>

                <div className="flex items-center space-x-4">
                  {/* Logo Preview */}
                  {logoPreview ? (
                    <div className={`w-20 h-auto border-2 border-dashed rounded-lg overflow-hidden ${fieldErrors.companyLogo ? 'border-red-500' : 'border-gray-300'}`}>
                      <img src={logoPreview} alt="Logo preview" />
                    </div>
                  ) : (
                    <div className={`w-20 h-20 border-2 border-dashed rounded-lg flex items-center justify-center bg-gray-50 ${fieldErrors.companyLogo ? 'border-red-500' : 'border-gray-300'}`}>
                      <Image className="h-6 w-6 text-gray-400" />
                    </div>
                  )}

                  <div className="flex-1 space-y-2">
                    {/* If company has logo, show "Change Logo" button instead of file input */}
                    {logoPreview && !showFileInput ? (
                      <Button
                        type="button"
                        onClick={() => setShowFileInput(true)}
                        className="h-8 px-3 main-bg text-gray-200 rounded-md hover:main-bg transition-colors"
                      >
                        {t("changeCompanyLogo") || "Change Company Logo"}
                      </Button>
                    ) : (
                      <>
                        <Input
                          id="companyLogo"
                          name="companyLogo"
                          type="file"
                          accept="image/*"
                          onChange={handleLogoChange}
                          className={fieldErrors.companyLogo ? "border-red-500 focus:border-red-500" : ""}
                        />
                        <p className="text-xs text-gray-500 mt-1">{t("logoHelpText")}</p>

                        {/* Optional cancel button to hide the file input */}
                        {logoPreview && (
                          <button
                            type="button"
                            onClick={() => setShowFileInput(false)}
                            className="text-xs text-gray-500 underline hover:text-blue-500"
                          >
                            {t("cancelChange") || "Cancel Change"}
                          </button>
                        )}
                      </>
                    )}

                    {fieldErrors.companyLogo && (
                      <p className="text-xs text-red-500">{t("companyLogo")} is required</p>
                    )}
                  </div>
                </div>
              </div>

            </div>
          </CardContent>
        </Card>
      </div>

      <SaveText />
    </div>
  );
};

export default EditCompany;