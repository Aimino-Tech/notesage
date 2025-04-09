import { AIModel, ChatMessage, DocumentSummary, QAPair, WorkAidContent } from '@/types/types';
import { parseWorkAidContent } from '@/lib/llm-parsers'; // Import the parser

// --- Anthropic API Interaction Functions ---

/**
 * Generates document summary using Anthropic API.
 */
export async function anthropicGenerateDocumentSummary(
  model: AIModel,
  apiKey: string,
  prompt: string
): Promise<{ rawResponseText: string }> { // Return raw text
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: model.id,
      max_tokens: 4096, // Consider making this configurable
      messages: [{ role: 'user', content: prompt }]
      // No specific JSON mode, rely on prompt
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Anthropic API error: ${response.status}`);
  }

  const data = await response.json();
  if (!data.content?.[0]?.text) {
    throw new Error('Invalid Anthropic response format');
  }
  const rawResponseText = data.content[0].text;
  return { rawResponseText };
}

/**
 * Generates work aid content using Anthropic API.
 */
export async function anthropicGenerateWorkAidContent(
  model: AIModel,
  apiKey: string,
  prompt: string
): Promise<WorkAidContent> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: model.id,
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Anthropic API error: ${response.status}`);
  }

  const data = await response.json();
  const rawContent = data.content?.[0]?.text || '';
  return parseWorkAidContent(rawContent); // Use the imported parser
}

/**
 * Generates text completion using Anthropic API.
 */
export async function anthropicGenerateTextCompletion(
  model: AIModel,
  apiKey: string,
  messages: ChatMessage[] // Use pre-formatted messages
): Promise<string> {
  // Separate system prompt if present
  const systemPrompt = messages.find(m => m.role === 'system')?.content;
  const userAssistantMessages = messages.filter(m => m.role !== 'system');

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: model.id,
      max_tokens: 4096, // Consider making this configurable
      messages: userAssistantMessages, // Pass only user/assistant messages
      system: systemPrompt // Pass system prompt separately
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Anthropic API error: ${response.status}`);
  }

  const data = await response.json();
  if (!data.content?.[0]?.text) {
    throw new Error('Invalid Anthropic response format');
  }
  return data.content[0].text;
}

/**
 * Generates text completion using Anthropic API (Streaming).
 */
export async function* anthropicGenerateTextCompletionStream(
  model: AIModel,
  apiKey: string,
  messages: ChatMessage[] // Use pre-formatted messages
): AsyncGenerator<string> {
  // Separate system prompt if present
  const systemPrompt = messages.find(m => m.role === 'system')?.content;
  const userAssistantMessages = messages.filter(m => m.role !== 'system');

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream' // Important for SSE
    },
    body: JSON.stringify({
      model: model.id,
      max_tokens: 4096,
      messages: userAssistantMessages,
      system: systemPrompt,
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

    // Process buffer line by line for SSE events
    const lines = buffer.split('\n');
    buffer = lines.pop() || ''; // Keep potential partial line

    for (const line of lines) {
      if (line.startsWith('event: ')) {
        // Could check event type (e.g., 'content_block_delta') if needed
        continue;
      }
      if (line.startsWith('data: ')) {
        const dataContent = line.substring(6).trim();
        try {
          const json = JSON.parse(dataContent);
          // Extract text delta based on Anthropic's streaming format
          if (json.type === 'content_block_delta' && json.delta?.type === 'text_delta') {
            const chunk = json.delta.text || '';
            if (chunk) {
              yield chunk;
            }
          }
          // Handle other event types like 'message_stop' if necessary
          if (json.type === 'message_stop') {
            return; // Stream finished
          }
        } catch (e) {
          // Ignore lines that are not valid JSON or irrelevant events
          // console.warn('Skipping non-JSON/irrelevant line:', line, e);
        }
      }
    }
  }
}
