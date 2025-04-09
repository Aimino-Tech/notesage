import type { VFSState } from '@/lib/vfs'; // Import VFSState type

// AI Model types
export interface AIModel {
  id: string;
  name: string;
  provider: 'google' | 'openai' | 'anthropic' | 'ollama' | 'local' | 'deepseek';
  capabilities: {
    text: boolean;
    image: boolean;
    audio: boolean;
    computerUse: boolean;
  };
  requiresApiKey: boolean;
  maxTokens?: number;
  version?: string;
  notes?: string; // Optional field for pricing/usage notes
  ollamaConfig?: {
    host?: string;
    model?: string;
    keepAlive?: string;
    options?: {
      temperature?: number;
      topP?: number;
      topK?: number;
      repeatPenalty?: number;
    };
  };
}

export interface OllamaResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

// List of supported models
export const supportedModels: AIModel[] = [
  // Google Models
  // Note: Removed gemini-2.5-pro as it's unsupported based on user feedback/error logs.
  //       Removed other experimental models for clarity.
  {
    id: "gemini-2.0-flash", // Ensure this is supported by the user's API key
    name: "Gemini 2.0 Flash",
    provider: "google",
    capabilities: {
      text: true,
      image: true, // Assuming based on previous definition, adjust if needed
      audio: false,
      computerUse: true // Assuming based on previous definition, adjust if needed
    },
    requiresApiKey: true,
    maxTokens: 8192, // Assuming based on previous definition, adjust if needed
    version: "2.0" // Assuming based on previous definition, adjust if needed
  },
  // OpenAI Models
  {
    id: "gpt-4-turbo",
    name: "GPT-4 Turbo",
    provider: "openai",
    capabilities: {
      text: true,
      image: true,
      audio: true,
      computerUse: true
    },
    requiresApiKey: true,
    maxTokens: 128000,
    version: "4-turbo"
  },
  {
    id: "gpt-4",
    name: "GPT-4",
    provider: "openai",
    capabilities: {
      text: true,
      image: true,
      audio: true,
      computerUse: true
    },
    requiresApiKey: true,
    maxTokens: 8192,
    version: "4"
  },
  {
    id: "gpt-3.5-turbo",
    name: "GPT-3.5 Turbo",
    provider: "openai",
    capabilities: {
      text: true,
      image: false,
      audio: true,
      computerUse: true
    },
    requiresApiKey: true,
    maxTokens: 4096,
    version: "3.5"
  },
  // Ollama Models
  {
    id: "llama3",
    name: "Llama 3 (Ollama)",
    provider: "ollama",
    capabilities: {
      text: true,
      image: false,
      audio: false,
      computerUse: false
    },
    requiresApiKey: false,
    ollamaConfig: {
      host: "http://localhost:11434",
      options: {
        temperature: 0.7,
        topP: 0.9
      }
    }
  },
  {
    id: "mistral",
    name: "Mistral (Ollama)",
    provider: "ollama",
    capabilities: {
      text: true,
      image: false,
      audio: false,
      computerUse: false
    },
    requiresApiKey: false,
    ollamaConfig: {
      host: "http://localhost:11434",
      options: {
        temperature: 0.7,
        topK: 40
      }
    }
  },
  {
    id: "phi3",
    name: "Phi-3 (Ollama)",
    provider: "ollama",
    capabilities: {
      text: true,
      image: false,
      audio: false,
      computerUse: false
    },
    requiresApiKey: false,
    ollamaConfig: {
      host: "http://localhost:11434",
      options: {
        temperature: 0.7,
        repeatPenalty: 1.1
      }
    }
  },
  // DeepSeek Models
  {
    id: "deepseek-chat",
    name: "DeepSeek Chat",
    provider: "deepseek",
    capabilities: {
      text: true,
      image: false,
      audio: false,
      computerUse: false
    },
    requiresApiKey: true,
    maxTokens: 128000,
    version: "1.0"
  },
  {
    id: "deepseek-coder",
    name: "DeepSeek Coder",
    provider: "deepseek",
    capabilities: {
      text: true,
      image: false,
      audio: false,
      computerUse: false
    },
    requiresApiKey: true,
    maxTokens: 128000,
    version: "1.0"
  }
];

// Document Overview type (used within Source)
export interface QAPair {
  question: string;
  answer: string;
}

export interface DocumentSummary {
  summary: string;
  outline: string;
  keyPoints: string;
  qa: QAPair[]; // Changed from string to array of QAPair objects
  todos: string; // Added todos field
  error?: string;
  isValid: boolean;
  missingSections?: string[];
  lastUpdated: Date;
}

// Interface for Work Aid content structure
export interface WorkAidContent {
  summary: string;
  highlights: string;
  checklist: string;
  error?: string; // Optional error message
}

export interface LLMDocumentResponse {
  model: string;
  response: {
    summary: string;
    outline: string;
    keyPoints: string;
    qa: string;
  };
  tokensUsed: number;
  timestamp: Date;
}

// Source types

// Define the possible statuses for a source document
export enum SourceStatus {
  Pending = 'pending',
  Processing = 'processing',
  Completed = 'completed',
  Error = 'error',
}

// Define the allowed source types
export type SourceType = 'pdf' | 'docx' | 'txt' | 'md' | 'image' | 'audio' | 'url' | 'text' | 'csv' | 'json'; // Added csv, json

export interface Source {
  id: string;
  name: string;
  type: SourceType; // Use the defined SourceType
  content: string; // Text content, URL, or placeholder for binary files
  fileDataUrl?: string | null; // Changed: Store file content as Data URL for persistence
  thumbnailUrl?: string;
  dateAdded: Date;
  size?: number;
  summary?: DocumentSummary | null; // Added field to store the generated overview
  isGeneratingSummary?: boolean; // Added flag for loading state
  status?: SourceStatus; // Add status field
  part?: number; // Optional: Part number if the source is a chunk of a larger file
  totalParts?: number; // Optional: Total number of parts if the source is chunked
  originalId?: string; // Optional: ID linking all parts of a split document
}

// Notebook types
export interface Notebook {
  id: string;
  title: string;
  description?: string;
  sources: Source[];
  messages: ChatMessage[];
  notes: Note[];
  dateCreated: Date;
  dateModified: Date;
  workspace?: WorkspaceData; // Optional workspace data
}

// Define the structure for an individual Todo item
export interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
  completedBy?: 'user' | 'ai'; // Added field to track who completed it
}

// Define the structure for workspace-specific data within a Notebook
export interface WorkspaceData {
  todos?: TodoItem[]; // Changed from todoMarkdown to array of TodoItem
  // vfsState is managed separately in localStorage by vfs.ts
}

// Chat message types
export interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant' | 'system'; // Allow 'system' role
  timestamp: Date;
  citations?: Citation[];
  isLoading?: boolean; // Added for streaming placeholder
  isError?: boolean; // Added for error state
}

export interface Citation {
  id: string;
  sourceId: string;
  text: string;
  pageNumber?: number;
  highlightedText?: string;
  searchText: string;  // Text to search for when clicking the citation
}

// Note types
export interface Note {
  id: string;
  title: string;
  content: string;
  dateCreated: Date;
  dateModified: Date;
  isLoading?: boolean; // Added optional loading flag
}

// Generation types
export type GenerationType = 'work_aid' | 'faq' | 'briefing' | 'timeline' | 'document_overview' | 'document_selection' | 'document_answer' | 'document_chat';

// AI Interaction Modes
export type AIMode = 'cite' | 'solve' | 'write'; // Changed 'create' to 'write'

export interface GenerationOptions {
  type: GenerationType;
  title?: string;
  includeImages?: boolean;
  language?: 'en' | 'de';
}
