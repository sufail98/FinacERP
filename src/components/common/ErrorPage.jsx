import { AlertCircle, ChevronDown, ChevronUp, X } from 'lucide-react'
import { useState } from 'react'

const ErrorPage = ({ errorMessage }) => {
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false)

  return (
    <div>
      <div className="w-full flex flex-col" style={{ height: 'calc(100vh - 45px)' }}>
        <div className="flex-1 flex items-center justify-center bg-gray-50">
          <div className="text-center px-6 py-8 max-w-md bg-gray-100 w-[90%] md:w-[400px] lg:w-[400px] rounded-2xl">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              OOPS!
            </h2>
            <p className="text-gray-600 mb-4">
              Something went wrong
            </p>

            {/* Technical Details Toggle */}
            {errorMessage && (
              <div className="mb-6">
                {!showTechnicalDetails ? (
                  <button
                    onClick={() => setShowTechnicalDetails(true)}
                    className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    <span>See technical details</span>
                    <ChevronDown className="w-4 h-4" />
                  </button>
                ) : (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-left relative">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-red-800">Technical Details</span>
                      <button
                        onClick={() => setShowTechnicalDetails(false)}
                        className="text-red-400 hover:text-red-600 transition-colors"
                        aria-label="Close technical details"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-red-700 text-xs break-words">
                      {errorMessage}
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-3">
              <button
                onClick={() => window.history.back()}
                className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-3 px-4 rounded-lg transition-colors"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ErrorPage