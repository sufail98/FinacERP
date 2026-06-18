// ErrorBoundary.jsx
import React from "react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showTechnical: false,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("App Crash:", error, errorInfo);
    this.setState({ errorInfo });
  }

  handleToggleTechnical = () => {
    this.setState((prev) => ({ showTechnical: !prev.showTechnical }));
  };

  handleRefresh = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const { error, errorInfo, showTechnical } = this.state;

      return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 font-sans p-5">
          <div className="bg-white rounded-2xl shadow-xl p-10 max-w-lg w-full text-center">

            {/* ── Icon ── */}
            <div className="mb-6 flex justify-center">
              <svg
                className="w-16 h-16"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle
                  cx="12" cy="12" r="11"
                  stroke="#e74c3c" strokeWidth="2"
                />
                <line
                  x1="12" y1="7" x2="12" y2="13"
                  stroke="#e74c3c" strokeWidth="2" strokeLinecap="round"
                />
                <circle cx="12" cy="17" r="1.2" fill="#e74c3c" />
              </svg>
            </div>

            {/* ── Main Message ── */}
            <h1 className="text-3xl font-bold text-gray-900 mb-1">
              OOPS!
            </h1>
            <h2 className="text-lg font-medium text-gray-500 mb-3">
              Something went wrong
            </h2>
            <p className="text-md text-gray-700 leading-relaxed mb-7">
              Please contact customer support or refresh the page to try again.
            </p>

            {/* ── Action Buttons ── */}
            <div className="flex gap-3 justify-center flex-wrap mb-6">
              <button
                onClick={this.handleRefresh}
                className="px-6 py-3 text-sm font-semibold text-white main-bg
                           rounded-lg hover:main-bg active:scale-95
                           transition-all duration-200 cursor-pointer"
              >
                Refresh Page
              </button>
      
            </div>

            {/* ── Technical Details Toggle ── */}
            <button
              onClick={this.handleToggleTechnical}
              className="inline-flex items-center gap-1.5 text-xs text-gray-400
                         bg-transparent border-none cursor-pointer
                         hover:text-gray-600 transition-colors duration-200"
            >
              {showTechnical ? "Hide" : "View"} Technical Details
              <span
                className={`text-[10px] inline-block transition-transform duration-300
                            ${showTechnical ? "rotate-180" : "rotate-0"}`}
              >
                ▼
              </span>
            </button>

            {/* ── Technical Details Panel ── */}
            {showTechnical && (
              <div className="mt-4 bg-[#1e1e2e] rounded-xl overflow-hidden text-left
                              animate-[slideDown_0.3s_ease]">

                {/* Panel Header */}
                <div className="flex justify-between items-center px-4 py-3 bg-[#2a2a3d]">
                  <span className="text-xs font-semibold text-red-400 tracking-wide">
                    Error Details
                  </span>
                  <button
                    onClick={this.handleToggleTechnical}
                    aria-label="Close technical details"
                    className="bg-transparent border-none text-gray-500 text-base
                               cursor-pointer px-1.5 py-0.5 rounded
                               hover:text-gray-300 transition-colors duration-200"
                  >
                    ✕
                  </button>
                </div>

                {/* Panel Content */}
                <div className="p-4 max-h-72 overflow-y-auto">

                  {/* Error Message */}
                  <p className="text-[11px] font-semibold text-gray-500
                                uppercase tracking-widest mb-1.5">
                    Error Message:
                  </p>
                  <code className="block text-sm text-red-200 bg-[#2a2a3d]
                                   px-3 py-2.5 rounded-md break-words leading-relaxed">
                    {error?.message || "Unknown error"}
                  </code>

                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;