import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Eye, SaveAll } from 'lucide-react';

import BreadCrumb from '@/components/common/BreadCrumb';
import AlertBox from '@/components/common/AlertBox';
import WindowPlanVisibleAdmin from './windowPlanVisibleAdmin';

const SetPlanVisibleAdmin = () => {
    const { userGroupId } = useParams();
    const [alert, setAlert] = useState(null);
    const [saving, setSaving] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    // Ref to trigger save from child component
    const windowPlanVisibleRef = React.useRef();

    const handleSave = async () => {
        if (windowPlanVisibleRef.current) {
            await windowPlanVisibleRef.current.save();
        }
    };

    return (
        <>
            {alert && <AlertBox key={alert.key} message={alert.message} type={alert.type} />}

            <BreadCrumb
                routes={[
                    { title: "User Group", url: "#" },
                    { title: "Plan Visibility Settings", url: "#" },
                ]}
                heading={{ icon: Eye, title: "Plan Visibility Settings" }}
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
                    {/* Tab Content */}
                    <div className="p-2 sm:p-4 bg-gray-50 dark:bg-[#121212] transition-colors">
                        <WindowPlanVisibleAdmin
                            ref={windowPlanVisibleRef}
                            userGroupId={userGroupId}
                            setAlert={setAlert}
                            setSaving={setSaving}
                            setHasUnsavedChanges={setHasUnsavedChanges}
                        />
                    </div>
                </div>
            </div>
        </>
    );
};

export default SetPlanVisibleAdmin;