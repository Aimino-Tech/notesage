import { createContext } from "react";
import { ApiKeyTestResult } from "@/shared/api";

// Type definitions for API key storage
interface ApiKeyStorage {
  [provider: string]: string;
}

// Export the context type
export interface ApiKeyContextType {
  apiKeys: ApiKeyStorage;
  setApiKey: (provider: string, key: string) => void;
  getApiKey: (provider: string) => string;
  testApiKey: (provider: string, key: string) => Promise<ApiKeyTestResult>;
  isApiKeyValid: (provider: string) => boolean;
}

// Export the context itself with default values
export const ApiKeyContext = createContext<ApiKeyContextType>({
  apiKeys: {},
  setApiKey: () => {},
  getApiKey: () => "",
  testApiKey: async () => ({ isValid: false, message: "Context not initialized" }),
  isApiKeyValid: () => false,
});
