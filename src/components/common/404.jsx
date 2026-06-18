import React from 'react'
import { ArrowLeft, Home, Search } from 'lucide-react'

const NotFound = () => {
  const handleGoBack = () => {
    window.history.back()
  }

  const handleGoHome = () => {
    window.location.href = '/'
  }

  return (
    <div className="min-h-[calc(100vh-40px)] w-full flex items-center justify-center bg-gradient-to-br">
      <div className="max-w-md w-full mx-4 text-center">
        {/* 404 Number */}
        <div className="mb-8">
          <h1 className="text-8xl font-bold text-transparent bg-clip-text bg-gradient-to-r text-main mb-4">
            404
          </h1>
          <div className="w-24 h-1 bg-gradient-to-r main-bg mx-auto rounded-full"></div>
        </div>

        {/* Error Message */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-main mb-3">
            Page Not Found
          </h2>
          <p className="text-gray-600 leading-relaxed">
            The page you're looking for doesn't exist or has been moved. 
            Please check the URL or return to the dashboard.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleGoHome}
            className="w-full bg-gradient-to-r main-bg hover:from-blue-700 hover:to-indigo-700 text-white font-medium py-3 px-6 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            <Home size={20} />
            Go to Dashboard
          </button>
          
          <button
            onClick={handleGoBack}
            className="w-full bg-white hover:bg-gray-50 text-gray-700 font-medium py-3 px-6 rounded-lg border border-gray-200 transition-all duration-200 flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
          >
            <ArrowLeft size={20} />
            Go Back
          </button>
        </div>

      </div>
    </div>
  )
}

export default NotFound