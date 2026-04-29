import {downloadDriveFolderFilesAsData, getAuthClient, listDriveImages} from "./driveHelpers";
import {processDriveFolderAndData, writeBufferToFile} from "./processImages";
import {listR2DriveFolders, uploadDriveFolderAndDataToR2} from "./r2Helpers";

const UPLOAD_ALL = false; // Set to true to upload all folders, even if they exist on R2 with the same number of files

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

    const driveFiles = await listDriveImages(driveId, client);
    const r2Files = await listR2DriveFolders("modal/");

    let foldersToDownload = driveFiles
        .filter((driveFolder) => {
            const r2Folder = r2Files.find((r2) => r2.name === driveFolder.name);
            if (UPLOAD_ALL) return true; // Upload all folders regardless of R2 state
            if (!r2Folder) return true; // Folder missing in R2, needs download
            return (driveFolder.files?.length || 0) !== (r2Folder.files?.length || 0);
        })
        .sort((a, b) => {
            // Natural sort for folder names with numbers
            return a.name.localeCompare(b.name, undefined, {numeric: true, sensitivity: "base"});
        });

    console.log(
        "Folders not on R2:",
        foldersToDownload.map((f) => f.name)
    );

    for (const folder of foldersToDownload) {
        try {
            console.log(`Downloading and processing folder: ${folder.name}`);
            const downloadedImages = await downloadDriveFolderFilesAsData(folder, client);
            const processed = await processDriveFolderAndData(downloadedImages);
            uploadDriveFolderAndDataToR2(processed);
        } catch (e) {
            console.error(`Error processing folder ${folder.name}:`, e);
        }
    }
}

main();
