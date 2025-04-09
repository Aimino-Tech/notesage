import { Source, AIModel, DocumentSummary } from '@/types/types'; // Ensure DocumentSummary is imported here
import { generateDocumentOverview } from './document-summary';
// Removed import { DocumentSummary } from './mock-summary';

/**
 * Processes a document source to generate an overview using the configured LLM
 * @param source The document source to process
 * @param model The AI model to use (from context)
 * @param apiKey The API key for the selected model's provider
 * @returns Updated document summary
 */
export async function processDocumentSource(
  source: Source,
  model: AIModel | null,
  apiKey: string
): Promise<DocumentSummary> {
  try {
    console.log(`Processing document: ${source.name}`);
    const content = source.content || "";
    
    // Use the document overview generator which handles LLM selection and fallbacks
    const summary = await generateDocumentOverview(content, model, apiKey);
    
    return summary;
  } catch (error) {
    console.error('Error processing document source:', error);
    return {
      summary: '',
      outline: '',
      keyPoints: '',
      qa: [], // Should be an array
      todos: '', // Added missing field
      error: error instanceof Error ? error.message : 'Failed to process document',
      isValid: false, // Added missing field
      lastUpdated: new Date() // Added missing field
    };
  }
}
