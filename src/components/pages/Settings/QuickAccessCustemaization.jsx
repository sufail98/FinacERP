import { useEffect, useState } from 'react';
import axiosInstance from '../../../lib/axiosConfig'
import useAuth from '../../../redux/hook/auth/useAuth'
import { ChevronDown, X, Edit2 } from 'lucide-react';
import { showToast } from '@/utils/toast';

const QuickAccessCustemaization = () => {
    const { selectedBranchId } = useAuth()

    const [allItems, setAllItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [userGroups, setUsers] = useState([]);

    const [selectedLeft, setSelectedLeft] = useState([]);
    const [selectedRight, setSelectedRight] = useState([]);

    const [selectedUserGroupIds, setSelectedUserGroupIds] = useState([]);
    const [showUserGroupDropdown, setShowUserGroupDropdown] = useState(false);

    const [itemUserGroups, setItemUserGroups] = useState({});
    const [editingItemId, setEditingItemId] = useState(null);

    useEffect(() => {
        fetchAllQuickAccess();
        fetchAllUserGroup()
    }, [])

    const fetchAllQuickAccess = async () => {
        setLoading(true);
        try {
            const response = await axiosInstance.get(`get-all-quickaccess/${selectedBranchId}`);
            setAllItems(response.data?.data || []);
            
            const groupsMap = {};
            response.data?.data?.forEach(item => {
                groupsMap[item.Id] = item.UserGroups || [];
            });
            setItemUserGroups(groupsMap);
        } catch (error) {
            console.error('Error fetching quick access data:', error);
            showToast.error('Error fetching quick access data');
        } finally {
            setLoading(false);
        }
    };

    const fetchAllUserGroup = async () => {
        setLoading(true);
        try {
            const response = await axiosInstance.get('user-groups');
            const groups = response.data.data || [];
            setUsers(groups);
            
            // Auto-select first group
            if (groups.length > 0 && selectedUserGroupIds.length === 0) {
                setSelectedUserGroupIds([groups[0].usergroupId]);
            }
        } catch (error) {
            console.error('Error fetching user groups:', error);
            showToast.error('Error fetching user groups');
        } finally {
            setLoading(false);
        }
    };

    const leftItems = allItems.filter((item) => item.Status === false);
    const rightItems = allItems.filter((item) => item.Status === true);

    const toggleSelect = (id, side) => {
        if (side === 'left') {
            setSelectedLeft((prev) =>
                prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
            );
        } else {
            setSelectedRight((prev) =>
                prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
            );
        }
    };

    const toggleUserGroup = (groupId) => {
        setSelectedUserGroupIds((prev) =>
            prev.includes(groupId)
                ? prev.filter((id) => id !== groupId)
                : [...prev, groupId]
        );
    };

    const toggleItemUserGroup = (itemId, groupId) => {
        setItemUserGroups((prev) => {
            const current = prev[itemId] || [];
            const groupExists = current.some(g => g.usergroupId === groupId);
            
            if (groupExists) {
                return {
                    ...prev,
                    [itemId]: current.filter(g => g.usergroupId !== groupId)
                };
            } else {
                const group = userGroups.find(g => g.usergroupId === groupId);
                return {
                    ...prev,
                    [itemId]: [...current, { 
                        usergroupId: groupId, 
                        usergroupName: group?.usergroupName || `Group ${groupId}` 
                    }]
                };
            }
        });
    };

    const saveItemUserGroups = async (itemId) => {
        const item = allItems.find(i => i.Id === itemId);
        if (!item) return;

        const groups = itemUserGroups[itemId] || [];
        const payload = [{
            id: item.Id,
            WindowName: item.WindowName,
            Status: item.Status,
            branchId: item.branchId,
            usergroupIds: groups.map(g => g.usergroupId),
            ModifiedUser: "Admin",
        }];

        setSaving(true);
        try {
            await axiosInstance.post('update-quickaccess/null', payload);
            showToast.success('User groups updated successfully');
            setEditingItemId(null);
        } catch (error) {
            console.error('Error updating user groups:', error);
            showToast.error('Error updating user groups');
        } finally {
            setSaving(false);
        }
    };

    const buildPayload = (ids, newStatus) => {
        return allItems
            .filter((item) => ids.includes(item.Id))
            .map((item) => {
                let usergroupIds = [];

                if (newStatus && selectedUserGroupIds.length > 0) {
                    usergroupIds = selectedUserGroupIds;
                } 
                else if (!newStatus) {
                    usergroupIds = [];
                }

                return {
                    id: item.Id,
                    WindowName: item.WindowName,
                    Status: newStatus,
                    branchId: item.branchId,
                    usergroupIds: usergroupIds,
                    ModifiedUser: "Admin",
                };
            });
    };

    const moveToRight = async () => {
        if (selectedLeft.length === 0 || saving) return;
        
        if (selectedUserGroupIds.length === 0) {
            showToast.error('Please select at least one user group first');
            return;
        }

        const payload = buildPayload(selectedLeft, true);
        setSaving(true);
        try {
            await axiosInstance.post('update-quickaccess/null', payload);
            
            setAllItems((prev) =>
                prev.map((item) => {
                    if (selectedLeft.includes(item.Id)) {
                        return { ...item, Status: true };
                    }
                    return item;
                })
            );

            setItemUserGroups((prev) => {
                const updated = { ...prev };
                
                selectedLeft.forEach(itemId => {
                    updated[itemId] = selectedUserGroupIds.map(groupId => {
                        const group = userGroups.find(g => g.usergroupId === groupId);
                        return {
                            usergroupId: groupId,
                            usergroupName: group?.usergroupName || `Group ${groupId}`
                        };
                    });
                });
                return updated;
            });

            setSelectedLeft([]);
            showToast.success('Items moved to quick access');
        } catch (error) {
            console.error('Error updating quick access data:', error);
            showToast.error('Error updating quick access data');
        } finally {
            setSaving(false);
        }
    };

    const moveToLeft = async () => {
        if (selectedRight.length === 0 || saving) return;
        const payload = buildPayload(selectedRight, false);
        setSaving(true);
        try {
            await axiosInstance.post('update-quickaccess/null', payload);
            setAllItems((prev) =>
                prev.map((item) =>
                    selectedRight.includes(item.Id) ? { ...item, Status: false } : item
                )
            );
            
            setItemUserGroups((prev) => {
                const updated = { ...prev };
                selectedRight.forEach(itemId => {
                    updated[itemId] = [];
                });
                return updated;
            });

            setSelectedRight([]);
            showToast.success('Items removed from quick access');
        } catch (error) {
            console.error('Error updating quick access data:', error);
            showToast.error('Error updating quick access data');
        } finally {
            setSaving(false);
        }
    };

    const getGroupName = (groupId) => {
        return userGroups.find(g => g.usergroupId === groupId)?.usergroupName || `Group ${groupId}`;
    };

    const selectedGroupNames = selectedUserGroupIds
        .map(id => getGroupName(id))
        .join(', ');

    return (
        <div className="w-full h-full p-6 bg-slate-50">
            <div className="max-w-6xl mx-auto">
                <h2 className="text-lg font-semibold text-slate-800 mb-1">Quick access setup</h2>
             

                {/* User Group Multiple Selection Dropdown */}
                <div className="mb-6 flex items-start gap-4">
                    <div className="flex-1 max-w-md relative">
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Select User Groups (for moving to quick access)
                        </label>
                      
                        <button
                            onClick={() => setShowUserGroupDropdown(!showUserGroupDropdown)}
                            className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 text-sm flex items-center justify-between hover:bg-slate-50 transition-colors"
                        >
                            <span>
                                {selectedUserGroupIds.length === 0
                                    ? 'Select user groups...'
                                    : `${selectedUserGroupIds.length} group(s) selected`}
                            </span>
                            <ChevronDown 
                                size={16} 
                                className={`transition-transform ${showUserGroupDropdown ? 'rotate-180' : ''}`}
                            />
                        </button>

                        {showUserGroupDropdown && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50">
                                {userGroups.length === 0 ? (
                                    <div className="p-3 text-sm text-slate-500">No user groups available</div>
                                ) : (
                                    <div className="max-h-48 overflow-y-auto">
                                        {userGroups.map((group) => (
                                            <label
                                                key={group.usergroupId}
                                                className="flex items-center gap-3 px-4 py-2.5 text-sm border-b border-slate-50 last:border-0 cursor-pointer hover:bg-slate-50 transition-colors"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selectedUserGroupIds.includes(group.usergroupId)}
                                                    onChange={() => toggleUserGroup(group.usergroupId)}
                                                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                                                />
                                                <span className="text-slate-700">{group.usergroupName}</span>
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Selected user groups tags */}
                        {selectedUserGroupIds.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2">
                                {selectedUserGroupIds.map((groupId) => (
                                    <div
                                        key={groupId}
                                        className="inline-flex items-center gap-1.5 bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-medium"
                                    >
                                        {getGroupName(groupId)}
                                        <button
                                            onClick={() => toggleUserGroup(groupId)}
                                            className="hover:text-indigo-900 flex-shrink-0"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        
                    </div>
                </div>

                <div className="flex items-stretch gap-3">
                    <Panel
                        title="Available"
                        count={leftItems.length}
                        items={leftItems}
                        selected={selectedLeft}
                        onToggle={(id) => toggleSelect(id, 'left')}
                        loading={loading}
                        emptyText="Nothing here. Everything is in quick access."
                        userGroups={userGroups}
                        itemUserGroups={itemUserGroups}
                        editingItemId={editingItemId}
                        onEditingChange={setEditingItemId}
                        onToggleItemUserGroup={toggleItemUserGroup}
                        onSaveGroups={saveItemUserGroups}
                        isSaving={saving}
                    />

                    <div className="flex flex-col items-center justify-center gap-3 px-1">
                        <button
                            onClick={moveToRight}
                            disabled={selectedLeft.length === 0 || saving || selectedUserGroupIds.length === 0}
                            title={selectedUserGroupIds.length === 0 ? "Select at least one user group first" : "Add to quick access"}
                            className={`w-11 h-11 rounded-full flex items-center justify-center border transition-colors
                                ${selectedLeft.length === 0 || saving || selectedUserGroupIds.length === 0
                                    ? 'bg-white border-slate-200 text-slate-300 cursor-not-allowed'
                                    : 'bg-indigo-600 border-indigo-600 text-white hover:bg-indigo-700 cursor-pointer'}`}
                        >
                            <ArrowRightIcon />
                        </button>
                        <button
                            onClick={moveToLeft}
                            disabled={selectedRight.length === 0 || saving}
                            title="Remove from quick access"
                            className={`w-11 h-11 rounded-full flex items-center justify-center border transition-colors
                                ${selectedRight.length === 0 || saving
                                    ? 'bg-white border-slate-200 text-slate-300 cursor-not-allowed'
                                    : 'bg-indigo-600 border-indigo-600 text-white hover:bg-indigo-700 cursor-pointer'}`}
                        >
                            <ArrowLeftIcon />
                        </button>
                    </div>

                    <Panel
                        title="Quick access"
                        count={rightItems.length}
                        items={rightItems}
                        selected={selectedRight}
                        onToggle={(id) => toggleSelect(id, 'right')}
                        loading={loading}
                        emptyText="No windows added yet."
                        userGroups={userGroups}
                        itemUserGroups={itemUserGroups}
                        editingItemId={editingItemId}
                        onEditingChange={setEditingItemId}
                        onToggleItemUserGroup={toggleItemUserGroup}
                        onSaveGroups={saveItemUserGroups}
                        isSaving={saving}
                    />
                </div>
            </div>
        </div>
    )
}

const Panel = ({ 
    title, 
    count, 
    items, 
    selected, 
    onToggle, 
    loading, 
    emptyText,
    userGroups,
    itemUserGroups,
    editingItemId,
    onEditingChange,
    onToggleItemUserGroup,
    onSaveGroups,
    isSaving
}) => {
    return (
        <div className="flex-1 bg-white border border-slate-200 rounded-lg overflow-y-auto max-h-[490px] flex flex-col min-w-0">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <span className="text-sm font-medium text-slate-700">{title}</span>
                <span className="text-xs text-slate-400">{count}</span>
            </div>
            <div className="flex-1 overflow-y-auto">
                {loading ? (
                    <div className="p-4 text-sm text-slate-400">Loading…</div>
                ) : items.length === 0 ? (
                    <div className="p-4 text-sm text-slate-400">{emptyText}</div>
                ) : (
                    items.map((item) => {
                        const isSelected = selected.includes(item.Id);
                        const itemGroups = itemUserGroups[item.Id] || [];
                        const isEditing = editingItemId === item.Id;

                        return (
                            <div key={item.Id} className="border-b border-slate-50 last:border-0">
                                <div
                                    onClick={() => onToggle(item.Id)}
                                    className={`px-4 py-2.5 text-sm cursor-pointer select-none transition-colors flex items-center justify-between ${
                                        isSelected
                                            ? 'bg-indigo-600 text-white'
                                            : 'text-slate-700 hover:bg-slate-100'
                                    }`}
                                >
                                    <span>{item.WindowName}</span>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onEditingChange(isEditing ? null : item.Id);
                                        }}
                                        className={`p-1 rounded transition-colors ${
                                            isSelected
                                                ? 'hover:bg-indigo-500'
                                                : 'hover:bg-slate-200'
                                        }`}
                                        title="Edit user groups"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                </div>

                                {/* Edit Mode */}
                                {isEditing && (
                                    <div className={`px-4 py-3 border-t border-slate-200 space-y-2 ${
                                        isSelected ? 'bg-indigo-50' : 'bg-slate-50'
                                    }`}>
                                        <p className="text-xs font-medium text-slate-700 mb-2">Assign to groups:</p>
                                        <div className="space-y-2 max-h-40 overflow-y-auto">
                                            {userGroups.length === 0 ? (
                                                <p className="text-xs text-slate-400">No user groups available</p>
                                            ) : (
                                                userGroups.map((group) => {
                                                    const isAssigned = itemGroups.some(g => g.usergroupId === group.usergroupId);
                                                    return (
                                                        <label
                                                            key={group.usergroupId}
                                                            className="flex items-center gap-2 cursor-pointer"
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={isAssigned}
                                                                onChange={() => onToggleItemUserGroup(item.Id, group.usergroupId)}
                                                                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                                                            />
                                                            <span className="text-xs text-slate-700">{group.usergroupName}</span>
                                                        </label>
                                                    );
                                                })
                                            )}
                                        </div>
                                        <div className="flex gap-2 pt-2 border-t border-slate-200">
                                            <button
                                                onClick={() => onSaveGroups(item.Id)}
                                                disabled={isSaving}
                                                className="flex-1 text-xs px-3 py-1.5 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors disabled:bg-slate-300"
                                            >
                                                {isSaving ? 'Saving...' : 'Save'}
                                            </button>
                                            <button
                                                onClick={() => onEditingChange(null)}
                                                className="flex-1 text-xs px-3 py-1.5 bg-slate-300 text-slate-700 rounded hover:bg-slate-400 transition-colors"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Display Groups (when not editing) */}
                                {!isEditing && itemGroups.length > 0 && (
                                    <div className={`px-4 py-2 ${
                                        isSelected ? 'bg-indigo-100' : 'bg-slate-50'
                                    }`}>
                                        <div className="flex flex-wrap gap-1">
                                            {itemGroups.map((group) => (
                                                <span
                                                    key={group.usergroupId}
                                                    className="inline-block text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded"
                                                >
                                                    {group.usergroupName}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Empty state message */}
                                {!isEditing && itemGroups.length === 0 && (
                                    <div className={`px-4 py-2 text-xs text-slate-500 ${
                                        isSelected ? 'bg-indigo-100' : 'bg-slate-50'
                                    }`}>
                                        No groups assigned. Click edit to add groups.
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

const ArrowRightIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="5" y1="12" x2="19" y2="12" />
        <polyline points="12 5 19 12 12 19" />
    </svg>
);

const ArrowLeftIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="19" y1="12" x2="5" y2="12" />
        <polyline points="12 5 5 12 12 19" />
    </svg>
);

export default QuickAccessCustemaization