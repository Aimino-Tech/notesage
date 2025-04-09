import { useContext } from 'react';
// Import the context type and the context itself from the new definition file
import { ApiKeyContextType, ApiKeyContext } from '@/lib/contexts/api-key'; 

// Custom hook to use the API key context
// We assert the context type as ApiKeyContextType because we expect it to be provided
export const useApiKeys = (): ApiKeyContextType => {
  const context = useContext(ApiKeyContext);
  if (context === undefined) {
    throw new Error('useApiKeys must be used within an ApiKeyProvider');
  }
  return context;
};
