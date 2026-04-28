import {DriveFile, DriveFolder, DriveFolderAndData} from "./driveHelpers";
import {S3Client, ListObjectsV2Command, PutObjectCommand} from "@aws-sdk/client-s3";

import fs from "fs";
import path from "path";

function getR2Config() {
    let config: any = {};
    const configPath = path.resolve(__dirname, "../auth/r2.json");
    if (fs.existsSync(configPath)) {
        try {
            config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
        } catch (e) {
            throw new Error("Failed to parse auth/r2.json: " + e);
        }
    }
    // Fallback to process.env if not in config
    const R2_BUCKET = config.R2_BUCKET || process.env.R2_BUCKET;
    const R2_ACCESS_KEY_ID = config.R2_ACCESS_KEY_ID || process.env.R2_ACCESS_KEY_ID;
    const R2_SECRET_ACCESS_KEY = config.R2_SECRET_ACCESS_KEY || process.env.R2_SECRET_ACCESS_KEY;
    const R2_ENDPOINT = config.R2_ENDPOINT || process.env.R2_ENDPOINT;
    if (!R2_BUCKET || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_ENDPOINT) {
        throw new Error(
            "Missing R2 credentials: R2_BUCKET, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ENDPOINT must be set in auth/r2.json or environment variables."
        );
    }
    return {R2_BUCKET, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ENDPOINT};
}

const {R2_BUCKET, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ENDPOINT} = getR2Config();

const s3 = new S3Client({
    region: "auto",
    endpoint: R2_ENDPOINT,
    credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY
    }
});

// List folders (prefixes) at depth 1 under rootPrefix
export async function listR2Folders(rootPrefix: string): Promise<string[]> {
    const command = new ListObjectsV2Command({
        Bucket: R2_BUCKET,
        Prefix: rootPrefix,
        Delimiter: "/"
    });
    const res = await s3.send(command);
    // CommonPrefixes contains the "folders"
    return (res.CommonPrefixes || []).map((p) => p.Prefix!).filter(Boolean);
}

// List image files in a folder (prefix)
export async function listR2Images(folderPrefix: string): Promise<DriveFile[]> {
    const command = new ListObjectsV2Command({
        Bucket: R2_BUCKET,
        Prefix: folderPrefix,
        Delimiter: undefined
    });
    const res = await s3.send(command);
    return (res.Contents || [])
        .filter(
            (obj) =>
                obj.Key && obj.Key !== folderPrefix && obj.Key.match(/\.(jpg|jpeg|png|gif|webp)$/i)
        )
        .map((obj) => ({
            id: obj.Key!,
            name: obj.Key!.replace(folderPrefix, "")
        }));
}

// List DriveFolder[] for all folders at depth 1 under rootPrefix
export async function listR2DriveFolders(rootPrefix: string): Promise<DriveFolder[]> {
    const folders = await listR2Folders(rootPrefix);
    const concurrency = 8;
    let idx = 0;
    const results: DriveFolder[] = [];
    async function worker() {
        while (idx < folders.length) {
            const myIdx = idx++;
            const prefix = folders[myIdx];
            if (!prefix) break;
            try {
                const files = await listR2Images(prefix);
                // Remove trailing slash for id/name
                const folderName = prefix.endsWith("/") ? prefix.slice(0, -1) : prefix;
                const name = folderName.split("/").filter(Boolean).pop() || folderName;
                results.push({id: folderName, name, files});
            } catch (e) {
                console.error(`Error listing images for folder ${prefix}:`, e);
            }
        }
    }
    const workers = Array.from({length: concurrency}, () => worker());
    await Promise.all(workers);
    return results;
}

// Uploads all files in a DriveFolderAndData to R2, creating intermediate folders as needed
export async function uploadDriveFolderAndDataToR2(folder: DriveFolderAndData) {
    for (const file of folder.files) {
        let key: string;
        if (file.id.includes("modal")) {
            key = `modal/${folder.name}/${file.name}`;
        } else if (file.id.includes("thumb")) {
            key = `thumbnail/${folder.name}/${file.name}`;
        } else {
            key = `${folder.name}/${file.name}`;
        }
        // Ensure key uses forward slashes and no double slashes
        key = key.replace(/\/+/g, "/");
        const command = new PutObjectCommand({
            Bucket: R2_BUCKET,
            Key: key,
            Body: Buffer.from(file.buffer),
            ContentType: "image/" + (file.name.split(".").pop() || "jpeg")
        });
        await s3.send(command);
        console.log(`Uploaded ${file.name} to ${key}`);
    }
}
