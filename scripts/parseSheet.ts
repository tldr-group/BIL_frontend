#!/usr/bin/env node

import fs from "fs";
import path from "path";

import {parse} from "csv-parse/sync";
import {
    CellFormat,
    CellType,
    ElectrolyteType,
    Modality,
    ScanDetails,
    ScanDetailsSchema
} from "../src/interfaces/types";

export const parseRow = (row: any): ScanDetails => {
    const parseDataDim = (input: string) => {
        if (!input) return [];
        const parts = input.split(";");
        const result: (number | string)[] = [];
        for (const part of parts) {
            const match = part.match(/^(\d+)([A-Za-z].*)?$/);
            if (match) {
                result.push(Number(match[1]));
                if (match[2]) result.push(match[2]);
            } else {
                result.push(part);
            }
        }
        return result;
    };

    const getRealsize = (resolution: string, size: string): number[] => {
        const resArray = resolution
            .toString()
            .split(";")
            .map((v) => parseFloat(v));
        const sizeArray = size
            .toString()
            .split(";")
            .map((v) => parseFloat(v));

        // Validate equal lengths
        if (resArray.length !== sizeArray.length) {
            throw new Error("Resolution and size must have the same number of elements.");
        }

        // Compute elementwise product and join with semicolon
        const productArray = resArray.map((val, i) => parseFloat((val * sizeArray[i]).toFixed(2)));
        return productArray;
    };

    const getCitation = (shortcodes: string): string => {
        switch (shortcodes) {
            case "BIL":
                return "R. Docherty et al, 'Battery Imaging Library: Multi-length scale and multi-modal synchrotron and laboratory battery imaging data for all', chemRxiv preprint, (2025)";
            case "KINT":
                return "S. J. Cooper et al, 'Methods—Kintsugi Imaging of Battery Electrodes: Distinguishing Pores from the Carbon Binder Domain using Pt Deposition', J. Electrochem. Soc. 169 070512, (2022)";
            case "TAILING":
                return "J.D Morley et al, 'Mine tailings as active electrode materials for Li-ion batteries', Cell Reports Sustainability 2 10 100494, (2025)";
            case "SEI_TEM":
                return "N. Mulcahy et al, 'Degradation and SEI Evolution in Alloy Anodes Revealed by Correlative Liquid-Cell Electrochemistry and Cryogenic Microscopy', arXiv preprint, (2025)";
            case "CHIP_TEM":
                return "N. Mulcahy et al, 'A Workflow for Correlative in-situ Nano-chip Liquid Cell Transmission Electron Microscopy and Atom Probe Tomography Enabled by Cryogenic Plasma Focused Ion Beam', arXiv preprint, (2025)";
            default:
                return "";
        }
    };

    const nThumbnails = Number(row["Thumbnail Type"].split("H")[0]);

    const scanID = Number(row["Scan ID"]);
    const sampleID = row["Sample ID"].split(";").map((s: string) => Number(s))[0];
    const sampleName = row["Sample Name"];
    const chemistry = row["Chemistry"].toUpperCase();
    const electrolyteType = row["Electrolyte Type"].toUpperCase() as ElectrolyteType;
    const cellType = row["Cell Type"].toUpperCase() as CellType;
    const cellFormat = row["Cell Format"].toUpperCase() as CellFormat;
    const sampleDescription = row["Sample Description"];
    const scanType = row["Scan Type"].toUpperCase();
    const scanModality = row["Scan Modality"].toUpperCase() as Modality;
    const instrument = row["Instrument"];
    const pixelSize_µm = row["Pixel/Voxel Size (µm) (XYZ)"]
        .split(";")
        .map((s: string) => Number(s));
    const dataDimensions_px = parseDataDim(row["Data Dimensions (px) (XYZ)"]);
    const dataDimensions_µm = getRealsize(
        row["Pixel/Voxel Size (µm) (XYZ)"],
        row["Data Dimensions (px) (XYZ)"]
    );
    const thumbnailType = row["Thumbnail Type"];
    const thumbnailName = Array.from(
        {length: nThumbnails},
        (_, i) => scanID + "_" + (1 + i) + "H.webp"
    );
    const scanParameters: Record<string, string> = JSON.parse(row["Scan Parameters"]) ?? {};
    const citations = row["Citations"].split(";").map((s: string) => getCitation(s.trim()));
    const contributors = row["Contributors"];
    const licence = row["Licence"].toUpperCase();
    const zenodoLinks = {
        rawZenodoLinks: row["Raw Zenodo Links"].split(";").map((s: string) => s.trim()),
        rawZenodoLabels: row["Raw Zenodo Labels"].split(";").map((s: string) => s.trim()),
        processedZenodoLinks: row["Processed Zenodo Links"].split(";").map((s: string) => s.trim()),
        processedZenodoLabels: row["Processed Zenodo Labels"]
            .split(";")
            .map((s: string) => s.trim()),
        reconstructedZenodoLinks: row["Reconstructed Zenodo Links"]
            .split(";")
            .map((s: string) => s.trim()),
        reconstructedZenodoLabels: row["Reconstructed Zenodo Labels"]
            .split(";")
            .map((s: string) => s.trim())
    };

    return {
        scanID,
        sampleID,
        sampleName,
        chemistry,
        electrolyteType,
        cellType,
        cellFormat,
        sampleDescription,
        scanType,
        scanModality,
        instrument,
        pixelSize_µm,
        dataDimensions_px,
        dataDimensions_µm,
        thumbnailType,
        thumbnailName,
        scanParameters,
        citations,
        contributors,
        licence,
        zenodoLinks
    };
};

// Helper to fetch TSV from Google Sheets using fetch
async function fetchTSV(url: string): Promise<string> {
    const res = await fetch(url, {redirect: "follow"});
    if (!res.ok) {
        throw new Error(`Failed to fetch: ${res.status} ${res.statusText}`);
    }
    return await res.text();
}

// Main script
async function main() {
    const [, , googleSheetUrl] = process.argv;
    if (!googleSheetUrl) {
        console.error("Usage: parseSheet <google_sheet_url>");
        process.exit(1);
    }

    // Extract the sheet ID
    const match = googleSheetUrl.match(/\/d\/([\w-]+)/);
    if (!match) {
        console.error("Invalid Google Sheet URL");
        process.exit(1);
    }
    const sheetId = match[1];
    const tsvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=tsv`;

    let tsv: string;
    try {
        tsv = await fetchTSV(tsvUrl);
    } catch (err) {
        console.error("Failed to fetch TSV:", err);
        process.exit(1);
    }
    // console.log(tsv);

    let records: any[];
    try {
        //, relaxQuotes: true
        records = parse(tsv, {
            columns: true,
            skip_empty_lines: true,
            delimiter: "\t",
            quote: false
        });
    } catch (err) {
        console.error("Failed to parse TSV:", err);
        process.exit(1);
    }

    // Parse each row into Book, accumulate errors
    const scans: ScanDetails[] = [];
    const errors: {row: number; error: any; data: any}[] = [];
    records.forEach((row, idx) => {
        console.log("Processing row:", row);
        // Convert fields to correct types
        const parsedRow = parseRow(row);
        const result = ScanDetailsSchema.safeParse(parsedRow);
        if (result.success) {
            scans.push(result.data);
        } else {
            errors.push({row: idx + 2, error: result.error, data: row}); // +2 for header and 0-index
        }
    });

    if (errors.length > 0) {
        console.error("Errors found in the following rows:");
        errors.forEach((e) => {
            console.error(`Row ${e.row}:`, e.error, e.data);
        });
        process.exit(1);
    }

    const outPath = path.join(__dirname, "../src/assets/data.json");
    fs.writeFileSync(outPath, JSON.stringify(scans, null, 4));
    console.log(`Successfully wrote ${scans.length} scans to src/assets/data.json`);
}

main();
