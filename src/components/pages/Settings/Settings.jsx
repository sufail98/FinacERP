import { useState } from "react"
import BreadCrumb from "@/components/common/BreadCrumb"
import { Settings2, Blocks, Award, ShoppingCart, ChartNoAxesCombined, Download, ScreenShare } from "lucide-react"
import GeneralSettings from "./GeneralSettings"
import InventorySettings from "./InventorySettings"
import FinanceSettings from "./FinanceSettings"
import PurchaseSettings from "./PurchaseSettings"
import SalesSettings from "./SalesSettings"
import PrinterSettings from "./PrinterSettings"
import SystemSettings from "./SystemSettings"
import ZatcaSettings from "./ZatcaSettings"
import { useSelector } from "react-redux"

const Settings = () => {
    const [activeTab, setActiveTab] = useState('general')
    const { generalSettings } = useSelector((state) => state.settings)

    const tabs = [
        { id: 'general', label: 'General Settings', icon: Settings2 },
        { id: 'inventory', label: 'Inventory Settings', icon: Blocks },
        { id: 'finance', label: 'Finance Settings', icon: Award },
        { id: 'purchase', label: 'Purchase Settings', icon: ShoppingCart },
        { id: 'sales', label: 'Sales Settings', icon: ChartNoAxesCombined },

        ...(generalSettings.zatcaType === 'Phase 2'
            ? [{ id: 'zatcaSettings', label: 'ZATCA Settings', icon: ChartNoAxesCombined }]
            : []),

        { id: 'printer', label: 'Printer Settings', icon: Download },
    ];

    const renderTabContent = () => {
        switch (activeTab) {
            case 'general':
                return <GeneralSettings />;

            case 'inventory':
                return <InventorySettings />;

            case 'finance':
                return <FinanceSettings />;

            case 'purchase':
                return <PurchaseSettings />;

            case 'sales':
                return <SalesSettings />;

            case 'printer':
                return <PrinterSettings />;

            case 'systemSettings':
                return <SystemSettings />;

            case 'zatcaSettings':
                return generalSettings.zatcaType === 'Phase 2'
                    ? <ZatcaSettings />
                    : null;

            default:
                return null;
        }
    };


    return (
        <div className="bg-gray-50 dark:bg-[#121212] transition-colors">
            <BreadCrumb
                routes={[
                    { title: "Settings", url: "#" },
                ]}
                heading={{
                    icon: Settings2,
                    title: 'Settings',
                }}
            />

            {/* Tab Header */}
            <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1e1e1e] transition-colors">
                <div className="px-2 sm:px-2 lg:px-3">
                    <nav className="-mb-px flex space-x-4 overflow-x-auto" aria-label="Tabs">
                        {tabs.map((tab) => {
                            const Icon = tab.icon
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`
                                        cursor-pointer group inline-flex items-center border-b-2 py-2 px-1 text-sm font-medium transition-colors duration-200 whitespace-nowrap
                                        ${activeTab === tab.id
                                            ? 'border-[#2b216a] dark:border-blue-400 text-[#2b216a] dark:text-blue-400'
                                            : 'border-transparent text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600 hover:text-gray-700 dark:hover:text-gray-300'
                                        }
                                    `}
                                    aria-current={activeTab === tab.id ? 'page' : undefined}
                                >
                                    <Icon
                                        className={`
                                            -ml-0.5 mr-2 h-5 w-5 transition-colors duration-200
                                            ${activeTab === tab.id
                                                ? 'text-[#2b216a] dark:text-blue-400'
                                                : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-500 dark:group-hover:text-gray-400'
                                            }
                                        `}
                                    />
                                    {tab.label}
                                </button>
                            )
                        })}
                    </nav>
                </div>
            </div>

            {/* Tab Content */}
            <div className="">
                {renderTabContent()}
            </div>
        </div>
    )
}

export default Settings