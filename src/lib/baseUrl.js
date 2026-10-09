
// Default API URL
export const DEFAULT_API_BASE_URL = 'https://test.finacerp.com/Api/public/api/';

// Customer-wise domain mapping
export const customerWiseDomainList = [
    {
        customerName: "hashmi",
        code: 'HM123456',
        domain: "https://hashmi.finacerp.com/Api/public/api/"
    },
    {
        customerName: "demo",
        code: 'DM123456',
        domain: "https://demo.finacerp.com/Api/public/api/"
    },
    {
        customerName: "test",
        code: 'TS123456',
        domain: "https://test.finacerp.com/Api/public/api/"
    },
    {
        customerName: "east-cost",
        code: 'EC123456',
        domain: "https://east-coast.finacerp.com/Api/public/api/"
    },
    {
        customerName: "saham-masar",
        code: 'SM123456',
        domain: "https://sahammasar.finacerp.com/Api/public/api/"
    },
    {
        customerName: "arr",
        code: 'AR123456',
        domain: "https://arr.finacerp.com/Api/public/api/"
    },
    {
        customerName: "maasker",
        code: 'MS123456',
        domain: "https://maasker.finacerp.com/Api/public/api/"
    },
    {
        customerName: "arab-designs",
        code: 'AD123456',
        domain: "https://arabdesign.finacerp.com/Api/public/api/"
    },
    {
        customerName: "latest-update-check",
        code: 'LU123456',
        domain: "https://update-check.finacerp.com/Api/public/api/"
    },
    {
        customerName: "tester",
        code: 'TST12345',
        domain: "https://tester.finacerp.com/Api/public/api/"
    },
    {
        customerName: "fursan-al-sharkiya",
        code: 'FS123456',
        domain: "https://fst.finacerp.com/Api/public/api/"
    },
    {
        customerName: "ktc",
        code: 'KT123456',
        domain: "https://ktc.finacerp.com/Api/public/api/"
    },
    {
        customerName: "logismart",
        code: 'LS123456',
        domain: "https://logismart.finacerp.com/Api/public/api/"
    },
    {
        customerName: "kmis",
        code: 'KS123456',
        domain: "https://kmis.finacerp.com/Api/public/api/"
    },
];

/**
 * Get API base URL by customer code (slno)
 * @param {string} slno - Customer serial number/code
 * @returns {string} - API base URL for the customer
 */
export const getApiBaseUrlBySlno = (slno) => {
    if (!slno) return DEFAULT_API_BASE_URL;
    
    const customer = customerWiseDomainList.find(
        (c) => c.code.toLowerCase() === slno.toLowerCase()
    );
    
    return customer ? customer.domain : DEFAULT_API_BASE_URL;
};

/**
 * Get current API base URL from localStorage or default
 * @returns {string} - Current API base URL
 */
export const getCurrentApiBaseUrl = () => {
    const savedSlno = localStorage.getItem('customerSlno');
    return getApiBaseUrlBySlno(savedSlno);
};

// Export for backward compatibility
export const API_BASE_URL = getCurrentApiBaseUrl();


export const getDomainBySlno = (slno) => {
    const defaultDomain = 'https://test.finacerp.com';
    
    if (!slno) return defaultDomain;
    
    const customer = customerWiseDomainList.find(
        (c) => c.code.toLowerCase() === slno.toLowerCase()
    );
    
    if (!customer) return defaultDomain;
    
    // Remove '/Api/public/api/' from the domain
    return customer.domain.replace('/Api/public/api/', '');
};

/**
 * Get current domain from localStorage or default
 * @returns {string} - Current base domain URL
 */
export const getCurrentDomain = () => {
    const savedSlno = localStorage.getItem('customerSlno');
    return getDomainBySlno(savedSlno);
};

export const CURRENT_DOMAIN = getCurrentDomain();

export const getCustomerCodeFromQuery = () => {
    // For hash-based routing (#/invoicepdf/123?c=TS)
    const hash = window.location.hash;
    const queryString = hash.split('?')[1];
    
    if (!queryString) return null;
    
    const params = new URLSearchParams(queryString);
    return params.get('c');
};

// Usage