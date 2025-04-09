import React, { useState, useEffect, useCallback } from 'react';
// Import the configured PDF.js library
import pdfjsLib from '@/lib/pdf-worker';
// Other imports...

// Remove any direct imports of PDF worker if they exist
// import '...pdf.worker.min.mjs'; <-- This kind of import should be removed

export const FileViewer = ({ file, ...props }) => {
  const [pdf, setPdf] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [numPages, setNumPages] = useState(null);
  const [scale, setScale] = useState(1.0);

  // Define loadPdf using useCallback before the useEffect hook that uses it
  const loadPdf = useCallback(async () => {
    if (!file?.url) {
      // Reset state if file or url is missing
      setPdf(null);
      setNumPages(null);
      setPageNumber(1);
      return;
    }
    try {
      // Use the already configured pdfjsLib
      const loadingTask = pdfjsLib.getDocument({
        url: file.url,
        cMapUrl: '/cmaps/',
        cMapPacked: true,
      });
      const pdfDocument = await loadingTask.promise;
      setPdf(pdfDocument);
      setNumPages(pdfDocument.numPages);
    } catch (error) {
      console.error('Error loading PDF:', error);
      // Reset state on error
      setPdf(null);
      setNumPages(null);
      setPageNumber(1);
    }
  }, [file?.url]); // Dependency for useCallback

  useEffect(() => {
    loadPdf();
  }, [loadPdf]); // Now useEffect depends on the memoized loadPdf

  const renderPage = (pageNumber) => {
    if (!pdf) return null;

    pdf.getPage(pageNumber).then((page) => {
      const viewport = page.getViewport({ scale });
      const canvas = document.getElementById(`pdf-page-${pageNumber}`) as HTMLCanvasElement; // Cast to HTMLCanvasElement
      if (!canvas) return; // Add null check
      const context = canvas.getContext('2d');
      if (!context) return; // Add null check for context
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      const renderContext = {
        canvasContext: context,
        viewport,
      };
      page.render(renderContext);
    });
  };

    return (
    <div {...props} style={{ overflow: 'auto', width: '100%', height: '500px' }}>
      <div>
        {Array.from(new Array(numPages), (el, index) => (
          <canvas
            key={`pdf-page-${index + 1}`}
            id={`pdf-page-${index + 1}`}
            style={{ display: index + 1 === pageNumber ? 'block' : 'none' }}
          />
        ))}
      </div>
      <div>
        <button
          disabled={pageNumber <= 1}
          onClick={() => setPageNumber(pageNumber - 1)}
        >
          Previous
        </button>
        <button
          disabled={pageNumber >= numPages}
          onClick={() => setPageNumber(pageNumber + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
};
