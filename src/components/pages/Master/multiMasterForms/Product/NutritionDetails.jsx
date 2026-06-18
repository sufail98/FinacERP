import TextArea from '@/components/elements/theme/TextArea'
import TextInput from '@/components/elements/theme/TextInput';
import { Plus, Trash2 } from 'lucide-react';
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import PropTypes from 'prop-types';

const NutritionDetails = ({ formData, handleInputChange, onNutritionDataChange, initialBomData, viewMode = false }) => {
    const { t } = useTranslation();
    const [nutritionRows, setNutritionRows] = useState(initialBomData);

    // Call parent callback whenever nutrition data changes
    useEffect(() => {
        if (onNutritionDataChange) {
            const nutritionData = nutritionRows.filter(row => row.name && row.value);
            onNutritionDataChange(nutritionData);
        }
    }, [nutritionRows, onNutritionDataChange]);

    // Add new row
    const addRow = () => {
        setNutritionRows((prev) => [
            ...prev,
            { id: Date.now(), name: "", value: "" },
        ]);
    };

    // Remove row
    const removeRow = (id) => {
        setNutritionRows((prev) => prev.filter((row) => row.id !== id));
    };

    const handleNutritionChange = (id, field, value) => {
        setNutritionRows((prev) =>
            prev.map((row) => (row.id === id ? { ...row, [field]: value } : row))
        );
    };

    return (
        <div className="space-y-3">
            <TextArea
                name="Ingredients"
                label={t("product.form.Ingredients")}
                value={formData.Ingredients}
                onChange={handleInputChange}
                placeholder={t("product.placeholders.ingredients")}
                type="text"
                readOnly={viewMode}
            />
            
            <TextInput
                name="NutritionName"
                label={t("product.form.NutritionName")}
                value={formData.NutritionName}
                onChange={handleInputChange}
                placeholder={t("product.placeholders.NutritionName")}
                readOnly={viewMode}
            />
            
            <div className="flex items-center gap-2 mb-0 sm:mb-2 mt-2">
                <input
                    type="checkbox"
                    id="NutritionFact"
                    name="NutritionFact"
                    checked={formData.NutritionFact}
                    onChange={handleInputChange}
                    className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 
                        text-blue-600 dark:text-blue-500
                        focus:ring-blue-500 dark:focus:ring-blue-400
                        bg-white dark:bg-gray-700"
                    disabled={viewMode}
                />
                <label
                    htmlFor="NutritionFact"
                    className="text-xs font-medium whitespace-nowrap text-gray-900 dark:text-gray-100"
                >
                    {t("product.form.NutritionFact")}
                </label>
            </div>
            
            {formData.NutritionFact && (
                <div className="mt-3">
<div className="border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-[#1e1e1e]">
                        <table className="w-full min-w-[500px]">
<thead className="bg-gray-50 dark:bg-[#2c2c2c]">
                                <tr>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300 border-r border-gray-300 dark:border-gray-600 min-w-[150px]">
                                        {t("product.tables.NutritionName")}
                                    </th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300 border-r border-gray-300 dark:border-gray-600 min-w-[80px]">
                                        {t("product.tables.NutritionValue")}
                                    </th>
                                    <th className="px-3 py-2 text-center text-xs font-medium text-gray-700 dark:text-gray-300 w-12">
                                        {t("product.tables.action")}
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                                {nutritionRows.map((row) => (
                                    <tr key={row.id}>
                                        <td className="px-2 py-1 border-r border-gray-300 dark:border-gray-600">
                                            <input
                                                type="text"
                                                value={row.name}
                                                onChange={(e) =>
                                                    handleNutritionChange(row.id, "name", e.target.value)
                                                }
                                                placeholder={t("product.tables.NutritionName")}
                                                className="w-full border-0 p-1 text-xs focus:outline-none bg-transparent
                                                    text-gray-900 dark:text-gray-100
                                                    placeholder:text-gray-400 dark:placeholder:text-gray-500"
                                                readOnly={viewMode}
                                            />
                                        </td>
                                        <td className="px-2 py-1 border-r border-gray-300 dark:border-gray-600">
                                            <input
                                                type="text"
                                                value={row.value}
                                                onChange={(e) =>
                                                    handleNutritionChange(row.id, "value", e.target.value)
                                                }
                                                placeholder={t("product.tables.NutritionValue")}
                                                className="w-full border-0 p-1 text-xs focus:outline-none bg-transparent
                                                    text-gray-900 dark:text-gray-100
                                                    placeholder:text-gray-400 dark:placeholder:text-gray-500"
                                                readOnly={viewMode}
                                            />
                                        </td>
                                        <td className="px-2 py-1 text-center">
                                            <button
                                                type="button"
                                                onClick={() => removeRow(row.id)}
                                                className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                disabled={nutritionRows.length === 1 || viewMode}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
<div className="p-2 border-t border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-[#2c2c2c]">
    <button
        type="button"
        onClick={addRow}
        className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={viewMode}
    >
        <Plus className="w-4 h-4" />
        {t("product.buttons.addRow")}
    </button>
</div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default NutritionDetails

NutritionDetails.propTypes = {
    formData: PropTypes.object.isRequired,
    handleInputChange: PropTypes.func.isRequired,
    onNutritionDataChange: PropTypes.func.isRequired,
    initialBomData: PropTypes.array,
    viewMode: PropTypes.bool,
};