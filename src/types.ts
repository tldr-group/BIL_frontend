import { z } from "zod";

export const ELECTROLYTE_TYPE = ["LIQUID", "SOLID", "UNKNOWN"] as const;
export type ElectrolyteType = (typeof ELECTROLYTE_TYPE)[number];

export const CELL_TYPE = ["PRIMARY", "SECONDARY", "UNKNOWN"] as const;
export type CellType = (typeof CELL_TYPE)[number];

export const CELL_FORMAT = ["POUCH", "COIN", "PRISMATIC", "CYLINDRICAL", "BLADE", "OTHER", "UNKNOWN"] as const;
export type CellFormat = (typeof CELL_FORMAT)[number];

export const SCAN_TYPE = ["PARTICLE", "ELECTRODE", "CELL", "UNKNOWN"] as const;
export type ScanType = (typeof SCAN_TYPE)[number];

export const MODALITIES = [
  "ANY",
  "SEM",
  "EDS",
  "EBSD",
  "LAB_MICRO_XCT",
  "LAB_NANO_XCT",
  "NEUTRON_CT",
  "XRD_CT",
  "XANES_CT",
  "SYNCHOTRON_MICRO_XCT",
  "SYNCHOTRON_NANO_XCT",
  "S3DXRD",
  "TEM",
  "APT",
] as const;
export type Modality = (typeof MODALITIES)[number];

export type ScanDetails = {
  scanID: number;
  sampleID: number;
  sampleName: string;
  chemistry: string;
  electrolyteType: ElectrolyteType;
  cellType: CellType;
  cellFormat: CellFormat;
  sampleDescription: string;
  scanType: string;
  scanModality: Modality;
  instrument: string;
  pixelSize_µm: (number | string)[] | null;
  dataDimensions_px: (number | string)[] | null;
  dataDimensions_µm: number[] | null;
  thumbnailType: string;
  thumbnailName: string[];
  scanParameters: Record<string, string>;
  citations: string[];
  contributors: string;
  licence: "CC-4.0" | "CC0";
  zenodoLinks: {
    rawZenodoLinks: string[];
    rawZenodoLabels: string[];
    processedZenodoLinks: string[];
    processedZenodoLabels: string[];
    reconstructedZenodoLinks: string[];
    reconstructedZenodoLabels: string[];
  };
};

// Our zod schemas we'll use to validate the json data in content
// They should match our types 1-1
export const ScanDetailsSchema = z.object({
  scanID: z.number(),
  sampleID: z.number(),
  sampleName: z.string(),
  chemistry: z.string(),
  electrolyteType: z.enum(ELECTROLYTE_TYPE),
  cellType: z.enum(CELL_TYPE),
  cellFormat: z.enum(CELL_FORMAT),
  sampleDescription: z.string(),
  scanType: z.enum(SCAN_TYPE),
  scanModality: z.enum(MODALITIES),
  instrument: z.string(),
  pixelSize_µm: z.array(z.number()).nullable(),
  dataDimensions_px: z.array(z.union([z.number(), z.string()])).nullable(),
  dataDimensions_µm: z.array(z.number()).nullable(),
  thumbnailType: z.string(),
  thumbnailName: z.array(z.string()),
  scanParameters: z.record(z.string(), z.string()),
  citations: z.array(z.string()),
  contributors: z.string(),
  licence: z.enum(["CC-4.0", "CC0"]),
  zenodoLinks: z.object({
    rawZenodoLinks: z.array(z.string()),
    rawZenodoLabels: z.array(z.string()),
    processedZenodoLinks: z.array(z.string()),
    processedZenodoLabels: z.array(z.string()),
    reconstructedZenodoLinks: z.array(z.string()),
    reconstructedZenodoLabels: z.array(z.string()),
  }),
});

// We need to define our own interface (i.e behaviours $schema will have) because zod mini removes the ZodSchema type
interface MinimalSchema<Output> {
  safeParse: (input: unknown) => { success: true; data: Output } | { success: false; error: any };
}

// This is a helper function that parses JSON arrays according to zod schemas and returns objects of type T
// if successful, otherwise logs error and skips item. This allows us to handle errors in our JSON data gracefully without crashing the whole page.
export const gracefulParse = <T>(schema: MinimalSchema<T>, data: unknown[]): T[] => {
  return data.reduce<T[]>((acc, item) => {
    const result = schema.safeParse(item);

    if (result.success) {
      acc.push(result.data);
    } else {
      console.warn("Parsing failed for item:", item, result.error);
    }
    return acc;
  }, []);
};
