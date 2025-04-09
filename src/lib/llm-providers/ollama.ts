// Use the browser-specific import for Ollama
import { Ollama, Message as OllamaMessage } from 'ollama/browser';
import { AIModel, ChatMessage, DocumentSummary, QAPair, WorkAidContent } from '@/types/types';
import { parseWorkAidContent } from '@/lib/llm-parsers'; // Import the parser

// --- Helper Function for Message Conversion ---

/**
 * Converts generic ChatMessage array to Ollama's message format.
 */
export function convertToOllamaMessages(messages: ChatMessage[]): OllamaMessage[] {
  return messages.map(msg => ({
    role: msg.role === 'user' ? 'user' : msg.role === 'assistant' ? 'assistant' : 'system', // Map roles
    content: msg.content,
    // Ollama specific properties like 'images' could be added here if needed
  }));
}

// --- Ollama Interaction Functions ---

function getOllamaInstance(model: AIModel): Ollama {
  return new Ollama({ host: model.ollamaConfig?.host || 'http://localhost:11434' });
}

function getOllamaModelName(model: AIModel): string {
  return model.ollamaConfig?.model || model.id;
}

/**
 * Generates document summary using Ollama.
 */
export async function ollamaGenerateDocumentSummary(
  model: AIModel,
  prompt: string
): Promise<{ rawResponseText: string }> { // Return raw text
  const ollama = getOllamaInstance(model);
  const modelName = getOllamaModelName(model);

  // Using generate for single prompt task, not chat.
  const response = await ollama.generate({
    model: modelName,
    prompt: prompt,
    stream: false,
    options: model.ollamaConfig?.options || {},
    // format: 'json' // This might work in future Ollama versions or specific models, but rely on prompt for now
  });

  if (!response.response) {
    throw new Error('Invalid Ollama response format');
  }
  const rawResponseText = response.response;
  return { rawResponseText };
}

/**
 * Generates work aid content using Ollama.
 */
export async function ollamaGenerateWorkAidContent(
  model: AIModel,
  prompt: string
): Promise<WorkAidContent> {
  const ollama = getOllamaInstance(model);
  const modelName = getOllamaModelName(model);

  const response = await ollama.generate({
    model: modelName,
    prompt: prompt,
    stream: false,
    options: model.ollamaConfig?.options || {}
  });

  if (!response.response) {
    throw new Error('Invalid Ollama response format');
  }
  const rawContent = response.response;
  return parseWorkAidContent(rawContent); // Use the imported parser
}

/**
 * Generates text completion using Ollama.
 */
export async function ollamaGenerateTextCompletion(
  model: AIModel,
  messages: ChatMessage[] // Use pre-formatted messages
): Promise<string> {
  const ollama = getOllamaInstance(model);
  const modelName = getOllamaModelName(model);
  const ollamaMessages = convertToOllamaMessages(messages);

  // Use ollama.chat for consistency if system prompts are important
  const response = await ollama.chat({
    model: modelName,
    messages: ollamaMessages,
    stream: false,
    options: model.ollamaConfig?.options || {}
  });

  if (!response.message?.content) {
    throw new Error('Invalid Ollama response format');
  }
  return response.message.content;
}

/**
 * Generates text completion using Ollama (Streaming).
 */
export async function* ollamaGenerateTextCompletionStream(
  model: AIModel,
  messages: ChatMessage[] // Use pre-formatted messages
): AsyncGenerator<string> {
  const ollama = getOllamaInstance(model);
  const modelName = getOllamaModelName(model);
  const ollamaMessages = convertToOllamaMessages(messages);

  const stream = await ollama.chat({
    model: modelName,
    messages: ollamaMessages,
    stream: true,
    options: model.ollamaConfig?.options || {}
  });

  for await (const chunk of stream) {
    if (chunk.message?.content) {
      yield chunk.message.content;
    }
    if (chunk.done) {
      // Optionally handle final metrics if needed: chunk.total_duration, etc.
      break;
    }
  }
}
