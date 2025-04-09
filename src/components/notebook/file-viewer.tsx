import React, { useState, useEffect, useCallback } from "react"; // Keep useState, useEffect, useCallback
import { Source } from "@/types/types";
import { Button } from "@/components/ui/button";
// Restore necessary imports
import { ArrowLeft, RefreshCcw } from "lucide-react"; // Keep ArrowLeft, RefreshCcw
import { DocumentOverview } from "./document-overview";
import { generateDocumentOverview } from '@/lib/document-summary';
import { DocumentSummary, AIModel } from '@/types/types';
import { useModel } from '@/hooks/useModel';
import { useApiKeys } from '@/hooks/useApiKeys';
import { cn } from "@/lib/utils";

// Import the new viewer components
import { PdfViewer } from './PdfViewer';
import { DocxViewer } from './DocxViewer';
import { ImageViewer } from './ImageViewer';
import { TextViewer } from './TextViewer';

interface FileViewerProps {
  source: Source;
  onClose: () => void;
  className?: string;
  searchText?: string;
  targetPage?: number; // Add targetPage prop
  // Add props passed by EnhancedFileViewer
  onRetryProcessing?: () => Promise<void> | void;
  onUpdateSummary?: (summary: DocumentSummary | null) => void;
  isProcessing?: boolean;
}

// Ensure PDF worker is configured (usually done in main.tsx or App.tsx, but good practice)
// pdfjs.GlobalWorkerOptions.workerSrc = new URL(
//   '/pdf.worker.min.mjs',
//   import.meta.url,
// ).toString();

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
const PDF_EXTENSION = 'pdf';
const DOCX_EXTENSION = 'docx';

function isImageFile(filename: string) {
  const extension = filename.split('.').pop()?.toLowerCase();
  return extension && IMAGE_EXTENSIONS.includes(extension);
}

function isPdfFile(filename: string) {
  const extension = filename.split('.').pop()?.toLowerCase();
  return extension === PDF_EXTENSION;
}

function isDocxFile(filename: string) {
  const extension = filename.split('.').pop()?.toLowerCase();
  return extension === DOCX_EXTENSION;
}

export function FileViewer({ 
  source, 
  onClose,
  className,
  searchText,
  targetPage, // Destructure targetPage
  // Destructure new props
  onRetryProcessing,
  onUpdateSummary,
  isProcessing = false // Default isProcessing to false
}: FileViewerProps) {
  const { selectedModel } = useModel();
  const { getApiKey } = useApiKeys();
  // Remove state and effects related to specific viewers (PDF, DOCX, Text, Image)
  // State for internal summary generation (if not overridden by props)
  const [summary, setSummary] = useState<DocumentSummary | null>(null);

  // Internal summary retry handler (used if onRetryProcessing is not provided)
  const handleRetrySummary = useCallback(async () => {
    // This logic should ideally use the source.content which should be pre-populated
    // during the source adding process (e.g., in useSourceActions).
    // Avoid re-extracting text here if possible.
    if (!source.content) {
      console.warn("Cannot retry summary: Source content is missing.");
      // Optionally try to fetch/extract again, but it's better handled upstream
      return;
    }

    setSummary(null); // Clear previous internal summary state
    try {
      const apiKey = getApiKey(selectedModel?.provider || '');
      if (!selectedModel || !apiKey) {
        throw new Error("Model or API key not configured for summary retry.");
      }
      console.log(`Retrying summary internally for ${source.name}`);
      const newSummary = await generateDocumentOverview(source.content, selectedModel, apiKey);
      setSummary(newSummary); // Update internal state
      if (onUpdateSummary) {
        onUpdateSummary(newSummary); // Notify parent if handler provided
      }
    } catch (error) {
      console.error('Error retrying summary internally:', error);
      const errorSummary: DocumentSummary = {
        summary: "", outline: "", keyPoints: "", qa: [], todos: "",
        error: error instanceof Error ? error.message : "Failed to retry summary",
        isValid: false, lastUpdated: new Date()
      };
      setSummary(errorSummary); // Update internal state with error
      if (onUpdateSummary) {
        onUpdateSummary(errorSummary); // Notify parent if handler provided
      }
    }
  }, [source.content, source.name, selectedModel, getApiKey, onUpdateSummary]); // Added source.name to dependencies


  // Determine which viewer to render
  const renderContentViewer = () => {
    if (isDocxFile(source.name)) {
      return <DocxViewer source={source} className="flex-1" />;
    } else if (isPdfFile(source.name)) {
      return <PdfViewer source={source} searchText={searchText} targetPage={targetPage} className="flex-1" />;
    } else if (isImageFile(source.name)) {
      return <ImageViewer source={source} className="flex-1" />;
    } else {
      // Default to TextViewer for text, md, txt, or unknown types
      return <TextViewer source={source} searchText={searchText} className="flex-1" />;
    }
  };

  return (
     <div className={cn("flex flex-col h-full", className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-background flex-shrink-0">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back to Sources</span>
          </Button>
          <h2 className="font-semibold text-lg truncate" title={source.name}>
            {source.name}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            // Use external handler if provided, disable if processing
            onClick={onRetryProcessing || handleRetrySummary} 
            disabled={isProcessing} 
            className="h-8 w-8"
          >
            {/* Show spinner if processing */}
            <RefreshCcw className={cn("h-4 w-4", isProcessing && "animate-spin")} /> 
            <span className="sr-only">Refresh Summary</span>
          </Button>
        </div>
      </div>

      {/* Pass down relevant props to DocumentOverview */}
      {/* Use source.summary if EnhancedFileViewer manages state, otherwise internal summary */}
      {/* Use onRetryProcessing if provided, otherwise internal handleRetrySummary */}
      {/* Use onUpdateSummary if provided, otherwise internal setSummary */}
      <DocumentOverview 
        summary={source.summary || summary} // Prefer summary from source prop if available
        onRetry={onRetryProcessing || handleRetrySummary} // Prefer external handler
        onUpdateSummary={onUpdateSummary || setSummary} // Prefer external handler
        isProcessing={isProcessing} // Pass down processing state
      />

      {/* Content Area: Render the appropriate viewer */}
      <div className="flex-1 overflow-auto">
        {renderContentViewer()}
      </div>
    </div>
  );
}
