/**
 * Initialize PDF.js worker for Vite environment
 * Simplified implementation focusing on text extraction
 */
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/legacy/build/pdf';
import pdfWorker from 'pdfjs-dist/legacy/build/pdf.worker?url';

// Define the base path for CMaps relative to the public directory
const CMAP_URL = '/cmaps/'; // Assuming cmaps are served from /cmaps/ relative to the domain root
const CMAP_PACKED = true; // Standard CMaps are usually packed

// Initialize the worker globally
GlobalWorkerOptions.workerSrc = pdfWorker;


export async function extractTextFromPdf(arrayBuffer: ArrayBuffer): Promise<string> {
  try {
    // Pass cMap options directly to getDocument, casting to 'any' to bypass TS error
    const pdf = await getDocument({
      data: arrayBuffer,
      cMapUrl: CMAP_URL,
      cMapPacked: CMAP_PACKED,
     } as any).promise; // Cast to any as a workaround for potential type definition mismatch
    let text = '';

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      // Type inference should handle item type here
      text += content.items
        .map((item) => item.str)
        .join(' ') + '\n\n';
    }

    return text.trim();
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw error;
  }
}
