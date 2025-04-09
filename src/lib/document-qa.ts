import { Source, Citation, DocumentSummary, AIMode, QAPair, SourceStatus, ChatMessage } from '@/types/types'; // Added ChatMessage
import { AIModel } from '@/types/types';
// Update imports to point to new task-specific files
import { generateDocumentSummary } from '@/lib/llm-summary';
import { generateTextCompletion, generateTextCompletionStream } from '@/lib/llm-completion';
import { getPrompt, aiModeSystemPrompts } from './prompts'; // Added aiModeSystemPrompts

interface DocumentQAResult {
  answer: string;
  citations: Citation[]; // Use Citation type directly
}

// Define a new interface for the streaming result
interface DocumentQAStreamResult {
  stream: AsyncGenerator<string>;
  citationsPromise: Promise<Citation[]>;
  selectedSourceId: string | null; // ID of the source used for the answer
}

/**
 * Parses citations from the AI response in the format [quote](page:PAGE_NUMBER)
 */
function parseCitations(response: string, sourceId: string): Citation[] { // Added return type
  const citations: Citation[] = []; // Use Citation type
  // Regex to match the markdown link format: [quote text](page:NUMBER)
  const regex = /\[(.*?)\]\(page:(\d+)\)/g;
  let match;

  while ((match = regex.exec(response)) !== null) {
    const citationText = match[1].trim(); // The text inside the square brackets
    const pageNumber = parseInt(match[2], 10); // The number after "page:"

    if (!isNaN(pageNumber)) {
      citations.push({
        id: `${sourceId}-page-${pageNumber}-${citations.length}`, // Generate a unique ID
        sourceId,
        text: citationText,
        pageNumber: pageNumber,
        searchText: citationText // Use the quote text for searching initially
      });
    } else {
      console.warn(`Failed to parse page number from citation: ${match[0]}`);
      // Optionally add citation without page number if needed
      // citations.push({ sourceId, text: citationText, searchText: citationText });
    }
  }

  return citations;
}


// Helper function to select relevant sources based on summaries
async function selectRelevantSources(
  question: string,
  sources: Source[],
  model: AIModel,
  apiKey: string,
  systemPrompt?: string, // Make systemPrompt optional for this helper
  messages: ChatMessage[] = [] // Add messages parameter
): Promise<{ selectedIds: Set<string>; error?: Error }> { // Return selected IDs or an error
  try {
    // Ensure all documents have summaries (still needed for selection stage)
    const sourcesWithMissingSummaries = sources.filter(s => s.type !== 'image' && s.type !== 'audio' && (!s.summary || !s.summary.summary));
    if (sourcesWithMissingSummaries.length > 0) {
      console.log(`Generating missing summaries for selection for sources: ${sourcesWithMissingSummaries.map(s=>s.name).join(', ')}`);
      const summaryPromises = sourcesWithMissingSummaries.map(async (source) => {
         // Use correct API key logic here too
         let apiKeyForSummary = apiKey;
         let modelForSummary = model;
         if ('apiKey' in model && typeof (model as any).apiKey === 'string') {
             apiKeyForSummary = (model as any).apiKey;
         }
         if (model.provider === 'ollama' && apiKeyForSummary) {
             modelForSummary = { ...model, ollamaConfig: { ...(model.ollamaConfig || {}), host: apiKeyForSummary } };
         }

         // Check if content is valid before attempting summary
         const hasExtractionError = source.content?.startsWith('[PDF Text Extraction Failed');
         const isNonTextualPlaceholder = source.content?.startsWith('[') && source.content?.endsWith(']');
         // Include URL type as valid for summary generation
         const hasValidContent = source.content && !hasExtractionError && !isNonTextualPlaceholder;

         if (hasValidContent && (apiKeyForSummary || modelForSummary.provider === 'ollama')) {
            try {
              const summaryResult: DocumentSummary = await generateDocumentSummary(modelForSummary, apiKeyForSummary || '', source.content);
              source.summary = summaryResult; // Update the source object directly
            } catch (summaryError) {
              console.error(`Failed to generate summary for ${source.name}:`, summaryError);
              source.summary = {
                summary: 'Error generating summary.', outline: '', keyPoints: '', qa: [], todos: '',
                error: summaryError instanceof Error ? summaryError.message : 'Unknown summary error',
                isValid: false, lastUpdated: new Date()
              };
            }
         } else {
             // Handle cases where content is missing, placeholder, or config is missing
             source.summary = {
               summary: 'Summary not generated (missing/invalid content or config).', outline: '', keyPoints: '', qa: [], todos: '',
               error: 'Missing/invalid content or configuration',
               isValid: false, lastUpdated: new Date()
             };
         }
      });
      await Promise.all(summaryPromises); // Wait for all summaries to be generated/updated
    }

    // Prepare summaries for selection prompt
    const summariesContent = sources
      .map((s, index) => `[${index + 1}] Document ID: ${s.id}\nTitle: ${s.name}\nSummary: ${s.summary?.summary || 'No summary available.'}\n`)
      .join('\n---\n');

    // Call LLM for selection, ensuring correct API key is used
    let apiKeyForSelection = apiKey;
    // Check for embedded key in the model object
    if ('apiKey' in model && typeof (model as any).apiKey === 'string') {
        apiKeyForSelection = (model as any).apiKey;
        console.log(`selectRelevantSources: Using hardcoded API key for sponsored model: ${model.id}`);
    } else {
         console.log(`selectRelevantSources: Using API key from settings for provider: ${model.provider}`);
    }
    // Ensure Ollama uses the correct host if passed via apiKey slot
    let modelForSelection = model;
     if (model.provider === 'ollama' && apiKeyForSelection) {
        modelForSelection = { ...model, ollamaConfig: { ...(model.ollamaConfig || {}), host: apiKeyForSelection } };
     }

    const selectionPrompt = getPrompt('document_selection', summariesContent, question, messages);
    // Use the determined key/config
    const selectionResponseText = await generateTextCompletion(modelForSelection, apiKeyForSelection || '', selectionPrompt, systemPrompt);
    console.log('Selection response:', selectionResponseText);

    // Extract document IDs
    const selectedIds = new Set<string>();
    const sourceIds = sources.map(s => s.id);

    // Strategy 1: Explicit ID mentions
    const explicitIdRegex = /ID:?\s*([a-zA-Z0-9-]+)/gi;
    let match;
    while ((match = explicitIdRegex.exec(selectionResponseText)) !== null) {
      if (sourceIds.includes(match[1])) selectedIds.add(match[1]);
    }

    // Strategy 2: Bracketed numbers
    const numberRegex = /\[(\d+)\]/g;
    while ((match = numberRegex.exec(selectionResponseText)) !== null) {
      const num = parseInt(match[1]) - 1;
      if (num >= 0 && num < sources.length) selectedIds.add(sources[num].id);
    }

    // Strategy 3: Direct ID word matching (fallback)
    if (selectedIds.size === 0) {
      sourceIds.forEach(id => {
        const idRegex = new RegExp(`\\b${id}\\b`, 'g');
        if (idRegex.test(selectionResponseText)) selectedIds.add(id);
      });
    }

     // If still no IDs selected, maybe select the first one as a last resort? Or rely on fallback.
     if (selectedIds.size === 0 && sources.length > 0) {
       console.warn("No specific documents selected by LLM, defaulting to first document.");
       selectedIds.add(sources[0].id);
     }

    return { selectedIds };

  } catch (error) {
    console.error("Error during document selection phase:", error);
    return { selectedIds: new Set<string>(), error: error instanceof Error ? error : new Error(String(error)) };
  }
}


/**
 * Two-stage document Q&A process: (Non-streaming version)
 * 1. Select relevant document(s) based on summaries.
 * 2. Generate answer from selected document's FULL content.
 */
export async function getDocumentAnswer(
  question: string,
  sources: Source[],
  model: AIModel,
  apiKey: string,
  selectedAIMode: AIMode,
  messages: ChatMessage[] = []
): Promise<DocumentQAResult> {
  try {
    const systemPrompt = aiModeSystemPrompts[selectedAIMode];

    // --- Stage 1: Document Selection ---
    const { selectedIds, error: selectionError } = await selectRelevantSources(
      question, sources, model, apiKey, systemPrompt, messages
    );

    if (selectionError) {
      console.warn("Error during document selection, falling back to general query:", selectionError);
      try {
        const generalAnswer = await generateTextCompletion(model, apiKey, question, systemPrompt);
        return { answer: generalAnswer, citations: [] };
      } catch (generalError) {
        console.error('Error during general fallback query:', generalError);
        return { answer: `Sorry, I encountered an error during selection and fallback: ${selectionError.message}`, citations: [] };
      }
    }

    if (selectedIds.size === 0) {
      console.warn("No relevant document IDs selected. Performing general query.");
      try {
        const generalAnswer = await generateTextCompletion(model, apiKey, question, systemPrompt);
        return { answer: generalAnswer, citations: [] };
      } catch (generalError) {
        console.error('Error during general fallback query:', generalError);
        return { answer: 'Sorry, I encountered an error while trying to answer your question generally.', citations: [] };
      }
    }

    // --- Stage 2: Generate Answer using Full Content ---
    const selectedSources = sources.filter(s => selectedIds.has(s.id));
    selectedSources.sort((a, b) => (a.part ?? 0) - (b.part ?? 0));

    if (selectedSources.length === 0) {
      return { answer: "I couldn't find the relevant document content after selection.", citations: [] };
    }

    // Combine FULL CONTENT
    const combinedContent = selectedSources.map(s => {
      // Special handling for URL type sources, treat them as valid text
      if (s.type === 'url') {
        const partIdentifier = `--- START ${s.name} (Web Content) ---\n`;
        const partEndIdentifier = `\n--- END ${s.name} ---\n`;
        const contentText = s.content || '[Web content not available]';
        return partIdentifier + contentText + partEndIdentifier;
      }
      
      const hasExtractionError = s.content?.startsWith('[PDF Text Extraction Failed');
      const isNonTextualPlaceholder = s.content?.startsWith('[') && s.content?.endsWith(']');
      if (s.type === 'image' || s.type === 'audio' || hasExtractionError || isNonTextualPlaceholder) {
        const skippedPartIdentifier = (s.part && s.totalParts && s.totalParts > 1) ? `--- START ${s.name} (Part ${s.part}/${s.totalParts}) ---\n` : `--- START ${s.name} ---\n`;
        return `${skippedPartIdentifier}[Content is ${s.type}, extraction failed, or placeholder - not usable text]\n--- END ${s.name} ---\n`;
      }
      const partIdentifier = (s.part && s.totalParts && s.totalParts > 1) ? `--- START ${s.name} (Part ${s.part}/${s.totalParts}) ---\n` : `--- START ${s.name} ---\n`;
      const partEndIdentifier = `\n--- END ${s.name} ---\n`;
      const contentText = s.content || '[Content not available]';
      return partIdentifier + contentText + partEndIdentifier;
    }).join('\n\n');

    // Check if combined content is usable
    const actualContent = selectedSources
      .filter(s => {
        // Include URL type as valid content
        if (s.type === 'url') return true;
        // Filter out non-textual and error content
        return s.type !== 'image' && s.type !== 'audio' && 
               !s.content?.startsWith('[PDF Text Extraction Failed') && 
               !(s.content?.startsWith('[') && s.content?.endsWith(']'));
      })
      .map(s => s.content)
      .join('');

    if (!actualContent || actualContent.trim().length === 0) {
        return { answer: "I could not find any usable text content from the selected document(s) to answer your question.", citations: [] };
    }

    // Generate answer using combined full content
    const answerPrompt = getPrompt('document_chat', combinedContent, question, messages);
    // Ensure correct API key logic
    let apiKeyForAnswer = apiKey;
    let modelForAnswer = model;
    if ('apiKey' in model && typeof (model as any).apiKey === 'string') {
        apiKeyForAnswer = (model as any).apiKey;
    }
    if (model.provider === 'ollama' && apiKeyForAnswer) {
        modelForAnswer = { ...model, ollamaConfig: { ...(model.ollamaConfig || {}), host: apiKeyForAnswer } };
    }
    const answerResponseText = await generateTextCompletion(modelForAnswer, apiKeyForAnswer || '', answerPrompt, systemPrompt);
    console.log('Answer response:', answerResponseText);

    // Parse citations (using the ID of the first part for now)
    const citations = parseCitations(answerResponseText, selectedSources[0].id);

    // Process answer (replace citation markers)
    let processedAnswer = answerResponseText;
     citations.forEach((citation, index) => {
       const escapedText = citation.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
       const markerRegex = new RegExp(`\\[${escapedText}\\]\\(page:${citation.pageNumber}\\)`);
       processedAnswer = processedAnswer.replace(markerRegex, `[CITATION:${index + 1}]`);
     });

    return {
      answer: processedAnswer.trim(),
      citations
    };

  } catch (error) {
    console.error('Error in document Q&A:', error);
    return {
      answer: 'Sorry, I encountered an error while trying to answer your question.',
      citations: []
    };
  }
}


/**
 * Streaming version of document Q&A.
 * Performs document selection, then streams the answer generation from FULL CONTENT.
 * Returns an async generator for the answer chunks and a promise for the final citations.
 */
export async function getDocumentAnswerStream(
  question: string,
  sources: Source[],
  model: AIModel,
  apiKey: string,
  selectedAIMode: AIMode,
  messages: ChatMessage[] = []
): Promise<DocumentQAStreamResult> {
  const systemPrompt = aiModeSystemPrompts[selectedAIMode];

  // --- Stage 1: Document Selection using helper (based on summaries) ---
    const { selectedIds, error: selectionError } = await selectRelevantSources(
    question, sources, model, apiKey, systemPrompt, messages
  );

  if (selectionError) {
    console.error("Error during document selection phase:", selectionError);
    async function* errorStream(): AsyncGenerator<string> {
      yield `Sorry, I encountered an error selecting the relevant document: ${selectionError instanceof Error ? selectionError.message : selectionError}`;
    }
    return { stream: errorStream(), citationsPromise: Promise.resolve([]), selectedSourceId: null };
  }

  if (selectedIds.size === 0) {
    console.warn("No relevant document IDs selected by summary. Performing general query stream.");
    // Fallback: General query stream
    try {
      // Ensure correct API key logic for fallback
      let apiKeyForFallback = apiKey;
      let modelForFallback = model;
       if ('apiKey' in model && typeof (model as any).apiKey === 'string') {
           apiKeyForFallback = (model as any).apiKey;
       }
       if (model.provider === 'ollama' && apiKeyForFallback) {
           modelForFallback = { ...model, ollamaConfig: { ...(model.ollamaConfig || {}), host: apiKeyForFallback } };
       }
      const generalStream = generateTextCompletionStream(modelForFallback, apiKeyForFallback || '', question, systemPrompt);
      return {
        stream: generalStream,
        citationsPromise: Promise.resolve([]), // No citations for general query
        selectedSourceId: null, // No specific source used
      };
    } catch (generalError) {
      console.error('Error during general fallback stream query:', generalError);
      async function* errorStream(): AsyncGenerator<string> {
        yield `Sorry, I encountered an error while trying to answer your question generally: ${generalError instanceof Error ? generalError.message : generalError}`;
      }
      return {
        stream: errorStream(),
        citationsPromise: Promise.resolve([]),
        selectedSourceId: null,
      };
    }
  }

  // --- Continue with document-based Q&A if documents were selected ---
  // Gather all sources matching the selected IDs
  const selectedSources = sources.filter(s => selectedIds.has(s.id));
  // Sort them by part number if applicable
  selectedSources.sort((a, b) => (a.part ?? 0) - (b.part ?? 0));

  if (selectedSources.length === 0) {
     // This case should ideally not happen if selectedIds has items, but handle defensively
     console.error("Selection returned IDs but no matching sources found:", selectedIds);
     async function* errorStream(): AsyncGenerator<string> {
      yield "I couldn't find the relevant document content after selection.";
    }
    return {
      stream: errorStream(),
      citationsPromise: Promise.resolve([]),
      selectedSourceId: null,
    };
  }

  // --- Stage 2: Generate Answer Stream using Full Content ---

  // Combine FULL CONTENT from all selected sources/parts
  const combinedContent = selectedSources.map(s => {
     // Special handling for URL type sources, treat them as valid text
     if (s.type === 'url') {
       const partIdentifier = `--- START ${s.name} (Web Content) ---\n`;
       const partEndIdentifier = `\n--- END ${s.name} ---\n`;
       const contentText = s.content || '[Web content not available]';
       return partIdentifier + contentText + partEndIdentifier;
     }
     
     // Skip content for image/audio types or if extraction failed
     const hasExtractionError = s.content?.startsWith('[PDF Text Extraction Failed');
     const isNonTextualPlaceholder = s.content?.startsWith('[') && s.content?.endsWith(']');
     if (s.type === 'image' || s.type === 'audio' || hasExtractionError || isNonTextualPlaceholder) {
       // Include a marker indicating this part is skipped, but keep the name/part info
        const skippedPartIdentifier = (s.part && s.totalParts && s.totalParts > 1)
         ? `--- START ${s.name} (Part ${s.part}/${s.totalParts}) ---\n`
         : `--- START ${s.name} ---\n`;
       return `${skippedPartIdentifier}[Content is ${s.type}, extraction failed, or placeholder - not usable text]\n--- END ${s.name} ---\n`;
     }
    // Add metadata to each part's content to help the AI distinguish them
    const partIdentifier = (s.part && s.totalParts && s.totalParts > 1)
      ? `--- START ${s.name} (Part ${s.part}/${s.totalParts}) ---\n`
      : `--- START ${s.name} ---\n`;
    const partEndIdentifier = `\n--- END ${s.name} ---\n`;
    // Use the actual content
    const contentText = s.content || '[Content not available]';
    return partIdentifier + contentText + partEndIdentifier;
  }).join('\n\n'); // Join content parts with double newline

  console.log(`Combined full content length for prompt: ${combinedContent.length}`);
  // Removed the preemptive context length check

   // === FINAL CHECK: Ensure there is actual text content to send ===
   // Filter out the placeholder/error messages before checking length
   const actualContent = selectedSources
     .filter(s => {
       // Ensure content exists before checking type or placeholders
       if (!s.content) return false;
       // Include URL type as valid content
       if (s.type === 'url') return true;
       // Filter out non-textual and error content
       return s.type !== 'image' && s.type !== 'audio' &&
              !s.content.startsWith('[PDF Text Extraction Failed') &&
              !(s.content.startsWith('[') && s.content.endsWith(']'));
     })
     .map(s => s.content) // Map only after filtering ensures s.content exists
     .join('');

   if (!actualContent || actualContent.trim().length === 0) {
       console.warn("Combined context is empty or contains only errors/placeholders. Aborting LLM call.");
       async function* noContextStream(): AsyncGenerator<string> {
           yield "I could not find any usable text content from the selected document(s) to answer your question. The document might be image-only or corrupted.";
       }
       return {
           stream: noContextStream(),
           citationsPromise: Promise.resolve([]),
           selectedSourceId: selectedSources[0]?.id || null,
       };
   }
   // === END FINAL CHECK ===


  // Update the prompt function call to use combinedContent
  const answerPrompt = getPrompt('document_chat', combinedContent, question, messages);

  // --- AGGRESSIVE LOGGING ---
  console.log("--- FINAL PROMPT FOR LLM ---");
  console.log("System Prompt:", systemPrompt);
  console.log("Answer Prompt (Context + Question):", answerPrompt);
  console.log("--- END FINAL PROMPT ---");
  // --- END LOGGING ---

  let fullAnswer = ''; // Accumulate the full answer for citation parsing
  let streamError: Error | null = null;
  let streamDone = false; // Flag to signal stream completion

  // This inner generator handles the actual streaming and error catching
  async function* processStreamInternal(): AsyncGenerator<string> {
    try {
      // Determine the correct API key/config to use for the final answer generation
      let apiKeyForAnswer = apiKey;
      let modelForAnswer = model;
      if ('apiKey' in model && typeof (model as any).apiKey === 'string') {
        apiKeyForAnswer = (model as any).apiKey;
         console.log(`getDocumentAnswerStream: Using hardcoded API key for sponsored model: ${model.id}`);
      }
      if (model.provider === 'ollama' && apiKeyForAnswer) {
         modelForAnswer = { ...model, ollamaConfig: { ...(model.ollamaConfig || {}), host: apiKeyForAnswer } };
      }

      // Use the determined key/config for the stream
      const stream = generateTextCompletionStream(modelForAnswer, apiKeyForAnswer || '', answerPrompt, systemPrompt);
      for await (const chunk of stream) {
        fullAnswer += chunk;
        yield chunk; // Yield the chunk immediately
      }
    } catch (error) {
      console.error('Error during answer stream generation:', error);
      streamError = error instanceof Error ? error : new Error(String(error));
      // Yield an error message chunk
      yield `\n\nSorry, an error occurred while generating the response: ${streamError.message}`;
    } finally {
        streamDone = true; // Signal that the stream has finished (or errored out)
    }
   }

   // Create the citations promise. It waits until the stream is fully processed.
   const citationsPromise = new Promise<Citation[]>((resolve) => {
     const checkStreamDone = () => {
       if (streamDone) {
         if (streamError) {
           resolve([]); // Resolve with empty citations if the stream had an error
           return;
         }
         try {
           // Now that the stream is done, fullAnswer should be complete
           const primarySourceId = selectedSources[0].id; // Use the first selected source ID for citation parsing for now
           const citations = parseCitations(fullAnswer, primarySourceId);
           resolve(citations);
         } catch (parseError) {
           console.error("Error parsing citations from streamed answer:", parseError);
           resolve([]); // Resolve with empty citations on parsing error
         }
       } else {
         setTimeout(checkStreamDone, 50); // Poll check
       }
     };
     checkStreamDone(); // Start the check
   });


   return {
    stream: processStreamInternal(), // Return the inner generator
    citationsPromise: citationsPromise,
    selectedSourceId: selectedSources[0].id,
  };
}
