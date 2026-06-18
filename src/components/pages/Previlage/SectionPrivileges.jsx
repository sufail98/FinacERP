import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Search, Plus, Trash2 } from 'lucide-react';
import axiosInstance from '@/lib/axiosConfig';
import Preloader from '@/components/common/Preloader';
import useAuth from '@/redux/hook/auth/useAuth';

const SectionPrivileges = forwardRef(({ userGroupId, setAlert, setSaving, setHasUnsavedChanges }, ref) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [sections, setSections] = useState([
        { id: Date.now(), name: '', status: true, isNew: true }
    ]);
    const [modifiedPrivileges, setModifiedPrivileges] = useState({});
    const [branchId, setBranchId] = useState(1);
    const { userId } = useAuth();

    // Fetch section privileges from API
    const fetchSectionPrivileges = async () => {
        if (!userGroupId || !branchId) {
            console.error('User Group ID and Branch ID are required');
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const response = await axiosInstance.get(`get-section-privileges-byId/${userGroupId}/${branchId}`);
            const result = response.data;

            if (result.status === 200 && !result.error) {
                if (result.data && Array.isArray(result.data) && result.data.length > 0) {
                    // Map API data to sections array
                    const apiSections = result.data.map((privilege, index) => ({
                        id: privilege.id || Date.now() + index,
                        name: privilege.SectionName || '',
                        status: privilege.status || false,
                        isNew: false
                    }));
                    setSections(apiSections);
                } else {
                    // Initialize with one empty row if no data
                    setSections([{ id: Date.now(), name: '', status: true, isNew: true }]);
                }
                setModifiedPrivileges({});
            } else {
                console.error('Failed to fetch section privileges:', result.message);
                setSections([{ id: Date.now(), name: '', status: true, isNew: true }]);
            }
        } catch (error) {
            console.error('Error fetching section privileges:', error);
            setSections([{ id: Date.now(), name: '', status: true, isNew: true }]);
        } finally {
            setLoading(false);
        }
    };

    const saveSectionPrivileges = async () => {
        if (!userGroupId) {
            setAlert({ key: new Date(), type: 'error', message: 'User Group ID is required' });
            return;
        }

        // Validate: Check for empty section names
        const hasEmptySections = sections.some(section => !section.name.trim());
        if (hasEmptySections) {
            setAlert({ key: new Date(), type: 'error', message: 'Please fill in all section names' });
            return;
        }

        // Check for duplicate section names
        const sectionNames = sections.map(s => s.name.trim().toLowerCase());
        const hasDuplicates = sectionNames.some((name, index) => sectionNames.indexOf(name) !== index);
        if (hasDuplicates) {
            setAlert({ key: new Date(), type: 'error', message: 'Duplicate section names are not allowed' });
            return;
        }

        try {
            setSaving(true);

            const privilegesToSave = sections.map(section => ({
                SectionName: section.name.trim(),
                status: section.status,
                branchId: branchId
            }));

            const payload = {
                userGroupId: parseInt(userGroupId),
                userid: userId.toString(),
                privileges: privilegesToSave
            };

            const response = await axiosInstance.post('save-section-privilege', payload);
            const result = response.data;

            if (result.status === 200 && !result.error) {
                setAlert({
                    key: new Date(),
                    type: 'success',
                    message: `Section privileges saved successfully for ${privilegesToSave.length} sections`
                });
                setModifiedPrivileges({});
                setHasUnsavedChanges(false);
                await fetchSectionPrivileges();
            } else {
                setAlert({
                    key: new Date(),
                    type: 'error',
                    message: 'Failed to save section privileges: ' + (result.message || 'Unknown error')
                });
            }
        } catch (error) {
            console.error('Error saving section privileges:', error);
            setAlert({ key: new Date(), type: 'error', message: 'Error saving section privileges. Please try again.' });
        } finally {
            setSaving(false);
        }
    };

    // Expose save method to parent
    useImperativeHandle(ref, () => ({
        save: saveSectionPrivileges
    }));

    useEffect(() => {
        fetchSectionPrivileges();
    }, [userGroupId, branchId]);

    useEffect(() => {
        setHasUnsavedChanges(Object.keys(modifiedPrivileges).length > 0);
    }, [modifiedPrivileges]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
                e.preventDefault();
                if (Object.keys(modifiedPrivileges).length > 0) {
                    saveSectionPrivileges();
                }
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [modifiedPrivileges]);

    const handleSectionNameChange = (id, newName) => {
        setSections(prev => prev.map(section =>
            section.id === id ? { ...section, name: newName } : section
        ));

        setModifiedPrivileges(prev => ({
            ...prev,
            [id]: true
        }));
    };

    const handleStatusChange = (id, checked) => {
        setSections(prev => prev.map(section =>
            section.id === id ? { ...section, status: checked } : section
        ));

        setModifiedPrivileges(prev => ({
            ...prev,
            [id]: true
        }));
    };

    const handleAddSection = () => {
        const newSection = {
            id: Date.now(),
            name: '',
            status: true,
            isNew: true
        };
        setSections(prev => [...prev, newSection]);
        setModifiedPrivileges(prev => ({
            ...prev,
            [newSection.id]: true
        }));
    };

    const handleDeleteSection = (id) => {
        if (sections.length === 1) {
            setAlert({ key: new Date(), type: 'error', message: 'At least one section is required' });
            return;
        }

        setSections(prev => prev.filter(section => section.id !== id));
        setModifiedPrivileges(prev => {
            const updated = { ...prev };
            delete updated[id];
            return { ...updated, deleted: true };
        });
    };

    const handleSelectAll = () => {
        const filteredSections = getFilteredSections();
        const allChecked = filteredSections.every(section => section.status);

        setSections(prev => prev.map(section => {
            if (filteredSections.find(fs => fs.id === section.id)) {
                return { ...section, status: !allChecked };
            }
            return section;
        }));

        const newModifiedPrivileges = {};
        filteredSections.forEach(section => {
            newModifiedPrivileges[section.id] = true;
        });

        setModifiedPrivileges(prev => ({
            ...prev,
            ...newModifiedPrivileges
        }));
    };

    const isAllChecked = () => {
        const filteredSections = getFilteredSections();
        if (filteredSections.length === 0) return false;
        return filteredSections.every(section => section.status);
    };

    const getFilteredSections = () => {
        return sections.filter(section =>
            section.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    };

    if (loading) {
        return <Preloader />;
    }

    return (
        <div className="bg-white dark:bg-gray-800 overflow-hidden transition-colors">
            {/* Search Bar and Add Button */}
            <div className="mb-4 flex gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 
                        text-gray-400 dark:text-gray-500" size={16} />
                    <input
                        type="text"
                        placeholder="Search sections..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 
                            bg-white dark:bg-gray-700 
                            text-gray-900 dark:text-gray-100
                            border border-gray-300 dark:border-gray-600 
                            rounded-md 
                            placeholder:text-gray-400 dark:placeholder:text-gray-500
                            focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400
                            focus:border-blue-500 dark:focus:border-blue-400
                            transition-colors"
                    />
                </div>
                <button
                    onClick={handleAddSection}
                    className="flex items-center gap-2 px-4 py-2 
                        main-bg 
                        dark:bg-blue-700 dark:hover:bg-blue-600
                        text-white rounded-md 
                        transition-colors whitespace-nowrap"
                >
                    <Plus size={16} />
                    <span className="hidden sm:inline">Add Section</span>
                </button>
            </div>

            {/* Sections Grid */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded transition-colors">
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-100 dark:bg-gray-800 sticky top-0 transition-colors">
                            <tr>
                                <th className="text-left px-3 h-[40px] 
                                    border-b border-gray-200 dark:border-gray-700 
                                    font-medium text-gray-700 dark:text-gray-300">
                                    Section Name
                                </th>
                                <th className="text-center px-2 py-2 
                                    border-b border-gray-200 dark:border-gray-700 
                                    font-medium text-gray-700 dark:text-gray-300 
                                    w-32">
                                    <div className="flex items-center justify-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={isAllChecked()}
                                            onChange={handleSelectAll}
                                            className="w-3 h-3 cursor-pointer
                                                accent-blue-600 dark:accent-blue-500"
                                            title="Select/Deselect all sections"
                                        />
                                        <span>Access</span>
                                    </div>
                                </th>
                                <th className="text-center px-2 py-2 
                                    border-b border-gray-200 dark:border-gray-700 
                                    font-medium text-gray-700 dark:text-gray-300 
                                    w-20">
                                    Action
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {getFilteredSections().map((section, index) => (
                                <tr
                                    key={section.id}
                                    className={`hover:bg-gray-50 dark:hover:bg-gray-700 
                                        transition-colors
                                        ${index % 2 === 1
                                            ? 'bg-gray-25 dark:bg-gray-800/50'
                                            : 'bg-white dark:bg-gray-800'
                                        }`}
                                >
                                    <td className="px-3 py-2 
                                        border-b border-gray-200 dark:border-gray-700">
                                        <input
                                            type="text"
                                            value={section.name}
                                            onChange={(e) => handleSectionNameChange(section.id, e.target.value)}
                                            placeholder="Enter section name"
                                            className="w-full px-2 py-1 
                                                bg-white dark:bg-gray-700 
                                                text-gray-900 dark:text-gray-100
                                                border border-gray-300 dark:border-gray-600 
                                                rounded 
                                                placeholder:text-gray-400 dark:placeholder:text-gray-500
                                                focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400
                                                focus:border-blue-500 dark:focus:border-blue-400
                                                transition-colors"
                                        />
                                    </td>
                                    <td className="text-center px-2 py-2 
                                        border-b border-gray-200 dark:border-gray-700">
                                        <input
                                            type="checkbox"
                                            checked={section.status}
                                            onChange={(e) => handleStatusChange(section.id, e.target.checked)}
                                            className="w-4 h-4 cursor-pointer
                                                accent-blue-600 dark:accent-blue-500"
                                        />
                                    </td>
                                    <td className="text-center px-2 py-2 
                                        border-b border-gray-200 dark:border-gray-700">
                                        <button
                                            onClick={() => handleDeleteSection(section.id)}
                                            className="p-1.5 text-red-600 hover:text-red-700 
                                                dark:text-red-500 dark:hover:text-red-400
                                                hover:bg-red-50 dark:hover:bg-red-900/20
                                                rounded transition-colors"
                                            title="Delete section"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden">
                    {/* Select All for Mobile */}
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700 
                        bg-gray-50 dark:bg-gray-900">
                        <label className="flex items-center space-x-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={isAllChecked()}
                                onChange={handleSelectAll}
                                className="w-5 h-5 cursor-pointer
                                    accent-blue-600 dark:accent-blue-500"
                            />
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Select All Sections
                            </span>
                        </label>
                    </div>

                    {getFilteredSections().map((section) => (
                        <div
                            key={section.id}
                            className="p-4 
                                border-b border-gray-200 dark:border-gray-700 
                                bg-white dark:bg-gray-800 
                                transition-colors space-y-3"
                        >
                            <input
                                type="text"
                                value={section.name}
                                onChange={(e) => handleSectionNameChange(section.id, e.target.value)}
                                placeholder="Enter section name"
                                className="w-full px-3 py-2 
                                    bg-white dark:bg-gray-700 
                                    text-gray-900 dark:text-gray-100
                                    border border-gray-300 dark:border-gray-600 
                                    rounded-md 
                                    placeholder:text-gray-400 dark:placeholder:text-gray-500
                                    focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400
                                    focus:border-blue-500 dark:focus:border-blue-400
                                    transition-colors"
                            />
                            <div className="flex items-center justify-between">
                                <label className="flex items-center space-x-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={section.status}
                                        onChange={(e) => handleStatusChange(section.id, e.target.checked)}
                                        className="w-5 h-5 cursor-pointer
                                            accent-blue-600 dark:accent-blue-500"
                                    />
                                    <span className="text-sm text-gray-700 dark:text-gray-300">
                                        Has Access
                                    </span>
                                </label>
                                <button
                                    onClick={() => handleDeleteSection(section.id)}
                                    className="p-2 text-red-600 hover:text-red-700 
                                        dark:text-red-500 dark:hover:text-red-400
                                        hover:bg-red-50 dark:hover:bg-red-900/20
                                        rounded transition-colors"
                                    title="Delete section"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {getFilteredSections().length === 0 && (
                    <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                        {searchTerm ? 'No sections found matching your search.' : 'No sections available. Click "Add Section" to create one.'}
                    </div>
                )}
            </div>
        </div>
    );
});

SectionPrivileges.displayName = 'SectionPrivileges';

export default SectionPrivileges;