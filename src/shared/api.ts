import { DocumentSummary } from '@/types/types'; // Corrected import path
import { getPrompt } from '@/lib/prompts';

// Removed empty interface ApiConfiguration

export interface ModelInfo {
  id: string;
  vendor: string;
  model: string;
}

// API key verification interfaces and functions
export interface ApiKeyTestResult {
  isValid: boolean;
  message: string;
}

/**
 * Tests an OpenAI API key by making a simple request to list models
 */
export async function testOpenAIApiKey(apiKey: string): Promise<ApiKeyTestResult> {
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      return {
        isValid: true,
        message: 'OpenAI API key is valid!'
      };
    } else {
      const errorData = await response.json().catch(() => ({}));
      return {
        isValid: false,
        message: errorData.error?.message || `Invalid API key (${response.status})`
      };
    }
  } catch (error) {
    console.error('Error testing OpenAI API key:', error);
    return {
      isValid: false,
      message: error instanceof Error ? error.message : 'Network error when testing API key'
    };
  }
}

/**
 * Tests a Google AI (Gemini) API key by making a simple model list request
 */
export async function testGoogleApiKey(apiKey: string): Promise<ApiKeyTestResult> {
  try {
    // Google's API for Gemini requires project ID generally, but we can test the key with a models endpoint
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      return {
        isValid: true,
        message: 'Google AI API key is valid!'
      };
    } else {
      const errorData = await response.json().catch(() => ({}));
      return {
        isValid: false,
        message: errorData.error?.message || `Invalid API key (${response.status})`
      };
    }
  } catch (error) {
    console.error('Error testing Google AI API key:', error);
    return {
      isValid: false,
      message: error instanceof Error ? error.message : 'Network error when testing API key'
    };
  }
}

/**
 * Tests an Anthropic API key by making a simple request
 */
export async function testAnthropicApiKey(apiKey: string): Promise<ApiKeyTestResult> {
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1,
        messages: [{ role: 'user', content: 'Hello' }]
      })
    });

    // For Anthropic, we're actually sending a request that would generate content
    // but we're only asking for 1 token to minimize costs during testing
    if (response.ok) {
      return {
        isValid: true,
        message: 'Anthropic API key is valid!'
      };
    } else {
      const errorData = await response.json().catch(() => ({}));
      return {
        isValid: false,
        message: errorData.error?.message || `Invalid API key (${response.status})`
      };
    }
  } catch (error) {
    console.error('Error testing Anthropic API key:', error);
    return {
      isValid: false,
      message: error instanceof Error ? error.message : 'Network error when testing API key'
    };
  }
}

/**
 * Tests an Ollama connection by checking if the server is responding at the given endpoint
 */
export async function testOllamaConnection(endpoint: string): Promise<ApiKeyTestResult> {
  if (!endpoint || typeof endpoint !== 'string' || !endpoint.trim()) {
    return { isValid: false, message: 'Ollama host URL is missing or invalid.' };
  }
  // Basic URL validation (can be enhanced)
  try {
    new URL(endpoint);
  } catch (_) {
    return { isValid: false, message: 'Invalid Ollama host URL format.' };
  }

  try {
    // Test connection by fetching tags or version
    const response = await fetch(`${endpoint.replace(/\/$/, '')}/api/tags`, { // Ensure no trailing slash
      method: 'GET'
    });

    if (response.ok) {
      return {
        isValid: true,
        message: 'Successfully connected to Ollama server!'
      };
    } else {
      return {
        isValid: false,
        message: `Could not connect to Ollama at ${endpoint} (${response.status})`
      };
    }
  } catch (error) {
    console.error(`Error testing Ollama connection at ${endpoint}:`, error);
    return {
      isValid: false,
      message: `Could not connect to Ollama at ${endpoint}. Is it running and accessible?`
    };
  }
}

/**
 * Tests a Deepseek API key by making a simple request
 */
export async function testDeepseekApiKey(apiKey: string): Promise<ApiKeyTestResult> {
  try {
    const response = await fetch('https://api.deepseek.com/v1/models', { // Use Deepseek models endpoint
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      // Further check if the response body indicates success if needed
      // const data = await response.json();
      // if (data && data.data && data.data.length > 0) { ... }
      return {
        isValid: true,
        message: 'Deepseek API key is valid!'
      };
    } else {
      const errorData = await response.json().catch(() => ({}));
      // Deepseek might return errors differently than OpenAI
      const message = errorData.error?.message || errorData.message || `Invalid API key (${response.status})`;
      return {
        isValid: false,
        message: message
      };
    }
  } catch (error) {
    console.error('Error testing Deepseek API key:', error);
    return {
      isValid: false,
      message: error instanceof Error ? error.message : 'Network error when testing API key'
    };
  }
}


/**
 * Generic function to test an API key (or connection setting) for any provider
 */
export async function testApiKey(provider: string, apiKey: string): Promise<ApiKeyTestResult> {
  switch (provider) {
    case 'openai':
      return testOpenAIApiKey(apiKey);
    case 'google':
      return testGoogleApiKey(apiKey);
    case 'anthropic':
      return testAnthropicApiKey(apiKey);
    case 'ollama':
      // Pass the apiKey (which holds the host URL) to testOllamaConnection
      return testOllamaConnection(apiKey);
    case 'deepseek':
      return testDeepseekApiKey(apiKey);
    default:
      console.warn(`API key test requested for unknown provider: ${provider}`);
      return {
        isValid: false,
        message: `Unknown provider: ${provider}`
      };
  }
}

// Removed redundant generateDocumentSummary and parseGeneratedContent functions.
// The logic is now centralized in src/lib/llm-service.ts
