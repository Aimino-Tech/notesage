import { useState, useEffect } from 'react';
// Import the configured PDF.js library from our custom file
import pdfjsLib from '@/lib/pdf-worker';
import './PDFViewer.css';

// Remove the direct worker configuration as it's now handled in pdf-worker.ts
// pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js'; <-- Remove this line

const PDFViewer = ({ fileUrl }) => {
  const [pdfDocument, setPdfDocument] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!fileUrl) return;
    
    setLoading(true);
    setError(null);
    
    // Load the PDF
    const loadPDF = async () => {
      try {
        // Create a new loading task
        const loadingTask = pdfjsLib.getDocument({
          url: fileUrl,
          cMapUrl: '/cmaps/', // Add cMap support
          cMapPacked: true,
        });
        
        // Add error handling to the loading task
        loadingTask.onProgress = (progress) => {
          console.log(`Loading PDF: ${progress.loaded / progress.total * 100}%`);
        };
        
        // Load the PDF document
        const pdf = await loadingTask.promise;
        setPdfDocument(pdf);
        setTotalPages(pdf.numPages);
        setCurrentPage(1);
        setLoading(false);
      } catch (err) {
        console.error('Error loading PDF:', err);
        setError(`Failed to load PDF: ${err.message || 'Unknown error'}`);
        setLoading(false);
      }
    };

    loadPDF();
    
    // Cleanup function
    return () => {
      // Cancel any pending tasks when component unmounts
    };
  }, [fileUrl]);

  useEffect(() => {
    if (!pdfDocument) return;
    
    const renderPage = async () => {
      try {
        const canvas = document.getElementById('pdf-canvas');
        if (!canvas) return;
        
        const context = canvas.getContext('2d');
        
        // Get the specified page
        const page = await pdfDocument.getPage(currentPage);
        
        // Calculate viewport to fit width
        const viewport = page.getViewport({ scale });
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        // Render PDF page
        const renderContext = {
          canvasContext: context,
          viewport: viewport
        };
        
        await page.render(renderContext).promise;
      } catch (err) {
        console.error('Error rendering PDF page:', err);
        setError(`Failed to render PDF page: ${err.message || 'Unknown error'}`);
      }
    };
    
    renderPage();
  }, [pdfDocument, currentPage, scale]);

  const changePage = (delta) => {
    const newPage = currentPage + delta;
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const changeZoom = (delta) => {
    const newScale = scale + delta;
    if (newScale >= 0.5 && newScale <= 3) {
      setScale(newScale);
    }
  };

  if (!fileUrl) return <div className="pdf-message">No file selected</div>;
  
  if (loading) return <div className="pdf-loading">Loading document...</div>;
  
  if (error) return (
    <div className="pdf-error">
      <p>{error}</p>
      <button onClick={() => window.location.reload()}>Reload</button>
    </div>
  );

  return (
    <div className="pdf-viewer">
      <div className="pdf-controls">
        <button onClick={() => changePage(-1)} disabled={currentPage === 1}>
          Previous
        </button>
        <span>
          Page {currentPage} of {totalPages}
        </span>
        <button onClick={() => changePage(1)} disabled={currentPage === totalPages}>
          Next
        </button>
        <button onClick={() => changeZoom(-0.2)}>Zoom Out</button>
        <button onClick={() => changeZoom(0.2)}>Zoom In</button>
      </div>
      <div className="pdf-container">
        <canvas id="pdf-canvas"></canvas>
      </div>
    </div>
  );
};

export default PDFViewer;
