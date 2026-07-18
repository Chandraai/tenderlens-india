declare module "pdf-parse" {
  export class PDFParse {
    constructor(input: { data: Buffer } | { url: string });
    getText(options?: unknown): Promise<{ text: string; total?: number }>;
    destroy(): Promise<void>;
  }
}
