import {FC} from "react";
import {MODALITY_TO_COLOUR, type ScanDetails} from "../interfaces/types";
import type {Modality} from "../interfaces/types";
import {renderDataDims, renderModality, renderSmallestPixelSize} from "../interfaces/helpers";

import ChannelCarousel from "./ChannelCarousel";

interface SearchCardProps {
    scan: ScanDetails;
    isSelected?: boolean;
    onToggleSelect?: (scanID: number) => void;
}

// Abstracted badge component
export const ModalityBadge: FC<{
    modality: Modality;
    canClose: boolean;
    onClick: (e: Modality) => void;
    isLarge?: boolean;
}> = ({modality, canClose = false, onClick, isLarge = false}) => (
    <span
        className="badge"
        style={{
            backgroundColor: MODALITY_TO_COLOUR[modality],
            color: "#fff",
            fontWeight: 600,
            fontSize: isLarge ? "1.1em" : "0.8em",
            textAlign: "center",
            padding: isLarge ? "7px 14px" : "6px 8px",
            borderRadius: 4
        }}
    >
        {renderModality(modality)}
        {canClose && (
            <>
                &nbsp;&nbsp;
                <b onClick={(_) => onClick(modality)} style={{cursor: "pointer"}}>
                    x
                </b>
            </>
        )}
    </span>
);

const SearchCard: FC<SearchCardProps> = ({scan, isSelected = false, onToggleSelect}) => {
    const {thumbnailName, sampleName, scanModality, scanID} = scan;
    const dataDims = scan.dataDimensions_px;
    const pixelSize = scan.pixelSize_µm;

    const dataDimsText = renderDataDims(dataDims);
    const pixelSizeText = renderSmallestPixelSize(pixelSize);

    return (
        <div
            className={`search-card ${isSelected ? "selected" : ""}`}
            style={{
                border: isSelected ? "2px solid #0d6efd" : "1px solid #ccc",
                borderRadius: 8,
                overflow: "hidden",
                width: 310,
                height: 340,
                background: "#fff",
                boxShadow: isSelected ? "0 4px 14px rgba(13,110,253,0.22)" : "0 2px 8px #0001",
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "stretch",
                position: "relative"
                // transition: "border 0.2s ease, box-shadow 0.2s ease"
            }}
        >
            {/* Styled Selection Checkbox */}
            <button
                type="button"
                aria-label={isSelected ? "Deselect scan" : "Select scan for bulk export"}
                onClick={(e) => {
                    e.stopPropagation();
                    if (onToggleSelect) {
                        onToggleSelect(scanID);
                    }
                }}
                style={{
                    position: "absolute",
                    top: 10,
                    right: 10,
                    zIndex: 10,
                    width: 24,
                    height: 24,
                    borderRadius: 6,
                    border: isSelected ? "2px solid #0d6efd" : "2px solid #94a3b8",
                    backgroundColor: isSelected ? "#0d6efd" : "rgba(255, 255, 255, 0.9)",
                    boxShadow: isSelected
                        ? "0 2px 6px rgba(13,110,253,0.4)"
                        : "0 2px 5px rgba(0,0,0,0.18)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    padding: 0,
                    outline: "none",
                    backdropFilter: "blur(4px)"
                }}
            >
                {isSelected && (
                    <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#ffffff"
                        strokeWidth="3.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <polyline points="20 6 9 17 4 12" />
                    </svg>
                )}
            </button>
            <ChannelCarousel
                thumbnailName={thumbnailName}
                scanID={scanID}
                rootDir="thumbnail"
                height={200}
            />
            <div
                style={{
                    padding: 16,
                    display: "flex",
                    flexDirection: "column",
                    flex: 1
                }}
            >
                <div
                    style={{
                        fontWeight: 600,
                        fontSize: 18,
                        marginBottom: 8,
                        background: "#f5f5f5",
                        padding: "4px 12px",
                        borderRadius: 6,
                        textAlign: "center",
                        // overflowX: "scroll",
                        overflowX: "clip",
                        height: 40,
                        whiteSpace: "nowrap",
                        textOverflow: "ellipsis",
                        resize: "none"
                    }}
                >
                    {sampleName}
                </div>
                <div
                    style={{
                        display: "flex",
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 5,
                        // overflowX: "scroll",
                        flexWrap: "wrap",
                        justifyContent: "space-evenly"
                    }}
                >
                    <ModalityBadge
                        modality={scanModality}
                        canClose={false}
                        onClick={() => {
                            /**/
                        }}
                    />
                    {pixelSizeText && (
                        <div
                            style={{
                                fontSize: 14,
                                color: "#555",
                                background: "#e3eaff",
                                padding: "2px 10px",
                                borderRadius: 4
                            }}
                        >
                            {pixelSizeText}
                        </div>
                    )}
                    {dataDimsText !== "" && (
                        <div
                            style={{
                                fontSize: 14,
                                color: "#555",
                                background: "#e3eaff",
                                padding: "2px 10px",
                                borderRadius: 4
                            }}
                        >
                            {dataDimsText}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SearchCard;
