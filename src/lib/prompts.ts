import { GenerationType, AIMode, ChatMessage } from '@/types/types';

// Define system prompts for each AI mode
export const aiModeSystemPrompts: Record<AIMode, string> = {
  cite: `You are a helpful assistant focused on answering questions based *only* on the provided document context. Your primary goal is to extract relevant information and cite it accurately using the format [quote:line_number]. If the answer cannot be found in the provided documents, state that clearly. Do not provide information or opinions from outside the documents.`,
  solve: `You are a helpful assistant designed for problem-solving and brainstorming. You can answer questions, provide explanations, and generate ideas. While you should prioritize information from provided documents if available, you are free to use your general knowledge to provide comprehensive answers. Citations are not strictly required unless directly quoting.`,
  write: `You are an agentic assistant capable of creating content, planning tasks, and organizing information. Analyze the user's request and the provided context. Generate documents, outlines, lists, or other requested artifacts. You can ask clarifying questions if needed to fulfill the request effectively. Be proactive and structured in your responses.`, // Renamed 'create' to 'write'
};

// Helper function to format chat history
const formatChatHistory = (messages: ChatMessage[]): string => {
  return messages
    .map(m => `${m.role.toUpperCase()}: ${m.content}`)
    .join('\n\n');
};

// Define task-specific prompt templates for each generation type
const promptTemplates: Record<GenerationType, string> = {
  document_selection: `Given the following document summaries, chat history, and user question:

Document Summaries:
{source_content}

Chat History:
{chat_history}

Question: {question}

Using chain of thought reasoning:
1. First determine which document(s) are most relevant to answer this question, considering both the question and chat context
2. Explain why those documents are relevant
3. List the selected document IDs in order of relevance

Ensure response includes clear reasoning and specific document IDs, taking into account any context from the chat history.`,

  document_answer: `You are an AI assistant engaged in a conversation. Your task is to answer the user's question based *strictly* and *only* on the provided text context below, while maintaining context from the chat history. The context may consist of multiple parts from one or more documents, each marked with START and END identifiers (e.g., "--- START doc_name (Part 1/2) ---"). Do not use any external knowledge.

Chat History:
{chat_history}

Provided Context:
{source_content}

User Question: {question}

Answer based *only* on the context provided above while maintaining consistency with previous chat interactions. If the answer cannot be found in the context, state exactly: "The answer cannot be found in the provided context." Do not add any other explanation. If the context includes markers like "[Content is image/audio, extraction failed, or placeholder - not usable text]", treat that section as empty.`,

  document_chat: `You are an AI assistant engaged in an ongoing conversation about the provided documents. Maintain conversation flow and context while ensuring answers are grounded in the document content. Use citations appropriately.

Chat History:
{chat_history}

Document Context:
{source_content}

Question: {question}

Provide a natural, conversational response that builds on the chat history while staying true to the document content. If referencing specific content, use citations in the format [quote:line_number].`,

  faq: `Based on the following document(s), please generate a list of frequently asked questions (FAQs) and their corresponding answers:

--- DOCUMENT START ---
{source_content}
--- DOCUMENT END ---

FAQs:`,

  work_aid: `Based on the following document(s), please provide a comprehensive analysis using the EXACT following section headers:

document summary: (3-5 sentences summarizing the main content)
key highlights: (5-7 most important points or insights)
work aid/checklist: (actionable items or key takeaways)

--- DOCUMENT START ---
{source_content}
--- DOCUMENT END ---

Ensure your response uses ONLY these lowercase headers followed by a colon.`,

  briefing: `Based on the following document(s), please generate a concise briefing document summarizing the key points:

--- DOCUMENT START ---
{source_content}
--- DOCUMENT END ---

Briefing Document:`,

  timeline: `Based on the following document(s), please extract key events and generate a chronological timeline:

--- DOCUMENT START ---
{source_content}
--- DOCUMENT END ---

Timeline:`,

  document_overview: `Analyze the following document and generate a comprehensive overview. Respond ONLY with a valid JSON object containing the following keys:
- "summary": A concise 3-5 sentence summary of the document's main purpose and content.
- "outline": A structured outline (e.g., using markdown headings or nested lists) showing the document's organization and main sections.
- "keyPoints": A bulleted list (markdown format) of the 5-10 most important points or takeaways from the document.
- "qa": An array of 3-5 objects, each with a "question" and "answer" key, representing likely questions someone might have after reading the document and their corresponding answers.

Example JSON structure:
{
  "summary": "...",
  "outline": "...",
  "keyPoints": "- Point 1\n- Point 2",
  "qa": [
    { "question": "...", "answer": "..." },
    { "question": "...", "answer": "..." }
  ]
}

Ensure the entire response is a single JSON object and nothing else.

Here is the document:

--- DOCUMENT START ---
{source_content}
--- DOCUMENT END ---
`
};

/**
 * Gets the appropriate prompt template for a given generation type and injects the required content.
 * @param type The type of content to generate.
 * @param sourceContent The combined content from the relevant sources.
 * @param question Optional question for Q&A related prompts.
 * @param messages Optional array of chat messages for context
 * @returns The formatted prompt string.
 */
export const getPrompt = (
  type: GenerationType, 
  sourceContent: string,
  question?: string,
  messages: ChatMessage[] = []
): string => {
  const template = promptTemplates[type];
  if (!template) {
    console.warn(`No prompt template found for type: ${type}`);
    return `Generate content based on: ${sourceContent}`; 
  }

  // Format recent chat history (limit to last 5 messages)
  const recentMessages = messages.slice(-5);
  const chatHistory = formatChatHistory(recentMessages);

  let prompt = template
    .replace('{source_content}', sourceContent)
    .replace('{chat_history}', chatHistory);
  
  // Handle question replacement for Q&A prompts
  if (question && (type === 'document_selection' || type === 'document_answer' || type === 'document_chat')) {
    prompt = prompt.replace('{question}', question);
  }
  
  return prompt;
};
