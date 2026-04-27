#!/usr/bin/env node

import fs from "fs";
import path from "path";
// Use node-fetch for fetch API
import { parse } from "csv-parse/sync";
import { Book, BookSchema } from "../src/types";

// Helper to fetch TSV from Google Sheets using fetch
async function fetchTSV(url: string): Promise<string> {
  const res = await fetch(url, { redirect: "follow" });
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
  console.log(tsv);

  let records: any[];
  try {
    records = parse(tsv, { columns: true, skip_empty_lines: true, delimiter: "\t" });
  } catch (err) {
    console.error("Failed to parse TSV:", err);
    process.exit(1);
  }

  // Parse each row into Book, accumulate errors
  const books: Book[] = [];
  const errors: { row: number; error: any; data: any }[] = [];
  records.forEach((row, idx) => {
    console.log("Processing row:", row);
    // Convert fields to correct types
    const parsedRow = {
      id: Number(row["ID"]),
      name: row["Name"],
      author: row["Author"],
      year: Number(row["Year"]),
      url: row["Url"],
      type: row["Type"],
    };
    const result = BookSchema.safeParse(parsedRow);
    if (result.success) {
      books.push(result.data);
    } else {
      errors.push({ row: idx + 2, error: result.error, data: row }); // +2 for header and 0-index
    }
  });

  if (errors.length > 0) {
    console.error("Errors found in the following rows:");
    errors.forEach((e) => {
      console.error(`Row ${e.row}:`, e.error, e.data);
    });
    process.exit(1);
  }

  // Write to src/dynamic_content.json
  const outPath = path.join(__dirname, "../src/dynamic_content.json");
  fs.writeFileSync(outPath, JSON.stringify(books, null, 2));
  console.log(`Successfully wrote ${books.length} books to src/dynamic_content.json`);
}

main();
