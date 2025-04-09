import { generateTextCompletion } from '@/lib/llm-completion'; // Use alias
import { AIModel } from '@/types/types'; // Use the correct type name
import { readFileVFS, writeFileVFS, mkdirVFS } from './vfs'; // Import VFS functions

// TODO: Define specific types for agent state and tools if needed

// Placeholder for tool definitions
type AgentTool =
  | { name: 'create_folder'; params: { path: string } }
  | { name: 'create_document'; params: { path: string; content: string } }
  | { name: 'update_document'; params: { path: string; new_content: string } }
  | { name: 'read_document'; params: { path: string } }
  | { name: 'mark_todo_done'; params: { item_description: string } }
  | { name: 'ask_clarification'; params: { question: string } }
  | { name: 'finish_writing'; params: Record<string, never> }; // Use Record<string, never> for empty object

// Placeholder for tool execution result
type ToolResult = {
  toolName: AgentTool['name'];
  toolParams: AgentTool['params'];
  success: boolean;
  result?: string; // Content for read_document or error message
  error?: string;
};

// Define a type for the update callback argument, exported for use in UI components
export type WriteAgentUpdate =
  | { type: 'status'; message: string }
  | { type: 'error'; message: string }
  | { type: 'fileSystemChanged' }
  | { type: 'todoCompleted'; description: string };


export class WriteAgent {
  // private llmService: LLMService; // Removed class reference
  private model: AIModel;
  private apiKey: string;
  private notebookId: string; // Added notebookId to use with VFS
  private initialTodoList: string;
  private contextDocuments: { name: string; content: string }[]; // Add property for context documents
  // private outputBasePath: string; // No longer needed if VFS handles paths internally
  private conversationHistory: { role: 'user' | 'assistant' | 'tool'; content: string }[] = [];
  private maxIterations: number = 10;

  // Callback for UI updates using the new structured type
  private onUpdate: (update: WriteAgentUpdate) => void;

  constructor(
    model: AIModel,
    apiKey: string,
    notebookId: string, // Added notebookId
    initialTodoList: string,
    contextDocuments: { name: string; content: string }[], // Add context documents parameter
    // outputBasePath: string, // Removed outputBasePath
    onUpdate: (update: WriteAgentUpdate) => void // Use the new type here too
  ) {
    this.model = model;
    this.apiKey = apiKey;
    this.notebookId = notebookId; // Store notebookId
    this.initialTodoList = initialTodoList;
    this.contextDocuments = contextDocuments; // Store context documents
    // this.outputBasePath = outputBasePath; // Removed
    this.onUpdate = onUpdate;
  }

  // Helper function to validate if the input looks like a Markdown list
  private isValidTodoListFormat(listText: string): boolean {
    const lines = listText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    if (lines.length === 0) {
      return false; // Empty input is not a valid list for the agent
    }

    const listMarkerRegex = /^(?:[-*]|\d+\.|\[[ x]\])\s+/; // Matches '- ', '* ', '1. ', '[ ] ', '[x] '
    let listLineCount = 0;

    for (const line of lines) {
      if (listMarkerRegex.test(line)) {
        listLineCount++;
      }
    }

    // Consider it a list if at least half the non-empty lines look like list items
    // Adjust threshold as needed
    return listLineCount / lines.length >= 0.5;
  }


  public async start(): Promise<void> {
    this.onUpdate({ type: 'status', message: 'Starting agent...' });

    // --- Input Validation ---
    if (!this.isValidTodoListFormat(this.initialTodoList)) {
      // Send separate status and error messages if needed, or combine
      this.onUpdate({ type: 'status', message: 'Agent failed.' });
      this.onUpdate({
        type: 'error',
        message: 'Input does not appear to be a valid Markdown to-do list. Please use list format (e.g., "- Task 1").'
      });
      console.error("WriteAgent Error: Invalid to-do list format provided.");
      return; // Stop execution
    }
    // --- End Validation ---


    this.conversationHistory = []; // Reset history

    // Initial prompt
    const initialPrompt = this.createInitialPrompt();
    this.addToHistory('user', initialPrompt);

    try {
      await this.runAgentLoop();
      this.onUpdate({ type: 'status', message: 'Agent finished.' });
    } catch (error) {
      console.error('WriteAgent Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      this.onUpdate({ type: 'status', message: 'Agent failed.' }); // Separate status
      this.onUpdate({ type: 'error', message: errorMessage }); // Separate error
    }
  }

  private async runAgentLoop(): Promise<void> {
    for (let i = 0; i < this.maxIterations; i++) {
      this.onUpdate({ type: 'status', message: `Iteration ${i + 1}/${this.maxIterations}...` });

      // TODO: Build system prompt separately if needed by generateTextCompletion
      const systemPrompt = this.createSystemPrompt(); // Define system prompt logic
      const userPrompt = this.buildPrompt(); // Get the latest user/tool message

      const assistantResponseContent = await generateTextCompletion(
        this.model,
        this.apiKey,
        userPrompt,
        systemPrompt
      );

      if (!assistantResponseContent) {
        throw new Error('LLM did not provide a response.');
      }

      this.addToHistory('assistant', assistantResponseContent);

      // TODO: Implement robust parsing of assistant response for tool calls
      const toolCall = this.parseToolCall(assistantResponseContent);

      if (toolCall) {
        if (toolCall.name === 'finish_writing') {
          this.onUpdate({ type: 'status', message: 'Agent decided to finish.' });
          return; // Agent signaled completion
        }

        this.onUpdate({ type: 'status', message: `Executing tool: ${toolCall.name}...` });
        const toolResult = await this.executeTool(toolCall);
        // Send status update about tool success/failure
        this.onUpdate({ type: 'status', message: `Tool ${toolCall.name} ${toolResult.success ? 'succeeded' : 'failed'}.` });
        // If failed, also send an error update
        if (!toolResult.success && toolResult.error) {
            this.onUpdate({ type: 'error', message: `Tool ${toolCall.name} failed: ${toolResult.error}` });
        }


        // Format tool result for the next LLM prompt
        const toolResultString = this.formatToolResult(toolResult);
        this.addToHistory('tool', toolResultString);

        if (!toolResult.success) {
          // Optional: Add logic to handle repeated tool failures
          console.warn(`Tool ${toolCall.name} failed. Error: ${toolResult.error}`);
        }
      } else {
        // No tool call found - potentially finished or needs guidance
        this.onUpdate({ type: 'status', message: 'Agent did not call a tool. Finishing...' });
        console.log("Assistant response without tool call:", assistantResponseContent); // Fixed variable name
        // Consider asking the LLM to explicitly call 'finish_writing' or use a tool
        return;
      }
    }
    this.onUpdate({ type: 'status', message: 'Reached maximum iterations. Stopping agent.' });
  }

  private createInitialPrompt(): string {
    // Build the context string from the provided documents
    let contextString = '';
    if (this.contextDocuments && this.contextDocuments.length > 0) {
      contextString = `
You have access to the following document(s) as context. Use their content when a task in the To-Do List refers to them by name:
${this.contextDocuments.map((doc, index) => `
--- Document ${index + 1}: ${doc.name} ---
${doc.content}
--- End Document ${index + 1} ---`).join('\n')}
`;
    } else {
      contextString = "\nNo context documents were provided.\n";
    }

    // Refined prompt with stronger emphasis on using context
    return `You are an AI assistant tasked with generating Markdown documents based on a to-do list, using provided context documents when relevant.
Your primary goal is to complete the tasks in the To-Do List by creating the necessary folders and files using the available tools.

**Context Usage Rules:**
- **PRIORITY:** Before asking for clarification, ALWAYS check if the task can be completed or understood using the information within the provided 'Context Documents' below.
- If a task in the To-Do List mentions a document name that matches one of the 'Context Documents', USE the content of that document to fulfill the task (e.g., summarizing, extracting information, answering a question implied by the task).
- Generate the required content based *on the context documents* when applicable, and use the 'create_document' or 'update_document' tool to save it.
- Only use the 'ask_clarification' tool if the task is ambiguous AND the necessary information cannot be found in the To-Do List OR the provided Context Documents.

${contextString}
Available Tools:
- create_folder(path: string): Creates a new folder relative to the base output path.
- create_document(path: string, content: string): Creates a new Markdown file with the given content.
- update_document(path: string, new_content: string): Overwrites an existing Markdown file with new content.
- read_document(path: string): Reads the content of an existing Markdown file.
- mark_todo_done(item_description: string): Marks a specific item from the original list as completed. Use the exact description.
- ask_clarification(question: string): Ask the user for clarification if a task is unclear.
- finish_writing(): Call this tool when you believe all tasks are completed.

Rules:
- Use the tools provided to interact with the file system.
- Ensure all paths are relative to the base output directory. Do not use absolute paths.
- Create folders before creating files inside them.
- **CRITICAL:** After successfully completing the work for a specific item in the To-Do List (e.g., creating a requested document), you MUST call the 'mark_todo_done' tool with the exact description of that item.
- Only call the 'finish_writing' tool AFTER you have completed ALL items in the list AND marked each one as done using 'mark_todo_done'.

To-Do List:
\`\`\`markdown
${this.initialTodoList}
\`\`\`

Start processing the tasks. Prioritize using the provided context documents to fulfill the tasks before asking for clarification.`;
  }

  // Refined system prompt
  private createSystemPrompt(): string | undefined {
   // Provide more context about the agent's role and tool usage format
   return `You are an AI assistant inside a note-taking application. Your task is to generate Markdown documents based on a user's to-do list.
You have access to a virtual file system. Use the provided tools to create folders and documents.
Respond ONLY with tool calls in the format tool_name({"param1": "value1", ...}) or call finish_writing({}) when done.
CRITICAL: The argument inside the parentheses MUST be a single, valid JSON object enclosed in curly braces {}. Keys and string values MUST use double quotes.
Do not include any other text, explanations, or markdown formatting (like \`\`\`) in your response.

Example valid response:
create_document({"path": "my_folder/report.md", "content": "This is the report content."})

Example invalid response (missing quotes):
create_document({path: "report.md", content: "Bad format"})

Example invalid response (extra text):
Okay, I will create the document: create_document({"path": "report.md", "content": "Content"})
`;
 }

  // Build prompt including history (simple concatenation for now)
  private buildPrompt(): string {
    // Concatenate history for context, depending on how generateTextCompletion handles it.
    // This is a basic example; LLM service might need specific formatting.
    return this.conversationHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n\n');
    // Alternatively, just send the last message if the service manages history:
    // return this.conversationHistory[this.conversationHistory.length - 1]?.content || '';
  }

  private addToHistory(role: 'user' | 'assistant' | 'tool', content: string): void {
    this.conversationHistory.push({ role, content });
    // TODO: Consider history truncation if needed
  }

  // TODO: Implement robust parsing logic (e.g., using regex or structured output)
  // Slightly more robust parsing logic
  private parseToolCall(responseText: string): AgentTool | null {
    console.log("Parsing LLM response for tool call:", responseText);

    // Attempt to strip common markdown code fences and language identifiers before parsing
    let cleanedResponse = responseText.trim();
    // More general regex to remove leading ``` optionally followed by language name and newline
    cleanedResponse = cleanedResponse.replace(/^```[\w-]*\s*\n?/, '');
    // Remove trailing ``` and optional preceding newline
    cleanedResponse = cleanedResponse.replace(/\s*\n?```$/, '');
    cleanedResponse = cleanedResponse.trim(); // Trim again after stripping

    console.log("Cleaned response after stripping fences:", cleanedResponse);

    // Regex: Find tool_name({JSON_content}) structure directly anywhere in the string.
    const toolRegex = /(\w+)\s*\(\{([\s\S]*?)\}\)/; // Find tool_name, optional space, '({', capture JSON content non-greedily, '})'
    const match = cleanedResponse.match(toolRegex);

    console.log("Regex match result on cleaned response (searching for tool_name({json})):", match); // Log the match object

    if (match && match[1] && match[2] !== undefined) { // Check if tool name (group 1) and JSON content (group 2) were captured
      const name = match[1];
      // Reconstruct the JSON string including the braces captured implicitly by the regex structure
      let jsonString = `{${match[2]}}`;
      console.log(`Potential tool found: Name='${name}', JsonString='${jsonString}'`); // Log extracted parts

      // Handle finish_writing separately (it doesn't match the {json} pattern)
      // We need a separate check for finish_writing({}) potentially outside this block
      if (name === 'finish_writing') {
         // This case might be handled better by a simpler regex check first
         console.warn("finish_writing matched the complex pattern unexpectedly, might indicate LLM error.");
         // Let's assume it's a valid finish if the name matches
         console.log("Parsed tool call:", { name, params: {} });
         return { name: 'finish_writing', params: {} };
      }

      // Attempt to parse the reconstructed JSON string
      let params = {};
      try {
        // Clean up common invalid escape sequences within the extracted JSON
        jsonString = jsonString.replace(/\\_/g, '_');

        params = JSON.parse(jsonString);

        // Basic validation - refine as needed
        if (this.isValidTool(name, params)) {
           console.log("Parsed tool call:", { name, params });
           return { name, params } as AgentTool; // Type assertion needed here
        } else {
           console.warn("Parsed invalid tool name or params:", name, params);
        }
      } catch (e) {
        // Log the JSON string that failed parsing
        console.error("Failed to parse tool params JSON:", jsonString, e);
      }
    } else {
        // Add a separate check specifically for finish_writing({}) as it won't match the main regex
        const finishRegex = /finish_writing\s*\(\s*\{\s*\}\s*\)/;
        if (finishRegex.test(cleanedResponse)) {
            console.log("Parsed tool call: finish_writing({})");
            return { name: 'finish_writing', params: {} };
        }
    }

     console.log("No valid tool call found in response.");
    return null;
  }

  // Basic validation - expand as needed
  private isValidTool(name: string, params: Record<string, unknown>): boolean { // Changed params type to Record<string, unknown>
     switch (name) {
        case 'create_folder':
        case 'read_document':
           return typeof params.path === 'string';
        case 'create_document':
           return typeof params.path === 'string' && typeof params.content === 'string';
        case 'update_document':
           return typeof params.path === 'string' && typeof params.new_content === 'string';
        case 'mark_todo_done':
           return typeof params.item_description === 'string';
        case 'ask_clarification':
           return typeof params.question === 'string';
        case 'finish_writing':
           return true; // No params needed
        default:
           return false;
     }
  }


  // TODO: Implement actual tool execution logic
  private async executeTool(tool: AgentTool): Promise<ToolResult> {
    const baseResult = { toolName: tool.name, toolParams: tool.params };
    try {
      switch (tool.name) {
        case 'create_folder': {
          const success = mkdirVFS(this.notebookId, tool.params.path);
          if (success) {
            this.onUpdate({ type: 'fileSystemChanged' });
            return { ...baseResult, success: true, result: `Folder '${tool.params.path}' created or already exists.` };
          } else {
            // Error message is returned in the ToolResult, no separate onUpdate needed here
            return { ...baseResult, success: false, error: `Failed to create folder '${tool.params.path}'. It might be a file or path is invalid.` };
          }
        }
        case 'create_document':
        case 'update_document': { // Combine create and update logic
          const filePath = tool.name === 'create_document' ? tool.params.path : tool.params.path;
          const content = tool.name === 'create_document' ? tool.params.content : tool.params.new_content;
          const success = writeFileVFS(this.notebookId, filePath, content);
          if (success) {
            this.onUpdate({ type: 'fileSystemChanged' });
            return { ...baseResult, success: true, result: `Document '${filePath}' ${tool.name === 'create_document' ? 'created' : 'updated'}.` };
          } else {
            // Error message is returned in the ToolResult
            return { ...baseResult, success: false, error: `Failed to write document '${filePath}'. Path might be invalid or point to a folder.` };
          }
        }
        case 'read_document': {
           const content = readFileVFS(this.notebookId, tool.params.path);
           if (content !== null) {
             return { ...baseResult, success: true, result: content };
           } else {
             return { ...baseResult, success: false, error: `Failed to read document '${tool.params.path}'. File not found or it's a folder.` };
           }
        }
        case 'mark_todo_done': {
          // This tool needs to interact with the UI state via the onUpdate callback or similar mechanism.
          const itemDescription = tool.params.item_description;
          console.log(`Agent wants to mark TODO as done: ${itemDescription}`);
          // Send the specific update type for UI handling
          this.onUpdate({ type: 'todoCompleted', description: itemDescription });
          return { ...baseResult, success: true, result: `Successfully requested to mark '${itemDescription}' as done.` };
        }
        case 'ask_clarification': {
          // This tool needs UI integration to actually ask the user.
          const question = tool.params.question;
          console.log(`Agent asks for clarification: ${question}`);
          // For now, return the question itself, assuming the next loop iteration
          // might contain user's answer (this requires prompt engineering).
          // A better approach needs UI changes (e.g., modal, input field).
           this.onUpdate({ type: 'status', message: `Waiting for clarification: ${question}` }); // Inform UI
          // Returning the question forces the agent to process it in the next turn.
          return { ...baseResult, success: true, result: `Clarification requested: "${question}". Waiting for user response.` };
        }
        default:
          // Ensure finish_writing doesn't fall through if added later without explicit handling
          console.warn(`Attempted to execute unhandled tool or finish_writing: ${tool.name}`);
          return { ...baseResult, success: false, error: `Tool '${tool.name}' is not executable.` };
      }
    } catch (error) {
      console.error(`Error executing tool ${tool.name}:`, error);
      return { ...baseResult, success: false, error: error instanceof Error ? error.message : 'Tool execution failed' };
    }
  }

  private formatToolResult(toolResult: ToolResult): string {
    if (toolResult.success) {
      return `Tool ${toolResult.toolName} executed successfully.${toolResult.result ? `\nResult:\n${toolResult.result}` : ''}`;
    } else {
      return `Tool ${toolResult.toolName} failed. Error: ${toolResult.error}`;
    }
  }
}
