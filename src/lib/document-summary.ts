import { DocumentSummary, AIModel } from '@/types/types';
import { generateDocumentSummary } from '@/lib/llm-summary'; // Use alias
import { getPrompt } from './prompts';

/**
 * Generates document overview using the selected LLM model or falls back to mock data
 * @param content Document content to summarize
 * @param model Selected AI model (optional)
 * @param apiKey API key for the selected model provider (optional)
 * @returns Document summary with overview sections
 */
export async function generateDocumentOverview(
  content: string, 
  model: AIModel | null = null,
  apiKey: string = ""
): Promise<DocumentSummary> {
  // Ensure model and API key are provided
  if (!model || !apiKey) {
    console.error('Error generating document overview: Missing model or API key.');
    return {
      summary: '',
      outline: '',
      keyPoints: '',
      qa: [],
      todos: '',
      error: 'Missing model or API key for generation.',
      isValid: false,
      lastUpdated: new Date()
    };
  }

  try {
    // Proceed with generating the real summary
    console.log(`Generating real document overview using ${model.provider}/${model.id}`);
    return await generateDocumentSummary(model, apiKey, content);
  } catch (error) {
    console.error('Error generating document overview:', error);
    return {
      summary: '',
      outline: '',
      keyPoints: '',
      qa: [], // Use empty array for qa
      todos: '', // Added todos
      error: error instanceof Error ? error.message : 'Error generating document overview',
      isValid: false,
      lastUpdated: new Date()
    };
  }
}
