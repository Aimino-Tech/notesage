import OpenAI from 'openai';
import { AIModel, ChatMessage, DocumentSummary, QAPair, WorkAidContent } from '@/types/types';
import { parseWorkAidContent } from '@/lib/llm-parsers'; // Import the parser
// Note: Using the same message converter as OpenAI
import { convertToOpenAiMessages } from './openai'; // Adjust path if moved later

// --- DeepSeek API Interaction Functions ---

function getDeepseekInstance(apiKey: string): OpenAI {
  return new OpenAI({
    baseURL: "https://api.deepseek.com/v1",
    apiKey: apiKey,
    dangerouslyAllowBrowser: true // Required for client-side usage
  });
}

/**
 * Generates document summary using DeepSeek API.
 */
export async function deepseekGenerateDocumentSummary(
  model: AIModel,
  apiKey: string,
  prompt: string
): Promise<{ rawResponseText: string }> { // Return raw text
  const deepseek = getDeepseekInstance(apiKey);

  const response = await deepseek.chat.completions.create({
    model: model.id,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
    // response_format: { type: "json_object" } // Not standard in OpenAI SDK for all providers, rely on prompt
  });

  if (!response.choices?.[0]?.message?.content) {
    throw new Error('Invalid DeepSeek response format');
  }
  const rawResponseText = response.choices[0].message.content;
  return { rawResponseText };
}

/**
 * Generates work aid content using DeepSeek API.
 */
export async function deepseekGenerateWorkAidContent(
  model: AIModel,
  apiKey: string,
  prompt: string
): Promise<WorkAidContent> {
  const deepseek = getDeepseekInstance(apiKey);

  const response = await deepseek.chat.completions.create({
    model: model.id,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3
  });

  if (!response.choices?.[0]?.message?.content) {
    throw new Error('Invalid DeepSeek response format');
  }
  const rawContent = response.choices[0].message.content;
  return parseWorkAidContent(rawContent); // Use the imported parser
}

/**
 * Generates text completion using DeepSeek API.
 */
export async function deepseekGenerateTextCompletion(
  model: AIModel,
  apiKey: string,
  messages: ChatMessage[] // Use pre-formatted messages
): Promise<string> {
  const deepseek = getDeepseekInstance(apiKey);
  const openAiMessages = convertToOpenAiMessages(messages);

  const response = await deepseek.chat.completions.create({
    model: model.id,
    messages: openAiMessages,
    temperature: 0.3 // Adjust temperature as needed
  });

  if (!response.choices?.[0]?.message?.content) {
    throw new Error('Invalid DeepSeek response format');
  }
  return response.choices[0].message.content;
}

/**
 * Generates text completion using DeepSeek API (Streaming).
 */
export async function* deepseekGenerateTextCompletionStream(
  model: AIModel,
  apiKey: string,
  messages: ChatMessage[] // Use pre-formatted messages
): AsyncGenerator<string> {
  const deepseek = getDeepseekInstance(apiKey);
  const openAiMessages = convertToOpenAiMessages(messages);

  const stream = await deepseek.chat.completions.create({
    model: model.id,
    messages: openAiMessages,
    temperature: 0.3,
    stream: true,
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) {
      yield content;
    }
  }
}
