import axiosInstance from '@/lib/axiosConfig'
import React, { useState, useEffect } from 'react'

const QRUpdatePage = () => {
  const [data, setData] = useState([])
  const [selected, setSelected] = useState([])
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [qrDetails, setQrDetails] = useState({})
  const [updateProgress, setUpdateProgress] = useState({ current: 0, total: 0 })

  const API_URL = '/zatca/zatca-invoices'
  const UPDATE_API_URL = '/zatca/update-qrlink'

  const decodeQRCode = (encodedQR) => {
    try {
      return atob(encodedQR)
    } catch {
      return null
    }
  }

  const parseQRCode = (qrString) => {
    try {
      const tlvData = {}
      let i = 0
      while (i < qrString.length) {
        const tag = qrString.charCodeAt(i)
        const length = qrString.charCodeAt(i + 1)
        const value = qrString.substring(i + 2, i + 2 + length)
        tlvData[tag] = value
        i += 2 + length
      }
      return tlvData
    } catch {
      return null
    }
  }

  const encodeToBase64 = (str) => {
    try {
      return btoa(str)
    } catch {
      return null
    }
  }

  const buildQRString = (tlvData) => {
    try {
      let qrString = ''
      const sortedTags = Object.keys(tlvData).sort((a, b) => Number(a) - Number(b))
      sortedTags.forEach(tag => {
        const value = tlvData[tag]
        qrString += String.fromCharCode(Number(tag))
        qrString += String.fromCharCode(value.length)
        qrString += value
      })
      return qrString
    } catch {
      return null
    }
  }

  const processQRCodeOnCheckbox = (masterid, currentQRLink, currentTotalAmount, currentTaxAmount, billDateTime) => {
    try {
      const decodedQR = decodeQRCode(currentQRLink)
      if (!decodedQR) throw new Error('Failed to decode QR code')

      let tlvData = parseQRCode(decodedQR)
      if (!tlvData) throw new Error('Failed to parse QR code')

      const formattedTotalAmount = parseFloat(currentTotalAmount).toFixed(2)
      const formattedTaxAmount = parseFloat(currentTaxAmount).toFixed(2)

      const oldTag3 = tlvData[3]
      const oldTag4 = tlvData[4]
      const oldTag5 = tlvData[5]

      tlvData[3] = billDateTime.toString()
      tlvData[4] = formattedTotalAmount.toString()
      tlvData[5] = formattedTaxAmount.toString()

      const newQRString = buildQRString(tlvData)
      if (!newQRString) throw new Error('Failed to build QR string')

      const encryptedQR = encodeToBase64(newQRString)
      if (!encryptedQR) throw new Error('Failed to encode to Base64')

      return {
        encryptedQR,
        decodedQR,
        newQRString,
        tlvData,
        oldDateTime: oldTag3,
        newDateTime: billDateTime,
        oldTotalAmount: oldTag4,
        newTotalAmount: formattedTotalAmount,
        oldTaxAmount: oldTag5,
        newTaxAmount: formattedTaxAmount
      }
    } catch {
      return null
    }
  }

  const fetchData = async (from = '', to = '') => {
    setLoading(true)
    setError('')
    try {
      const payload = {}
      if (from) payload.fromDate = from
      if (to) payload.toDate = to

      const res = await axiosInstance.post(API_URL, payload)
      const json = res.data

      let records = []
      if (json.success && json.data) {
        records = json.data.map(item => ({
          masterid: item.salesMasterId,
          invoiceno: item.invoiceNo,
          customername: item.customerName,
          totalamount: item.totalAmount,
          totaltax: item.totalTax,
          qrlink: item.qr_link,
          billdatetime: item.billDateTime
        }))
      } else if (Array.isArray(json)) {
        records = json
      } else {
        records = json.data || json.records || []
      }

      setData(records)
    } catch {
      setError('Failed to fetch data. Using sample data.')
      setData([
        {
          masterid: 1,
          invoiceno: '1',
          customername: 'CASH CUSTOMER',
          totalamount: '36.000000',
          totaltax: '4.700000',
          qrlink: 'ARpTQUhBTSBBTCBNQVNBUiBUUkFESU5HIEVTVAIPMzEwNDIyNTU3MTAwMDAzAxMyMDI2LTA0LTAxVDEyOjAwOjAwBAU0MS40MAUENS40MAYscUVxaFlsVUNQMExsTFl4bGh4Vy9LN1JNV09YWWtLajJYT1duVkwvY0VYND0HYE1FWUNJUUNxOE4zdUphL3NuMXFtOHJYSEpaMnp3T2t2eTlFTnl2aENRNlNNcnJUdVh3SWhBTGYxd2U0NlFlZ3hXZ0RTN3FRazFUaUNHZngyWnVhR2pwL3FIdWcxMVg2eAhYMFYwEAYHKoZIzj0CAQYFK4EEAAoDQgAEqmYb+ds7D942SNQGPFqYpwl+Ibe9YkOgX+KHVJ3A0itcsHeQyHeJzInXvBfI7f6rV8flR\/cUjK++sng\/phD+HglGMEQCIGvsyku9r1KXYz5cKdeQm4\/0CujVGt19\/+HKnTWX\/R0uAiB6oE6G5vA4a0G9sx+tot60iJEvPkPF88FE8z8AsumYUQ==',
          billdatetime: '2026-04-01 13:18:00'
        },
      ])
    }
    setSelected([])
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  const toggleRow = (id) => {
    const isSelected = selected.includes(id)
    const row = data.find(r => r.masterid === id)

    if (!isSelected && row) {
      const result = processQRCodeOnCheckbox(
        id,
        row.qrlink,
        row.totalamount,
        row.totaltax,
        row.billdatetime
      )
      if (result) {
        setQrDetails(prev => ({ ...prev, [id]: result }))
      }
    }

    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const toggleAll = (e) => {
    if (e.target.checked) {
      const newSelected = data.map(r => r.masterid)
      setSelected(newSelected)

      const details = {}
      data.forEach(row => {
        const result = processQRCodeOnCheckbox(
          row.masterid,
          row.qrlink,
          row.totalamount,
          row.totaltax,
          row.billdatetime
        )
        if (result) {
          details[row.masterid] = result
        }
      })
      setQrDetails(details)
    } else {
      setSelected([])
      setQrDetails({})
    }
  }

  const handleUpdate = async () => {
    if (!selected.length) return alert('Select at least one row.')

    try {
      setLoading(true)
      setUpdateProgress({ current: 0, total: selected.length })

      let successCount = 0
      let failCount = 0
      const failedRecords = []

      for (let i = 0; i < selected.length; i++) {
        const masterid = selected[i]
        const row = data.find(r => r.masterid === masterid)
        const details = qrDetails[masterid]

        if (!row || !details) {
          failCount++
          failedRecords.push({ masterid, reason: 'Missing data' })
          continue
        }

        try {
          const payload = {
            salesMasterId: masterid,
            qr_link: details.encryptedQR
          }

          const response = await axiosInstance.post(UPDATE_API_URL, payload)
          void response
          successCount++
          setUpdateProgress({ current: i + 1, total: selected.length })
        } catch (err) {
          failCount++
          failedRecords.push({
            masterid,
            invoiceno: row.invoiceno,
            reason: err.response?.data?.message || err.message
          })
        }
      }

      let alertMessage = `Update Complete!\n\n✅ Successful: ${successCount}\n❌ Failed: ${failCount}`
      if (failedRecords.length > 0) {
        alertMessage += `\n\nFailed Records:\n${failedRecords.map(r => `- ${r.invoiceno}: ${r.reason}`).join('\n')}`
      }
      alert(alertMessage)

      setSelected([])
      setQrDetails({})
      setUpdateProgress({ current: 0, total: 0 })
      fetchData(fromDate, toDate)
    } catch (err) {
      alert('Batch update process failed: ' + err.message)
      setUpdateProgress({ current: 0, total: 0 })
    } finally {
      setLoading(false)
    }
  }

  const fmt = (n) => Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2 })

  return (
    <div className="min-h-screen p-6 bg-white">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-lg font-semibold text-black">QR Code Update</h1>
        <button
          onClick={handleUpdate}
          disabled={!selected.length || loading}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed text-white text-xs font-medium px-4 py-2 rounded-md transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <polyline points="1 4 1 10 7 10" />
            <path d="M3.51 15a9 9 0 1 0 .49-3.62" />
          </svg>
          Update {selected.length > 0 && `(${selected.length})`}
        </button>
      </div>

      {updateProgress.total > 0 && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-900">
              Updating... {updateProgress.current} of {updateProgress.total}
            </span>
            <span className="text-sm font-medium text-blue-900">
              {Math.round((updateProgress.current / updateProgress.total) * 100)}%
            </span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(updateProgress.current / updateProgress.total) * 100}%` }}
            ></div>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 text-xs rounded-lg">
          {error}
        </div>
      )}

      <div className="flex items-end gap-3 mb-4 p-3 bg-gray-50 border border-gray-300 rounded-lg">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-gray-600 uppercase tracking-widest font-medium">From</label>
          <input
            type="date"
            value={fromDate}
            onChange={e => setFromDate(e.target.value)}
            className="bg-white border border-gray-300 text-black text-xs rounded px-2.5 py-1.5 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-gray-600 uppercase tracking-widest font-medium">To</label>
          <input
            type="date"
            value={toDate}
            onChange={e => setToDate(e.target.value)}
            className="bg-white border border-gray-300 text-black text-xs rounded px-2.5 py-1.5 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <button
          onClick={() => fetchData(fromDate, toDate)}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-400 text-white text-xs px-3 py-1.5 rounded transition-colors"
        >
          {loading ? 'Loading...' : 'Filter'}
        </button>
        <button
          onClick={() => { setFromDate(''); setToDate(''); fetchData() }}
          className="text-gray-600 hover:text-gray-900 text-xs px-2 py-1.5 transition-colors"
        >
          Clear
        </button>
      </div>

      <div className="border border-gray-300 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-100 border-b border-gray-300">
              <tr>
                <th className="px-3 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={selected.length === data.length && data.length > 0}
                    onChange={toggleAll}
                    className="accent-blue-500 cursor-pointer"
                  />
                </th>
                {['Master ID', 'Invoice No', 'Customer Name', 'Total Amount', 'Total Tax', 'QR Link', 'Bill Date'].map(h => (
                  <th key={h} className="px-3 py-3 text-left text-[10px] text-gray-700 uppercase tracking-widest font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && updateProgress.total === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-10 text-gray-500">Loading…</td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-10 text-gray-500">No records found.</td>
                </tr>
              ) : data.map(row => (
                <tr
                  key={row.masterid}
                  onClick={() => toggleRow(row.masterid)}
                  className={`border-b border-gray-200 cursor-pointer transition-colors ${
                    selected.includes(row.masterid) ? 'bg-blue-100' : 'hover:bg-gray-50'
                  }`}
                >
                  <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selected.includes(row.masterid)}
                      onChange={() => toggleRow(row.masterid)}
                      className="accent-blue-500 cursor-pointer"
                      disabled={loading}
                    />
                  </td>
                  <td className="px-3 py-2.5 font-mono text-gray-700 font-medium">{row.masterid}</td>
                  <td className="px-3 py-2.5 font-mono text-gray-700 font-medium">{row.invoiceno}</td>
                  <td className="px-3 py-2.5 text-gray-800">{row.customername}</td>
                  <td className="px-3 py-2.5 font-mono text-green-700 font-semibold">{fmt(row.totalamount)}</td>
                  <td className="px-3 py-2.5 font-mono text-amber-700 font-semibold">{fmt(row.totaltax)}</td>
                  <td className="px-3 py-2.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        const details = qrDetails[row.masterid]
                        if (details) {
                          alert(`QR Details\n\nMaster ID: ${row.masterid}\nInvoice: ${row.invoiceno}\n\nDateTime: ${details.oldDateTime} → ${details.newDateTime}\nTotal Amount: ${details.oldTotalAmount} → ${details.newTotalAmount}\nTax Amount: ${details.oldTaxAmount} → ${details.newTaxAmount}`)
                        } else {
                          alert('Please check this row first to process QR code')
                        }
                      }}
                      className="text-blue-600 hover:text-blue-800 font-mono underline underline-offset-2 text-xs"
                      disabled={loading}
                    >
                      View QR
                    </button>
                  </td>
                  <td className="px-3 py-2.5 text-gray-600 text-xs">{row.billdatetime}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data.length > 0 && (
          <div className="px-4 py-2 bg-gray-50 border-t border-gray-300 text-[10px] text-gray-700 font-medium">
            {data.length} records · {selected.length} selected
          </div>
        )}
      </div>
    </div>
  )
}

export default QRUpdatePage