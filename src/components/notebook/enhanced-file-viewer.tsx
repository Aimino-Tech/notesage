import { useState, useEffect } from "react";
import { Source, DocumentSummary } from "@/types/types"; // Import DocumentSummary from types
import { FileViewer } from "./file-viewer";
// Removed incorrect import: import { DocumentSummary } from "@/lib/document-summary"; 
import { processDocumentSource } from "@/lib/document-processor";
import { useModel } from "@/hooks/useModel"; // Updated import path
import { useApiKeys } from "@/hooks/useApiKeys"; // Updated import path

interface EnhancedFileViewerProps {
  source: Source;
  onClose: () => void;
  className?: string;
  searchText?: string;
}

/**
 * Enhanced file viewer that uses the configured LLM to generate document overviews
 * instead of using mock data. Wraps the standard file viewer component.
 */
export function EnhancedFileViewer({
  source,
  onClose,
  className,
  searchText
}: EnhancedFileViewerProps) {
  const [enhancedSource, setEnhancedSource] = useState<Source>(source);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const { selectedModel } = useModel();
  const { getApiKey, isApiKeyValid } = useApiKeys();

  // Process the source document with the selected LLM when it changes
  useEffect(() => {
    const processDocument = async () => {
      if (!enhancedSource.summary) {
        setIsProcessing(true);
        try {
          // Only use real LLM if we have a valid model and API key
          const apiKey = selectedModel ? getApiKey(selectedModel.provider) : "";
          const validApiKey = selectedModel && isApiKeyValid(selectedModel.provider);
          
          console.log(`Using ${selectedModel?.name || 'no model'} for document processing`);
          console.log(`API key validity: ${validApiKey ? 'valid' : 'invalid'}`);
          
          // Process the document with our document processor
          const summary = await processDocumentSource(
            enhancedSource, 
            validApiKey ? selectedModel : null,
            apiKey
          );
          
          // Update the source with the new summary
          setEnhancedSource({
            ...enhancedSource,
            summary
          });
        } catch (error) {
          console.error("Error processing document:", error);
        } finally {
          setIsProcessing(false);
        }
      }
    };
    
    processDocument();
    // Added enhancedSource, getApiKey, isApiKeyValid to dependencies
  }, [source, selectedModel, enhancedSource, getApiKey, isApiKeyValid]); 

  // Handle retrying document processing with the current LLM
  const handleRetryProcessing = async () => {
    setIsProcessing(true);
    try {
      // Use the current model and API key
      const apiKey = selectedModel ? getApiKey(selectedModel.provider) : "";
      const validApiKey = selectedModel && isApiKeyValid(selectedModel.provider);
      
      // Process the document with our document processor
      const summary = await processDocumentSource(
        enhancedSource, 
        validApiKey ? selectedModel : null,
        apiKey
      );
      
      // Update the source with the new summary
      setEnhancedSource({
        ...enhancedSource,
        summary
      });
    } catch (error) {
      console.error("Error reprocessing document:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle updates to the summary (e.g., from edits)
  // Ensure DocumentSummary type is correctly imported and used
  const handleSummaryUpdate = (updatedSummary: DocumentSummary) => { 
    setEnhancedSource({
      ...enhancedSource,
      summary: updatedSummary
    });
  };

  // Pass the enhanced source with generated summary to the original file viewer
  return (
    <FileViewer
      source={enhancedSource}
      onClose={onClose}
      className={className}
      searchText={searchText}
      onRetryProcessing={handleRetryProcessing}
      onUpdateSummary={handleSummaryUpdate}
      isProcessing={isProcessing}
    />
  );
}
