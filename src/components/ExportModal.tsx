import React, {FC, useState, useMemo, useContext} from "react";
import {Modal, Button, Form, Accordion, Badge, InputGroup} from "react-bootstrap";
import AppContext, {ScanDetails} from "../interfaces/types";
import {ModalityBadge} from "./SearchCard";
import {
    generatePythonScript,
    generateBashScript,
    ScriptLanguage
} from "../interfaces/scriptGenerator";

interface ExportModalProps {
    show: boolean;
    onClose: () => void;
}

const ExportModal: FC<ExportModalProps> = ({show, onClose}) => {
    const {
        scanData: [scanData],
        selectedScanIds: [selectedScanIds, setSelectedScanIds]
    } = useContext(AppContext)!;

    // Filter scans that are selected
    const selectedScans: ScanDetails[] = useMemo(() => {
        return scanData.filter((s) => selectedScanIds.includes(s.scanID));
    }, [scanData, selectedScanIds]);

    // Setting 1: Data types
    const [downloadRaw, setDownloadRaw] = useState<boolean>(true);
    const [downloadReconstructed, setDownloadReconstructed] = useState<boolean>(true);
    const [downloadProcessed, setDownloadProcessed] = useState<boolean>(true);

    // Setting 2: Save path & organization
    const [destinationPath, setDestinationPath] = useState<string>("./bil_downloads");
    const [organizeByScan, setOrganizeByScan] = useState<boolean>(true);

    // Setting 3: Language
    const [scriptLanguage, setScriptLanguage] = useState<ScriptLanguage>("python");

    // Copy state
    const [copied, setCopied] = useState<boolean>(false);

    // Count available links per category among selected scans
    const linkCounts = useMemo(() => {
        let raw = 0;
        let reconstructed = 0;
        let processed = 0;

        for (const scan of selectedScans) {
            const zl = scan.zenodoLinks;
            if (zl?.rawZenodoLinks?.some((u) => u && u.trim() !== "")) raw++;
            if (zl?.reconstructedZenodoLinks?.some((u) => u && u.trim() !== "")) reconstructed++;
            if (zl?.processedZenodoLinks?.some((u) => u && u.trim() !== "")) processed++;
        }

        return {raw, reconstructed, processed};
    }, [selectedScans]);

    // Generate script based on current options
    const generatedScript = useMemo(() => {
        const options = {
            scans: selectedScans,
            dataTypes: {
                raw: downloadRaw,
                reconstructed: downloadReconstructed,
                processed: downloadProcessed
            },
            destinationPath: destinationPath.trim() || "./bil_downloads",
            organizeByScan
        };

        if (scriptLanguage === "python") {
            return generatePythonScript(options);
        } else {
            return generateBashScript(options);
        }
    }, [
        selectedScans,
        downloadRaw,
        downloadReconstructed,
        downloadProcessed,
        destinationPath,
        organizeByScan,
        scriptLanguage
    ]);

    const handleCopy = () => {
        navigator.clipboard.writeText(generatedScript);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
    };

    const handleDownloadScript = () => {
        const filename =
            scriptLanguage === "python" ? "download_bil_data.py" : "download_bil_data.sh";
        const blob = new Blob([generatedScript], {
            type: scriptLanguage === "python" ? "text/x-python" : "text/x-sh"
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleRemoveScan = (scanID: number) => {
        setSelectedScanIds((prev) => prev.filter((id) => id !== scanID));
    };

    const handleSelectAllDataTypes = (select: boolean) => {
        setDownloadRaw(select);
        setDownloadReconstructed(select);
        setDownloadProcessed(select);
    };

    const noDataTypesSelected = !downloadRaw && !downloadReconstructed && !downloadProcessed;

    return (
        <Modal
            show={show}
            onHide={onClose}
            size="xl"
            centered
            dialogClassName="export-modal"
            style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: 0
            }}
        >
            <Modal.Header closeButton style={{backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0"}}>
                <div style={{display: "flex", alignItems: "center", gap: 12}}>
                    <div
                        style={{
                            width: 38,
                            height: 38,
                            borderRadius: "50%",
                            background: "#0d6efd",
                            color: "#fff",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            boxShadow: "0 2px 6px rgba(13,110,253,0.3)"
                        }}
                    >
                        <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#fff"
                            strokeWidth="2.3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="7 10 12 15 17 10" />
                            <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                    </div>
                    <div>
                        <Modal.Title style={{fontWeight: 700, fontSize: "1.35rem", margin: 0, color: "#1e293b"}}>
                            Bulk Export &amp; Download Script
                        </Modal.Title>
                        <div style={{fontSize: "0.85rem", color: "#64748b", marginTop: 2}}>
                            Generate custom automated download script for {selectedScans.length} selected dataset{selectedScans.length > 1 ? "s" : ""}
                        </div>
                    </div>
                </div>
            </Modal.Header>

            <Modal.Body style={{padding: "24px", maxHeight: "80vh", overflowY: "auto"}}>
                {selectedScans.length === 0 ? (
                    <div style={{textAlign: "center", padding: "40px 20px", color: "#64748b"}}>
                        <p style={{fontSize: "1.1rem", marginBottom: 12}}>No entries currently selected.</p>
                        <Button variant="primary" onClick={onClose}>
                            Browse &amp; Select Scans
                        </Button>
                    </div>
                ) : (
                    <div style={{display: "flex", flexDirection: "column", gap: 24}}>
                        {/* Top Settings Grid */}
                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                                gap: 18
                            }}
                        >
                            {/* Setting 1: Data Type Selection */}
                            <div
                                style={{
                                    border: "1px solid #e2e8f0",
                                    borderRadius: 10,
                                    padding: 16,
                                    backgroundColor: "#f8fafc"
                                }}
                            >
                                <div style={{fontWeight: 700, fontSize: "0.95rem", color: "#1e293b", marginBottom: 12}}>
                                    1. Data Categories
                                </div>

                                <div style={{display: "flex", flexDirection: "column", gap: 8}}>
                                    <Form.Check
                                        type="checkbox"
                                        id="chk-raw"
                                        checked={downloadRaw}
                                        onChange={(e) => setDownloadRaw(e.target.checked)}
                                        label={
                                            <span style={{fontSize: "0.9rem", color: "#334155"}}>
                                                <strong>Raw Data</strong>{" "}
                                                <Badge bg="secondary" pill style={{fontSize: "0.75em", marginLeft: 4}}>
                                                    {linkCounts.raw} scan{linkCounts.raw !== 1 ? "s" : ""}
                                                </Badge>
                                            </span>
                                        }
                                    />
                                    <Form.Check
                                        type="checkbox"
                                        id="chk-reconstructed"
                                        checked={downloadReconstructed}
                                        onChange={(e) => setDownloadReconstructed(e.target.checked)}
                                        label={
                                            <span style={{fontSize: "0.9rem", color: "#334155"}}>
                                                <strong>Reconstructed Data</strong>{" "}
                                                <Badge bg="secondary" pill style={{fontSize: "0.75em", marginLeft: 4}}>
                                                    {linkCounts.reconstructed} scan{linkCounts.reconstructed !== 1 ? "s" : ""}
                                                </Badge>
                                            </span>
                                        }
                                    />
                                    <Form.Check
                                        type="checkbox"
                                        id="chk-processed"
                                        checked={downloadProcessed}
                                        onChange={(e) => setDownloadProcessed(e.target.checked)}
                                        label={
                                            <span style={{fontSize: "0.9rem", color: "#334155"}}>
                                                <strong>Processed Data</strong>{" "}
                                                <Badge bg="secondary" pill style={{fontSize: "0.75em", marginLeft: 4}}>
                                                    {linkCounts.processed} scan{linkCounts.processed !== 1 ? "s" : ""}
                                                </Badge>
                                            </span>
                                        }
                                    />
                                </div>
                                {noDataTypesSelected && (
                                    <div style={{color: "#dc2626", fontSize: "0.8rem", marginTop: 8}}>
                                        Please select at least one data category.
                                    </div>
                                )}
                            </div>

                            {/* Setting 2: Destination Directory */}
                            <div
                                style={{
                                    border: "1px solid #e2e8f0",
                                    borderRadius: 10,
                                    padding: 16,
                                    backgroundColor: "#f8fafc"
                                }}
                            >
                                <div style={{fontWeight: 700, fontSize: "0.95rem", color: "#1e293b", marginBottom: 12}}>
                                    2. Save Path &amp; Organization
                                </div>
                                <Form.Group className="mb-2">
                                    <Form.Label style={{fontSize: "0.8rem", color: "#64748b", marginBottom: 4}}>
                                        Destination Directory:
                                    </Form.Label>
                                    <Form.Control
                                        type="text"
                                        size="sm"
                                        value={destinationPath}
                                        onChange={(e) => setDestinationPath(e.target.value)}
                                        placeholder="./bil_downloads"
                                        style={{fontFamily: "monospace", fontSize: "0.85rem"}}
                                    />
                                </Form.Group>
                                <Form.Check
                                    type="checkbox"
                                    id="chk-organize"
                                    checked={organizeByScan}
                                    onChange={(e) => setOrganizeByScan(e.target.checked)}
                                    label={
                                        <span style={{fontSize: "0.82rem", color: "#475569"}}>
                                            Organize subfolders by scan ID &amp; name
                                        </span>
                                    }
                                />
                            </div>

                            {/* Setting 3: Script Language */}
                            <div
                                style={{
                                    border: "1px solid #e2e8f0",
                                    borderRadius: 10,
                                    padding: 16,
                                    backgroundColor: "#f8fafc"
                                }}
                            >
                                <div style={{fontWeight: 700, fontSize: "0.95rem", color: "#1e293b", marginBottom: 12}}>
                                    3. Script Language
                                </div>
                                <div style={{display: "flex", flexDirection: "column", gap: 10}}>
                                    <div
                                        onClick={() => setScriptLanguage("python")}
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            padding: "8px 12px",
                                            borderRadius: 8,
                                            border: scriptLanguage === "python" ? "2px solid #0d6efd" : "1px solid #cbd5e1",
                                            backgroundColor: scriptLanguage === "python" ? "#eff6ff" : "#fff",
                                            cursor: "pointer",
                                            transition: "all 0.15s ease"
                                        }}
                                    >
                                        <Form.Check
                                            type="radio"
                                            name="scriptLanguage"
                                            id="lang-python"
                                            checked={scriptLanguage === "python"}
                                            onChange={() => setScriptLanguage("python")}
                                            style={{marginRight: 8}}
                                        />
                                        <div>
                                            <div style={{fontWeight: 600, fontSize: "0.9rem", color: "#1e293b"}}>
                                                Python 3 (.py)
                                            </div>
                                            <div style={{fontSize: "0.75rem", color: "#64748b"}}>
                                                Self-contained, progress bar &amp; MD5 verification
                                            </div>
                                        </div>
                                    </div>

                                    <div
                                        onClick={() => setScriptLanguage("bash")}
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            padding: "8px 12px",
                                            borderRadius: 8,
                                            border: scriptLanguage === "bash" ? "2px solid #0d6efd" : "1px solid #cbd5e1",
                                            backgroundColor: scriptLanguage === "bash" ? "#eff6ff" : "#fff",
                                            cursor: "pointer",
                                            transition: "all 0.15s ease"
                                        }}
                                    >
                                        <Form.Check
                                            type="radio"
                                            name="scriptLanguage"
                                            id="lang-bash"
                                            checked={scriptLanguage === "bash"}
                                            onChange={() => setScriptLanguage("bash")}
                                            style={{marginRight: 8}}
                                        />
                                        <div>
                                            <div style={{fontWeight: 600, fontSize: "0.9rem", color: "#1e293b"}}>
                                                Bash (.sh)
                                            </div>
                                            <div style={{fontSize: "0.75rem", color: "#64748b"}}>
                                                cURL-based streaming with automatic resume
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Selected Scans List Accordion */}
                        <Accordion defaultActiveKey="0">
                            <Accordion.Item eventKey="0">
                                <Accordion.Header>
                                    <div style={{display: "flex", alignItems: "center", gap: 8, width: "100%"}}>
                                        <span style={{fontWeight: 600}}>
                                            Selected Scans ({selectedScans.length})
                                        </span>
                                    </div>
                                </Accordion.Header>
                                <Accordion.Body style={{maxHeight: 200, overflowY: "auto", padding: "12px 16px"}}>
                                    <div style={{display: "flex", flexDirection: "column", gap: 8}}>
                                        {selectedScans.map((scan) => (
                                            <div
                                                key={scan.scanID}
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "space-between",
                                                    padding: "6px 12px",
                                                    borderRadius: 6,
                                                    backgroundColor: "#f8fafc",
                                                    border: "1px solid #e2e8f0"
                                                }}
                                            >
                                                <div style={{display: "flex", alignItems: "center", gap: 10}}>
                                                    <span style={{fontWeight: 700, fontSize: "0.85rem", color: "#64748b"}}>
                                                        #{scan.scanID}
                                                    </span>
                                                    <span style={{fontWeight: 600, fontSize: "0.9rem", color: "#1e293b"}}>
                                                        {scan.sampleName}
                                                    </span>
                                                    <ModalityBadge
                                                        modality={scan.scanModality}
                                                        canClose={false}
                                                        onClick={() => {}}
                                                    />
                                                </div>
                                                <Button
                                                    variant="outline-danger"
                                                    size="sm"
                                                    style={{fontSize: "0.75rem", padding: "2px 8px"}}
                                                    onClick={() => handleRemoveScan(scan.scanID)}
                                                >
                                                    Remove
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                </Accordion.Body>
                            </Accordion.Item>
                        </Accordion>

                        {/* Code Generator Output Section */}
                        <div style={{display: "flex", flexDirection: "column", gap: 10}}>
                            <div
                                style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    flexWrap: "wrap",
                                    gap: 12
                                }}
                            >
                                <span style={{fontWeight: 700, fontSize: "1rem", color: "#1e293b"}}>
                                    Generated {scriptLanguage === "python" ? "Python" : "Bash"} Download Script
                                </span>
                            </div>

                            {/* Script Viewer */}
                            <pre
                                style={{
                                    backgroundColor: "#0f172a",
                                    color: "#f8fafc",
                                    padding: 16,
                                    borderRadius: 8,
                                    fontSize: "0.82rem",
                                    fontFamily: "'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace",
                                    maxHeight: 280,
                                    overflowY: "auto",
                                    overflowX: "auto",
                                    border: "1px solid #1e293b",
                                    lineHeight: 1.5,
                                    margin: 0
                                }}
                            >
                                <code>{generatedScript}</code>
                            </pre>

                            {/* Quick Execution Help Note */}
                            <div
                                style={{
                                    backgroundColor: "#f0fdf4",
                                    border: "1px solid #bbf7d0",
                                    borderRadius: 6,
                                    padding: "8px 12px",
                                    fontSize: "0.82rem",
                                    color: "#166534",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 8
                                }}
                            >
                                <strong>How to run:</strong>
                                <code>
                                    {scriptLanguage === "python"
                                        ? "python3 download_bil_data.py"
                                        : "chmod +x download_bil_data.sh && ./download_bil_data.sh"}
                                </code>
                            </div>
                        </div>
                    </div>
                )}
            </Modal.Body>

            <Modal.Footer style={{backgroundColor: "#f8fafc", borderTop: "1px solid #e2e8f0"}}>
                <Button variant="secondary" onClick={onClose}>
                    Close
                </Button>
                {selectedScans.length > 0 && (
                    <>
                        <Button
                            variant="outline-primary"
                            onClick={handleCopy}
                            style={{display: "flex", alignItems: "center", gap: 6, fontWeight: 600}}
                        >
                            <svg
                                width="15"
                                height="15"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                            </svg>
                            {copied ? "Copied!" : "Copy Script"}
                        </Button>
                        <Button
                            variant="primary"
                            onClick={handleDownloadScript}
                            style={{display: "flex", alignItems: "center", gap: 6, fontWeight: 600}}
                        >
                            <svg
                                width="15"
                                height="15"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="7 10 12 15 17 10" />
                                <line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                            Download {scriptLanguage === "python" ? ".py" : ".sh"} File
                        </Button>
                    </>
                )}
            </Modal.Footer>
        </Modal>
    );
};

export default ExportModal;
