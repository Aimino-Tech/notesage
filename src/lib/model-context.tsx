import React, { useState, ReactNode } from "react";
import { AIModel } from "@/types/types";
// Import the context and type from the new definition file
import { ModelContext, ModelContextType } from "./contexts/model";
import { apiProviders, sponsoredModelId } from "@/config"; // Import necessary items

// Remove the context type definition
// export interface ModelContextType { ... }

// Remove the context definition
// export const ModelContext = createContext<ModelContextType>({ ... });

// Provider component that will wrap the application
export const ModelProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Find the default model (Aimino sponsored)
  const defaultModel = apiProviders
    .flatMap(provider => provider.models)
    .find(model => model.id === sponsoredModelId) || null; // Fallback to null if not found

  const [selectedModel, setSelectedModel] = useState<AIModel | null>(defaultModel); // Set initial state

  return (
    <ModelContext.Provider
      value={{
        selectedModel,
        setSelectedModel,
      }}
    >
      {children}
    </ModelContext.Provider>
  );
};

// Remove the hook export from this file
// export const useModel = () => useContext(ModelContext);
