import { useCallback, useState } from "react"; // Added useState
// Import ChatMessage and Note types
import { Source, AIModel, DocumentSummary, ChatMessage, Note, SourceStatus, SourceType } from "@/types/types"; // Added SourceStatus, SourceType
import { useToast } from "@/hooks/use-toast";
import { useApiKeys } from "@/hooks/useApiKeys";
import { ProcessedSourceData } from "@/components/ui/add-source-dialog"; // Import ProcessedSourceData
import { v4 as uuidv4 } from 'uuid'; // Import uuid
// Update import path for generateDocumentSummary
import { generateDocumentSummary } from "@/lib/llm-summary";
// mammoth and extractTextFromPdf are no longer needed here as content extraction moved to dialog

export interface UseSourceActionsProps {
  sources: Source[];
  setSources: React.Dispatch<React.SetStateAction<Source[]>>;
  selectedModel: AIModel;
  // Need messages and notes for saving context, even if not directly modified here
  messages: ChatMessage[];
  notes: Note[];
  saveNotebookToLocalStorage: (updatedSources: Source[], updatedMessages: ChatMessage[], updatedNotes: Note[]) => void;
}

export const useSourceActions = ({
  sources,
  setSources,
  selectedModel,
  messages, // Receive messages for saving
  notes, // Receive notes for saving
  saveNotebookToLocalStorage,
}: UseSourceActionsProps) => {
  const { toast } = useToast();
  const { getApiKey } = useApiKeys();
  const [isProcessingSources, setIsProcessingSources] = useState(false); // Loading state for adding sources

  // Helper function to map MIME type/extension to SourceType
  const mapFileTypeToSourceType = (fileType: string, fileName: string): SourceType => {
    // Prioritize specific extensions
    if (fileName.endsWith('.pdf')) return 'pdf';
    if (fileName.endsWith('.docx')) return 'docx';
    if (fileName.endsWith('.md')) return 'md';
    if (fileName.endsWith('.txt')) return 'txt';
    if (fileName.endsWith('.csv')) return 'csv';
    if (fileName.endsWith('.json')) return 'json';

    // Then check MIME types
    if (fileType.startsWith('image/')) return 'image';
    if (fileType.startsWith('audio/')) return 'audio';
    if (fileType === 'application/pdf') return 'pdf';
    if (fileType === 'text/csv') return 'csv';
    if (fileType === 'application/json') return 'json';
    if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return 'docx';
    if (fileType === 'text/markdown') return 'md';
    if (fileType === 'text/plain') return 'txt';
    if (fileType.startsWith('text/')) return 'text';
    if (fileType === 'url') return 'url'; // Add case for URL type

    console.warn(`Unknown file type: ${fileType} for file: ${fileName}. Defaulting to 'text'.`);
    return 'text';
  };

  // --- handleAddFiles removed ---

  // New handler for adding processed sources (including split parts)
  const handleAddProcessedSources = useCallback(async (sourcesData: ProcessedSourceData[]) => {
    if (!sourcesData || sourcesData.length === 0) return;

    setIsProcessingSources(true);
    const newSources: Source[] = sourcesData.map(data => ({
      id: uuidv4(),
      name: data.name,
      content: data.content, // Content is already extracted
      type: mapFileTypeToSourceType(data.type, data.name),
      status: SourceStatus.Processing, // Start in processing state
      summary: null,
      createdAt: new Date(),
      lastModified: new Date(),
      dateAdded: new Date(),
      part: data.part,
      totalParts: data.totalParts,
      originalId: data.originalId, // Map the originalId
      // fileDataUrl: data.originalFile.type.startsWith('text/') ? undefined : await readFileAsDataURL(data.originalFile), // Example
    }));

    // Add new sources to state immediately
    setSources(prevSources => [...prevSources, ...newSources]);
    saveNotebookToLocalStorage([...sources, ...newSources], messages, notes); // Save immediately

    toast({
      title: "Sources Added",
      description: `${newSources.length} source(s)/part(s) added. Processing summaries...`,
    });

    // Now, process summaries asynchronously
    const summaryPromises = newSources.map(async (source) => {
      // Check if content indicates a prior extraction error or is unsuitable for summary
      const hasExtractionError = source.content.startsWith('Error reading text file:') || source.content.startsWith('Error processing PDF:');
      const isNonTextualPlaceholder = source.content.startsWith('[') && source.content.endsWith(']'); // e.g., [image/png content...]

      if (source.type === 'image' || source.type === 'audio' || hasExtractionError || isNonTextualPlaceholder) {
        console.log(`Skipping summary for ${source.name} (type: ${source.type}, error: ${hasExtractionError}, placeholder: ${isNonTextualPlaceholder})`);
        // Set status to Error if extraction failed, otherwise Completed for non-summarizable types
        const finalStatus = hasExtractionError ? SourceStatus.Error : SourceStatus.Completed;
        return { ...source, status: finalStatus, isGeneratingSummary: false, summary: null }; // Ensure summary is null
      }

      // Proceed with summary generation only if content is valid text
      console.log(`Attempting summary generation for ${source.name}`);
      try {
        let apiKeyToUse: string | undefined;
        let modelToUse = selectedModel;

        // Check if the model object itself contains an API key (for sponsored models)
        if ('apiKey' in modelToUse && typeof (modelToUse as any).apiKey === 'string') {
           apiKeyToUse = (modelToUse as any).apiKey;
           console.log(`Using hardcoded API key for sponsored model: ${modelToUse.id}`);
        } else {
           // Otherwise, get the key from settings based on the provider
           apiKeyToUse = getApiKey(modelToUse.provider);
           console.log(`Using API key from settings for provider: ${modelToUse.provider}`);
        }


        // Adjust Ollama host if API key field is used for host URL
        // Note: This assumes Ollama host URL is stored via getApiKey('ollama')
        if (modelToUse.provider === 'ollama' && apiKeyToUse) {
           modelToUse = { ...modelToUse, ollamaConfig: { ...(modelToUse.ollamaConfig || {}), host: apiKeyToUse } };
           // For Ollama, the 'apiKeyToUse' might be the host, not a key for the actual call,
           // depending on how ollamaGenerateDocumentSummary is implemented.
           // Let's assume ollamaGenerateDocumentSummary handles this.
        }

        // Check if we have a model and a key/config needed for it
        // Ollama doesn't strictly need apiKeyToUse here if host is in modelToUse.ollamaConfig
        const canProceed = modelToUse && (apiKeyToUse || modelToUse.provider === 'ollama');

        if (canProceed) {
          // Pass the determined key (could be hardcoded or from settings)
          const summaryResult = await generateDocumentSummary(modelToUse, apiKeyToUse || '', source.content);
          // Ensure summary generation itself didn't error out internally in the LLM call
           if (summaryResult.error) {
             console.error(`Summary generation returned an error for ${source.name}: ${summaryResult.error}`);
             return { ...source, summary: summaryResult, status: SourceStatus.Error, isGeneratingSummary: false };
           }
          return { ...source, summary: summaryResult, status: SourceStatus.Completed, isGeneratingSummary: false };
        } else {
          // Handle missing config case
          const configErrorMsg = 'Configuration missing for summary generation.';
          console.warn(`Cannot generate summary for ${source.name}: ${configErrorMsg}`);
          const errorSummary: DocumentSummary = { summary: '', outline: '', keyPoints: '', qa: [], todos: '', error: configErrorMsg, isValid: false, lastUpdated: new Date() };
          // Don't show a generic toast here, the final check will show a more specific one
          return { ...source, summary: errorSummary, status: SourceStatus.Error, isGeneratingSummary: false };
        }
      } catch (summaryError) {
        // Catch errors during the generateDocumentSummary call itself
        // Catch errors during the generateDocumentSummary call itself
        console.error(`Error generating summary for ${source.name}:`, summaryError);
        toast({
          title: "Summary Generation Error",
          description: `Could not generate summary for: ${source.name}`,
          variant: "destructive",
        });
        const errorSummary: DocumentSummary = { summary: '', outline: '', keyPoints: '', qa: [], todos: '', error: summaryError instanceof Error ? summaryError.message : 'Summary generation failed', isValid: false, lastUpdated: new Date() };
        return { ...source, summary: errorSummary, status: SourceStatus.Error, isGeneratingSummary: false };
      }
    });

    // Wait for all summaries to process
    const processedSources = await Promise.all(summaryPromises);

    // Update the state again with the processed summaries and statuses
    setSources(currentSources => {
      const updatedMap = new Map(currentSources.map(s => [s.id, s]));
      processedSources.forEach(ps => updatedMap.set(ps.id, ps));
      const finalSources = Array.from(updatedMap.values());
      saveNotebookToLocalStorage(finalSources, messages, notes); // Save final state
      return finalSources;
    });

    setIsProcessingSources(false);
    // Check for errors and notify user with specific reasons
    const failedSources = processedSources.filter(s => s.status === SourceStatus.Error);
    if (failedSources.length > 0) {
      const errorDetails = failedSources.map(s => {
        let reason = 'processing failed'; // Default reason
        if (s.content?.startsWith('[PDF Text Extraction Failed')) {
          reason = 'PDF text extraction failed (check if image-only or corrupted)';
        } else if (s.summary?.error === 'Configuration missing for summary generation.') {
          reason = `missing API key/config for ${selectedModel.provider}`;
        } else if (s.summary?.error) {
          reason = `summary generation failed (${s.summary.error})`;
        }
        return `${s.name} (${reason})`;
      }).join(', ');

       toast({
         title: "Source Processing Issues",
         description: `Could not fully process: ${errorDetails}. Please check file content or API key settings.`,
         variant: "destructive",
         duration: 9000 // Longer duration for detailed error
       });
    } else {
       toast({
         title: "Processing Complete",
         description: `Summaries generated for ${processedSources.filter(s => s.status === SourceStatus.Completed).length} source(s).`,
       });
    }

  }, [sources, setSources, selectedModel, messages, notes, saveNotebookToLocalStorage, toast, getApiKey]);


  const handleRenameSource = useCallback((sourceId: string, newName: string) => {
    setSources(prevSources => {
      const updatedSources = prevSources.map(source =>
        source.id === sourceId ? { ...source, name: newName, lastModified: new Date() } : source // Update lastModified
      );
      saveNotebookToLocalStorage(updatedSources, messages, notes);
      return updatedSources;
    });
    toast({
      title: "Source Renamed",
      description: `Source renamed to "${newName}".`,
    });
  }, [messages, notes, saveNotebookToLocalStorage, setSources, toast]);

  const handleDownloadSource = useCallback((source: Source) => {
    // TODO: Re-evaluate download logic. If content is split, how should download work?
    // Download original file? Download specific part? Download combined text?
    // Current logic might download only the part's content or fail if fileDataUrl isn't stored.
    if (source.type === 'url') {
      window.open(source.content, '_blank');
      toast({
        title: "Opening URL",
        description: `Opening ${source.name} in a new tab.`,
      });
      return;
    }

    if (!source.fileDataUrl) {
      // Handle text/md/txt/csv/json sources - create a blob from content
      if (['text', 'md', 'txt', 'csv', 'json'].includes(source.type)) {
        const mimeType = source.type === 'csv' ? 'text/csv' : (source.type === 'json' ? 'application/json' : 'text/plain');
        const blob = new Blob([source.content], { type: `${mimeType};charset=utf-8` });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        // Ensure filename has an appropriate extension
        const defaultExt = source.type === 'json' ? '.json' : (source.type === 'csv' ? '.csv' : '.txt');
        const filename = source.name.includes('.') ? source.name : `${source.name}${defaultExt}`;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast({
          title: "Download Started",
          description: `"${filename}" is being downloaded.`,
        });
        return;
      }

      // If not URL or text-based, and no fileDataUrl, then error
      toast({
        title: "Download Error",
        description: "Original file data not found for this source.",
        variant: "destructive",
      });
      return;
    }

    // Handle download from fileDataUrl (PDF, DOCX, Image, Audio)
    try {
      const byteString = atob(source.fileDataUrl.split(',')[1]);
      const mimeString = source.fileDataUrl.split(',')[0].split(':')[1].split(';')[0];
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
          ia[i] = byteString.charCodeAt(i);
      }
      const blob = new Blob([ab], { type: mimeString });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = source.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Download Started",
        description: `"${source.name}" is being downloaded.`,
      });
    } catch (error) {
      console.error("Error preparing download from Data URL:", error);
      toast({
        title: "Download Failed",
        description: "Could not prepare the file for download.",
        variant: "destructive",
      });
    }
  }, [toast]);

  const handleDeleteSource = useCallback((sourceId: string) => {
    setSources(prevSources => {
      const updatedSources = prevSources.filter(source => source.id !== sourceId);
      saveNotebookToLocalStorage(updatedSources, messages, notes);
      return updatedSources;
    });
    toast({
      title: "Source Removed",
      description: "The source has been removed from the notebook.",
    });
  }, [messages, notes, saveNotebookToLocalStorage, setSources, toast]);

  // This function now uses handleAddProcessedSources
  const handleAddText = useCallback(async (text: string, title: string) => {
    if (!text || !title) {
      toast({
        title: "Invalid Input",
        description: "Both title and text content are required.",
        variant: "destructive",
      });
      return;
    }

    // Create ProcessedSourceData and use handleAddProcessedSources
    const processedData: ProcessedSourceData[] = [{
        name: title.endsWith('.txt') ? title : `${title}.txt`, // Ensure .txt extension
        content: text,
        type: 'text/plain', // Assume plain text
        originalFile: new File([text], title.endsWith('.txt') ? title : `${title}.txt`, { type: 'text/plain' }), // Dummy file
        part: 1,
        totalParts: 1,
    }];

    // Use the same processing logic as file uploads
    await handleAddProcessedSources(processedData);

    // Toast message is handled within handleAddProcessedSources now

  }, [handleAddProcessedSources, toast]); // Depend on the new handler

  // This function now uses handleAddProcessedSources
  const handleAddLink = useCallback(async (url: string, title: string) => {
    if (!url || !title) {
      toast({
        title: "Invalid Input",
        description: "Both title and URL are required.",
        variant: "destructive",
      });
      return;
    }

     // Basic URL validation
     try {
         new URL(url);
     } catch (_) {
         toast({
             title: "Invalid URL",
             description: "Please enter a valid URL (e.g., https://example.com).",
             variant: "destructive",
         });
         return;
     }

     // Treat link as another type of ProcessedSourceData
     const processedData: ProcessedSourceData[] = [{
        name: title,
        content: url, // Store URL as content
        type: 'url', // Special type for URL
        originalFile: new File([url], title, { type: 'text/uri-list' }), // Dummy file
        part: 1,
        totalParts: 1,
    }];

    // Use the same processing logic
    await handleAddProcessedSources(processedData);

    // Toast message handled within handleAddProcessedSources

  }, [handleAddProcessedSources, toast]); // Depend on the new handler


  return {
    // handleAddFiles, // Removed old handler
    handleAddProcessedSources, // Expose the new handler
    handleRenameSource,
    handleDownloadSource,
    handleDeleteSource,
    handleAddText, // Keep this, now uses handleAddProcessedSources internally
    handleAddLink, // Keep this, now uses handleAddProcessedSources internally
    isProcessingSources, // Expose loading state
  };
};
