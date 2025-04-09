import { AIModel } from '@/types/types';

// Define and export the unique ID for the sponsored model
export const sponsoredModelId = "gemini-2.0-flash-aimino-sponsored";

// Define the sponsored model object
const sponsoredGeminiModel: AIModel & { sponsored: true; apiKey: string } = {
  id: sponsoredModelId,
  name: "Aimino's sponsored Model",
  provider: "google",
  capabilities: { text: true, image: true, audio: false, computerUse: true }, // Based on gemini-2.0-flash
  requiresApiKey: false, // UI hint: key is handled internally
  maxTokens: 8192, // Based on gemini-2.0-flash
  version: "2.0", // Based on gemini-2.0-flash
  sponsored: true,
  apiKey: "AIzaSyBOapSkKX9xg3aEY0W158_WfkX7NGQiKmY", // Hardcoded key
  notes: "Provided by Aimino. No API key needed."
};

// List of all providers and their models, ensuring all models have required properties
export const apiProviders: { name: string; id: AIModel['provider']; apiKeyName: string; models: AIModel[] }[] = [
  {
    name: "Google AI",
    id: "google",
    apiKeyName: "geminiApiKey",
    models: [
      // Add the sponsored model first
      sponsoredGeminiModel as AIModel,
      // Add required properties to existing Google models
      // { // Note: Removing 2.5 Pro as it seemed unsupported previously? Add back if needed.
      //   id: "gemini-2.5-pro",
      //   name: "Gemini 2.5 Pro",
      //   provider: "google",
      //   capabilities: { text: true, image: true, audio: false, computerUse: true }, // Example capabilities
      //   requiresApiKey: true,
      //   maxTokens: 8192, // Example value
      // },
      {
        id: "gemini-2.0-flash",
        name: "Gemini 2.0 Flash",
        provider: "google",
        capabilities: { text: true, image: true, audio: false, computerUse: true }, // From types.ts
        requiresApiKey: true,
        maxTokens: 8192, // From types.ts
        version: "2.0" // From types.ts
      }
    ],
  },
  {
    name: "OpenAI",
    id: "openai",
    apiKeyName: "openaiApiKey",
    models: [
      // Add required properties to existing OpenAI models
      {
        id: "gpt-4-turbo",
        name: "GPT-4 Turbo",
        provider: "openai",
        capabilities: { text: true, image: true, audio: true, computerUse: true }, // From types.ts
        requiresApiKey: true,
        maxTokens: 128000, // From types.ts
        version: "4-turbo" // From types.ts
      },
      {
        id: "gpt-4",
        name: "GPT-4",
        provider: "openai",
        capabilities: { text: true, image: true, audio: true, computerUse: true }, // From types.ts
        requiresApiKey: true,
        maxTokens: 8192, // From types.ts
        version: "4" // From types.ts
      },
      {
        id: "gpt-3.5-turbo",
        name: "GPT-3.5 Turbo",
        provider: "openai",
        capabilities: { text: true, image: false, audio: true, computerUse: true }, // From types.ts
        requiresApiKey: true,
        maxTokens: 4096, // From types.ts
        version: "3.5" // From types.ts
      },
    ],
  },
  // Add Anthropic (assuming it was intended to be here)
  {
    name: "Anthropic",
    id: "anthropic",
    apiKeyName: "anthropicApiKey",
    models: [
      // Add Anthropic models from types.ts if available, or define here
      // Example: (Assuming Claude 3 Opus was defined in types.ts)
      // {
      //   id: "claude-3-opus-20240229",
      //   name: "Claude 3 Opus",
      //   provider: "anthropic",
      //   capabilities: { text: true, image: true, audio: false, computerUse: false },
      //   requiresApiKey: true,
      //   maxTokens: 200000, // Example
      // },
       { // Placeholder if not in types.ts
        id: "claude-3-sonnet-20240229", // Example ID
        name: "Claude 3 Sonnet",
        provider: "anthropic",
        capabilities: { text: true, image: true, audio: false, computerUse: false },
        requiresApiKey: true,
        maxTokens: 200000, // Example
      },
    ],
  },
  // Add Ollama
  {
    name: "Ollama",
    id: "ollama",
    apiKeyName: "ollamaHostUrl", // Using this name for the host setting
    models: [
      // Reference models from types.ts
      {
        id: "llama3",
        name: "Llama 3 (Ollama)",
        provider: "ollama",
        capabilities: { text: true, image: false, audio: false, computerUse: false },
        requiresApiKey: false, // Host URL needed, not API key
        ollamaConfig: { host: "http://localhost:11434" } // Default host
      },
      {
        id: "mistral",
        name: "Mistral (Ollama)",
        provider: "ollama",
        capabilities: { text: true, image: false, audio: false, computerUse: false },
        requiresApiKey: false,
        ollamaConfig: { host: "http://localhost:11434" }
      },
      {
        id: "phi3",
        name: "Phi-3 (Ollama)",
        provider: "ollama",
        capabilities: { text: true, image: false, audio: false, computerUse: false },
        requiresApiKey: false,
        ollamaConfig: { host: "http://localhost:11434" }
      }
      // Add other Ollama models from types.ts if needed
    ],
  },
  // Add DeepSeek
  {
    name: "DeepSeek",
    id: "deepseek",
    apiKeyName: "deepseekApiKey",
    models: [
      // Reference models from types.ts
      {
        id: "deepseek-chat",
        name: "DeepSeek Chat",
        provider: "deepseek",
        capabilities: { text: true, image: false, audio: false, computerUse: false },
        requiresApiKey: true,
        maxTokens: 128000,
        version: "1.0"
      },
      {
        id: "deepseek-coder",
        name: "DeepSeek Coder",
        provider: "deepseek",
        capabilities: { text: true, image: false, audio: false, computerUse: false },
        requiresApiKey: true,
        maxTokens: 128000,
        version: "1.0"
      }
    ],
  }
];

// Function to get all available models as a flat array of AIModel
export function getAllModels(): AIModel[] {
  return apiProviders.flatMap(provider => provider.models);
}

// Function to retrieve the actual sponsored model object with its key
export function getSponsoredModelDetails(modelId: string): (AIModel & { sponsored: true; apiKey: string }) | undefined {
    if (modelId === sponsoredModelId) {
        const model = apiProviders.flatMap(p => p.models).find(m => m.id === sponsoredModelId);
        // Check property existence and value directly, then assert the specific return type
        if (model && 'sponsored' in model && model.sponsored === true) {
             return model as AIModel & { sponsored: true; apiKey: string };
        }
    }
    return undefined;
}

// Default provider might need adjustment depending on the full list
export const defaultProvider = "google";

// defaultApiKey export is removed
