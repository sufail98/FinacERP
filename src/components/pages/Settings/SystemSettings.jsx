import AlertBox from '@/components/common/AlertBox'
import NormalSelectInput from '@/components/elements/theme/NormalSelectInput'
import { Button } from '@/components/ui/button';
import { showToast } from '@/utils/toast';
import React, { useState } from 'react'

const SystemSettings = () => {
    const initialprintType = localStorage.getItem('printType');

    const [printType, setPrintType] = useState(initialprintType || 'a4')
    const [saved, setSaved] = useState(false)

    const handlePrintTypeChange = (e) => {
        setPrintType(e.target.value)
        setSaved(false)
    }

    const handleSave = () => {
        localStorage.setItem('printType', printType)
       showToast.success("Print type saved successfully");
    }

    return (
        <>
            <div className="p-2 bg-white dark:bg-[#121212] transition-colors">
                <div className="">
                    <div className="w-[30%]">
                        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6">System Settings</h1>

                        <div className="space-y-6">
                            <div>
                                <NormalSelectInput
                                    name="crOrDr"
                                    label='Select Print Type'
                                    value={printType}
                                    onChange={handlePrintTypeChange}
                                    placeholder='Select print type'
                                    options={[
                                        { value: "type1", label: "Type 1" },
                                        { value: "type2", label: "Type 2" },
                                        { value: "type3", label: "Type 3" },
                                        { value: "thermal", label: "Thermal print" },
                                    ]}
                                    required
                                />
                            </div>

                            <div className="fixed bottom-0 left-10 right-0 flex gap-3 p-4 justify-start bg-white dark:bg-[#121212] border-t border-gray-200 dark:border-gray-700">
                                <Button
                                    onClick={handleSave}
                                    className="px-6 py-2 main-bg text-white rounded-md hover:opacity-90 transition-colors font-medium"
                                >
                                    Save
                                </Button>
                            </div>

                         
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}

export default SystemSettings