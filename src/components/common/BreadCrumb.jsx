import { Link, useNavigate } from "react-router-dom";
import { ChevronRight, CornerLeftUp, Loader2, MoreHorizontal, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useRef, useEffect } from "react";
import ExportDropdown from "./ExportDropdown";

const MAX_VISIBLE_MOBILE = 1;

const BreadCrumb = ({ routes, actions = [], heading, exportConfig = null, customActions = null, onHelpClick = null }) => {
    const navigate = useNavigate();
    const [showAllRoutes, setShowAllRoutes] = useState(false);
    const [mobileOverflowOpen, setMobileOverflowOpen] = useState(false);
    const overflowRef = useRef(null);

    const shouldTruncateRoutes = routes && routes.length > 2;
    const displayRoutes = shouldTruncateRoutes && !showAllRoutes
        ? [routes[0], routes[routes.length - 1]]
        : routes;

    const regularActions = actions.filter(action => action.actionType !== 'export');
    const exportAction = actions.find(action => action.actionType === 'export');
const primaryTypeAction = regularActions.find(a => a.type === 'primary');
const otherActions = regularActions.filter(a => a !== primaryTypeAction);

const primaryActions = primaryTypeAction 
    ? [primaryTypeAction] 
    : regularActions.slice(0, MAX_VISIBLE_MOBILE);

const overflowActions = primaryTypeAction 
    ? otherActions 
    : regularActions.slice(MAX_VISIBLE_MOBILE);
    // const primaryActions = regularActions.slice(0, MAX_VISIBLE_MOBILE);
    // const overflowActions = regularActions.slice(MAX_VISIBLE_MOBILE);
    const hasOverflow = overflowActions.length > 0 || exportAction || exportConfig || customActions;

    useEffect(() => {
        const handler = (e) => {
            if (overflowRef.current && !overflowRef.current.contains(e.target)) {
                setMobileOverflowOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const ActionButton = ({ action, idx, fullWidth = false }) => (
        <Button
            key={idx}
            onClick={() => { action.onClick?.(); }}
            className={
                fullWidth
                    ? `w-full justify-start gap-2 text-sm rounded-none px-3 py-2 h-auto font-normal
           ${action.type === "primary"
                        ? "main-bg text-white hover:opacity-90"
                        : action.type === "tertiary"
                            ? "bg-green-700 text-white hover:bg-green-800"
                            : "bg-transparent text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"}`
                    : `flex items-center gap-1 flex-shrink-0 text-xs
           ${action.type === "primary"
                        ? "main-bg text-white hover:opacity-90"
                        : action.type === "tertiary"
                            ? "bg-green-700 text-white hover:bg-green-800"
                            : "bg-gray-200 border border-[#4e23485c] text-[#4e2348] hover:opacity-90 hover:text-white"}`
            }
            size="sm"
            disabled={action.loading}
            title={action.label || ""}
        >
            {action.loading ? (
                <Loader2 className={`${fullWidth ? 'w-4 h-4' : 'w-3 h-3'} animate-spin`} />
            ) : (
                action.icon && (
                    <action.icon className={`${fullWidth ? 'w-4 h-4' : 'w-3 h-3'}`} />
                )
            )}
            {action.label && (
                <span className={`${fullWidth ? 'text-sm' : 'text-sm font-semibold'} truncate`}>
                    {action.label}
                </span>
            )}
        </Button>
    );

    const HelpIconButton = ({ size = 18 }) => (
        <button
            type="button"
            onClick={onHelpClick}
            title="Help (Alt + /)"
            className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full
                       text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100
                       hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors focus:outline-none"
        >
            <HelpCircle size={size} />
        </button>
    );

    return (
        <div className="bg-gray-50 dark:bg-gray-900 px-2 md:px-0 border-b border-gray-300 dark:border-gray-700 sticky top-[45px] z-50 transition-colors">
            <div className="flex flex-col lg:px-4 gap-0">
                <div className="flex items-center w-full h-[44px] gap-2 relative">

                    {/* Back button */}
                    <CornerLeftUp
                        className="flex-shrink-0 w-8 h-7 rounded-sm p-1 cursor-pointer transition-colors
                          main-bg text-gray-100 dark:bg-gray-700 dark:text-gray-300
                          hover:opacity-80"
                        onClick={() => navigate(-1)}
                    />

                    {/* Desktop breadcrumb */}
                    <div className="hidden lg:flex items-center overflow-hidden min-w-0">
                        {displayRoutes?.map((route, index) => (
                            <div key={index} className="flex items-center flex-shrink-0">
                                {index !== 0 && (
                                    <>
                                        {shouldTruncateRoutes && !showAllRoutes && index === 1 ? (
                                            <div className="flex items-center">
                                                <MoreHorizontal
                                                    className="w-4 h-4 text-gray-500 dark:text-gray-400 mx-1 lg:mx-2 cursor-pointer hover:text-gray-700"
                                                    onClick={() => setShowAllRoutes(true)}
                                                />
                                                <ChevronRight className="w-4 h-4 text-gray-500 dark:text-gray-400 mx-1 lg:mx-2" />
                                            </div>
                                        ) : (
                                            <ChevronRight className="w-4 h-4 text-gray-500 dark:text-gray-400 mx-1 lg:mx-2 flex-shrink-0" />
                                        )}
                                    </>
                                )}
                                {index === displayRoutes.length - 1 ? (
                                <>
                                    <span className="text-gray-700 dark:text-gray-300 lg:font-bold xl:font-normal text-xs lg:text-lg xl:text-sm font-medium truncate">
                                        {route.title}
                                    </span>
                                    <span className="hidden lg:flex xl:hidden">{onHelpClick && <HelpIconButton size={18} />}</span>
                                </>
                                ) : (
                                    <Link
                                        to={route.url}
                                        className="text-gray-600 dark:text-gray-400 hover:underline text-xs lg:text-sm truncate hover:text-gray-800 transition-colors"
                                    >
                                        {route.title}
                                    </Link>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Heading */}
                    {heading && (
                        <>
                            {/* Mobile / tablet (below lg): centered heading in remaining space */}
                            <div className="flex lg:hidden flex-1 items-center justify-center min-w-0 overflow-hidden gap-1.5">
                                {heading.icon && (
                                    <heading.icon className="h-4 w-4 flex-shrink-0 text-gray-700 dark:text-gray-300 mr-1" />
                                )}
                                <h1 className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">
                                    {heading.title}
                                </h1>
                                {onHelpClick && <HelpIconButton size={16} />}
                            </div>

                            {/* Desktop (lg+): absolutely centered in the bar */}
                            <div className="hidden xl:flex absolute inset-0 items-center justify-center pointer-events-none">
                                <div className="flex items-center space-x-2 pointer-events-auto">
                                    {heading.icon && (
                                        <heading.icon className="h-5 w-5 flex-shrink-0 text-gray-700 dark:text-gray-300" />
                                    )}
                                    <h1 className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-gray-100 whitespace-nowrap">
                                        {heading.title}
                                    </h1>
                                    {onHelpClick && <HelpIconButton size={18} />}
                                </div>
                            </div>
                        </>
                    )}

                    {/* Spacer pushes actions to the right on desktop */}
                    <div className="hidden lg:flex flex-1" />

                    {/* ── Desktop actions ── */}
                    <div className="hidden lg:flex items-center gap-2 flex-shrink-0">
                        {customActions && <div className="flex items-center gap-2">{customActions}</div>}
                        {regularActions.map((action, idx) => (
                            <ActionButton action={action} idx={idx} key={idx} />
                        ))}
                        {exportConfig && (
                            <ExportDropdown {...exportConfig} label={exportConfig.label || "Export"} size="sm" />
                        )}
                        {exportAction && !exportConfig && (
                            <ExportDropdown {...exportAction} label={exportAction.label || "Export"} size="sm" />
                        )}
                    </div>

                    {/* ── Compact actions (below lg) ── */}
                    <div className="flex lg:hidden items-center gap-1.5 flex-shrink-0">
                        {/* Primary action always visible */}
                        {primaryActions.map((action, idx) => (
                            <ActionButton action={action} idx={idx} key={idx} />
                        ))}

                        {/* Overflow ⋯ */}
                        {hasOverflow && (
                            <div ref={overflowRef} className="relative">
                                <button
                                    className="w-8 h-8 flex items-center justify-center rounded-md bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                                    onClick={() => setMobileOverflowOpen(v => !v)}
                                    aria-label="More actions"
                                >
                                    <MoreHorizontal className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                                </button>

                                {mobileOverflowOpen && (
                                    <div className="absolute right-0 top-full mt-1 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50 ">

                                        {customActions && (
                                            <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700">
                                                <div className="flex flex-col gap-2">
                                                    {customActions}
                                                </div>
                                            </div>
                                        )}

                                        {overflowActions.map((action, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => { action.onClick?.(); setMobileOverflowOpen(false); }}
                                                disabled={action.loading}
                                                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors text-left"
                                            >
                                                {action.icon && (
                                                    <action.icon className={`w-4 h-4 flex-shrink-0 ${action.loading ? 'animate-spin' : ''}`} />
                                                )}
                                                <span className="truncate">
                                                    {action.loading ? action.loadingText : action.label}
                                                </span>
                                            </button>
                                        ))}

                                        {(exportConfig || exportAction) && (
                                            <div className="px-2 py-1 border-t border-gray-100 dark:border-gray-700">
                                                <ExportDropdown
                                                    {...(exportConfig || exportAction)}
                                                    label={(exportConfig || exportAction)?.label || "Export"}
                                                    size="sm"
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BreadCrumb;