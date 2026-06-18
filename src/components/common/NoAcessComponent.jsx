import React from 'react'
import { useTranslation } from 'react-i18next'

const NoAcessComponent = ({ message }) => {
  const {t}=useTranslation()
  return (
    <div>
        <div className="flex justify-center h-[calc(100vh-87px)] items-center">{message || t('noPermission')}</div>
    </div>
  )
}

export default NoAcessComponent
