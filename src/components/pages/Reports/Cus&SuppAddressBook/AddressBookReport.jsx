// src/components/pages/Reports/AddressBook/AddressBookReport.jsx
import BreadCrumb from '@/components/common/BreadCrumb';
import NoAcessComponent from '@/components/common/NoAcessComponent';
import Preloader from '@/components/common/Preloader';
import axiosInstance from '@/lib/axiosConfig';
import usePrivileges from '@/lib/hooks/usePrivileges';
import useAuth from '@/redux/hook/auth/useAuth';
import { BookOpen } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import AddressBookFilters from './AddressBookFilters';
import useReportExport from '@/hooks/useReportExport';
import { useSelector } from 'react-redux';

const AddressBookReport = ({ type }) => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const { generalSettings } = useSelector((state) => state.settings);

    const [reportData, setReportData] = useState(null);
    const { selectedBranchId } = useAuth();
    const { privileges, loading: privilegeLoading, hasAccess, message } = usePrivileges(
        type === 'customer' ? "Customer Address Book" : "Supplier Address Book"
    );

    const {
        exportGenericToExcel,
        exportGenericToPdf,
        exportGenericToCsv
    } = useReportExport();

    const [filters, setFilters] = useState({
        name: '',
        address: '',
        phoneno: '',
        email: ''
    });

    // Column definitions - added 'source' column
    const allColumns = [
        { key: 'source', label: t("cusSuppAddressBook.columns.source") || 'Source', defaultVisible: true, minWidth: '90px' },
        // { key: 'ledgerCode', label: t("cusSuppAddressBook.columns.ledgerCode"), defaultVisible: false, minWidth: '80px' },
        { key: 'ledgerName', label: t("cusSuppAddressBook.columns.ledgerName"), defaultVisible: true, minWidth: '150px' },
        { key: 'nameArb', label: t("cusSuppAddressBook.columns.nameArb"), defaultVisible: false, minWidth: '130px' },
        { key: 'ledgerType', label: t("cusSuppAddressBook.columns.ledgerType"), defaultVisible: false, minWidth: '80px' },
        { key: 'phoneNo', label: t("cusSuppAddressBook.columns.phoneNo"), defaultVisible: true, minWidth: '110px' },
        { key: 'faxNo', label: t("cusSuppAddressBook.columns.faxNo"), defaultVisible: false, minWidth: '100px' },
        { key: 'email', label: t("cusSuppAddressBook.columns.email"), defaultVisible: true, minWidth: '160px' },
        { key: 'address', label: t("cusSuppAddressBook.columns.address"), defaultVisible: false, minWidth: '180px', wrap: true },
        { key: 'AddressArabic', label: t("cusSuppAddressBook.columns.AddressArabic"), defaultVisible: false, minWidth: '150px', wrap: true },
        { key: 'BuildingNo', label: t("cusSuppAddressBook.columns.BuildingNo"), defaultVisible: false, minWidth: '70px' },
        { key: 'StreetName', label: t("cusSuppAddressBook.columns.StreetName"), defaultVisible: false, minWidth: '120px' },
        { key: 'District', label: t("cusSuppAddressBook.columns.District"), defaultVisible: false, minWidth: '100px' },
        { key: 'CityName', label: t("cusSuppAddressBook.columns.CityName"), defaultVisible: false, minWidth: '100px' },
        { key: 'Country', label: t("cusSuppAddressBook.columns.Country"), defaultVisible: false, minWidth: '90px' },
        { key: 'PostboxNo', label: t("cusSuppAddressBook.columns.PostboxNo"), defaultVisible: false, minWidth: '80px' },
        { key: 'AdditionalNo', label: t("cusSuppAddressBook.columns.AdditionalNo"), defaultVisible: false, minWidth: '90px' },
        { key: 'creditLimit', label: t("cusSuppAddressBook.columns.creditLimit"), defaultVisible: false, minWidth: '100px' },
        { key: 'creditPeriod', label: t("cusSuppAddressBook.columns.creditPeriod"), defaultVisible: false, minWidth: '90px' },
        { key: 'creditLimitStatus', label: t("cusSuppAddressBook.columns.creditLimitStatus"), defaultVisible: false, minWidth: '80px' },
        { key: 'openingBalance', label: t("cusSuppAddressBook.columns.openingBalance"), defaultVisible: false, minWidth: '100px' },
        { key: 'crOrDr', label: t("cusSuppAddressBook.columns.crOrDr"), defaultVisible: false, minWidth: '60px' },
        { key: 'pricingLevelId', label: t("cusSuppAddressBook.columns.pricingLevelId"), defaultVisible: false, minWidth: '80px' },
        { key: 'currencyId', label: t("cusSuppAddressBook.columns.currencyId"), defaultVisible: false, minWidth: '70px' },
        // Employee-specific columns
        { key: 'employeeCode', label: 'Emp Code', defaultVisible: false, minWidth: '90px' },
        { key: 'employeeName', label: 'Employee Name', defaultVisible: false, minWidth: '150px' },
        { key: 'voucherNo', label: 'Voucher No', defaultVisible: false, minWidth: '90px' },
    ];

    const [visibleColumns, setVisibleColumns] = useState(() => {
        const initial = {};
        allColumns.forEach(col => {
            initial[col.key] = col.defaultVisible;
        });
        return initial;
    });

    const toggleColumn = (columnKey) => {
        setVisibleColumns(prev => ({
            ...prev,
            [columnKey]: !prev[columnKey]
        }));
    };

   const fetchReport = async (overrideFilters) => {
        setLoading(true);
        const groupId = type === 'customer' ? "44" : "43";
        const f = overrideFilters || filters;

        const requestPayload = {
            branchId: String(selectedBranchId),
            groupId: groupId,
            name: f.name || "",
            address: f.address || "",
            phoneno: f.phoneno || "",
            email: f.email || ""
        };

        try {
            const res = await axiosInstance.post("address-book-report", requestPayload);
            const rawData = res.data?.data || [];

            const flattenedData = rawData.map((item) => {
                const d = item?.data || {};
                const source = item?.source;

                if (source === 'Ledger') {
                    const branchArray = Array.isArray(d.branchId) ? d.branchId : [];
                    const branchEntry = branchArray.find(
                        (b) => b.branchId === Number(selectedBranchId)
                    );

                    return {
                        source,
                        ...d,
                        openingBalance: branchEntry?.openingBalance?.toFixed(generalSettings.decimalPart) ?? '',
                        crOrDr: branchEntry?.crOrDr ?? d?.crOrDr ?? '',
                    };
                }

                return {
                    source,
                    ...d,
                    ledgerName: d.employeeName,
                    ledgerCode: d.employeeCode,
                    phoneNo: d.phoneNo,
                };
            });

            setReportData(flattenedData);
        } catch (error) {
            console.error("❌ API Error:", error);
            setReportData(null);
        } finally {
            setLoading(false);
        }
    };

    /* ------------------------------ Debounced auto-fetch on filter change ------------------------------ */
    const debounceRef = useRef(null);
    const isFirstRun = useRef(true);

     useEffect(() => {
        setReportData(null);
        setFilters({ name: '', address: '', phoneno: '', email: '' });
        setSearchTerm('');
        isFirstRun.current = true;
        if (debounceRef.current) clearTimeout(debounceRef.current);
    }, [type]);

    useEffect(() => {
        // skip firing on initial mount (no filters typed yet)
        if (isFirstRun.current) {
            isFirstRun.current = false;
            return;
        }

        const hasAnyFilter =
            filters.name.trim() ||
            filters.address.trim() ||
            filters.phoneno.trim() ||
            filters.email.trim();

        if (debounceRef.current) clearTimeout(debounceRef.current);

        if (!hasAnyFilter) {
            // all cleared — optionally clear results, or leave as-is
            return;
        }

        debounceRef.current = setTimeout(() => {
            fetchReport(filters);
        }, 500); // 500ms debounce delay

        return () => clearTimeout(debounceRef.current);
    }, [filters]);
    /* ------------------------------ Export Configuration ------------------------------ */

    const getExportOptions = () => {
        const visibleColumnsList = allColumns.filter(col => visibleColumns[col.key]);

        const exportData = reportData.map((row, index) => {
            const exportRow = { SNo: index + 1 };
            visibleColumnsList.forEach(col => {
                exportRow[col.key] = row[col.key] || '';
            });
            return exportRow;
        });

        const exportColumns = [
            { key: 'SNo', label: '#', align: 'center', width: 8 },
            ...visibleColumnsList.map(col => ({
                key: col.key,
                label: col.label,
                align: 'left',
                width: parseInt(col.minWidth) / 6 || 15
            }))
        ];

        const reportTitle = type === 'customer'
            ? t("cusSuppAddressBook.breadcrumb.custtitle") || 'Customer Address Book'
            : t("cusSuppAddressBook.breadcrumb.supptitle") || 'Supplier Address Book';

        return {
            fileName: `${type === 'customer' ? 'Customer' : 'Supplier'}_Address_Book`,
            sheetName: 'Address Book',
            title: reportTitle,
            subtitle: `${t('Total Records')}: ${reportData.length}`,
            reportInfo: {
                title: reportTitle,
                subtitle: `${t('Total Records')}: ${reportData.length}`
            },
            data: exportData,
            theme: 'professional',
            columns: exportColumns
        };
    };

    const handleExportExcel = () => {
        if (!reportData || reportData.length === 0) {
            alert(t('No data to export'));
            return;
        }
        exportGenericToExcel(getExportOptions());
    };

    const handleExportPdf = () => {
        if (!reportData || reportData.length === 0) {
            alert(t('No data to export'));
            return;
        }
        exportGenericToPdf({ ...getExportOptions(), orientation: 'landscape' });
    };

    const handleExportCsv = () => {
        if (!reportData || reportData.length === 0) {
            alert(t('No data to export'));
            return;
        }
        exportGenericToCsv(getExportOptions());
    };

    /* ------------------------------ Filter Handlers ------------------------------ */

    const handleFilterChange = (field, value) => {
        setFilters(prev => ({ ...prev, [field]: value }));
    };

    const resetFilters = () => {
        setFilters({ name: '', address: '', phoneno: '', email: '' });
        setReportData(null);
        setSearchTerm('');
    };

    const displayColumns = [
        { key: 'SNo', label: '#', minWidth: '40px' },
        ...allColumns.filter(col => visibleColumns[col.key])
    ];

    const pageTitle = type === 'customer' ? t("cusSuppAddressBook.breadcrumb.custtitle") : t("cusSuppAddressBook.breadcrumb.supptitle");

    /* ------------------------------ Local search state (since ContentTable's staticSearchable is no longer used) ------------------------------ */
    const [searchTerm, setSearchTerm] = useState('');

    const filteredData = React.useMemo(() => {
        if (!reportData) return [];
        if (!searchTerm.trim()) return reportData;
        const term = searchTerm.toLowerCase();
        return reportData.filter((row) =>
            displayColumns.some((col) => {
                const val = row[col.key];
                return val !== undefined && val !== null && String(val).toLowerCase().includes(term);
            })
        );
    }, [reportData, searchTerm, displayColumns]);

    /* ------------------------------ Loading / No Access States ------------------------------ */

    if (privilegeLoading) {
        return (
            <div>
                <BreadCrumb
                    routes={[{ title: t("cusSuppAddressBook.breadcrumb.group"), url: "#" }, { title: t(pageTitle), url: "#" }]}
                    heading={{ icon: BookOpen, title: t(pageTitle) }}
                />
                <Preloader />
            </div>
        );
    }

    if (!hasAccess) {
        return (
            <div>
                <BreadCrumb
                    routes={[{ title: t("cusSuppAddressBook.breadcrumb.group"), url: "#" }, { title: t(pageTitle), url: "#" }]}
                    heading={{ icon: BookOpen, title: t(pageTitle) }}
                />
                <NoAcessComponent message={message} />
            </div>
        );
    }

    const checkedCount = Object.values(visibleColumns).filter(Boolean).length;

    /* ------------------------------ Main Render ------------------------------ */

    return (
        <div>
            <BreadCrumb
                routes={[{ title: t("cusSuppAddressBook.breadcrumb.group"), url: "#" }, { title: t(pageTitle), url: "#" }]}
                heading={{ icon: BookOpen, title: t(pageTitle) }}
                exportConfig={reportData && reportData.length > 0 ? {
                    onExportExcel: handleExportExcel,
                    onExportPdf: handleExportPdf,
                    onExportCsv: handleExportCsv,
                    label: t('Export Report')
                } : null}
            />
            <div className="flex gap-1.5 px-1">
                {/* NARROW SIDEBAR - 120px */}
                <div className="w-[120px] flex-shrink-0">
                    <div className="bg-white dark:bg-[#1e1e1e] rounded p-1.5 border border-gray-200 dark:border-gray-700 sticky top-2">
                        <div className="flex items-center justify-between mb-1.5 pb-1.5 border-b border-gray-200 dark:border-gray-700">
                            <span className="text-[10px] font-semibold text-gray-600 dark:text-gray-400 uppercase">
                                {t('cusSuppAddressBook.labels.selectColumns')}
                            </span>
                            <span className="text-[10px] bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 px-1 rounded">
                                {checkedCount}
                            </span>
                        </div>

                        <div className="space-y-0 max-h-[calc(100vh-180px)] overflow-y-auto">
                            {allColumns.map((column) => (
                                <label
                                    key={column.key}
                                    className="flex items-center gap-1 py-0.5 px-0.5 rounded cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                                >
                                    <input
                                        type="checkbox"
                                        checked={visibleColumns[column.key]}
                                        onChange={() => toggleColumn(column.key)}
                                        className="w-2.5 h-2.5 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-0"
                                    />
                                    <span className="text-[10px] text-gray-700 dark:text-gray-300 truncate">
                                        {column.label}
                                    </span>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>

                {/* MAIN CONTENT */}
                <div className="flex-1 min-w-0">
                    <AddressBookFilters
                        filters={filters}
                        onFilterChange={handleFilterChange}
                        onGenerateReport={fetchReport}
                        loading={loading}
                        resetFilters={resetFilters}
                    />

                    {/* Custom table replacing ContentTable */}
                    <div className="bg-white dark:bg-[#1e1e1e] rounded border border-gray-200 dark:border-gray-700 mt-2">
                        <div className="flex items-center justify-between p-2 border-b border-gray-200 dark:border-gray-700">
                            <div className="text-xs text-gray-600 dark:text-gray-400">
                                {t('Total Records')}: {filteredData.length}
                            </div>
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder={t('Search') || 'Search...'}
                                className="text-xs px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-[#2a2a2a] text-gray-700 dark:text-gray-300 w-48 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                        </div>

                        {loading ? (
                            <Preloader />
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs border-collapse">
                                    <thead>
                                        <tr className="bg-gray-50 dark:bg-[#252525] border-b border-gray-200 dark:border-gray-700">
                                            {displayColumns.map((col) => (
                                                <th
                                                    key={col.key}
                                                    style={{ minWidth: col.minWidth }}
                                                    className="text-left px-2 py-1.5 font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap"
                                                >
                                                    {col.label}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredData && filteredData.length > 0 ? (
                                            filteredData.map((row, index) => (
                                                <tr
                                                    key={index}
                                                    className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800"
                                                >
                                                    {displayColumns.map((col) => {
                                                        if (col.key === 'SNo') {
                                                            return (
                                                                <td key={col.key} className="px-2 py-1 text-gray-600 dark:text-gray-400">
                                                                    {index + 1}
                                                                </td>
                                                            );
                                                        }
                                                        if (col.key === 'source') {
                                                            const isEmployee = row.source === 'Employee';
                                                            return (
                                                                <td key={col.key} className="px-2 py-1">
                                                                    <span
                                                                        className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${isEmployee
                                                                                ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300'
                                                                                : 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                                                                            }`}
                                                                    >
                                                                        {row.source}
                                                                    </span>
                                                                </td>
                                                            );
                                                        }
                                                        return (
                                                            <td
                                                                key={col.key}
                                                                className={`px-2 py-1 text-gray-700 dark:text-gray-300 ${col.wrap ? 'whitespace-normal' : 'whitespace-nowrap'}`}
                                                            >
                                                                {row[col.key] ?? ''}
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={displayColumns.length} className="px-2 py-4 text-center text-gray-400">
                                                    {reportData === null ? t('Generate a report to view data') : t('No data found')}
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AddressBookReport;