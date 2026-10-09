import React, { useRef, useState } from 'react'
import { Download, UploadCloud, FileSpreadsheet, X, CheckCircle2, AlertCircle, Loader2, XCircle, Table2 } from 'lucide-react'
import * as XLSX from 'xlsx'
import axiosInstance from '../../../lib/axiosConfig'
import NoAcessComponent from '@/components/common/NoAcessComponent';
import usePrivileges from '@/lib/hooks/usePrivileges';

// ---- Template column definitions (edit here if your backend fields change) ----
const TEMPLATES = {
    Product: {
        label: 'Product',
        apiUrl: '/product/bulk-upload',
        filename: 'product_bulk_upload_template.csv',
        columns: [
            'product_code', 'product_name', 'product_main_group', 'product_group1', 'product_group2',
            'product_group3', 'product_group4', 'brand', 'purchase_rate', 'sales_rate', 'mrp',
            'minimum_stock', 'maximum_stock', 'reorder_level', 'unit', 'branch', 'stock', 'part_no',
            'barcode', 'category',
        ],
        sampleRow: [
            '124006', 'Earphone Fonecom Fe08E', 'General', '', '', '', '', 'vv', '1.8', '3.6', '4',
            '5', '100', '10', 'PCS', '1', '50', '', '900000006', 'Inventory',
        ],
    },
    Customer: {
        label: 'Customer',
        apiUrl: '/ledger/bulk-upload',
        filename: 'customer_bulk_upload_template.csv',
        columns: [
            'ledgername', 'ledgercode', 'groupid', 'billbybill', 'crordr', 'openingbalance', 'branchids',
            'creditperiod', 'creditlimit', 'ledgertype', 'routeid', 'currencyid', 'pricinglevelid',
            'address', 'phoneno', 'email', 'narration', 'buildingno', 'additionalno', 'streetname',
            'cityname', 'district', 'postboxno', 'country', 'buildingno_arb', 'additionalno_arb',
            'streetname_arb', 'cityname_arb', 'district_arb', 'postboxno_arb', 'country_arb',
            'addressarabic', 'namearb', 'vatnumber', 'number', 'shipping_address1', 'shipping_address2',
            'shipping_address3', 'shipping_address4', 'shipping_isdefault', 'shipping_branchid',
            'document_name', 'filename', 'document_branchid',
        ],
        sampleRow: [
            'ABC Traders', 'L001', '1', '1', 'Dr', '5000', '1,2', '30', '10000', 'Customer', '1', '1', '1',
            'Chennai', '9999999999', 'abc@gmail.com', 'Opening Balance', '12A', '45', 'Main Street',
            'Chennai', 'Chennai District', '600001', 'India', '١٢أ', '٤٥', 'الشارع الرئيسي', 'تشيناي',
            'منطقة تشيناي', '٦٠٠٠٠١', 'الهند', 'العنوان الكامل بالعربية', 'ايه بي سي للتجارة',
            '1234567890', 'ACC1001', 'Warehouse 1', 'Industrial Area', '', 'Chennai', '1', '1',
            'GST Certificate', 'gst_abc.pdf', '1',
        ],
    },
}

const TABS = ['Product', 'Customer']

// Cap how many rows we render in the preview so a 50k-row file doesn't freeze the tab.
const PREVIEW_ROW_LIMIT = 50

function csvEscape(value) {
    const str = String(value ?? '')
    if (/[",\n\r]/.test(str)) {
        return `"${str.replace(/"/g, '""')}"`
    }
    return str
}

function downloadTemplate(tabKey) {
    const { columns, sampleRow, filename } = TEMPLATES[tabKey]
    const rows = [columns, sampleRow]
    const csvContent = rows.map((row) => row.map(csvEscape).join(',')).join('\r\n')
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', filename)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
}

// The backend uses different key names per entity (failed_products, failed_customers,
// success_products, success_customers). This pulls out whichever one exists so the
// same UI works for every tab without hardcoding "product" or "customer".
function extractResultLists(data) {
    if (!data || typeof data !== 'object') return { successItems: [], failedItems: [] }

    const successKey = Object.keys(data).find((k) => k.startsWith('success_') && Array.isArray(data[k]))
    const failedKey = Object.keys(data).find((k) => k.startsWith('failed_') && Array.isArray(data[k]))

    return {
        successItems: successKey ? data[successKey] : [],
        failedItems: failedKey ? data[failedKey] : [],
    }
}

// Failed rows can come back with slightly different field names depending on the
// entity (productCode vs ledgerCode, etc), so try a few common ones.
function getRowIdentifier(item) {
    return (
        item.productCode ||
        item.productcode ||
        item.product_code ||
        item.ledgerCode ||
        item.ledgercode ||
        item.code ||
        item.name ||
        'Row'
    )
}

// Reads the first sheet of a File (csv or xlsx) and returns { headers, rows, totalRows }.
// Uses SheetJS for both formats so we don't need a separate CSV parser.
function parseFileForPreview(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onerror = () => reject(reader.error || new Error('Failed to read file'))
        reader.onload = () => {
            try {
                const isCsv = file.name.toLowerCase().endsWith('.csv')
                const workbook = isCsv
                    ? XLSX.read(reader.result, { type: 'string' })
                    : XLSX.read(reader.result, { type: 'array' })

                const firstSheetName = workbook.SheetNames[0]
                const sheet = workbook.Sheets[firstSheetName]
                const data = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false, defval: '' })

                if (!data.length) {
                    resolve({ headers: [], rows: [], totalRows: 0 })
                    return
                }

                const [headerRow, ...bodyRows] = data
                const headers = headerRow.map((h, idx) => (h === '' || h == null ? `Column ${idx + 1}` : String(h)))

                resolve({
                    headers,
                    rows: bodyRows.slice(0, PREVIEW_ROW_LIMIT),
                    totalRows: bodyRows.length,
                })
            } catch (err) {
                reject(err)
            }
        }

        if (file.name.toLowerCase().endsWith('.csv')) {
            reader.readAsText(file)
        } else {
            reader.readAsArrayBuffer(file)
        }
    })
}

const STATUS = {
    IDLE: 'idle',
    UPLOADING: 'uploading',
    SUCCESS: 'success',
    ERROR: 'error',
}

const BulkUpload = () => {
    const [activeTab, setActiveTab] = useState('Product')
    const [file, setFile] = useState(null)
    const [status, setStatus] = useState(STATUS.IDLE)
    const [errorMessage, setErrorMessage] = useState('')
    const [isDragOver, setIsDragOver] = useState(false)
    const [uploadResult, setUploadResult] = useState(null) // { success_count, failed_count, successItems, failedItems }

    const {
    privileges,
    loading: privilegeLoading,
    hasAccess,
    message,
  } = usePrivileges('Bulk Upload');

    // Client-side preview of the selected file's contents, shown before upload.
    const [preview, setPreview] = useState(null) // { headers, rows, totalRows }
    const [previewLoading, setPreviewLoading] = useState(false)
    const [previewError, setPreviewError] = useState('')

    const fileInputRef = useRef(null)

    const activeTemplate = TEMPLATES[activeTab]

    const resetFileState = () => {
        setFile(null)
        setStatus(STATUS.IDLE)
        setErrorMessage('')
        setUploadResult(null)
        setPreview(null)
        setPreviewLoading(false)
        setPreviewError('')
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    const handleTabChange = (tab) => {
        if (tab === activeTab) return
        setActiveTab(tab)
        resetFileState()
    }

    const loadPreview = async (selected) => {
        setPreviewLoading(true)
        setPreviewError('')
        setPreview(null)
        try {
            const result = await parseFileForPreview(selected)
            setPreview(result)
        } catch (err) {
            setPreviewError('Could not preview this file. It may be corrupted or in an unsupported format.')
        } finally {
            setPreviewLoading(false)
        }
    }

    const validateAndSetFile = (selected) => {
        if (!selected) return
        const isCsv =
            selected.type === 'text/csv' ||
            selected.name.toLowerCase().endsWith('.csv') ||
            selected.name.toLowerCase().endsWith('.xlsx')
        if (!isCsv) {
            setStatus(STATUS.ERROR)
            setErrorMessage('Please select a .csv or .xlsx file.')
            setFile(null)
            return
        }
        setFile(selected)
        setStatus(STATUS.IDLE)
        setErrorMessage('')
        setUploadResult(null)
        loadPreview(selected)
    }

    const handleFileSelect = (e) => {
        validateAndSetFile(e.target.files?.[0])
    }

    const handleDrop = (e) => {
        e.preventDefault()
        setIsDragOver(false)
        validateAndSetFile(e.dataTransfer.files?.[0])
    }

    const handleUpload = async () => {
        if (!file) return
        setStatus(STATUS.UPLOADING)
        setErrorMessage('')
        setUploadResult(null)
        try {
            const formData = new FormData()
            formData.append('file', file)

            // IMPORTANT: pass the FormData instance directly as the body.
            // Wrapping it in { formData } causes axios to JSON.stringify it,
            // and a FormData object serializes to "{}", which is why the
            // backend was seeing an empty payload and rejecting the request.
            const res = await axiosInstance.post(activeTemplate.apiUrl, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            })

            const payload = res?.data?.data || {}

            const { successItems, failedItems } = extractResultLists(payload)

            setUploadResult({
                successCount: payload.success_count ?? successItems.length,
                failedCount: payload.failed_count ?? failedItems.length,
                failedItems,
            })
            setStatus(STATUS.SUCCESS)
        } catch (err) {
            setStatus(STATUS.ERROR)
            // axios throws on non-2xx responses automatically, so read the
            // error details off err.response instead of checking response.ok
            const message =
                err?.response?.data?.message ||
                err?.response?.data?.errors?.file?.[0] ||
                err?.message ||
                'Something went wrong while uploading. Please try again.'
            setErrorMessage(message)
        }
    }

    return (
        <div className="w-full p-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b border-slate-200 px-2">
                {TABS.map((tab) => (
                    <button
                        key={tab}
                        onClick={() => handleTabChange(tab)}
                        className={`relative px-5 py-3.5 text-sm font-medium transition-colors ${activeTab === tab
                                ? 'text-indigo-600'
                                : 'text-slate-500 hover:text-slate-800'
                            }`}
                    >
                        {tab}
                        {activeTab === tab && (
                            <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-indigo-600 rounded-full" />
                        )}
                    </button>
                ))}
            </div>

            <div className="p-6 space-y-6">
                {/* Step 1: Download template */}
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
                        Step 1
                    </p>
                    <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3.5">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="shrink-0 w-9 h-9 rounded-md bg-indigo-50 flex items-center justify-center">
                                <FileSpreadsheet size={18} className="text-indigo-600" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-sm font-medium text-slate-800">
                                    {activeTemplate.label} template
                                </p>
                                <p className="text-xs text-slate-500 truncate">
                                    Download the sample sheet and fill in your data
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => downloadTemplate(activeTab)}
                            className="shrink-0 inline-flex items-center gap-1.5 rounded-md bg-white border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
                        >
                            <Download size={15} />
                            Download
                        </button>
                    </div>
                </div>

                {/* Step 2: Upload file */}
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
                        Step 2
                    </p>

                    {!file ? (
                        <label
                            onDragOver={(e) => {
                                e.preventDefault()
                                setIsDragOver(true)
                            }}
                            onDragLeave={() => setIsDragOver(false)}
                            onDrop={handleDrop}
                            className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-10 cursor-pointer transition-colors ${isDragOver
                                    ? 'border-indigo-400 bg-indigo-50'
                                    : 'border-slate-300 hover:border-slate-400 bg-white'
                                }`}
                        >
                            <UploadCloud size={26} className="text-slate-400" />
                            <p className="text-sm text-slate-600">
                                <span className="font-medium text-indigo-600">Click to upload</span> or drag and drop
                            </p>
                            <p className="text-xs text-slate-400">CSV or XLSX, filled using the {activeTemplate.label.toLowerCase()} template</p>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".csv,.xlsx"
                                className="hidden"
                                onChange={handleFileSelect}
                            />
                        </label>
                    ) : (
                        <div className="rounded-lg border border-slate-200 px-4 py-3.5">
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="shrink-0 w-9 h-9 rounded-md bg-slate-100 flex items-center justify-center">
                                        <FileSpreadsheet size={18} className="text-slate-500" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-slate-800 truncate">{file.name}</p>
                                        <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
                                    </div>
                                </div>
                                {status !== STATUS.UPLOADING && (
                                    <button
                                        onClick={resetFileState}
                                        className="shrink-0 text-slate-400 hover:text-slate-600 p-1"
                                        aria-label="Remove file"
                                    >
                                        <X size={16} />
                                    </button>
                                )}
                            </div>

                            {/* File content preview: shown as soon as the file is selected, before upload */}
                            {status === STATUS.IDLE && (
                                <div className="mt-3.5">
                                    {previewLoading && (
                                        <div className="flex items-center gap-1.5 text-sm text-slate-500 py-3">
                                            <Loader2 size={14} className="animate-spin" />
                                            Reading file for preview…
                                        </div>
                                    )}

                                    {!previewLoading && previewError && (
                                        <div className="flex items-center gap-1.5 text-sm text-amber-600">
                                            <AlertCircle size={15} />
                                            {previewError}
                                        </div>
                                    )}

                                    {!previewLoading && !previewError && preview && preview.headers.length > 0 && (
                                        <div className="rounded-lg border border-slate-200 overflow-hidden">
                                            <div className="flex items-center justify-between gap-3 px-3.5 py-2 border-b border-slate-200 bg-slate-50">
                                                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                                                    <Table2 size={13} />
                                                    Preview
                                                </div>
                                                <span className="text-xs text-slate-400">
                                                    {preview.totalRows} row{preview.totalRows === 1 ? '' : 's'} detected
                                                    {preview.totalRows > PREVIEW_ROW_LIMIT
                                                        ? ` · showing first ${PREVIEW_ROW_LIMIT}`
                                                        : ''}
                                                </span>
                                            </div>
                                            <div className="max-h-72 overflow-auto">
                                                <table className="min-w-full text-xs">
                                                    <thead className="bg-slate-50 sticky top-0">
                                                        <tr>
                                                            {preview.headers.map((h, idx) => (
                                                                <th
                                                                    key={idx}
                                                                    className="px-3 py-2 text-left font-semibold text-slate-600 whitespace-nowrap border-b border-slate-200"
                                                                >
                                                                    {h}
                                                                </th>
                                                            ))}
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100">
                                                        {preview.rows.map((row, rowIdx) => (
                                                            <tr key={rowIdx} className="hover:bg-slate-50">
                                                                {preview.headers.map((_, colIdx) => (
                                                                    <td
                                                                        key={colIdx}
                                                                        className="px-3 py-2 text-slate-700 whitespace-nowrap"
                                                                    >
                                                                        {row[colIdx] ?? ''}
                                                                    </td>
                                                                ))}
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}

                                    {!previewLoading && !previewError && preview && preview.headers.length === 0 && (
                                        <div className="flex items-center gap-1.5 text-sm text-slate-500">
                                            <AlertCircle size={15} />
                                            This file appears to be empty.
                                        </div>
                                    )}
                                </div>
                            )}

                            {status === STATUS.SUCCESS && uploadResult && (
                                <div className="mt-3.5 space-y-3">
                                    {/* Summary badges */}
                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center gap-1.5 rounded-md bg-emerald-50 border border-emerald-200 px-2.5 py-1.5 text-xs font-medium text-emerald-700">
                                            <CheckCircle2 size={13} />
                                            {uploadResult.successCount} succeeded
                                        </div>
                                        {uploadResult.failedCount > 0 && (
                                            <div className="flex items-center gap-1.5 rounded-md bg-red-50 border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-700">
                                                <XCircle size={13} />
                                                {uploadResult.failedCount} failed
                                            </div>
                                        )}
                                    </div>

                                    {/* Failed rows breakdown */}
                                    {uploadResult.failedItems?.length > 0 && (
                                        <div className="rounded-lg border border-red-200 bg-red-50/50 overflow-hidden">
                                            <div className="px-3.5 py-2 border-b border-red-200 bg-red-50">
                                                <p className="text-xs font-semibold text-red-700">
                                                    Rows that couldn't be imported
                                                </p>
                                            </div>
                                            <ul className="max-h-56 overflow-y-auto divide-y divide-red-100">
                                                {uploadResult.failedItems.map((item, idx) => (
                                                    <li
                                                        key={idx}
                                                        className="flex items-start justify-between gap-3 px-3.5 py-2.5 text-sm"
                                                    >
                                                        <span className="font-medium text-slate-800 shrink-0">
                                                            {getRowIdentifier(item)}
                                                        </span>
                                                        <span className="text-right text-red-600">
                                                            {item.reason || item.message || 'Unknown error'}
                                                        </span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {uploadResult.failedCount === 0 && (
                                        <div className="flex items-center gap-1.5 text-sm text-emerald-600">
                                            <CheckCircle2 size={15} />
                                            All {uploadResult.successCount} {activeTemplate.label.toLowerCase()} rows uploaded successfully.
                                        </div>
                                    )}
                                </div>
                            )}

                            {status === STATUS.ERROR && errorMessage && (
                                <div className="mt-3 flex items-center gap-1.5 text-sm text-red-600">
                                    <AlertCircle size={15} />
                                    {errorMessage}
                                </div>
                            )}

                            <div className="mt-3.5 flex gap-2">
                                <button
                                    onClick={handleUpload}
                                    disabled={status === STATUS.UPLOADING || status === STATUS.SUCCESS}
                                    className="inline-flex items-center gap-1.5 rounded-md main-bg px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                                >
                                    {status === STATUS.UPLOADING && <Loader2 size={15} className="animate-spin" />}
                                    {status === STATUS.UPLOADING
                                        ? 'Uploading...'
                                        : status === STATUS.SUCCESS
                                            ? 'Uploaded'
                                            : 'Upload file'}
                                </button>
                                {status !== STATUS.UPLOADING && (
                                    <button
                                        onClick={resetFileState}
                                        className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                                    >
                                        Choose another file
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {status === STATUS.ERROR && !file && errorMessage && (
                        <p className="mt-2 flex items-center gap-1.5 text-sm text-red-600">
                            <AlertCircle size={15} />
                            {errorMessage}
                        </p>
                    )}
                </div>
            </div>
        </div>
    )
}

export default BulkUpload