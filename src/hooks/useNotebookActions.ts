import { useCallback, useState } from "react";
import { AIModel, ChatMessage, Citation, GenerationType, Note, Source, DocumentSummary, AIMode, SourceStatus } from "@/types/types"; // Added AIMode, SourceStatus
import { useToast } from "@/hooks/use-toast";
import { getPrompt } from "@/lib/prompts";
import { useApiKeys } from "@/hooks/useApiKeys";
// Update import paths for LLM functions
import { generateWorkAidContent } from "@/lib/llm-workaid";
import { generateTextCompletion } from "@/lib/llm-completion";
// generateDocumentSummary is no longer used here
import { getDocumentAnswer, getDocumentAnswerStream } from '@/lib/document-qa'; // Import both QA functions
// Removed mammoth and extractTextFromPdf imports

export interface UseNotebookActionsProps { // Added export keyword
  sources: Source[];
  setSources: React.Dispatch<React.SetStateAction<Source[]>>;
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  notes: Note[];
  setNotes: React.Dispatch<React.SetStateAction<Note[]>>;
  selectedModel: AIModel;
  selectedAIMode: AIMode; // Add selectedAIMode prop
  setViewingNote: React.Dispatch<React.SetStateAction<Note | null>>; // Add setter for viewing note
  // isLoading and setIsLoading removed from props
  saveNotebookToLocalStorage: (updatedSources: Source[], updatedMessages: ChatMessage[], updatedNotes: Note[]) => void;
}

export const useNotebookActions = ({
  sources,
  setSources,
  messages,
  setMessages,
  notes,
  setNotes,
  selectedModel,
  selectedAIMode, // Destructure selectedAIMode
  setViewingNote, // Destructure setter
  // isLoading, // Removed
  // setIsLoading, // Removed
  saveNotebookToLocalStorage,
}: UseNotebookActionsProps) => {
  const { toast } = useToast();
  const { getApiKey } = useApiKeys(); // Fix: Use getApiKey instead of apiKey
  const [isGeneratingContent, setIsGeneratingContent] = useState(false); // State for specific generation actions
  const [isSendingMessage, setIsSendingMessage] = useState(false); // State for chat message sending

  // Note: handleSendMessage now relies on the parent component (NotebookDetail)
  // to manage the loading state passed to ChatPanel/ChatInput.
  // It now accepts selectedSourceIds as an argument.
  const handleSendMessage = useCallback(async (message: string, selectedSourceIds: Set<string>) => {
    if (!message.trim() || isSendingMessage) return; // Prevent sending if already sending

    setIsSendingMessage(true); // Set loading state to true

    // Add user message immediately
    // Add random suffix for better ID uniqueness
    const userMessage: ChatMessage = {
      id: `msg-user-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      content: message,
      role: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => {
      const updated = [...prev, userMessage];
      saveNotebookToLocalStorage(sources, updated, notes);
      return updated;
    });

    // Add random suffix for better ID uniqueness
    const aiMessageId = `msg-ai-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    // --- Gather relevant sources, including all parts of split documents ---
    let sourcesForContext: Source[] = [];
    const processedOriginalIds = new Set<string>(); // Keep track of processed split documents

    sources.forEach(source => {
      if (selectedSourceIds.has(source.id)) {
        if (source.originalId && !processedOriginalIds.has(source.originalId)) {
          // If a selected source is part of a split document, add ALL parts
          console.log(`Selected source ${source.id} is part of ${source.originalId}. Fetching all parts.`);
          const allParts = sources.filter(s => s.originalId === source.originalId);
          // Sort parts by part number to ensure correct order
          allParts.sort((a, b) => (a.part ?? 0) - (b.part ?? 0));
          console.log(`Found ${allParts.length} parts for ${source.originalId}.`);
          sourcesForContext.push(...allParts);
          processedOriginalIds.add(source.originalId);
        } else if (!source.originalId) {
          // If it's a selected source and not part of a split document, add it
          console.log(`Selected source ${source.id} is not part of a split document.`);
          sourcesForContext.push(source);
        }
        // If source.originalId exists but is already in processedOriginalIds, skip it.
      }
    });
    // Remove duplicates just in case (though logic above should prevent it)
    sourcesForContext = Array.from(new Map(sourcesForContext.map(s => [s.id, s])).values());
    console.log(`Context includes ${sourcesForContext.length} sources/parts:`, sourcesForContext.map(s => s.name));
    // --- End Gather relevant sources ---


    // Check if any sources are selected for Q&A (use the gathered context)
    if (selectedSourceIds.size > 0 && sourcesForContext.length === 0) {
      // This case should ideally not happen with the new logic, but keep as a safeguard
       setMessages(prev => {
        const updated = prev.map(msg =>
          msg.id === aiMessageId
            ? { ...msg, content: "Please select at least one source file using the checkboxes to ask questions about it.", isLoading: false }
            : msg
        );
        saveNotebookToLocalStorage(sources, updated, notes); // Save final state
        return updated;
      });
      setIsSendingMessage(false); // Ensure loading state is reset
      return;
    } else if (sources.length === 0) {
       // No sources added to the notebook at all
       setMessages(prev => {
         const updated = prev.map(msg =>
          msg.id === aiMessageId
            ? { ...msg, content: "Please add some documents first so I can help you analyze them.", isLoading: false }
            : msg
        );
        saveNotebookToLocalStorage(sources, updated, notes); // Save final state
        return updated;
      });
       setIsSendingMessage(false); // Ensure loading state is reset
      return;
    }


    try {
      const settingValue = getApiKey(selectedModel.provider) || ''; // Can be API key or Ollama URL
      let modelToUse = selectedModel;

      // If Ollama, update the host in the model config before passing
      if (selectedModel.provider === 'ollama' && settingValue) {
        modelToUse = {
          ...selectedModel,
          ollamaConfig: {
            ...(selectedModel.ollamaConfig || {}),
            host: settingValue, // Use the configured host URL
          }
        };
      }

      // Use the gathered sources (including all parts) for Q&A
      const sourcesCopy = JSON.parse(JSON.stringify(sourcesForContext)) as Source[]; // Use the potentially expanded list

      // --- Initiate stream generation ---
      const { stream, citationsPromise, selectedSourceId } = await getDocumentAnswerStream(
        message,
        sourcesCopy, // Pass the potentially expanded list
        modelToUse, // Pass potentially modified model
        settingValue, // Pass API key or Ollama URL
        selectedAIMode // Pass selectedAIMode
      );

      // Update sources if summaries were generated during selection phase
      // This part might need re-evaluation: summaries are now generated in useSourceActions.
      // getDocumentAnswerStream might still trigger selection/summary internally.
      const hasNewSummaries = sourcesCopy.some((source, index) => {
         // Find the corresponding original source in the main 'sources' array
         const originalSource = sources.find(s => s.id === source.id);
         // Check if the summary exists and is different
         return originalSource && JSON.stringify(source.summary) !== JSON.stringify(originalSource.summary);
      });

      if (hasNewSummaries) {
        console.log("New summaries detected after getDocumentAnswerStream selection phase.");
        // Update the *original* sources array with any new summaries from the copy
        const updatedOriginalSources = sources.map(originalSource => {
          const updatedSource = sourcesCopy.find(s => s.id === originalSource.id && s.summary); // Ensure summary exists
          // Only update if the summary is different and valid
          if (updatedSource && JSON.stringify(updatedSource.summary) !== JSON.stringify(originalSource.summary)) {
            return { ...originalSource, summary: updatedSource.summary, status: SourceStatus.Completed }; // Update summary and status
          }
          return originalSource; // Return original if no change or no summary found
        });
        setSources(updatedOriginalSources);
        saveNotebookToLocalStorage(updatedOriginalSources, messages, notes);
      }

      // --- Process the stream ---
      let accumulatedContent = '';
      let isFirstChunk = true;
      // aiMessageId is now defined above

      for await (const chunk of stream) {
        accumulatedContent += chunk;

        if (isFirstChunk) {
          // Add the placeholder message *only* when the first chunk arrives
          const placeholderAiMessage: ChatMessage = {
            id: aiMessageId,
            content: accumulatedContent, // Start with the first chunk
            role: 'assistant',
            timestamp: new Date(),
            citations: [],
            isLoading: true,
          };
          setMessages(prev => [...prev, placeholderAiMessage]);
          isFirstChunk = false;
        } else {
          // Update the existing placeholder message
          setMessages(prev => {
            return prev.map(msg =>
              msg.id === aiMessageId
                ? { ...msg, content: accumulatedContent }
                : msg
            );
            // Avoid saving intermediate stream states to local storage
          });
        }
      }

      // --- Stream finished, wait for citations ---
      // Handle case where stream might end without yielding any chunks (e.g., immediate error)
      if (isFirstChunk) {
        // If no chunks arrived, it likely means an error occurred *before* streaming started
        // (e.g., in getDocumentAnswerStream setup). The error handling below will catch this.
        // We might need to add an empty error message here if the error handling doesn't cover it.
        console.warn("Stream ended without yielding any chunks. Potential pre-stream error.");
        // Add a generic error message if no message was added yet
         setMessages(prev => {
           // Check if the message was already added by error handling
           if (!prev.some(msg => msg.id === aiMessageId)) {
             const errorAiMessage: ChatMessage = {
               id: aiMessageId,
               content: 'An error occurred before the response could be generated.',
               role: 'assistant',
               timestamp: new Date(),
               citations: [],
               isLoading: false,
               isError: true,
             };
             const updated = [...prev, errorAiMessage];
             saveNotebookToLocalStorage(sources, updated, notes); // Save error state
             return updated;
           }
           return prev;
         });
      }

      const citations = await citationsPromise;

      // Final update to the AI message with citations and final content
      setMessages(prev => {
        const finalAnswer = accumulatedContent; // Use the fully accumulated content
        // Optional: Clean up citation markers like [CITATION:1] if they exist in finalAnswer
        // const cleanedAnswer = finalAnswer.replace(/\[CITATION:\d+\]/g, '').trim();

        const updated = prev.map(msg =>
          msg.id === aiMessageId
            ? {
                ...msg,
                content: finalAnswer, // Use final accumulated content
                citations: citations.map(cit => ({ // Map raw citations to ChatMessage citation format
                  id: `cit-${aiMessageId}-${Math.random().toString(36).substr(2, 9)}`,
                  sourceId: cit.sourceId,
                  text: cit.text,
                  searchText: cit.searchText,
                  pageNumber: cit.pageNumber // Include page number if available
                })),
                isLoading: false, // Mark as finished loading
              }
            : msg
        );
        // Save final state using the potentially updated original sources
        const finalSourcesToSave = sources.map(originalSource => {
           const updatedSource = sourcesCopy.find(s => s.id === originalSource.id && s.summary); // Check if summary exists in the copy
           // Only update if the summary is different and valid
           if (updatedSource && JSON.stringify(updatedSource.summary) !== JSON.stringify(originalSource.summary)) {
             return { ...originalSource, summary: updatedSource.summary, status: SourceStatus.Completed };
           }
           return originalSource;
        });
        saveNotebookToLocalStorage(finalSourcesToSave, updated, notes);
        return updated;
      });

    } catch (error) {
      console.error('Error processing streaming message:', error);
      // Update or add the placeholder message with an error
      const errorMessageContent = `I apologize, but I encountered an error: ${error instanceof Error ? error.message : String(error)}`; // Ensure string conversion
      setMessages(prev => {
        const existingMsgIndex = prev.findIndex(msg => msg.id === aiMessageId);
        let updated: ChatMessage[];

        if (existingMsgIndex !== -1) {
          // Update existing message if it was added
          updated = prev.map((msg, index) =>
            index === existingMsgIndex
              ? { ...msg, content: errorMessageContent, isLoading: false, isError: true }
              : msg
          );
        } else {
          // Add a new error message if the placeholder wasn't added yet
          const errorAiMessage: ChatMessage = {
            id: aiMessageId, // Use the same ID
            content: errorMessageContent,
            role: 'assistant',
            timestamp: new Date(),
            citations: [],
            isLoading: false,
            isError: true,
          };
          updated = [...prev, errorAiMessage];
        }

        // Save error state using original sources (as sourcesCopy might be empty/filtered)
        saveNotebookToLocalStorage(sources, updated, notes);
        return updated;
      });
    } finally {
      setIsSendingMessage(false); // Set loading state to false
    }
    // Dependencies: sources, notes, setMessages, saveNotebookToLocalStorage, getApiKey, selectedModel, selectedAIMode, setSources, isSendingMessage, messages
  }, [sources, notes, setMessages, saveNotebookToLocalStorage, getApiKey, selectedModel, selectedAIMode, setSources, isSendingMessage, messages]); // Added messages dependency

  // We're keeping the hook for compatibility, but the actual implementation is in NotebookDetail
  const handleCitationClick = useCallback((citation: Citation) => {
    // This is just a no-op since the actual implementation is in NotebookDetail
    // We keep this hook to maintain the interface contract
  }, []);

  // --- Note actions moved to useNoteActions.ts ---
  // handleAddNote, handleNoteClick, handleDeleteNote removed

  const handleGenerate = useCallback(async (type: GenerationType) => {
    if (sources.length === 0) {
      toast({
        title: "No Sources Available",
        description: "Please add some documents first to generate content.",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingContent(true); // Use specific state for generation
    const placeholderNoteId = `note-loading-${Date.now()}`; // Unique ID for placeholder
    let placeholderTitle = "Generating Content..."; // Default placeholder title

    // Determine placeholder title based on type
    switch (type) {
      case 'work_aid': placeholderTitle = 'Generating Work Aid...'; break;
      case 'faq': placeholderTitle = 'Generating FAQs...'; break;
      case 'briefing': placeholderTitle = 'Generating Briefing...'; break;
      case 'timeline': placeholderTitle = 'Generating Timeline...'; break;
    }

    // Create and add placeholder note immediately
    const placeholderNote: Note = {
      id: placeholderNoteId,
      title: placeholderTitle,
      content: "", // Empty content initially
      dateCreated: new Date(),
      dateModified: new Date(),
      isLoading: true, // Set loading state
    };

    setNotes(prevNotes => {
      const updatedNotes = [placeholderNote, ...prevNotes];
      // Don't save placeholder to local storage yet, wait for completion
      return updatedNotes;
    });


    try {
      // Combine all source content - IMPORTANT: Consider if this should use selected sources or all parts of selected original documents
      // For now, it uses ALL sources in the notebook, regardless of selection or splitting.
      // This might be desired for general generation tasks, but needs review if context should be limited.
      const combinedContent = sources.map(s => s.content).join('\n\n');
      let finalNoteTitle = ''; // Title after generation
      let finalNoteContent = ''; // Content after generation

      const settingValue = getApiKey(selectedModel.provider) || ''; // API Key or Ollama URL
      let modelToUse = selectedModel;

      // If Ollama, update the host in the model config
      if (selectedModel.provider === 'ollama' && settingValue) {
        modelToUse = {
          ...selectedModel,
          ollamaConfig: { ...(selectedModel.ollamaConfig || {}), host: settingValue }
        };
      }


      switch (type) {
        case 'work_aid': {
          const result = await generateWorkAidContent(
            modelToUse,
            settingValue,
            combinedContent
          );
          finalNoteTitle = 'Work Aid & Document Summary';
          finalNoteContent = [
            '# Document Summary', result.summary,
            '\n# Key Highlights', result.highlights,
            '\n# Work Aid/Checklist', result.checklist
          ].join('\n\n');
          // Add error handling from result if needed
          if (result.error) {
             finalNoteContent += `\n\n**Error:** ${result.error}`;
          }
          break;
        }
        case 'faq':
        case 'briefing':
        case 'timeline': {
          const prompt = getPrompt(type, combinedContent);
          finalNoteContent = await generateTextCompletion(
            modelToUse,
            settingValue,
            prompt
          );
          // Set title based on type
          if (type === 'faq') finalNoteTitle = 'Generated FAQs';
          else if (type === 'briefing') finalNoteTitle = 'Generated Briefing Document';
          else if (type === 'timeline') finalNoteTitle = 'Generated Timeline';
          break;
        }
        default:
          console.error(`Unsupported generation type: ${type}`);
          // Update placeholder with error
          setNotes(prevNotes => {
            const updatedNotes = prevNotes.map(note =>
              note.id === placeholderNoteId
                ? { ...note, title: "Generation Failed", content: `Unsupported type: ${type}`, isLoading: false }
                : note
            );
            // Save final state to local storage
            saveNotebookToLocalStorage(sources, messages, updatedNotes);
            return updatedNotes;
          });
          toast({
            title: "Unsupported Action",
            description: `The generation type "${type}" is not supported.`,
            variant: "destructive",
          });
          setIsGeneratingContent(false);
          return;
      }

      // Update the placeholder note with the final content
      setNotes(prevNotes => {
        const updatedNotes = prevNotes.map(note =>
          note.id === placeholderNoteId
            ? { ...note, title: finalNoteTitle, content: finalNoteContent, isLoading: false, dateModified: new Date() }
            : note
        );
        // Save final state to local storage
        saveNotebookToLocalStorage(sources, messages, updatedNotes);
        return updatedNotes;
      });

      toast({
        title: "Content Generated",
        description: `Note "${finalNoteTitle}" has been created/updated.`,
      });

    } catch (error) {
      console.error(`Error generating ${type}:`, error);
      const errorMessage = error instanceof Error ? error.message : "Failed to generate content";
      // Update placeholder with error message
      setNotes(prevNotes => {
        const updatedNotes = prevNotes.map(note =>
          note.id === placeholderNoteId
            ? { ...note, title: "Generation Failed", content: errorMessage, isLoading: false, dateModified: new Date() }
            : note
        );
        // Save final state to local storage
        saveNotebookToLocalStorage(sources, messages, updatedNotes);
        return updatedNotes;
      });
      toast({
        title: "Generation Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsGeneratingContent(false);
    }
    // Removed setSources from dependencies as it's not directly used here
    // Removed setIsLoading from dependencies
  }, [sources, setNotes, saveNotebookToLocalStorage, messages, toast, getApiKey, selectedModel]);

  // --- Source related functions moved to useSourceActions.ts ---

  // --- Note actions moved to useNoteActions.ts ---
  // handleRenameNote, handleDownloadNote removed


  return {
    handleSendMessage,
    handleCitationClick, // Still needed by NotebookDetail for passing to ChatPanel
    // Removed note actions: handleAddNote, handleNoteClick, handleDeleteNote, handleRenameNote, handleDownloadNote
    handleGenerate, // Generation logic remains here for now
    // Removed source actions
    isGeneratingContent, // State for specific generation actions (kept with handleGenerate)
    isSendingMessage, // State for chat message sending (kept with handleSendMessage)
  };
};
