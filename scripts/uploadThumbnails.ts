import {downloadDriveFolderFilesAsData, getAuthClient, listDriveImages} from "./driveHelpers";
import {processDriveFolderAndData, writeBufferToFile} from "./processImages";
import {listR2DriveFolders} from "./r2Helpers";

async function main() {
    const [, , googleDriveUrl] = process.argv;
    if (!googleDriveUrl) {
        console.error("Usage: parseSheet <google_sheet_url>");
        process.exit(1);
    }

    const match = googleDriveUrl.match(/\/folders\/([\w-]+)/);
    if (!match) {
        console.error("Invalid Google Sheet URL");
        process.exit(1);
    }
    const driveId = match[1];

    const client = await getAuthClient();

    console.log("Listing images in folder:", driveId);
    const driveFiles = await listDriveImages(driveId, client);
    const r2Files = await listR2DriveFolders("");

    const foldersToDownload = driveFiles
        .filter((driveFolder) => {
            const r2Folder = r2Files.find((r2) => r2.name === driveFolder.name);
            if (!r2Folder) return true; // Folder missing in R2, needs download
            return (driveFolder.files?.length || 0) !== (r2Folder.files?.length || 0);
        })
        .sort((a, b) => a.name.localeCompare(b.name));

    console.log(
        "Folders to download:",
        foldersToDownload.map((f) => f.name)
    );

    const downloadedImages = await downloadDriveFolderFilesAsData(foldersToDownload[0], client);
    const processed = await processDriveFolderAndData(downloadedImages);

    writeBufferToFile(processed.files[0].buffer, `./output/${processed.files[0].name}`);

    // console.log("Found files:", driveFiles);

    // console.log("Found files:", files);
}

main();
