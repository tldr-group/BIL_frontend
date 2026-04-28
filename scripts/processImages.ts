// processImages.ts
// TypeScript version of process_images.py using sharp, working with image buffers
import fs from "fs";
import path from "path";
import sharp from "sharp";

import {DriveFileAndData, DriveFolderAndData} from "./driveHelpers";

const THUMB_SIZE = 300;
const MODAL_SIZE = 600;

type CropDims = {left: number; top: number; width: number; height: number};

async function getCropDims(img: sharp.Sharp): Promise<CropDims | null> {
    const info = await img.metadata();
    const w = info.width || 0;
    const h = info.height || 0;
    if (Math.abs(w - h) < 0.1 * Math.min(w, h)) {
        // Crop in half along the longer axis
        if (w > h) {
            const left = Math.floor((w - h) / 2);
            return {left, top: 0, width: h, height: h};
        } else {
            const top = Math.floor((h - w) / 2);
            return {left: 0, top, width: w, height: w};
        }
    }
    return null;
}

async function resizeImage(img: sharp.Sharp, minSide: number): Promise<sharp.Sharp> {
    const info = await img.metadata();
    const w = info.width || 0;
    const h = info.height || 0;
    const scale = minSide / Math.min(w, h);
    const newW = Math.round(w * scale);
    const newH = Math.round(h * scale);
    console.log(`Resizing image from ${w}x${h} to ${newW}x${newH}`);
    return img.resize(newW, newH, {fit: "fill"});
}

export async function processDriveFolderAndData(
    folder: DriveFolderAndData
): Promise<DriveFolderAndData> {
    const processedFiles: DriveFileAndData[] = [];
    let imgIdx = 1;
    for (const file of folder.files) {
        let img = sharp(Buffer.from(file.buffer));

        // Greyscale conversion (if single channel)
        const info = await img.metadata();
        if (info.channels === 1) {
            img = img.greyscale();
        }

        // Remove whitespace padding and crop if nearly square
        const trimmed = img.trim({threshold: 10, background: {r: 255, g: 255, b: 255, alpha: 1}});
        const cropDims = await getCropDims(trimmed);
        const cropped = cropDims ? trimmed.extract(cropDims) : trimmed;

        // Prepare thumbnail and modal in parallel, using fresh clones and metadata
        const thumbName = `${folder.name}_${imgIdx}H.webp`;
        const modalName = `${folder.name}_${imgIdx}H.webp`;

        // Thumbnail
        const thumbImg = await resizeImage(cropped.clone(), THUMB_SIZE);
        const thumbBuffer = await thumbImg.webp().toBuffer();
        processedFiles.push({
            id: file.id + "_thumb",
            name: thumbName,
            buffer: new Uint8ClampedArray(thumbBuffer)
        });

        // Modal
        const modalImg = await resizeImage(cropped.clone(), MODAL_SIZE);
        const modalBuffer = await modalImg.webp().toBuffer();
        processedFiles.push({
            id: file.id + "_modal",
            name: modalName,
            buffer: new Uint8ClampedArray(modalBuffer)
        });

        imgIdx++;
    }
    return {
        id: folder.id,
        name: folder.name,
        files: processedFiles
    };
}

/**
 * Debug helper to write a Uint8ClampedArray buffer to a local file.
 * @param buffer The image buffer (Uint8ClampedArray)
 * @param filename The output file path
 */
export function writeBufferToFile(buffer: Uint8ClampedArray, filename: string) {
    // Ensure parent directory exists
    fs.mkdirSync(path.dirname(filename), {recursive: true});
    // Write buffer to file
    fs.writeFileSync(filename, Buffer.from(buffer));
}
