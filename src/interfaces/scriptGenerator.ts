import {ScanDetails} from "./types";

export type ExportDataType = "raw" | "reconstructed" | "processed" | "all";
export type ScriptLanguage = "python" | "bash";

export interface ScriptGeneratorOptions {
    scans: ScanDetails[];
    dataTypes: {
        raw: boolean;
        reconstructed: boolean;
        processed: boolean;
    };
    destinationPath: string;
    organizeByScan: boolean;
}

export function extractZenodoRecordId(url: string): string | null {
    if (!url) return null;
    const match = url.match(/(?:zenodo\.|\/records\/|\/record\/)(\d+)/i);
    return match ? match[1] : null;
}

export function generatePythonScript(options: ScriptGeneratorOptions): string {
    const {scans, dataTypes, destinationPath, organizeByScan} = options;

    const manifest = scans.map((s) => {
        const rawLinks = dataTypes.raw
            ? (s.zenodoLinks?.rawZenodoLinks || []).filter((u) => u && u.trim() !== "")
            : [];
        const reconstructedLinks = dataTypes.reconstructed
            ? (s.zenodoLinks?.reconstructedZenodoLinks || []).filter((u) => u && u.trim() !== "")
            : [];
        const processedLinks = dataTypes.processed
            ? (s.zenodoLinks?.processedZenodoLinks || []).filter((u) => u && u.trim() !== "")
            : [];

        return {
            scanID: s.scanID,
            sampleID: s.sampleID,
            sampleName: s.sampleName,
            modality: s.scanModality,
            chemistry: s.chemistry,
            links: {
                raw: rawLinks,
                reconstructed: reconstructedLinks,
                processed: processedLinks
            }
        };
    });

    const manifestJson = JSON.stringify(manifest, null, 4);

    return `#!/usr/bin/env python3
"""
Battery Imaging Library (BIL) - Bulk Data Download Script
Auto-generated export script with Zenodo REST API integration,
exponential backoff, automatic resume, and MD5 verification.
"""

import os
import sys
import json
import time
import math
import random
import hashlib
import re
import urllib.request
import urllib.error
from urllib.parse import urlparse

# ==============================================================================
# CONFIGURATION
# ==============================================================================
DESTINATION_DIR = os.path.expanduser(r"${destinationPath.replace(/\\/g, "/")}")
ORGANIZE_BY_SCAN = ${organizeByScan ? "True" : "False"}
MAX_RETRIES = 5
INITIAL_BACKOFF = 2.0  # 2 seconds default backoff
BACKOFF_FACTOR = 2.0
MAX_BACKOFF = 60.0    # seconds
CHUNK_SIZE = 1024 * 1024  # 1 MB chunk streaming
SOCKET_TIMEOUT = 45  # seconds

# Scans dataset manifest
SCANS_MANIFEST = ${manifestJson}

# ==============================================================================
# HELPER FUNCTIONS
# ==============================================================================

def sanitize_filename(name: str) -> str:
    """Sanitize string for safe directory and file names."""
    return re.sub(r'[^\\w\\-\\.]', '_', name).strip('_')

def format_bytes(size: float) -> str:
    """Format byte sizes into human readable units."""
    if size <= 0:
        return "0 B"
    units = ["B", "KB", "MB", "GB", "TB"]
    i = min(len(units) - 1, int(math.floor(math.log(size, 1024))))
    p = math.pow(1024, i)
    s = round(size / p, 2)
    return f"{s} {units[i]}"

def extract_zenodo_id(url: str):
    """Extract Zenodo numeric record ID from DOI or URL."""
    if not url:
        return None
    match = re.search(r'(?:zenodo\\.|/records/|/record/)(\\d+)', url, re.IGNORECASE)
    return match.group(1) if match else None

def request_with_exponential_backoff(url: str, headers=None, max_retries=MAX_RETRIES):
    """
    Perform HTTP GET request with exponential backoff and jitter.
    Handles HTTP 429 (Rate Limit) and 5xx Server Errors gracefully.
    """
    if headers is None:
        headers = {}
    
    headers.setdefault("User-Agent", "BatteryImagingLibrary-Downloader/1.0 (https://batteryimaginglibrary.com)")
    
    delay = INITIAL_BACKOFF
    for attempt in range(1, max_retries + 1):
        req = urllib.request.Request(url, headers=headers)
        try:
            response = urllib.request.urlopen(req, timeout=SOCKET_TIMEOUT)
            return response
        except urllib.error.HTTPError as e:
            if e.code == 429 or 500 <= e.code < 600:
                retry_after = e.headers.get("Retry-After")
                if retry_after:
                    try:
                        sleep_time = float(retry_after)
                    except ValueError:
                        sleep_time = delay
                else:
                    sleep_time = min(MAX_BACKOFF, delay + random.uniform(0.1, 1.0))
                
                print(f"  [!] HTTP {e.code} for {url}. Retrying in {sleep_time:.1f}s (Attempt {attempt}/{max_retries})...")
                time.sleep(sleep_time)
                delay = min(MAX_BACKOFF, delay * BACKOFF_FACTOR)
            else:
                print(f"  [X] HTTP Error {e.code}: {e.reason} for {url}")
                raise
        except (urllib.error.URLError, TimeoutError, ConnectionResetError) as e:
            sleep_time = min(MAX_BACKOFF, delay + random.uniform(0.1, 1.0))
            print(f"  [!] Network error ({e}). Retrying in {sleep_time:.1f}s (Attempt {attempt}/{max_retries})...")
            time.sleep(sleep_time)
            delay = min(MAX_BACKOFF, delay * BACKOFF_FACTOR)
            
    raise RuntimeError(f"Failed to fetch {url} after {max_retries} attempts.")

def fetch_zenodo_files(record_id: str):
    """
    Query Zenodo REST API for list of files, direct URLs, sizes, and MD5 checksums.
    """
    api_url = f"https://zenodo.org/api/records/{record_id}"
    try:
        resp = request_with_exponential_backoff(api_url)
        data = json.loads(resp.read().decode('utf-8'))
        
        files_data = data.get("files", [])
        if isinstance(files_data, dict):
            files_data = files_data.get("entries", [])
            
        file_list = []
        for f in files_data:
            filename = f.get("key") or f.get("filename") or f.get("name")
            size = f.get("size", 0)
            checksum = f.get("checksum", "")
            
            links = f.get("links", {})
            download_url = (
                links.get("self") or 
                links.get("content") or 
                links.get("download") or 
                f"https://zenodo.org/records/{record_id}/files/{filename}?download=1"
            )
            
            file_list.append({
                "filename": filename,
                "download_url": download_url,
                "size": size,
                "checksum": checksum
            })
        return file_list
    except Exception as e:
        print(f"  [X] Failed to query Zenodo API for record {record_id}: {e}")
        return []

def verify_file_md5(filepath: str, expected_md5: str) -> bool:
    """Verify MD5 checksum of a file."""
    if not expected_md5:
        return True
    if expected_md5.startswith("md5:"):
        expected_md5 = expected_md5[4:]
    
    md5 = hashlib.md5()
    with open(filepath, 'rb') as f:
        while chunk := f.read(CHUNK_SIZE):
            md5.update(chunk)
    return md5.hexdigest().lower() == expected_md5.lower()

def download_file(url: str, target_path: str, expected_size: int = 0, checksum: str = "") -> bool:
    """
    Download a file with resume support, live progress reporting, and retry logic.
    """
    part_path = target_path + ".part"
    os.makedirs(os.path.dirname(target_path), exist_ok=True)
    
    # Check if already fully downloaded
    if os.path.exists(target_path):
        if expected_size > 0 and os.path.getsize(target_path) == expected_size:
            if not checksum or verify_file_md5(target_path, checksum):
                print(f"  [OK] Already downloaded & verified: {os.path.basename(target_path)} ({format_bytes(expected_size)})")
                return True
        elif expected_size == 0:
            print(f"  [OK] File exists: {os.path.basename(target_path)}")
            return True
            
    existing_bytes = os.path.getsize(part_path) if os.path.exists(part_path) else 0
    headers = {}
    if existing_bytes > 0:
        headers["Range"] = f"bytes={existing_bytes}-"
        print(f"  [->] Resuming download from {format_bytes(existing_bytes)}...")
        
    delay = INITIAL_BACKOFF
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            req = urllib.request.Request(url, headers=headers)
            req.add_header("User-Agent", "BatteryImagingLibrary-Downloader/1.0")
            
            with urllib.request.urlopen(req, timeout=SOCKET_TIMEOUT) as response:
                status = getattr(response, "status", 200)
                is_resume = (status == 206)
                
                content_length = response.headers.get("Content-Length")
                total_size = int(content_length) + (existing_bytes if is_resume else 0) if content_length else expected_size
                
                mode = "ab" if is_resume else "wb"
                downloaded = existing_bytes if is_resume else 0
                start_time = time.time()
                last_update = start_time
                
                with open(part_path, mode) as out_f:
                    while True:
                        chunk = response.read(CHUNK_SIZE)
                        if not chunk:
                            break
                        out_f.write(chunk)
                        downloaded += len(chunk)
                        
                        now = time.time()
                        if now - last_update > 0.4:
                            elapsed = now - start_time
                            speed = (downloaded - (existing_bytes if is_resume else 0)) / max(0.001, elapsed)
                            if total_size > 0:
                                percent = (downloaded / total_size) * 100.0
                                sys.stdout.write(f"\\r  [{percent:5.1f}%] {format_bytes(downloaded)} / {format_bytes(total_size)} @ {format_bytes(speed)}/s")
                            else:
                                sys.stdout.write(f"\\r  [....] {format_bytes(downloaded)} @ {format_bytes(speed)}/s")
                            sys.stdout.flush()
                            last_update = now
                            
                sys.stdout.write("\\r" + " " * 80 + "\\r")
                sys.stdout.flush()
                
            # MD5 verification
            if checksum:
                print(f"  [*] Verifying MD5 checksum for {os.path.basename(target_path)}...")
                if not verify_file_md5(part_path, checksum):
                    print(f"  [X] MD5 Checksum mismatch! Corrupted download.")
                    if os.path.exists(part_path):
                        os.remove(part_path)
                    raise ValueError("MD5 verification failed")
                    
            os.replace(part_path, target_path)
            final_size = os.path.getsize(target_path)
            print(f"  [OK] Finished: {os.path.basename(target_path)} ({format_bytes(final_size)})")
            return True
            
        except Exception as e:
            sleep_time = min(MAX_BACKOFF, delay + random.uniform(0.1, 1.0))
            print(f"\\n  [!] Download interrupted ({e}). Retrying in {sleep_time:.1f}s (Attempt {attempt}/{MAX_RETRIES})...")
            time.sleep(sleep_time)
            delay = min(MAX_BACKOFF, delay * BACKOFF_FACTOR)
            existing_bytes = os.path.getsize(part_path) if os.path.exists(part_path) else 0
            if existing_bytes > 0:
                headers["Range"] = f"bytes={existing_bytes}-"
                
    print(f"  [X] Failed to download {url} after {MAX_RETRIES} attempts.")
    return False

# ==============================================================================
# MAIN EXECUTION
# ==============================================================================

def main():
    print("=" * 80)
    print("  Battery Imaging Library (BIL) - Bulk Downloader")
    print(f"  Target directory: {os.path.abspath(DESTINATION_DIR)}")
    print(f"  Total scans to process: {len(SCANS_MANIFEST)}")
    print("=" * 80)
    
    total_files_success = 0
    total_files_failed = 0
    total_scans_processed = 0
    start_total_time = time.time()
    
    for idx, scan in enumerate(SCANS_MANIFEST, 1):
        scan_id = scan["scanID"]
        sample_name = scan["sampleName"]
        modality = scan["modality"]
        safe_name = sanitize_filename(sample_name)
        
        print(f"\\n[{idx}/{len(SCANS_MANIFEST)}] Scan #{scan_id}: {sample_name} [{modality}]")
        
        if ORGANIZE_BY_SCAN:
            scan_dir = os.path.join(DESTINATION_DIR, f"scan_{scan_id:03d}_{safe_name}")
        else:
            scan_dir = DESTINATION_DIR
            
        for category, links in scan["links"].items():
            if not links:
                continue
                
            cat_dir = os.path.join(scan_dir, category)
            print(f" -> Category: {category.upper()} ({len(links)} record link(s))")
            
            for link_url in links:
                rec_id = extract_zenodo_id(link_url)
                if rec_id:
                    print(f"  * Querying Zenodo Record #{rec_id} ({link_url})...")
                    files = fetch_zenodo_files(rec_id)
                    if not files:
                        print(f"  [!] No files found or unable to access record #{rec_id}")
                        continue
                        
                    for f in files:
                        target_file_path = os.path.join(cat_dir, f["filename"])
                        success = download_file(
                            url=f["download_url"],
                            target_path=target_file_path,
                            expected_size=f["size"],
                            checksum=f["checksum"]
                        )
                        if success:
                            total_files_success += 1
                        else:
                            total_files_failed += 1
                else:
                    filename = sanitize_filename(os.path.basename(urlparse(link_url).path)) or f"scan_{scan_id}_{category}.dat"
                    target_file_path = os.path.join(cat_dir, filename)
                    print(f"  * Downloading direct link: {link_url}")
                    success = download_file(url=link_url, target_path=target_file_path)
                    if success:
                        total_files_success += 1
                    else:
                        total_files_failed += 1
                        
        total_scans_processed += 1

    elapsed_total = time.time() - start_total_time
    print("\\n" + "=" * 80)
    print("  DOWNLOAD SUMMARY")
    print(f"  Processed scans: {total_scans_processed}/{len(SCANS_MANIFEST)}")
    print(f"  Successful files: {total_files_success}")
    print(f"  Failed files:     {total_files_failed}")
    print(f"  Total time:       {elapsed_total / 60:.1f} minutes")
    print(f"  Output directory: {os.path.abspath(DESTINATION_DIR)}")
    print("=" * 80)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\\n\\n[!] Download canceled by user.")
        sys.exit(1)
`;
}

export function generateBashScript(options: ScriptGeneratorOptions): string {
    const {scans, dataTypes, destinationPath, organizeByScan} = options;

    // Build plain records list for bash execution
    const entries: {
        scanId: number;
        sampleName: string;
        modality: string;
        category: string;
        url: string;
    }[] = [];

    for (const s of scans) {
        if (dataTypes.raw) {
            for (const u of s.zenodoLinks?.rawZenodoLinks || []) {
                if (u && u.trim()) {
                    entries.push({
                        scanId: s.scanID,
                        sampleName: s.sampleName,
                        modality: s.scanModality,
                        category: "raw",
                        url: u.trim()
                    });
                }
            }
        }
        if (dataTypes.reconstructed) {
            for (const u of s.zenodoLinks?.reconstructedZenodoLinks || []) {
                if (u && u.trim()) {
                    entries.push({
                        scanId: s.scanID,
                        sampleName: s.sampleName,
                        modality: s.scanModality,
                        category: "reconstructed",
                        url: u.trim()
                    });
                }
            }
        }
        if (dataTypes.processed) {
            for (const u of s.zenodoLinks?.processedZenodoLinks || []) {
                if (u && u.trim()) {
                    entries.push({
                        scanId: s.scanID,
                        sampleName: s.sampleName,
                        modality: s.scanModality,
                        category: "processed",
                        url: u.trim()
                    });
                }
            }
        }
    }

    // Format bash array entries: "scanID|safeSampleName|modality|category|url"
    const bashEntries = entries
        .map((e) => {
            const safeName = e.sampleName.replace(/[^\w.-]/g, "_").replace(/^_+|_+$/g, "");
            return `  "${e.scanId}|${safeName}|${e.modality}|${e.category}|${e.url}"`;
        })
        .join("\n");

    return `#!/usr/bin/env bash
# ==============================================================================
# Battery Imaging Library (BIL) - Pure Bash Bulk Data Downloader
# Native Bash script using cURL / Wget with Zenodo REST API discovery,
# exponential backoff (2s initial delay), and automatic resume (-C -).
# ==============================================================================

set -u

# --- Configuration ---
DEST_DIR="${destinationPath.replace(/\\/g, "/")}"
ORGANIZE_BY_SCAN=${organizeByScan ? "1" : "0"}
MAX_RETRIES=5
INITIAL_BACKOFF=2
BACKOFF_FACTOR=2

# Colors
GREEN="\\033[0;32m"
BLUE="\\033[0;34m"
YELLOW="\\033[1;33m"
RED="\\033[0;31m"
CYAN="\\033[0;36m"
BOLD="\\033[1m"
NC="\\033[0m"

echo -e "\${BOLD}======================================================================\${NC}"
echo -e "\${BOLD}  Battery Imaging Library (BIL) - Bulk Downloader (Pure Bash)\${NC}"
echo -e "  Destination Directory: \${BLUE}\$DEST_DIR\${NC}"
echo -e "  Default Backoff:        \${CYAN}\${INITIAL_BACKOFF}s\${NC}"
echo -e "\${BOLD}======================================================================\${NC}"

# Verify curl or wget is present
HTTP_CLIENT=""
if command -v curl &>/dev/null; then
    HTTP_CLIENT="curl"
elif command -v wget &>/dev/null; then
    HTTP_CLIENT="wget"
else
    echo -e "\${RED}[Error] Neither 'curl' nor 'wget' was found. Please install curl or wget.\${NC}"
    exit 1
fi

mkdir -p "$DEST_DIR"

# Extract numeric record ID from DOI or URL
extract_zenodo_id() {
    local url="$1"
    if [[ "$url" =~ (zenodo\\.|/records/|/record/)([0-9]+) ]]; then
        echo "\${BASH_REMATCH[2]}"
    fi
}

# Fetch Zenodo JSON metadata with exponential backoff
fetch_zenodo_json() {
    local record_id="$1"
    local api_url="https://zenodo.org/api/records/\$record_id"
    local delay=\$INITIAL_BACKOFF
    local attempt=1

    while [ \$attempt -le \$MAX_RETRIES ]; do
        local resp=""
        if [ "$HTTP_CLIENT" = "curl" ]; then
            resp=\$(curl -fsSL \\
                -H "User-Agent: BatteryImagingLibrary-Downloader/1.0" \\
                --connect-timeout 30 \\
                --max-time 60 \\
                "\$api_url" 2>/dev/null)
        else
            resp=\$(wget -qO- \\
                --user-agent="BatteryImagingLibrary-Downloader/1.0" \\
                --timeout=60 \\
                "\$api_url" 2>/dev/null)
        fi

        if [ -n "\$resp" ]; then
            echo "\$resp"
            return 0
        fi

        echo -e "  \${YELLOW}[!] Zenodo API request failed. Retrying in \${delay}s (Attempt \$attempt/\$MAX_RETRIES)...\${NC}" >&2
        sleep "\$delay"
        delay=\$((delay * BACKOFF_FACTOR))
        attempt=\$((attempt + 1))
    done

    echo -e "  \${RED}[X] Failed to query Zenodo API for record #\$record_id\${NC}" >&2
    return 1
}

# Download a file using curl/wget with exponential backoff & resume
download_file() {
    local url="$1"
    local output_path="$2"
    local delay=\$INITIAL_BACKOFF
    local attempt=1

    mkdir -p "\$(dirname "\$output_path")"

    while [ \$attempt -le \$MAX_RETRIES ]; do
        echo -e "  \${BLUE}[->]\${NC} Downloading \$(basename "\$output_path") (Attempt \$attempt/\$MAX_RETRIES)..."
        
        local success=0
        if [ "$HTTP_CLIENT" = "curl" ]; then
            if curl -fSL -C - \\
                -H "User-Agent: BatteryImagingLibrary-Downloader/1.0" \\
                --connect-timeout 30 \\
                --retry 2 --retry-delay 2 \\
                -o "\$output_path" "\$url"; then
                success=1
            fi
        else
            if wget -c \\
                --user-agent="BatteryImagingLibrary-Downloader/1.0" \\
                --timeout=30 \\
                --tries=2 \\
                -O "\$output_path" "\$url"; then
                success=1
            fi
        fi

        if [ \$success -eq 1 ]; then
            echo -e "  \${GREEN}[OK]\${NC} Finished: \$(basename "\$output_path")"
            return 0
        fi

        echo -e "  \${YELLOW}[!] Download interrupted. Retrying in \${delay}s...\${NC}"
        sleep "\$delay"
        delay=\$((delay * BACKOFF_FACTOR))
        attempt=\$((attempt + 1))
    done

    echo -e "  \${RED}[X] Failed to download \$url after \$MAX_RETRIES attempts.\${NC}"
    return 1
}

# Manifest of all selected scans & links (scanId|sampleName|modality|category|url)
ENTRIES=(
${bashEntries}
)

TOTAL_FILES=\${#ENTRIES[@]}
echo -e "Found \${BOLD}\$TOTAL_FILES\${NC} record link(s) to process."

SUCCESS_COUNT=0
FAIL_COUNT=0
CURRENT=0

for entry in "\${ENTRIES[@]}"; do
    CURRENT=\$((CURRENT + 1))
    IFS='|' read -r SCAN_ID SAMPLE_NAME MODALITY CATEGORY RECORD_URL <<< "\$entry"

    echo -e "\\n\${BOLD}[\$CURRENT/\$TOTAL_FILES] Scan #\$SCAN_ID: \$SAMPLE_NAME [\$MODALITY] -> \$CATEGORY\${NC}"
    
    if [ "$ORGANIZE_BY_SCAN" = "1" ]; then
        TARGET_DIR="\$DEST_DIR/scan_\${SCAN_ID}_\${SAMPLE_NAME}/\$CATEGORY"
    else
        TARGET_DIR="\$DEST_DIR/\$CATEGORY"
    fi
    mkdir -p "\$TARGET_DIR"

    REC_ID=\$(extract_zenodo_id "\$RECORD_URL")

    if [ -n "\$REC_ID" ]; then
        echo -e "  Querying Zenodo record #\$REC_ID..."
        JSON_DATA=\$(fetch_zenodo_json "\$REC_ID")

        if [ -n "\$JSON_DATA" ]; then
            # Parse file keys and download URLs using pure sed/awk
            # Extracts entries from files array
            EXTRACTED=\$(echo "\$JSON_DATA" | awk -v RS='{' -v FS=',' '
                /key|filename/ {
                    fn=""; dl="";
                    for (i=1; i<=NF; i++) {
                        if ($i ~ /"key"[ \t]*:/ || $i ~ /"filename"[ \t]*:/) {
                            sub(/.*: *"/, "", $i); sub(/".*/, "", $i); fn=$i;
                        }
                        if ($i ~ /"self"[ \t]*:/ || $i ~ /"download"[ \t]*:/ || $i ~ /"content"[ \t]*:/) {
                            sub(/.*: *"/, "", $i); sub(/".*/, "", $i); dl=$i;
                        }
                    }
                    if (fn != "") {
                        if (dl == "") dl = "https://zenodo.org/records/'"\$REC_ID"'/files/" fn "?download=1";
                        print fn "\\t" dl;
                    }
                }
            ')

            if [ -n "\$EXTRACTED" ]; then
                while IFS=\$'\\t' read -r FILENAME FILE_URL; do
                    [ -z "\$FILENAME" ] && continue
                    FILE_PATH="\$TARGET_DIR/\$FILENAME"
                    if download_file "\$FILE_URL" "\$FILE_PATH"; then
                        SUCCESS_COUNT=\$((SUCCESS_COUNT + 1))
                    else
                        FAIL_COUNT=\$((FAIL_COUNT + 1))
                    fi
                done <<< "\$EXTRACTED"
            else
                # Fallback: download whole record archive
                ARCHIVE_URL="https://zenodo.org/api/records/\$REC_ID/files-archive"
                ARCHIVE_PATH="\$TARGET_DIR/zenodo_\${REC_ID}.zip"
                if download_file "\$ARCHIVE_URL" "\$ARCHIVE_PATH"; then
                    SUCCESS_COUNT=\$((SUCCESS_COUNT + 1))
                else
                    FAIL_COUNT=\$((FAIL_COUNT + 1))
                fi
            fi
        else
            FAIL_COUNT=\$((FAIL_COUNT + 1))
        fi
    else
        # Direct link
        BASENAME=\$(basename "\$RECORD_URL" | sed 's/[?&].*//')
        [ -z "\$BASENAME" ] && BASENAME="scan_\${SCAN_ID}_\${CATEGORY}.dat"
        FILE_PATH="\$TARGET_DIR/\$BASENAME"
        if download_file "\$RECORD_URL" "\$FILE_PATH"; then
            SUCCESS_COUNT=\$((SUCCESS_COUNT + 1))
        else
            FAIL_COUNT=\$((FAIL_COUNT + 1))
        fi
    fi
done

echo -e "\\n\${BOLD}======================================================================\${NC}"
echo -e "\${BOLD}  DOWNLOAD SUMMARY\${NC}"
echo -e "  Successful: \${GREEN}\$SUCCESS_COUNT\${NC}"
echo -e "  Failed:     \${RED}\$FAIL_COUNT\${NC}"
echo -e "  Saved to:   \${BLUE}\$DEST_DIR\${NC}"
echo -e "\${BOLD}======================================================================\${NC}"
`;
}
