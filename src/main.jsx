import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { Provider } from 'react-redux'
import { store } from './redux/store.js'

import "./i18n";
import { SidebarProvider } from './contexts/SidebarContext.jsx'
import ErrorBoundary from './components/common/ErrorBoundary.jsx'
import { Toaster } from 'react-hot-toast'


ReactDOM.createRoot(document.getElementById('root')).render(
  <Provider store={store}>
    <SidebarProvider>
      <ErrorBoundary>
        <Toaster
          position="top-right"
          reverseOrder={false}
          gutter={8}
          toastOptions={{
            duration: 2000,
            style: {
              background: '#363636',
              color: '#fff',
              fontSize: '14px',
            },
            success: {
              duration: 2000,
              iconTheme: {
                primary: '#216633',
                secondary: '#fff',
              },
            },
            error: {
              duration: 2000,
              iconTheme: {
                primary: '#EF4444',
                secondary: '#fff',
              },
            },
          }}
        />
        <App />
      </ErrorBoundary>
    </SidebarProvider>
  </Provider>
)
