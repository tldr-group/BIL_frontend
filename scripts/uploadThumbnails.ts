import {getAuthClient, listDriveImages} from "./driveHelpers";
import {listR2DriveFolders} from "./r2Helpers";

async function main() {
    // const [, , googleDriveUrl] = process.argv;
    // if (!googleDriveUrl) {
    //     console.error("Usage: parseSheet <google_sheet_url>");
    //     process.exit(1);
    // }

    // const match = googleDriveUrl.match(/\/folders\/([\w-]+)/);
    // if (!match) {
    //     console.error("Invalid Google Sheet URL");
    //     process.exit(1);
    // }
    // const driveId = match[1];

    // const client = await getAuthClient();

    // console.log("Listing images in folder:", driveId);
    // const files = await listDriveImages(driveId, client);
    // console.log("Found files:", files);
    const files = await listR2DriveFolders("");
    console.log("Found files:", files);
}

main();
