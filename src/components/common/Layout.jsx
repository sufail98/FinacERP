import Sidebar from "./Sidebar"
import { Outlet, useLocation } from "react-router-dom"
import UpdateNotification from "./UpdateNotification";

const Layout = () => {
  const location = useLocation();

  // Check if current path should hide sidebar
  const hidesSidebar =
    location.pathname.includes('/invoicepdf/') ||
    location.pathname.includes('/print/') ||
    location.pathname.startsWith('/invoicepdf');

  return (
    <div className="flex bg-primary dark:bg-primary">
      {/* Sidebar - Hidden for specific routes */}
      {!hidesSidebar && <Sidebar />}

      {/* Main Content - Dynamic margin */}
      <div
        className={`flex-1 bg-primary dark:bg-primary ${hidesSidebar ? 'ml-0' : 'md:ml-[50px] ml-0'}`}
        style={{ minWidth: 0 }}
      >
        <UpdateNotification />

        <Outlet />
      </div>
    </div>
  )
}

export default Layout