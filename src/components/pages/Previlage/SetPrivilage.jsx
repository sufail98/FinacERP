import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { UserRoundCog, SaveAll } from 'lucide-react';

import BreadCrumb from '@/components/common/BreadCrumb';
import AlertBox from '@/components/common/AlertBox';
import WindowPrivileges from './WindowPrivileges';
import SectionPrivileges from './SectionPrivileges';

const MenuPrivilegeManager = () => {
    const { userGroupId } = useParams();
    const [activeTab, setActiveTab] = useState('windows'); // 'windows' or 'sections'
    const [alert, setAlert] = useState(null);
    const [saving, setSaving] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    // Refs to trigger save from child components
    const windowPrivilegesRef = React.useRef();
    const sectionPrivilegesRef = React.useRef();

    const handleSave = async () => {
        if (activeTab === 'windows' && windowPrivilegesRef.current) {
            await windowPrivilegesRef.current.save();
        } else if (activeTab === 'sections' && sectionPrivilegesRef.current) {
            await sectionPrivilegesRef.current.save();
        }
    };

    return (
        <>
            {alert && <AlertBox key={alert.key} message={alert.message} type={alert.type} />}
            
            <BreadCrumb
                routes={[
                    { title: "User Group", url: "#" },
                    { title: "Privilege Settings", url: "#" },
                ]}
                heading={{ icon: UserRoundCog, title: "Privilege Settings" }}
                actions={[
                    {
                        label: saving ? "Saving..." : "Save",
                        type: "primary",
                        icon: SaveAll,
                        onClick: handleSave,
                        disabled: saving || !hasUnsavedChanges
                    },
                ]}
            />

            <div className="bg-gradient-to-b from-gray-50 to-white dark:from-[#121212] dark:to-[#1a1a1a] transition-colors">
                <div className="bg-white dark:bg-gray-800 overflow-hidden transition-colors">
                    {/* Tab Navigation */}
                    <div className="border-b border-gray-200 dark:border-gray-700">
                        <nav className="flex -mb-px">
                            <button
                                onClick={() => setActiveTab('windows')}
                                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors
                                    ${activeTab === 'windows'
                                        ? 'border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-500'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                                    }`}
                            >
                                Window Privileges
                            </button>
                            <button
                                onClick={() => setActiveTab('sections')}
                                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors
                                    ${activeTab === 'sections'
                                        ? 'border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-500'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                                    }`}
                            >
                                Section Privileges
                            </button>
                        </nav>
                    </div>

                    {/* Tab Content */}
                    <div className="p-2 sm:p-4 bg-gray-50 dark:bg-[#121212] transition-colors">
                        {activeTab === 'windows' && (
                            <WindowPrivileges
                                ref={windowPrivilegesRef}
                                userGroupId={userGroupId}
                                setAlert={setAlert}
                                setSaving={setSaving}
                                setHasUnsavedChanges={setHasUnsavedChanges}
                            />
                        )}
                        {activeTab === 'sections' && (
                            <SectionPrivileges
                                ref={sectionPrivilegesRef}
                                userGroupId={userGroupId}
                                setAlert={setAlert}
                                setSaving={setSaving}
                                setHasUnsavedChanges={setHasUnsavedChanges}
                            />
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};

export default MenuPrivilegeManager;