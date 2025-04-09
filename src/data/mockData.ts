
import { AIModel, Notebook, Source, ChatMessage, Note } from "@/types/types";

// Mock AI Models
export const mockModels: AIModel[] = [
  {
    id: "gemini-pro",
    name: "Google Gemini Pro",
    provider: "google",
    capabilities: {
      text: true,
      image: true,
      audio: false,
    },
    requiresApiKey: true,
  },
  {
    id: "gpt-4o",
    name: "OpenAI GPT-4o",
    provider: "openai",
    capabilities: {
      text: true,
      image: true,
      audio: true,
    },
    requiresApiKey: true,
  },
  {
    id: "claude-3-opus",
    name: "Anthropic Claude 3 Opus",
    provider: "anthropic",
    capabilities: {
      text: true,
      image: true,
      audio: false,
    },
    requiresApiKey: true,
  },
  {
    id: "llama3-70b",
    name: "Llama3 70B",
    provider: "ollama",
    capabilities: {
      text: true,
      image: false,
      audio: false,
    },
    requiresApiKey: false,
  },
  {
    id: "llava",
    name: "LLaVA",
    provider: "ollama",
    capabilities: {
      text: true,
      image: true,
      audio: false,
    },
    requiresApiKey: false,
  },
];

// Mock Sources
export const mockSources: Source[] = [
  {
    id: "src-1",
    name: "Forschungsbericht 2023.pdf",
    type: "pdf",
    content: "Lorem ipsum dolor sit amet, consectetur adipiscing elit...",
    dateAdded: new Date(2023, 5, 15),
    size: 1024 * 1024 * 2.5, // 2.5 MB
  },
  {
    id: "src-2",
    name: "Projektplan.docx",
    type: "docx",
    content: "Projekt Zeitplan und Meilensteine...",
    dateAdded: new Date(2023, 6, 10),
    size: 1024 * 512, // 512 KB
  },
  {
    id: "src-3",
    name: "Meeting Notes.txt",
    type: "txt",
    content: "Besprechungsnotizen vom 12. Juli...",
    dateAdded: new Date(2023, 6, 12),
    size: 1024 * 10, // 10 KB
  },
  {
    id: "src-4",
    name: "Presentation.url",
    type: "url",
    content: "https://example.com/presentation",
    dateAdded: new Date(2023, 7, 5),
  },
];

// Mock Chat Messages
export const mockMessages: ChatMessage[] = [
  {
    id: "msg-1",
    role: "user",
    content: "Kannst du mir einen Überblick über die Haupterkenntnisse aus dem Forschungsbericht geben?",
    timestamp: new Date(2023, 7, 8, 14, 30),
  },
  {
    id: "msg-2",
    role: "assistant",
    content: "Basierend auf dem Forschungsbericht 2023 sind die Haupterkenntnisse:\n\n1. Die Kundenzufriedenheit ist um 15% gestiegen [1].\n2. Neue Produktlinien haben 30% mehr Umsatz generiert als im Vorjahr [1].\n3. Die Marktdurchdringung in Europa hat 45% erreicht, was eine Steigerung von 10% darstellt [2].",
    timestamp: new Date(2023, 7, 8, 14, 31),
    citations: [
      {
        id: "cit-1",
        sourceId: "src-1",
        text: "Die Kundenzufriedenheit ist von 75% im Jahr 2022 auf 90% im Jahr 2023 gestiegen. Neue Produktlinien haben einen Umsatz von 3,2 Millionen Euro generiert, was einer Steigerung von 30% gegenüber dem Vorjahr entspricht.",
        pageNumber: 12,
      },
      {
        id: "cit-2",
        sourceId: "src-1",
        text: "Die Marktdurchdringung in Europa hat 45% erreicht, was eine Steigerung von 10 Prozentpunkten gegenüber dem Vorjahr darstellt.",
        pageNumber: 15,
      },
    ],
  },
  {
    id: "msg-3",
    role: "user",
    content: "Und was sind die nächsten Schritte laut dem Projektplan?",
    timestamp: new Date(2023, 7, 8, 14, 33),
  },
  {
    id: "msg-4",
    role: "assistant",
    content: "Laut dem Projektplan sind die nächsten Schritte:\n\n1. Produktlaunch in Asien bis Ende Q3 2023 [1].\n2. Implementierung der neuen CRM-Lösung im September [1].\n3. Beginn der Winterkampagne mit Fokus auf Nachhaltigkeit im Oktober [2].",
    timestamp: new Date(2023, 7, 8, 14, 34),
    citations: [
      {
        id: "cit-3",
        sourceId: "src-2",
        text: "Q3 2023: Produktlaunch in asiatischen Märkten mit Schwerpunkt Japan und Südkorea. Implementierung der neuen CRM-Lösung zur Verbesserung des Kundenservice.",
        pageNumber: 3,
      },
      {
        id: "cit-4",
        sourceId: "src-2",
        text: "Oktober 2023: Start der Winterkampagne mit Fokus auf Nachhaltigkeit und umweltfreundliche Produkte.",
        pageNumber: 4,
      },
    ],
  },
];

// Mock Notes
export const mockNotes: Note[] = [
  {
    id: "note-1",
    title: "Wichtige Erkenntnisse",
    content: "- Kundenzufriedenheit ist um 15% gestiegen\n- Neue Produktlinien haben 30% mehr Umsatz generiert\n- Marktdurchdringung in Europa bei 45%",
    dateCreated: new Date(2023, 7, 8, 14, 35),
    dateModified: new Date(2023, 7, 8, 14, 35),
  },
  {
    id: "note-2",
    title: "Nächste Schritte",
    content: "1. Produktlaunch in Asien (Q3)\n2. CRM-Implementation (September)\n3. Winterkampagne (Oktober)",
    dateCreated: new Date(2023, 7, 8, 14, 37),
    dateModified: new Date(2023, 7, 8, 14, 40),
  },
];

// Mock Notebooks
export const mockNotebooks: Notebook[] = [];
