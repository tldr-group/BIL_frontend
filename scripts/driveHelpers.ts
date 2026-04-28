import {Readable} from "stream";
import {google} from "googleapis";

const drive = google.drive("v3");

export type DriveFile = {
    id: string;
    name: string;
};

export type DriveFolder = {
    id: string;
    name: string;
    files: DriveFile[];
};

export type DriveFileAndData = {
    id: string;
    name: string;
    buffer: Uint8ClampedArray;
};

export type DriveFolderAndData = {
    id: string;
    name: string;
    files: DriveFileAndData[];
};

export async function getAuthClient() {
    const auth = new google.auth.GoogleAuth({
        keyFile: "auth/service-worker.json",
        scopes: ["https://www.googleapis.com/auth/drive.readonly"]
    });
    return auth.getClient();
}

export async function listDriveImages(rootFolderId: string, client: any): Promise<DriveFolder[]> {
    // Helper to list folders in a parent folder
    async function listFolders(parentId: string) {
        let pageToken: string | undefined;
        const folders: {id: string; name: string}[] = [];
        do {
            const res = await drive.files.list({
                auth: client as any,
                q: `'${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
                fields: "nextPageToken, files(id, name)",
                pageToken
            });
            for (const f of res.data.files ?? []) {
                folders.push({id: f.id!, name: f.name!});
            }
            pageToken = res.data.nextPageToken ?? undefined;
        } while (pageToken);
        return folders;
    }

    // Helper to list images in a parent folder
    async function listImages(parentId: string) {
        let pageToken: string | undefined;
        const images: {id: string; name: string}[] = [];
        do {
            const res = await drive.files.list({
                auth: client as any,
                q: `'${parentId}' in parents and mimeType contains 'image/' and trashed=false`,
                fields: "nextPageToken, files(id, name, mimeType)",
                pageToken
            });
            for (const f of res.data.files ?? []) {
                images.push({id: f.id!, name: f.name!});
            }
            pageToken = res.data.nextPageToken ?? undefined;
        } while (pageToken);
        return images;
    }

    // Traverse all folders at depth 1 under rootFolderId, in parallel with concurrency limit
    const subfolders = await listFolders(rootFolderId);
    const concurrency = 8; // Adjust as needed for rate limits
    let idx = 0;
    const results: DriveFolder[] = [];
    async function worker() {
        while (idx < subfolders.length) {
            const myIdx = idx++;
            const folder = subfolders[myIdx];
            if (!folder) break;
            try {
                const images = await listImages(folder.id);
                results.push({id: folder.id, name: folder.name, files: images});
            } catch (e) {
                console.error(`Error listing images for folder ${folder.name} (${folder.id}):`, e);
            }
        }
    }
    // Launch workers
    const workers = Array.from({length: concurrency}, () => worker());
    await Promise.all(workers);
    return results;
}

// Download all files in a DriveFolder as buffers, returning DriveFolderAndData
/**
 * Downloads all files in a DriveFolder from Google Drive and returns a DriveFolderAndData
 * suitable for processDriveFolderAndData (processImages.ts).
 * @param folder DriveFolder (id, name, files[])
 * @param client Authenticated Google API client
 * @returns DriveFolderAndData with buffers for each file
 */
export async function downloadDriveFolderFilesAsData(
    folder: DriveFolder,
    client: any
): Promise<DriveFolderAndData> {
    async function downloadFile(fileId: string): Promise<Uint8ClampedArray> {
        const res = await drive.files.get(
            {
                fileId,
                alt: "media",
                auth: client
            },
            {responseType: "stream"}
        );
        const stream: Readable = res.data as any;
        const chunks: Buffer[] = [];
        for await (const chunk of stream) {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        }
        const buf = Buffer.concat(chunks);
        return new Uint8ClampedArray(buf.buffer, buf.byteOffset, buf.length);
    }
    const files: DriveFileAndData[] = [];
    for (const file of folder.files) {
        try {
            const buffer = await downloadFile(file.id);
            files.push({id: file.id, name: file.name, buffer});
        } catch (e) {
            console.error(`Failed to download file ${file.name} (${file.id}):`, e);
        }
    }
    return {
        id: folder.id,
        name: folder.name,
        files
    };
}
