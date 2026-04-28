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
