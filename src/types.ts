import * as z from "zod/mini";

const bookTypes = ["classic", "non-fiction", "sci-fi", "horror"] as const;
export type BookTypes = (typeof bookTypes)[number];

// Our types we'll use in the components
export type Book = {
  id: number;
  name: string;
  author: string;
  year: number;
  url: string;
  type: BookTypes;
};

// Our zod schemas we'll use to validate the json data in content
// They should match our types 1-1
export const BookSchema = z.object({
  id: z.number(),
  name: z.string(),
  author: z.string(),
  year: z.number(),
  url: z.string(),
  type: z.enum(bookTypes),
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
