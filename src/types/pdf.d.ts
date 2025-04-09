declare module 'pdfjs-dist' {
  const GlobalWorkerOptions: {
    workerSrc: string;
  };
  
  interface PDFDocumentProxy {
    numPages: number;
    getPage(pageNumber: number): Promise<PDFPageProxy>;
  }

  interface PDFPageProxy {
    getTextContent(): Promise<TextContent>;
  }

  interface TextContent {
    items: Array<{ str: string }>;
  }

  interface PDFDocumentLoadingTask {
    promise: Promise<PDFDocumentProxy>;
  }

  function getDocument(params: { data: ArrayBuffer }): PDFDocumentLoadingTask;

  const version: string;

  export { getDocument, GlobalWorkerOptions, version };
}
