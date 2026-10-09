// src/components/pages/Reports/AccountGroupChart/AccountGroupChart.jsx
import BreadCrumb from '@/components/common/BreadCrumb';
import NoAcessComponent from '@/components/common/NoAcessComponent';
import Preloader from '@/components/common/Preloader';
import AlertBox from '@/components/common/AlertBox';
import axiosInstance from '@/lib/axiosConfig';
import usePrivileges from '@/lib/hooks/usePrivileges';
import useAuth from '@/redux/hook/auth/useAuth';
import { 
    GitBranch, ChevronRight, ChevronDown, Folder, FolderOpen, 
    FileText, RefreshCw, Maximize2, Minimize2
} from 'lucide-react';
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

// Helper functions
const getNodeId = (node) => {
    return node.groupId || node.GroupId || node.accountGroupId || node.id || node.ID;
};

const getNodeName = (node) => {
    return node.accountGroupName || node.AccountGroupName || node.groupName || node.name || node.Name;
};

const getNodeCode = (node) => {
    return node.AccountGroupCode || node.accountGroupCode || node.code || '';
};

// Recursive Tree Node Component
const TreeNode = ({ node, level = 0, expandedNodes, toggleNode }) => {
    const nodeId = getNodeId(node);
    const nodeName = getNodeName(node);
    const nodeCode = getNodeCode(node);
    const isExpanded = expandedNodes.has(nodeId);
    const hasChildren = node.children && node.children.length > 0;

    return (
        <div>
            <div
                className="flex items-center py-1.5 px-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded cursor-pointer transition-colors"
                style={{ paddingLeft: `${level * 20 + 8}px` }}
                onClick={() => hasChildren && toggleNode(nodeId)}
            >
                {/* Expand/Collapse Icon */}
                <span className="w-5 h-5 flex items-center justify-center mr-1 flex-shrink-0">
                    {hasChildren ? (
                        isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                        ) : (
                            <ChevronRight className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                        )
                    ) : (
                        <span className="w-4" />
                    )}
                </span>

                {/* Folder Icon */}
                {isExpanded && hasChildren ? (
                    <FolderOpen className="w-4 h-4 mr-2 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                ) : (
                    <Folder className="w-4 h-4 mr-2 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                )}

                {/* Node Name */}
                <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                    {nodeName}
                </span>

                {/* Account Code Badge */}
                {nodeCode && (
                    <span className="ml-2 px-1.5 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded flex-shrink-0">
                        {nodeCode}
                    </span>
                )}

                {/* Child count badge */}
                {hasChildren && (
                    <span className="ml-2 px-1.5 py-0.5 text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded flex-shrink-0">
                        {node.children.length}
                    </span>
                )}
            </div>

            {/* Children */}
            {hasChildren && isExpanded && (
                <div 
                    className="border-l border-gray-200 dark:border-gray-700" 
                    style={{ marginLeft: `${level * 20 + 18}px` }}
                >
                    {node.children.map((child, index) => (
                        <TreeNode
                            key={getNodeId(child) || `child-${index}`}
                            node={child}
                            level={level + 1}
                            expandedNodes={expandedNodes}
                            toggleNode={toggleNode}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

const AccountGroupChart = () => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [treeData, setTreeData] = useState([]);
    const [alert, setAlert] = useState(null);
    const [expandedNodes, setExpandedNodes] = useState(new Set());

    const { selectedBranchId } = useAuth();
    const { loading: privilegeLoading, hasAccess, message } = usePrivileges("Chart of Accounts");

    // Build complete tree from flat data
    const buildTreeFromFlatData = useCallback((flatData) => {
        if (!Array.isArray(flatData) || flatData.length === 0) return [];

        const itemMap = new Map();
        flatData.forEach(item => {
            const id = getNodeId(item);
            itemMap.set(id, { ...item, children: [] });
        });

        const roots = [];

        flatData.forEach(item => {
            const id = getNodeId(item);
            const parentId = item.groupUnder;
            const currentItem = itemMap.get(id);

            if (parentId === 0 || parentId === null || parentId === undefined) {
                roots.push(currentItem);
            } else if (itemMap.has(parentId)) {
                itemMap.get(parentId).children.push(currentItem);
            } else {
                roots.push(currentItem);
            }
        });

        // Sort alphabetically
        const sortChildren = (nodes) => {
            nodes.sort((a, b) => getNodeName(a).localeCompare(getNodeName(b)));
            nodes.forEach(node => {
                if (node.children?.length > 0) sortChildren(node.children);
            });
        };
        sortChildren(roots);

        return roots;
    }, []);

    // Load all account groups on mount
    useEffect(() => {
        loadAllAccountGroups();
    }, [selectedBranchId]);

    const loadAllAccountGroups = async () => {
        setLoading(true);
        setAlert(null);

        try {
            const res = await axiosInstance.get("accountgroups");
            const flatData = res.data?.data || res.data || [];

            if (flatData.length === 0) {
                setAlert({
                    id: Date.now(),
                    type: 'info',
                    message: t('No account groups found')
                });
                setTreeData([]);
            } else {
                const tree = buildTreeFromFlatData(flatData);
                setTreeData(tree);
                // Expand first level by default
                setExpandedNodes(new Set(tree.map(node => getNodeId(node))));
            }
        } catch (error) {
            setAlert({
                id: Date.now(),
                type: 'error',
                message: error.response?.data?.message || t('Failed to load account groups')
            });
            setTreeData([]);
        } finally {
            setLoading(false);
        }
    };

    const toggleNode = useCallback((nodeId) => {
        setExpandedNodes(prev => {
            const newSet = new Set(prev);
            if (newSet.has(nodeId)) {
                newSet.delete(nodeId);
            } else {
                newSet.add(nodeId);
            }
            return newSet;
        });
    }, []);

    // Get all expandable node IDs
    const allNodeIds = useMemo(() => {
        const ids = new Set();
        const collectIds = (nodes) => {
            nodes.forEach(node => {
                if (node.children?.length > 0) {
                    ids.add(getNodeId(node));
                    collectIds(node.children);
                }
            });
        };
        collectIds(treeData);
        return ids;
    }, [treeData]);

    const expandAll = () => setExpandedNodes(new Set(allNodeIds));
    const collapseAll = () => setExpandedNodes(new Set());

    // Count total groups
    const totalGroups = useMemo(() => {
        let count = 0;
        const countNodes = (nodes) => {
            nodes.forEach(node => {
                count++;
                if (node.children) countNodes(node.children);
            });
        };
        countNodes(treeData);
        return count;
    }, [treeData]);

    if (privilegeLoading) {
        return (
            <div>
                <BreadCrumb
                    routes={[
                        { title: t("Reports"), url: "#" },
                        { title: t("Chart of Account"), url: "#" },
                    ]}
                    heading={{ icon: GitBranch, title: t("Chart of Account") }}
                />
                <Preloader />
            </div>
        );
    }

    if (!hasAccess) {
        return (
            <div>
                <BreadCrumb
                    routes={[
                        { title: t("Reports"), url: "#" },
                        { title: t("Chart of Account"), url: "#" },
                    ]}
                    heading={{ icon: GitBranch, title: t("Chart of Account") }}
                />
                <NoAcessComponent message={message} />
            </div>
        );
    }

    return (
        <div>
            {alert && (
                <AlertBox key={alert.id} message={alert.message} type={alert.type} />
            )}

            <BreadCrumb
                routes={[
                    { title: t("Reports"), url: "#" },
                    { title: t("Chart of Account"), url: "#" },
                ]}
                heading={{ icon: GitBranch, title: t("Chart of Account") }}
            />

            <div className="px-1">
                {/* Toolbar */}
                <div className="bg-white dark:bg-[#1e1e1e] rounded-lg p-3 mb-3 border border-gray-200 dark:border-gray-700">
                    <div className="flex flex-wrap items-center gap-3">
                        {/* Stats */}
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                            <span className="font-semibold text-blue-600 dark:text-blue-400">{totalGroups}</span> {t('Account Groups')}
                        </span>

                        <div className="flex-1" />

                        {/* Buttons */}
                        <button
                            onClick={expandAll}
                            disabled={loading}
                            className="h-[36px] px-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center gap-2 disabled:opacity-50"
                        >
                            <Maximize2 className="w-4 h-4" />
                            {t('Expand All')}
                        </button>
                        <button
                            onClick={collapseAll}
                            disabled={loading}
                            className="h-[36px] px-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center gap-2 disabled:opacity-50"
                        >
                            <Minimize2 className="w-4 h-4" />
                            {t('Collapse All')}
                        </button>
                        <button
                            onClick={loadAllAccountGroups}
                            disabled={loading}
                            className="h-[36px] px-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                            title={t('Refresh')}
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>

                {/* Legend */}
                <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-white dark:bg-[#1e1e1e] rounded-md border border-gray-200 dark:border-gray-700">
                    <Folder className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                        {t('Account Group')}
                    </span>
                </div>

                {/* Loading */}
                {loading && (
                    <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-[#1e1e1e] rounded-lg border border-gray-200 dark:border-gray-700">
                        <RefreshCw className="w-10 h-10 animate-spin text-blue-600 mb-4" />
                        <span className="text-gray-600 dark:text-gray-400 text-lg">{t('Loading...')}</span>
                    </div>
                )}

                {/* Tree */}
                {!loading && treeData.length > 0 && (
                    <div className="bg-white dark:bg-[#1e1e1e] rounded-lg border border-gray-200 dark:border-gray-700 p-4 min-h-[500px] max-h-[calc(100vh-280px)] overflow-y-auto">
                        {treeData.map((node, index) => (
                            <TreeNode
                                key={getNodeId(node) || `root-${index}`}
                                node={node}
                                level={0}
                                expandedNodes={expandedNodes}
                                toggleNode={toggleNode}
                            />
                        ))}
                    </div>
                )}

                {/* Empty */}
                {!loading && treeData.length === 0 && (
                    <div className="bg-white dark:bg-[#1e1e1e] rounded-lg border border-gray-200 dark:border-gray-700 p-16 text-center">
                        <GitBranch className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                        <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
                            {t('No Account Groups Found')}
                        </h3>
                        <button
                            onClick={loadAllAccountGroups}
                            className="mt-4 px-4 py-2 main-bg text-white rounded-md hover:bg-blue-700"
                        >
                            {t('Retry')}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AccountGroupChart;