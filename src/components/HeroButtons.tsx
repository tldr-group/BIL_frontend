import React, {useContext} from "react";
import {Button, OverlayTrigger, Tooltip} from "react-bootstrap";
import {useNavigate} from "react-router-dom";
import AppContext, {isMobile} from "../interfaces/types";

import {scanMatchesSearch} from "../interfaces/helpers";
import ExportModal from "./ExportModal";

type FloatingButtonProps = {
    iconPath?: string;
    icon?: React.ReactNode;
    onClick: () => void;
    ariaLabel: string;
    badge?: number | string;
    style?: React.CSSProperties;
};

const FloatingButton: React.FC<FloatingButtonProps> = ({
    iconPath,
    icon,
    onClick,
    ariaLabel,
    badge,
    style
}) => {
    const renderTooltip = (props) => (
        <Tooltip id="button-tooltip" {...props}>
            {ariaLabel}
        </Tooltip>
    );

    return (
        <OverlayTrigger placement="right" delay={{show: 100, hide: 100}} overlay={renderTooltip}>
            <button
                onClick={onClick}
                aria-label={ariaLabel}
                style={{
                    background: "#fff",
                    borderRadius: "50%",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                    width: 48,
                    height: 48,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 12,
                    border: "none",
                    cursor: "pointer",
                    position: "relative",
                    transition: "all 0.2s ease-in-out",
                    ...style
                }}
            >
                {iconPath && (
                    <img
                        src={iconPath}
                        alt="icon"
                        style={{width: 24, height: 24, objectFit: "contain"}}
                    />
                )}
                {icon}
                {badge !== undefined && badge !== null && (
                    <span
                        style={{
                            position: "absolute",
                            top: -4,
                            right: -4,
                            background: "#e11d48",
                            color: "#fff",
                            borderRadius: "10px",
                            fontSize: "11px",
                            fontWeight: 700,
                            padding: "2px 6px",
                            minWidth: "19px",
                            height: "19px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            boxShadow: "0 2px 5px rgba(0,0,0,0.25)",
                            lineHeight: 1
                        }}
                    >
                        {badge}
                    </span>
                )}
            </button>
        </OverlayTrigger>
    );
};

export const FloatingButtons: React.FC = () => {
    const {
        isSearching: [isSearching, setIsSearching],
        selectedScanIds: [selectedScanIds, setSelectedScanIds],
        scanData: [scanData],
        searchText: [searchText],
        resRange: [resRange],
        sizeRange: [sizeRange],
        selectedModalities: [selectedModalities]
    } = useContext(AppContext)!;
    const navigate = useNavigate();

    // Local state for opening/closing the export modal
    const [showExportModal, setShowExportModal] = React.useState<boolean>(false);

    // const isMobile = isMobile();

    // Computed property: export button is visible when at least 1 scan is selected
    const isExportAvailable = selectedScanIds.length >= 1;

    const navButtonPath = isSearching ? "icons/home.png" : "icons/data.png";
    const label = isSearching ? "Home" : "Browse library";

    const handleNavClick = () => {
        if (isSearching) {
            setIsSearching(false);
            navigate("/");
        } else {
            setIsSearching(true);
            navigate("search");
        }
    };

    // Matching scans for current search filters
    const matchingScans = React.useMemo(
        () =>
            scanData.filter((s) =>
                scanMatchesSearch(s, searchText, resRange, sizeRange, selectedModalities)
            ),
        [scanData, searchText, resRange, sizeRange, selectedModalities]
    );

    const matchingIds = React.useMemo(() => matchingScans.map((s) => s.scanID), [matchingScans]);
    const allFilteredSelected =
        matchingIds.length > 0 && matchingIds.every((id) => selectedScanIds.includes(id));

    const handleToggleSelectAll = () => {
        if (allFilteredSelected) {
            setSelectedScanIds((prev) => prev.filter((id) => !matchingIds.includes(id)));
        } else {
            setSelectedScanIds((prev) => Array.from(new Set([...prev, ...matchingIds])));
        }
    };

    return (
        <div
            style={{
                position: "fixed",
                bottom: 4,
                left: 12,
                display: "flex",
                flexDirection: "column",
                zIndex: 1000
            }}
        >
            {/* 1. Circular Blue Bulk Download / Export Button (at top, computed when selectedScans.length >= 1) */}
            {isExportAvailable && !isMobile() && (
                <FloatingButton
                    onClick={() => setShowExportModal(true)}
                    ariaLabel={`Export download script (${selectedScanIds.length} selected)`}
                    badge={selectedScanIds.length}
                    style={{
                        background: "linear-gradient(135deg, #0d6efd 0%, #1d4ed8 100%)",
                        boxShadow: "0 4px 14px rgba(13,110,253,0.45)",
                        border: "2px solid #ffffff"
                    }}
                    icon={
                        <svg
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#ffffff"
                            strokeWidth="2.3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="7 10 12 15 17 10" />
                            <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                    }
                />
            )}

            {/* 2. Select/Deselect all filtered entries (always present, white button, blue tick toggle) */}
            {!isMobile() && (
                <FloatingButton
                    onClick={handleToggleSelectAll}
                    ariaLabel={
                        allFilteredSelected
                            ? `Deselect all filtered entries (${matchingIds.length})`
                            : `Select all filtered entries (${matchingIds.length})`
                    }
                    icon={
                        allFilteredSelected ? (
                            <svg
                                width="22"
                                height="22"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="#0d6efd"
                                strokeWidth="2.3"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <rect
                                    x="3"
                                    y="3"
                                    width="18"
                                    height="18"
                                    rx="4"
                                    fill="#eff6ff"
                                    stroke="#0d6efd"
                                    strokeWidth="2"
                                />
                                <polyline
                                    points="9 11 12 14 22 4"
                                    stroke="#0d6efd"
                                    strokeWidth="2.8"
                                />
                            </svg>
                        ) : (
                            <svg
                                width="22"
                                height="22"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="#94a3b8"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <rect x="3" y="3" width="18" height="18" rx="4" stroke="#94a3b8" />
                            </svg>
                        )
                    }
                />
            )}
            {/* 3. Navigation Home/Browse */}
            <FloatingButton iconPath={navButtonPath} onClick={handleNavClick} ariaLabel={label} />

            {/* 4. Scroll to Top */}
            <FloatingButton
                iconPath="icons/up.png"
                onClick={() => window.scrollTo({top: 0, behavior: "smooth"})}
                ariaLabel="Scroll to top"
            />

            {/* Export Modal */}
            {showExportModal && (
                <ExportModal show={showExportModal} onClose={() => setShowExportModal(false)} />
            )}
        </div>
    );
};

type HeroButton =
    | {label: string; type: "link"; url: string; color?: string}
    | {label: string; type: "action"; onClick: () => void; color?: string};

interface HeroButtonsProps {
    heroButtons: HeroButton[];
    isMobile: () => boolean;
}

export const HeroButtons: React.FC<HeroButtonsProps> = ({heroButtons, isMobile}) => {
    // Button sizing for even layout
    const BUTTON_WIDTH = 160;
    const BUTTON_HEIGHT = 48;

    // Helper to get shared button style
    const getButtonStyle = (color?: string, fontSize?: string) => ({
        backgroundColor: color,
        color: color ? "white" : "black",
        fontSize: fontSize || undefined,
        minWidth: BUTTON_WIDTH,
        minHeight: BUTTON_HEIGHT,
        maxWidth: BUTTON_WIDTH,
        maxHeight: BUTTON_HEIGHT,
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
    });

    // Helper to render a button (link or action)
    const renderHeroButton = (btn: HeroButton, size: "sm" | "lg", key?: React.Key) => {
        const style = getButtonStyle(btn.color, size === "sm" ? "0.95em" : undefined);
        if (btn.type === "link") {
            return (
                <Button
                    key={btn.label}
                    variant="light"
                    size={size}
                    as="a"
                    href={btn.url || undefined}
                    target={btn.url ? "_blank" : undefined}
                    rel={btn.url ? "noopener noreferrer" : undefined}
                    style={style}
                >
                    {btn.label}
                </Button>
            );
        } else {
            return (
                <Button
                    key={btn.label}
                    variant="light"
                    size={size}
                    onClick={btn.onClick}
                    style={style}
                >
                    {btn.label}
                </Button>
            );
        }
    };

    return (
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                gap: 8
            }}
        >
            {/* On mobile, stack all buttons vertically */}
            {isMobile()
                ? Array.from({length: Math.ceil(heroButtons.length / 2)}, (_, i) => (
                      <div
                          key={i}
                          style={{
                              display: "flex",
                              gap: 4,
                              marginBottom: 4
                          }}
                      >
                          {heroButtons
                              .slice(i * 2, i * 2 + 2)
                              .map((btn) => renderHeroButton(btn, "sm", btn.label))}
                      </div>
                  ))
                : [0, 1].map((row) => (
                      <div style={{display: "flex", gap: 8}} key={row}>
                          {heroButtons
                              .slice(row * 3, row * 3 + 3)
                              .map((btn) => renderHeroButton(btn, "lg", btn.label))}
                      </div>
                  ))}
        </div>
    );
};
