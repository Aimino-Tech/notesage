import { AIModel, WorkAidContent } from '@/types/types';
import { getPrompt } from '@/lib/prompts';

// Import provider-specific work aid functions
import { openaiGenerateWorkAidContent } from './llm-providers/openai';
import { googleGenerateWorkAidContent } from './llm-providers/google';
import { anthropicGenerateWorkAidContent } from './llm-providers/anthropic';
import { ollamaGenerateWorkAidContent } from './llm-providers/ollama';
import { deepseekGenerateWorkAidContent } from './llm-providers/deepseek';

// Import parser (if needed, though parsing seems to happen in provider functions for work aid)
// import { parseWorkAidContent } from './llm-parsers';

/**
 * Generates work aid content (summary, highlights, checklist) using the configured LLM.
 * @param model The AI model to use.
 * @param apiKey The API key for the chosen provider (or host for Ollama).
 * @param content The document content to process.
 * @returns A WorkAidContent object.
 */
export async function generateWorkAidContent(
  model: AIModel,
  apiKey: string, // Note: For Ollama, this will be the host URL from settings
  content: string
): Promise<WorkAidContent> {
  const prompt = getPrompt('work_aid', content);

  try {
    // Delegate to provider-specific function
    switch (model.provider) {
      case 'openai':
        return await openaiGenerateWorkAidContent(model, apiKey, prompt);
      case 'google':
        return await googleGenerateWorkAidContent(model, apiKey, prompt);
      case 'anthropic':
         return await anthropicGenerateWorkAidContent(model, apiKey, prompt);
       case 'ollama':
         // Ollama provider likely gets host from model.ollamaConfig
         return await ollamaGenerateWorkAidContent(model, prompt);
       case 'deepseek':
         return await deepseekGenerateWorkAidContent(model, apiKey, prompt);
      default:
        throw new Error(`Unsupported provider for work aid: ${model.provider}`);
    }
  } catch (error) {
    console.error('Error generating work aid content:', error);
    // Return WorkAidContent with error populated
    return {
      summary: '',
      highlights: '',
      checklist: '',
      error: error instanceof Error ? error.message : 'Unknown error generating work aid content'
    };
  }
}
