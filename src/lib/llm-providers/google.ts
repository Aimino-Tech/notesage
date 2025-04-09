import { AIModel, ChatMessage, DocumentSummary, QAPair, WorkAidContent } from '@/types/types';
import { getSponsoredModelDetails } from '@/config'; // Import for sponsored model check
import { parseWorkAidContent } from '@/lib/llm-parsers'; // Import the parser

// --- Google AI API Interaction Functions ---

/**
 * Generates document summary using Google AI API.
 */
export async function googleGenerateDocumentSummary(
  model: AIModel,
  apiKey: string,
  prompt: string
): Promise<{ rawResponseText: string }> { // Return raw text
  const sponsoredDetails = getSponsoredModelDetails(model.id);
  const effectiveApiKey = sponsoredDetails ? sponsoredDetails.apiKey : apiKey;
  const baseModelId = "gemini-2.0-flash"; // Actual API model ID
  const apiUrl = `https://generativelanguage.googleapis.com/v1/models/${baseModelId}:generateContent?key=${effectiveApiKey}`;

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }]
      // generationConfig: { temperature: 0.3 } // Example if needed
    })
  });

  if (!response.ok) {
    const errorBodyText = await response.text(); // Use const
    console.error("Google AI API Error Status:", response.status);
    console.error("Google AI API Error Body:", errorBodyText);
    let errorData: { error?: { message?: string } } = {}; // Add a basic type
    try {
      errorData = JSON.parse(errorBodyText);
    } catch (e) {
      console.error("Failed to parse error body as JSON");
    }
    // Use optional chaining, remove 'as any'
    const errorMessage = errorData?.error?.message || response.statusText || `Google AI API error: ${response.status}`;
    throw new Error(errorMessage);
  }

  const data = await response.json();
  if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
    throw new Error('Invalid Google AI response format');
  }
  const rawResponseText = data.candidates[0].content.parts[0].text;
  return { rawResponseText };
}

/**
 * Generates work aid content using Google AI API.
 */
export async function googleGenerateWorkAidContent(
  model: AIModel,
  apiKey: string,
  prompt: string
): Promise<WorkAidContent> {
  const sponsoredDetails = getSponsoredModelDetails(model.id);
  const effectiveApiKey = sponsoredDetails ? sponsoredDetails.apiKey : apiKey;
  const baseModelId = "gemini-2.0-flash"; // Actual API model ID
  const apiUrl = `https://generativelanguage.googleapis.com/v1/models/${baseModelId}:generateContent?key=${effectiveApiKey}`;

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }]
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Google AI API error: ${response.status}`);
  }

  const data = await response.json();
  const rawContent = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  return parseWorkAidContent(rawContent); // Use the imported parser
}

/**
 * Generates text completion using Google AI API.
 * Note: Google doesn't have a separate system prompt field in the standard API.
 * System prompt is prepended to the user prompt if provided.
 */
export async function googleGenerateTextCompletion(
  model: AIModel,
  apiKey: string,
  messages: ChatMessage[] // Use pre-formatted messages
): Promise<string> {
  const sponsoredDetails = getSponsoredModelDetails(model.id);
  const effectiveApiKey = sponsoredDetails ? sponsoredDetails.apiKey : apiKey;
  const baseModelId = "gemini-2.0-flash"; // Actual API model ID
  const apiUrl = `https://generativelanguage.googleapis.com/v1/models/${baseModelId}:generateContent?key=${effectiveApiKey}`;

  // Combine system prompt (if any) and the last user message for Google's format
  const systemMessage = messages.find(m => m.role === 'system');
  const userMessage = messages.find(m => m.role === 'user'); // Assuming last message is user prompt

  if (!userMessage) {
    throw new Error("No user message found for Google completion.");
  }

  // Format contents for Google API (v1) - attempt multi-turn structure
  const googleContents = [];
  if (systemMessage) {
    // Google v1 doesn't have a dedicated system role, prepend to first user message or handle differently
    // Let's try adding it as a separate user message first, although not ideal.
    // A better approach might be to use v1beta if possible, which supports roles.
    // For now, we'll stick to v1 structure but separate messages.
     googleContents.push({ role: "user", parts: [{ text: systemMessage.content }] });
     // Add a model placeholder turn if a system message exists, as required by Google API structure
     googleContents.push({ role: "model", parts: [{ text: "Okay, I understand the instructions." }] });
  }
   googleContents.push({ role: "user", parts: [{ text: userMessage.content }] }); // User prompt with context + question


  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: googleContents // Send structured contents
      // generationConfig: { temperature: 0.3 } // Example if needed
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Google AI API error: ${response.status}`);
  }

  const data = await response.json();
  if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
    throw new Error('Invalid Google AI response format');
  }
  return data.candidates[0].content.parts[0].text;
}

/**
 * Generates text completion using Google AI API (Streaming - Placeholder).
 * NOTE: Streaming for Google Gemini API (v1beta) requires different implementation.
 * This function currently falls back to non-streaming.
 */
export async function* googleGenerateTextCompletionStream(
  model: AIModel,
  apiKey: string,
  messages: ChatMessage[]
): AsyncGenerator<string> {
  console.warn(`Streaming not fully implemented for Google, falling back to non-streaming.`);
  // Determine correct API key (check for embedded key)
  const sponsoredDetails = getSponsoredModelDetails(model.id);
  const effectiveApiKey = sponsoredDetails ? sponsoredDetails.apiKey : apiKey;

  // Fallback to non-streaming version, passing the effective key
  const fullResponse = await googleGenerateTextCompletion(model, effectiveApiKey, messages);
  yield fullResponse;
}
