import React, { useState, useEffect, ReactNode } from "react";
import { testApiKey, ApiKeyTestResult } from "@/shared/api";
// Import the context and type from the new definition file
import { ApiKeyContext, ApiKeyContextType } from "./contexts/api-key";
// Import config to check for sponsored models
import { apiProviders } from "@/config";

// Type definitions for API key storage (Keep this local if only used here)
interface ApiKeyStorage {
  [provider: string]: string;
}

// Remove the context type definition
// export interface ApiKeyContextType { ... }

// Remove the context definition
// export const ApiKeyContext = createContext<ApiKeyContextType>({ ... });

// Context provider component
export const ApiKeyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [apiKeys, setApiKeys] = useState<ApiKeyStorage>({});
  const [validKeys, setValidKeys] = useState<Set<string>>(new Set());

  // Load saved API keys from localStorage on mount
  useEffect(() => {
    try {
      const savedKeys = localStorage.getItem("api_keys");
      if (savedKeys) {
        setApiKeys(JSON.parse(savedKeys));
      }

      // Load valid keys status
      const savedValidKeys = localStorage.getItem("valid_api_keys");
      if (savedValidKeys) {
        setValidKeys(new Set(JSON.parse(savedValidKeys)));
      }
    } catch (error) {
      console.error("Failed to load API keys from storage", error);
    }
  }, []);

  // Save API keys to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem("api_keys", JSON.stringify(apiKeys));
    } catch (error) {
      console.error("Failed to save API keys to storage", error);
    }
  }, [apiKeys]);

  // Save valid keys status whenever they change
  useEffect(() => {
    try {
      localStorage.setItem("valid_api_keys", JSON.stringify(Array.from(validKeys)));
    } catch (error) {
      console.error("Failed to save valid keys status to storage", error);
    }
  }, [validKeys]);

  // Set API key for a specific provider
  const setApiKey = (provider: string, key: string) => {
    setApiKeys((prev) => ({
      ...prev,
      [provider]: key,
    }));
  };

  // Get API key for a specific provider
  const getApiKey = (provider: string): string => {
    return apiKeys[provider] || "";
  };

  // Test if an API key is valid - now using real API testing
  const testProviderKey = async (provider: string, key: string): Promise<ApiKeyTestResult> => {
    try {
      const result = await testApiKey(provider, key);

      // Update the valid keys set based on the test result
      if (result.isValid) {
        setValidKeys(prev => new Set(prev).add(provider));
      } else {
        setValidKeys(prev => {
          const newSet = new Set(prev);
          newSet.delete(provider);
          return newSet;
        });
      }

      return result;
    } catch (error) {
      console.error(`Error testing ${provider} API key:`, error);
      return {
        isValid: false,
        message: error instanceof Error ? error.message : "Unknown error testing API key"
      };
    }
  };

  // Check if a provider has a valid API key OR is sponsored
  const isApiKeyValid = (provider: string): boolean => {
    // Check if the provider has any sponsored models
    const providerConfig = apiProviders.find(p => p.id === provider);
    // Check property existence and value directly
    const isSponsored = providerConfig?.models.some(m => 'sponsored' in m && m.sponsored === true);

    if (isSponsored) {
      return true; // Sponsored models are always considered valid
    }

    // Otherwise, check if the key has been manually validated
    return validKeys.has(provider);
  };

  return (
    <ApiKeyContext.Provider
      value={{
        apiKeys,
        setApiKey,
        getApiKey,
        testApiKey: testProviderKey,
        isApiKeyValid,
      }}
    >
      {children}
    </ApiKeyContext.Provider>
  );
};

// Remove the hook export from this file
// export const useApiKeys = () => useContext(ApiKeyContext);
