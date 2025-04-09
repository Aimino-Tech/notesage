import { AIModel, DocumentSummary, QAPair } from '@/types/types';
import { getPrompt } from '@/lib/prompts';

// Import provider-specific summary functions
import { openaiGenerateDocumentSummary } from './llm-providers/openai';
import { googleGenerateDocumentSummary } from './llm-providers/google';
import { anthropicGenerateDocumentSummary } from './llm-providers/anthropic';
import { ollamaGenerateDocumentSummary } from './llm-providers/ollama';
import { deepseekGenerateDocumentSummary } from './llm-providers/deepseek';

/**
 * Generates document summaries using the configured LLM
 * @param model The AI model to use
 * @param apiKey The API key for the chosen provider (or host for Ollama)
 * @param content The document content to summarize
 * @returns A DocumentSummary object with overview sections
 */
export async function generateDocumentSummary(
  model: AIModel,
  apiKey: string, // Note: For Ollama, this will be the host URL from settings
  content: string
): Promise<DocumentSummary> {
  const prompt = getPrompt('document_overview', content);
  try {
    let rawResponseText = '';

    // Delegate to provider-specific function
    switch (model.provider) {
      case 'openai': {
        const result = await openaiGenerateDocumentSummary(model, apiKey, prompt);
        rawResponseText = result.rawResponseText;
        break;
      }
      case 'google': {
        const result = await googleGenerateDocumentSummary(model, apiKey, prompt);
        rawResponseText = result.rawResponseText;
        break;
      }
      case 'anthropic': {
        const result = await anthropicGenerateDocumentSummary(model, apiKey, prompt);
        rawResponseText = result.rawResponseText;
        break;
       }
       case 'ollama': {
         // Ollama provider likely gets host from model.ollamaConfig, doesn't need apiKey here
         const result = await ollamaGenerateDocumentSummary(model, prompt);
         rawResponseText = result.rawResponseText;
         break;
      }
      case 'deepseek': {
        const result = await deepseekGenerateDocumentSummary(model, apiKey, prompt);
        rawResponseText = result.rawResponseText;
        break;
      }
      default:
        // Optional: Add exhaustive check helper if needed
        throw new Error(`Unsupported provider for document summary: ${model.provider}`);
    }

    // --- JSON Parsing Logic ---
    try {
      // Attempt to find JSON block if wrapped in markdown ```json ... ```
      const jsonMatch = rawResponseText.match(/```json\s*([\s\S]*?)\s*```/);
      const jsonToParse = jsonMatch ? jsonMatch[1] : rawResponseText;

      const parsedJson = JSON.parse(jsonToParse);

      // Validate structure
      const requiredKeys = ['summary', 'outline', 'keyPoints', 'qa'];
      const missingKeys = requiredKeys.filter(key => !(key in parsedJson));

      if (missingKeys.length > 0) {
        throw new Error(`LLM response missing required keys: ${missingKeys.join(', ')}`);
      }

      // Validate Q&A structure
      if (!Array.isArray(parsedJson.qa) || !parsedJson.qa.every((item: unknown): item is QAPair => typeof item === 'object' && item !== null && 'question' in item && 'answer' in item)) {
         throw new Error('Invalid Q&A structure in LLM response');
      }

      return {
        summary: parsedJson.summary || '',
        outline: parsedJson.outline || '',
        keyPoints: parsedJson.keyPoints || '',
        qa: parsedJson.qa || [],
        todos: parsedJson.todos || '', // Add todos field
        isValid: true,
        lastUpdated: new Date(),
      };

    } catch (parseError) {
      console.error('Error parsing LLM JSON response for summary:', parseError);
      console.error('Raw LLM Response:', rawResponseText); // Log raw response for debugging
      return {
        summary: '',
        outline: '',
        keyPoints: '',
        qa: [],
        todos: '',
        error: `Failed to parse LLM response as valid JSON. ${parseError instanceof Error ? parseError.message : parseError}`,
        isValid: false,
        lastUpdated: new Date(),
      };
    }
    // --- End JSON Parsing Logic ---

  } catch (apiError) { // Catch API/fetch errors separately
    console.error('Error calling LLM API for document summary:', apiError);
    return {
      summary: '',
      outline: '',
      keyPoints: '',
      qa: [],
      todos: '',
      error: `LLM API request failed: ${apiError instanceof Error ? apiError.message : apiError}`,
      isValid: false,
      lastUpdated: new Date(),
    };
  }
}
