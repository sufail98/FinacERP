import { useEffect, useState } from 'react';
import { HelpCircle, X, Keyboard, BookOpen, ChevronDown } from 'lucide-react';
import {
    Drawer,
    Fab,
    IconButton,
    Tabs,
    Tab,
    Box,
    Typography,
    Chip,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Divider,
} from '@mui/material';
import { useQuickAccessAvailable } from '../../lib/hooks/useQuickAccessAvailable';

const HelpShortcuts = ({
    title = 'Help',
    groups = [],
    manual = [],
    buttonPosition = 'bottom-6 left-22',
    defaultTab = 'shortcuts',
    hideNearBottom = false,
    showFloatingButton = true, // NEW: allow hiding the floating FAB when triggered externally
    open: controlledOpen,       // NEW: optional controlled open state
    onOpenChange,               // NEW: optional callback when open state changes
}) => {
    const [internalOpen, setInternalOpen] = useState(false);
    const isControlled = controlledOpen !== undefined;
    const open = isControlled ? controlledOpen : internalOpen;

    const setOpen = (value) => {
        if (isControlled) {
            onOpenChange?.(value);
        } else {
            setInternalOpen(value);
        }
    };

    const [nearBottom, setNearBottom] = useState(false);
    const [activeTab, setActiveTab] = useState(defaultTab);
    const [expandedManualIdx, setExpandedManualIdx] = useState(0);

    const quickAccessAvailable = useQuickAccessAvailable();

    const effectiveButtonPosition =
        quickAccessAvailable === false && buttonPosition.includes('right-22')
            ? buttonPosition.replace('right-22', 'right-6')
            : buttonPosition;

    useEffect(() => {
        if (!hideNearBottom) return;
        const handleScroll = () => {
            const scrolledToBottom =
                window.innerHeight + window.scrollY >= document.body.offsetHeight - 100;
            setNearBottom(scrolledToBottom);
        };
        window.addEventListener('scroll', handleScroll);
        handleScroll();
        return () => window.removeEventListener('scroll', handleScroll);
    }, [hideNearBottom]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.altKey && e.key === '/') {
                e.preventDefault();
                setOpen(!open);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const showShortcutsTab = groups.length > 0;
    const showManualTab = manual.length > 0;
    const showTabsBar = showShortcutsTab && showManualTab;

    return (
        <>
            {showFloatingButton && !open && (
                <button
                    onClick={() => setOpen(true)}
                    title="Help / Shortcuts (Alt + /)"
                    className={`fixed ${effectiveButtonPosition} z-[9998] flex items-center justify-center
                        w-12 h-12 rounded-full shadow-lg main-bg text-white
                        hover:scale-105 active:scale-95 transition-all duration-200
                        focus:outline-none focus:ring-2 focus:ring-blue-400
                        ${nearBottom ? 'opacity-40 scale-90' : 'opacity-100 scale-100'}`}
                >
                    <HelpCircle size={24} />
                </button>
            )}

            <Drawer
                anchor="right"
                open={open}
                onClose={() => setOpen(false)}
                transitionDuration={300}
                ModalProps={{ keepMounted: true }}
                PaperProps={{
                    className: 'bg-primary dark:bg-primary border-themed dark:border-themed z-[9999999999999]',
                    sx: {
                        width: { xs: '100%', sm: 440 },
                        display: 'flex',
                        flexDirection: 'column',
                        borderLeft: '1px solid',
                        borderColor: 'divider',
                    },
                }}
            >
                <Box
                    className="bg-secondary dark:bg-secondary"
                    sx={{
                        display: 'flex',
                        alignItems: 'end',
                        justifyContent: 'space-between',
                        px: 2,
                        pb: 0.8,
                        height: 86,
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Keyboard size={20} />
                        <Typography variant="subtitle1" fontWeight={600}>
                            {title}
                        </Typography>
                    </Box>
                    <IconButton size="small" onClick={() => setOpen(false)}>
                        <X size={22} />
                    </IconButton>
                </Box>

                {showTabsBar && (
                    <Tabs
                        value={activeTab}
                        onChange={(_, val) => setActiveTab(val)}
                        variant="fullWidth"
                        sx={{ borderBottom: '1px solid', borderColor: 'divider', minHeight: 44 }}
                    >
                        <Tab
                            value="shortcuts"
                            label="Shortcuts"
                            icon={<Keyboard size={16} />}
                            iconPosition="start"
                            sx={{ minHeight: 44, textTransform: 'none' }}
                        />
                        <Tab
                            value="manual"
                            label="User Manual"
                            icon={<BookOpen size={16} />}
                            iconPosition="start"
                            sx={{ minHeight: 44, textTransform: 'none' }}
                        />
                    </Tabs>
                )}

                <Box sx={{ flex: 1, overflowY: 'auto', px: 2, py: 1.5 }} className="custom-scrollbar">
                    {activeTab === 'shortcuts' && showShortcutsTab && (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                            {groups.map((group, gIdx) => (
                                <Box key={gIdx}>
                                    <Typography
                                        variant="caption"
                                        sx={{
                                            fontWeight: 600,
                                            textTransform: 'uppercase',
                                            letterSpacing: 0.5,
                                            color: 'text.secondary',
                                            mb: 1,
                                            display: 'block',
                                        }}
                                    >
                                        {group.heading}
                                    </Typography>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                        {group.items.map((item, iIdx) => (
                                            <Box
                                                key={iIdx}
                                                className="hover:bg-hover dark:hover:bg-hover"
                                                sx={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    gap: 1.5,
                                                    py: 0.75,
                                                    px: 1,
                                                    borderRadius: 1,
                                                }}
                                            >
                                                <Typography variant="body2">{item.description}</Typography>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
                                                    {item.keys.map((key, kIdx) => (
                                                        <Box key={kIdx} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                            <Chip
                                                                label={key}
                                                                size="small"
                                                                variant="outlined"
                                                                sx={{
                                                                    height: 22,
                                                                    fontSize: '0.7rem',
                                                                    fontWeight: 600,
                                                                    fontFamily: 'monospace',
                                                                }}
                                                            />
                                                            {kIdx < item.keys.length - 1 && (
                                                                <Typography variant="caption" color="text.secondary">
                                                                    +
                                                                </Typography>
                                                            )}
                                                        </Box>
                                                    ))}
                                                </Box>
                                            </Box>
                                        ))}
                                    </Box>
                                </Box>
                            ))}
                        </Box>
                    )}

                    {activeTab === 'manual' && showManualTab && (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            {manual.map((section, sIdx) => (
                                <Accordion
                                    key={sIdx}
                                    expanded={expandedManualIdx === sIdx}
                                    onChange={() => setExpandedManualIdx(expandedManualIdx === sIdx ? -1 : sIdx)}
                                    disableGutters
                                    elevation={0}
                                    sx={{
                                        border: '1px solid',
                                        borderColor: 'divider',
                                        '&:before': { display: 'none' },
                                    }}
                                >
                                    <AccordionSummary
                                        expandIcon={<ChevronDown size={16} />}
                                        className="bg-secondary dark:bg-secondary"
                                    >
                                        <Typography variant="body2" fontWeight={600}>
                                            {sIdx + 1}. {section.heading}
                                        </Typography>
                                    </AccordionSummary>
                                    <AccordionDetails>
                                        <Box component="ol" sx={{ pl: 2.5, m: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
                                            {section.steps.map((step, stIdx) => (
                                                <Typography component="li" variant="body2" key={stIdx} sx={{ lineHeight: 1.6 }}>
                                                    {step}
                                                </Typography>
                                            ))}
                                        </Box>
                                        {section.note && (
                                            <Typography
                                                variant="caption"
                                                sx={{ display: 'block', mt: 1, fontStyle: 'italic', color: 'text.secondary' }}
                                            >
                                                💡 {section.note}
                                            </Typography>
                                        )}
                                    </AccordionDetails>
                                </Accordion>
                            ))}
                        </Box>
                    )}

                    {!showShortcutsTab && !showManualTab && (
                        <Typography variant="body2" color="text.secondary">
                            No help content configured for this page.
                        </Typography>
                    )}
                </Box>

                <Divider />

                <Box sx={{ px: 2, py: 1, textAlign: 'center' }}>
                    <Typography variant="caption" color="text.secondary">
                        Press{' '}
                        <Box component="kbd" sx={{ px: 0.5, border: '1px solid', borderColor: 'divider', borderRadius: 0.5 }}>
                            Esc
                        </Box>{' '}
                        or click outside to close
                    </Typography>
                </Box>
            </Drawer>
        </>
    );
};

export default HelpShortcuts;