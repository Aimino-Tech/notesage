import { useState, useEffect, useRef } from 'react';
import pdfjsLib from '@/lib/pdf-worker';
import './PDFViewer.css';
import { Source } from '@/types/types';
import { cn } from "@/lib/utils";

interface PDFViewerProps {
  source: Source;
  searchText?: string;
  targetPage?: number;
  className?: string;
}

interface TextLayerItem {
  str: string;
  dir: string;
  width: number;
  height: number;
  transform: number[];
  fontName: string;
}

export function PdfViewer({ source, searchText, targetPage, className }: PDFViewerProps) {
  const [pdfDocument, setPdfDocument] = useState<typeof pdfjsLib.PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);

  // Load the PDF document
  useEffect(() => {
    if (!source.fileDataUrl) return;
    
    setLoading(true);
    setError(null);
    
    const loadPDF = async () => {
      try {
        const loadingTask = pdfjsLib.getDocument({
          url: source.fileDataUrl,
          cMapUrl: '/cmaps/',
          cMapPacked: true,
        });
        
        loadingTask.onProgress = (progress) => {
          console.log(`Loading PDF: ${progress.loaded / progress.total * 100}%`);
        };
        
        const pdf = await loadingTask.promise;
        setPdfDocument(pdf);
        setTotalPages(pdf.numPages);
        
        // If targetPage is provided and valid, set it as current page
        if (targetPage && targetPage >= 1 && targetPage <= pdf.numPages) {
          setCurrentPage(targetPage);
        }

        setLoading(false);
      } catch (err) {
        console.error('Error loading PDF:', err);
        setError(err instanceof Error ? err.message : 'Failed to load PDF');
        setLoading(false);
      }
    };

    loadPDF();
  }, [source.fileDataUrl, targetPage]);

  // Render PDF page and text layer
  useEffect(() => {
    if (!pdfDocument || !canvasRef.current || !textLayerRef.current) return;
    
    const renderPage = async () => {
      try {
        // Get the page
        const page = await pdfDocument.getPage(currentPage);
        
        // Calculate viewport
        const viewport = page.getViewport({ scale });
        
        // Set canvas dimensions
        const canvas = canvasRef.current!;
        const context = canvas.getContext('2d')!;
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        // Render PDF page
        const renderContext = {
          canvasContext: context,
          viewport: viewport
        };
        
        await page.render(renderContext).promise;

        // Clear previous text layer content
        const textLayer = textLayerRef.current!;
        textLayer.innerHTML = '';
        textLayer.style.width = `${viewport.width}px`;
        textLayer.style.height = `${viewport.height}px`;

        // Get text content
        const textContent = await page.getTextContent();
        
        // Create text layer
        const textItems = textContent.items as TextLayerItem[];
        textItems.forEach((item) => {
          const tx = pdfjsLib.Util.transform(
            viewport.transform,
            item.transform
          );
          
          const textElement = document.createElement('span');
          textElement.textContent = item.str;
          textElement.style.left = `${tx[4]}px`;
          textElement.style.top = `${tx[5]}px`;
          textElement.style.fontSize = `${Math.abs(tx[0] * 1.2)}px`;
          textElement.style.transform = `scaleX(${tx[0] > 0 ? 1 : -1})`;
          
          if (searchText && item.str.toLowerCase().includes(searchText.toLowerCase())) {
            textElement.classList.add('highlight');
            // Scroll the highlighted text into view (with a small delay to ensure rendering)
            setTimeout(() => textElement.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
          }
          
          textLayer.appendChild(textElement);
        });

      } catch (err) {
        console.error('Error rendering PDF page:', err);
        setError(err instanceof Error ? err.message : 'Failed to render PDF page');
      }
    };
    
    renderPage();
  }, [pdfDocument, currentPage, scale, searchText]);

  const changePage = (delta: number) => {
    const newPage = currentPage + delta;
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const changeZoom = (delta: number) => {
    const newScale = scale + delta;
    if (newScale >= 0.5 && newScale <= 3) {
      setScale(newScale);
    }
  };

  if (!source.fileDataUrl) return <div className="p-4">No file data available</div>;
  
  if (loading) return <div className="p-4">Loading document...</div>;
  
  if (error) return (
    <div className="p-4 space-y-2">
      <p className="text-red-500">Error: {error}</p>
      <button 
        onClick={() => window.location.reload()}
        className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
      >
        Reload
      </button>
    </div>
  );

  return (
    <div className={cn("pdf-viewer", className)}>
      <div className="sticky top-0 z-10 flex items-center justify-between p-2 bg-background border-b">
        <div className="flex items-center gap-2">
          <button
            onClick={() => changePage(-1)}
            disabled={currentPage === 1}
            className="px-3 py-1 text-sm bg-secondary hover:bg-secondary/80 rounded disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => changePage(1)}
            disabled={currentPage === totalPages}
            className="px-3 py-1 text-sm bg-secondary hover:bg-secondary/80 rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => changeZoom(-0.2)}
            className="px-3 py-1 text-sm bg-secondary hover:bg-secondary/80 rounded"
          >
            Zoom Out
          </button>
          <button
            onClick={() => changeZoom(0.2)}
            className="px-3 py-1 text-sm bg-secondary hover:bg-secondary/80 rounded"
          >
            Zoom In
          </button>
        </div>
      </div>
      <div className="pdf-container relative overflow-auto">
        <canvas ref={canvasRef} className="block mx-auto"></canvas>
        <div ref={textLayerRef} className="absolute top-0 left-0 text-layer"></div>
      </div>
    </div>
  );
}
