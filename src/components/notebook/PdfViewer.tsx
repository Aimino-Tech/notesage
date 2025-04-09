import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Source } from '@/types/types';
import { Button } from '@/components/ui/button';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import { extractTextFromPdf } from '@/lib/pdf-worker';
import { cn } from '@/lib/utils';

// Define minimal interface locally as TextItem export path is unreliable
interface MinimalTextItem { str: string; }

// Ensure PDF worker is configured (can be done globally too)
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  '/pdf.worker.min.mjs',
  import.meta.url,
).toString();

interface PdfViewerProps {
  source: Source;
  className?: string;
  searchText?: string;
  targetPage?: number;
}

export function PdfViewer({
  source,
  className,
  searchText,
  targetPage,
}: PdfViewerProps) {
  const [pdfText, setPdfText] = useState<string>("");
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [isLoadingText, setIsLoadingText] = useState(false);
  const [pdfViewMode, setPdfViewMode] = useState<'text' | 'visual'>('visual');
  const [numPages, setNumPages] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [highlightApplied, setHighlightApplied] = useState(false);

  // Load PDF text content
  useEffect(() => {
    if (source.fileDataUrl && pdfViewMode === 'text' && !pdfText) { // Only load if text view active and not already loaded
      setIsLoadingText(true);
      const loadPdfText = async () => {
        try {
          // Check if content is already available in the source object
          if (source.content && source.content !== '[PDF Content Placeholder]') {
             setPdfText(source.content);
             setPdfError(null);
             console.log("Using pre-extracted PDF text from source object.");
          } else if (source.fileDataUrl) {
            console.log("Fetching and extracting PDF text...");
            const response = await fetch(source.fileDataUrl);
            const arrayBuffer = await response.arrayBuffer();
            const extractedText = await extractTextFromPdf(arrayBuffer);
            setPdfText(extractedText);
            setPdfError(null);
          } else {
             throw new Error("No fileDataUrl available to extract PDF text.");
          }
        } catch (error) {
          console.error('Error loading PDF text:', error);
          setPdfError('Failed to load PDF text');
          setPdfText(''); // Clear any previous text
        } finally {
          setIsLoadingText(false);
        }
      };
      loadPdfText();
    }
  }, [source.fileDataUrl, source.content, pdfViewMode, pdfText]); // Add pdfText dependency

  // Effect to handle targetPage prop changes
  useEffect(() => {
    if (targetPage !== undefined && targetPage > 0 && targetPage !== currentPage && (!numPages || targetPage <= numPages)) {
      setCurrentPage(targetPage);
      if (pdfViewMode !== 'visual') {
        setPdfViewMode('visual');
      }
      setHighlightApplied(false);
    } else if (targetPage === currentPage) {
      setHighlightApplied(false); // Reset highlight if search text changes on same page
    }
  }, [targetPage, numPages, pdfViewMode, searchText, currentPage]);

  // PDF Load Success Handler
  const onDocumentLoadSuccess = useCallback(({ numPages: nextNumPages }: { numPages: number }) => {
    setNumPages(nextNumPages);
    if (targetPage === undefined || targetPage <= 0 || targetPage > nextNumPages) {
      setCurrentPage(1);
    } else {
      // Let the useEffect handle setting currentPage if targetPage is valid
    }
    setPdfError(null);
  }, [targetPage]);

  // PDF Load Error Handler
  const onDocumentLoadError = useCallback((error: Error) => {
    console.error('Error loading PDF document:', error);
    setPdfError(`Failed to load PDF: ${error.message}`);
    setNumPages(null);
  }, []);

  // Pagination Handlers
  const goToPreviousPage = () => setCurrentPage((prev) => Math.max(prev - 1, 1));
  const goToNextPage = () => setCurrentPage((prev) => Math.min(prev + 1, numPages || 1));

  // Highlighting and Scrolling Callbacks for Visual Mode
  const customTextRendererCallback = useCallback(
    (textItem: MinimalTextItem): string => {
      if (!searchText || !textItem.str) return textItem.str;
      const escapedSearchText = searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (!escapedSearchText) return textItem.str;
      const regex = new RegExp(`(${escapedSearchText})`, 'gi');
      return textItem.str.replace(regex, (match) => `<mark style="background-color: yellow; color: black;">${match}</mark>`);
    },
    [searchText]
  );

  const onRenderSuccessCallback = useCallback(() => {
    if (searchText && !highlightApplied) {
      setTimeout(() => {
        const highlightedElement = document.querySelector('.react-pdf__Page mark'); // Target marks within react-pdf page
        if (highlightedElement) {
          highlightedElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setHighlightApplied(true);
        }
      }, 150);
    }
  }, [searchText, highlightApplied]);

  return (
    <div className={cn("p-4 flex flex-col h-full", className)}>
      {/* PDF View Mode Toggle */}
      <div className="flex gap-2 mb-2 flex-shrink-0">
        <Button
          variant={pdfViewMode === 'text' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setPdfViewMode('text')}
        >
          Text View
        </Button>
        <Button
          variant={pdfViewMode === 'visual' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setPdfViewMode('visual')}
        >
          Visual View
        </Button>
      </div>

      {/* Conditional PDF Content */}
      <div className="flex-1 overflow-auto">
        {pdfViewMode === 'text' ? (
          isLoadingText ? (
            <div className="flex items-center justify-center h-full">Loading PDF Text...</div>
          ) : pdfError ? (
            <div className="flex items-center justify-center h-full text-red-500">{pdfError}</div>
          ) : (
            <pre className="whitespace-pre-wrap text-sm">{pdfText || "No text extracted."}</pre>
          )
        ) : (
          // Visual PDF Viewer
          <>
            <Document
              file={source.fileDataUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              loading={<div className="p-4 text-center">Loading PDF Document...</div>}
              error={<div className="p-4 text-red-500 text-center">Error loading PDF Document.</div>}
              className="mb-2 flex justify-center" // Center document
            >
              <Page
                key={`${source.id}-${currentPage}`}
                pageNumber={currentPage}
                loading={<div className="p-4 text-center">Loading page {currentPage}...</div>}
                error={<div className="p-4 text-red-500 text-center">Error loading page {currentPage}.</div>}
                customTextRenderer={customTextRendererCallback}
                onRenderSuccess={onRenderSuccessCallback}
                // Render text layer for highlighting/selection
                renderTextLayer={true} 
                // Render annotation layer if needed
                renderAnnotationLayer={true} 
              />
            </Document>
            {numPages && (
              <div className="flex items-center justify-center gap-2 mt-2 flex-shrink-0">
                <Button variant="outline" size="sm" onClick={goToPreviousPage} disabled={currentPage <= 1}>
                  Previous
                </Button>
                <span> Page {currentPage} of {numPages} </span>
                <Button variant="outline" size="sm" onClick={goToNextPage} disabled={currentPage >= numPages}>
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
