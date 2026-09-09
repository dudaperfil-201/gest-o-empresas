// Tipagem mínima do pdf-parse (importado pelo caminho interno /lib/pdf-parse.js para
// evitar o bloco de "debug" do index.js, que tenta ler um arquivo de teste no bundle).
declare module 'pdf-parse/lib/pdf-parse.js' {
  interface PdfParseResult {
    text: string
    numpages: number
    info: unknown
    metadata: unknown
    version: string
  }
  function pdfParse(dataBuffer: Buffer | Uint8Array, options?: unknown): Promise<PdfParseResult>
  export default pdfParse
}
