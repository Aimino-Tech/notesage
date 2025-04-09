import { AIModel, ChatMessage } from '@/types/types';
import { v4 as uuidv4 } from 'uuid'; // Import uuid for generating IDs

// Import provider-specific completion functions
import { openaiGenerateTextCompletion, openaiGenerateTextCompletionStream } from './llm-providers/openai';
import { googleGenerateTextCompletion, googleGenerateTextCompletionStream } from './llm-providers/google';
import { anthropicGenerateTextCompletion, anthropicGenerateTextCompletionStream } from './llm-providers/anthropic';
import { ollamaGenerateTextCompletion, ollamaGenerateTextCompletionStream } from './llm-providers/ollama';
import { deepseekGenerateTextCompletion, deepseekGenerateTextCompletionStream } from './llm-providers/deepseek';

/**
 * Generates text completion using the configured LLM for general prompts.
 * @param model The AI model to use
 * @param apiKey The API key for the chosen provider (or host for Ollama)
 * @param prompt The user prompt text
 * @param systemPrompt Optional system prompt to guide the AI's behavior
 * @returns The raw text response from the LLM
 */
export async function generateTextCompletion(
  model: AIModel,
  apiKey: string, // Note: For Ollama, this will be the host URL from settings
  prompt: string,
  systemPrompt?: string
): Promise<string> {
  // Construct messages array with IDs here, before passing to providers
  const messages: ChatMessage[] = [];
  if (systemPrompt) {
    messages.push({ id: uuidv4(), role: 'system', content: systemPrompt, timestamp: new Date() });
  }
  messages.push({ id: uuidv4(), role: 'user', content: prompt, timestamp: new Date() });

  try {
    let rawResponseText = '';

    // Delegate to provider-specific function
    switch (model.provider) {
      case 'openai':
        rawResponseText = await openaiGenerateTextCompletion(model, apiKey, messages);
        break;
      case 'google':
        rawResponseText = await googleGenerateTextCompletion(model, apiKey, messages);
        break;
      case 'anthropic':
         rawResponseText = await anthropicGenerateTextCompletion(model, apiKey, messages);
         break;
       case 'ollama':
         // Ollama provider likely gets host from model.ollamaConfig
         rawResponseText = await ollamaGenerateTextCompletion(model, messages);
         break;
       case 'deepseek':
        rawResponseText = await deepseekGenerateTextCompletion(model, apiKey, messages);
        break;
      default:
        throw new Error(`Unsupported provider for text completion: ${model.provider}`);
    }

    return rawResponseText.trim();

  } catch (apiError) {
    console.error('Error calling LLM API for text completion:', apiError);
    // Re-throw the error to be handled by the calling function
    throw new Error(`LLM API request failed: ${apiError instanceof Error ? apiError.message : apiError}`);
  }
}


/**
 * Generates text completion using the configured LLM for general prompts, yielding chunks for streaming.
 * @param model The AI model to use
 * @param apiKey The API key for the chosen provider (or host for Ollama)
 * @param prompt The user prompt text
 * @param systemPrompt Optional system prompt to guide the AI's behavior
 * @param history Optional chat history to provide context
 * @returns An async generator yielding text chunks
 */
export async function* generateTextCompletionStream(
  model: AIModel,
  apiKey: string, // Note: For Ollama, this will be the host URL from settings
  prompt: string, // Keep prompt for non-chat models if needed, but prefer history
  systemPrompt?: string,
  history: ChatMessage[] = []
): AsyncGenerator<string> {
  // Construct messages array from history + new prompt with IDs
  const messages: ChatMessage[] = [...history];
  if (systemPrompt && !messages.some(m => m.role === 'system')) {
    messages.unshift({ id: uuidv4(), role: 'system', content: systemPrompt, timestamp: new Date() });
  }
  // Ensure the latest user prompt is added if not already the last message in history
  if (!history.length || history[history.length - 1].content !== prompt || history[history.length - 1].role !== 'user') {
      messages.push({ id: uuidv4(), role: 'user', content: prompt, timestamp: new Date() });
  }


  try {
    // Delegate to the appropriate provider's streaming function
    switch (model.provider) {
      case 'openai':
        return openaiGenerateTextCompletionStream(model, apiKey, messages);
      case 'anthropic':
         return anthropicGenerateTextCompletionStream(model, apiKey, messages);
       case 'ollama':
         // Ollama provider likely gets host from model.ollamaConfig
         return ollamaGenerateTextCompletionStream(model, messages);
       case 'deepseek':
         yield* deepseekGenerateTextCompletionStream(model, apiKey, messages); // Use yield*
        break; // Add break statement
      case 'google': { // Add braces
        // Google streaming requires different handling (v1beta) or fallback
        console.warn(`Streaming not fully implemented for Google, falling back to non-streaming.`);
        // Use an async generator that yields the full response
        async function* fallbackStream() {
            const fullResponse = await googleGenerateTextCompletion(model, apiKey, messages);
            yield fullResponse;
        }
        yield* fallbackStream(); // Use yield*
        break; // Add break statement
      }
      default: { // Add braces
        console.warn(`Streaming not implemented for ${model.provider}, falling back to non-streaming.`);
        // Fallback for other unsupported providers
        async function* fallbackStreamUnsupported() {
            // Call the non-streaming version using the constructed messages
            const fullResponse = await generateTextCompletion(model, apiKey, messages[messages.length - 1].content, messages.find(m => m.role === 'system')?.content);
            yield fullResponse;
        }
        yield* fallbackStreamUnsupported(); // Use yield*
        break; // Add break statement
      }
    }
  } catch (apiError) {
    console.error('Error during LLM stream:', apiError);
    // Re-throw the error to be handled by the calling function
    throw new Error(`LLM stream failed: ${apiError instanceof Error ? apiError.message : apiError}`);
  }
}
