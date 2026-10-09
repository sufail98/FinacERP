import React from 'react'
import { useTranslation } from 'react-i18next'
import { ShieldAlert } from 'lucide-react'

const NoAcessComponent = ({ message }) => {
  const { t } = useTranslation()
  return (
    <div className="flex justify-center items-center h-[calc(100vh-87px)] px-4">
      <div className="flex flex-col items-center text-center max-w-sm">
        <div className="flex items-center justify-center w-14 h-14 rounded-full bg-gray-100 border border-gray-200 mb-4">
          <ShieldAlert className="w-7 h-7 text-gray-500" strokeWidth={1.75} />
        </div>
        <h2 className="text-base font-semibold text-gray-800 mb-1">
         Access Denied
        </h2>
        <p className="text-sm text-gray-500">
          {message || t('noPermission')}
        </p>
      </div>
    </div>
  )
}

export default NoAcessComponent