import { createContext } from "react";
import { AIModel } from "@/types/types";

// Export the context type
export interface ModelContextType {
  selectedModel: AIModel | null;
  setSelectedModel: (model: AIModel | null) => void;
}

// Export the context itself with default values
export const ModelContext = createContext<ModelContextType>({
  selectedModel: null,
  setSelectedModel: () => {},
});
