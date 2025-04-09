import OpenAI from 'openai';
import { AIModel, ChatMessage, DocumentSummary, QAPair, WorkAidContent } from '@/types/types';
import { parseWorkAidContent } from '@/lib/llm-parsers'; // Import the parser

// --- Helper Function for Message Conversion ---

/**
 * Converts generic ChatMessage array to OpenAI's message format.
 * Note: Also used by DeepSeek provider. Consider moving to a shared utility if needed.
 */
export function convertToOpenAiMessages(messages: ChatMessage[]): OpenAI.Chat.ChatCompletionMessageParam[] {
  return messages.map(msg => ({
    role: msg.role === 'user' ? 'user' : msg.role === 'assistant' ? 'assistant' : 'system', // Map roles
    content: msg.content,
  }));
}

// --- OpenAI API Interaction Functions ---

// Define a type for the expected response structure
interface OpenAiChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
    // Add other potential fields from the choice object if needed
  }>;
  // Add other potential top-level fields from the response if needed
}


/**
 * Generates document summary using OpenAI API.
 */
export async function openaiGenerateDocumentSummary(
  model: AIModel,
  apiKey: string,
  prompt: string
): Promise<{ rawResponseText: string; responseData: OpenAiChatCompletionResponse }> { // Use specific type
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: model.id,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      response_format: { type: "json_object" } // Request JSON mode
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `OpenAI API error: ${response.status}`);
  }
  const responseData = await response.json();
  const rawResponseText = responseData.choices?.[0]?.message?.content || '';
  return { rawResponseText, responseData };
}

/**
 * Generates work aid content using OpenAI API.
 */
export async function openaiGenerateWorkAidContent(
  model: AIModel,
  apiKey: string,
  prompt: string
): Promise<WorkAidContent> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: model.id,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  const rawContent = data.choices?.[0]?.message?.content || '';
  return parseWorkAidContent(rawContent); // Use the imported parser
}

/**
 * Generates text completion using OpenAI API.
 */
export async function openaiGenerateTextCompletion(
  model: AIModel,
  apiKey: string,
  messages: ChatMessage[] // Use pre-formatted messages
): Promise<string> {
  const openAiMessages = convertToOpenAiMessages(messages);
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: model.id,
      messages: openAiMessages, // Use converted messages
      temperature: 0.3 // Adjust temperature as needed
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `OpenAI API error: ${response.status}`);
  }
  const responseData = await response.json();
  return responseData.choices?.[0]?.message?.content || '';
}

/**
 * Generates text completion using OpenAI API (Streaming).
 */
export async function* openaiGenerateTextCompletionStream(
  model: AIModel,
  apiKey: string,
  messages: ChatMessage[] // Use pre-formatted messages
): AsyncGenerator<string> {
  const openAiMessages = convertToOpenAiMessages(messages);
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: model.id,
      messages: openAiMessages,
      temperature: 0.3,
      stream: true, // Enable streaming
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: { message: `API error: ${response.status}` } }));
    throw new Error(errorData.error?.message || `API error: ${response.status}`);
  }

  if (!response.body) {
    throw new Error('Response body is null');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split('\n');
    buffer = lines.pop() || ''; // Keep the last partial line

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const dataContent = line.substring(6).trim();
        if (dataContent === '[DONE]') {
          return; // End processing for this stream
        }
        try {
          const json = JSON.parse(dataContent);
          const chunk = json.choices?.[0]?.delta?.content || '';
          if (chunk) {
            yield chunk;
          }
        } catch (e) {
          // Ignore lines that are not valid JSON
          // console.warn('Skipping non-JSON line:', line, e);
        }
      }
    }
  }
}
