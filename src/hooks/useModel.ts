import { useContext } from 'react';
// Import the context type and the context itself from the new definition file
import { ModelContextType, ModelContext } from '@/lib/contexts/model'; 

// Custom hook to use the model context
// We assert the context type as ModelContextType because we expect it to be provided
export const useModel = (): ModelContextType => {
  const context = useContext(ModelContext);
  if (context === undefined) {
    throw new Error('useModel must be used within a ModelProvider');
  }
  return context;
};
