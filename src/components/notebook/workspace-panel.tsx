import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { WriteAgent, WriteAgentUpdate } from '@/lib/write-agent';
import { useNotebookData } from '@/hooks/useNotebookData';
import { useApiKeys } from '@/hooks/useApiKeys';
import { getFileSystemStateVFS } from '@/lib/vfs'; // Removed unused VFS imports and saveNotebookToLocalStorage
import type { TodoItem } from '@/types/types';
import { useParams } from 'react-router-dom';
import { Files, Bot } from 'lucide-react'; // Removed Download, Trash2
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TodoPanel } from './todo-panel'; // Import the extracted component
import { OutputPanel } from './output-panel'; // Import the extracted component
import { toast } from 'sonner'; // Import toast

// --- WorkspacePanel Component ---
export const WorkspacePanel: React.FC = () => {
  const { id: notebookId } = useParams<{ id: string }>();
  const {
    selectedModel,
    sources,
    messages,
    notes,
    todos: initialTodos, // Use the correct name from the hook
    setTodos, // Use the setter from the hook
    vfsState: currentVfsState,
    setVfsState,
    saveNotebookToLocalStorage,
    selectedSourceIds,
   } = useNotebookData(notebookId);
  const { apiKeys } = useApiKeys();

  const [agentStatus, setAgentStatus] = useState<string>('');
  const [agentError, setAgentError] = useState<string>('');
  const [isAgentRunning, setIsAgentRunning] = useState<boolean>(false);
  // Initialize with all source IDs by default
  const [agentContextSourceIds, setAgentContextSourceIds] = useState<Set<string>>(() => new Set(sources.map(s => s.id)));
  const [vfsRevision, setVfsRevision] = useState(0);
  const vfsState = currentVfsState;

  useEffect(() => {
    console.log("WorkspacePanel detected vfsState change from hook:", vfsState);
  }, [vfsState]);

  // Effect to update default selection when sources change
  useEffect(() => {
     setAgentContextSourceIds(new Set(sources.map(s => s.id)));
   }, [sources]);

  const refreshVfsState = useCallback(() => { // Wrap in useCallback
    if (notebookId) {
      console.log("[WorkspacePanel] VFS State BEFORE refresh:", vfsState); // Log current state from hook
      const newState = getFileSystemStateVFS(notebookId);
      console.log("[WorkspacePanel] VFS State read by getFileSystemStateVFS:", newState); // Log what was read
      setVfsState({ ...newState }); // Update hook state
      setVfsRevision(prev => prev + 1); // Update local revision
      // console.log("Refreshed VFS state in hook. New revision:", vfsRevision + 1); // This log is misleading due to closure
    }
  }, [notebookId, setVfsState, vfsState]); // Added vfsState dependency for logging

  // Save handler that updates hook state and persists
  const handleSaveTodosState = useCallback((newTodos: TodoItem[]) => {
     saveNotebookToLocalStorage(sources, messages, notes, newTodos);
  }, [saveNotebookToLocalStorage, sources, messages, notes]);

  // Agent start handler - wrapped in useCallback
  const handleStartAgent = useCallback((currentTodos: TodoItem[]) => {
    console.log("--- handleStartAgent ---");
    if (!notebookId || isAgentRunning || !selectedModel) return;

    const incompleteTodos = currentTodos.filter(t => !t.completed);
    if (incompleteTodos.length === 0) {
      toast.info("Please add at least one task to the list before starting the agent.");
      return;
    }

    const apiKey = apiKeys[selectedModel.provider];
    if (selectedModel.requiresApiKey && !apiKey) {
      setAgentStatus('Error');
      setAgentError(`API Key for ${selectedModel.provider} is missing.`);
      return;
    }

    setIsAgentRunning(true);
    setAgentStatus('Initializing agent...');
    setAgentError('');

    // Use the filtered list from the check above
    const todoListString = incompleteTodos
      .map(t => `- ${t.text}`) // Format according to error message example
      .join('\n');
    console.log("Starting agent with todo list string:", todoListString);

    const selectedSources = sources.filter(source => agentContextSourceIds.has(source.id));
    const contextDocuments = selectedSources.map(source => ({
      name: source.name,
      content: source.content,
    }));
    console.log(`Starting agent with ${contextDocuments.length} context documents.`);

    const agent = new WriteAgent(
      selectedModel,
      apiKey || '',
      notebookId,
      todoListString,
      contextDocuments,
      // Corrected onUpdate callback
      (update: WriteAgentUpdate) => {
        switch (update.type) {
          case 'status':
            setAgentStatus(update.message);
            break;
          case 'error':
            setAgentError(update.message);
            setAgentStatus('Error occurred');
            break;
          case 'fileSystemChanged':
            refreshVfsState();
            break;
          case 'todoCompleted': {
            const completedDesc = update.description;
            setAgentStatus(`Completed: ${completedDesc}`);
            console.log(`Agent marked todo as completed (by description): ${completedDesc}`);

            // Use the hook's state setter function to ensure atomicity
            setTodos(prevTodos => {
              let didActuallyUpdate = false;
              const nextTodos = prevTodos.map(todo => {
                if (todo.text === completedDesc && !todo.completed) {
                  didActuallyUpdate = true;
                  return { ...todo, completed: true, completedBy: 'ai' as const };
                }
                return todo;
              });

              // If an update occurred, save the new state
              if (didActuallyUpdate) {
                console.log(`Saving updated todo state for: ${completedDesc}`);
                // Call saveNotebook directly here as we have the definitive next state
                saveNotebookToLocalStorage(sources, messages, notes, nextTodos);
                return nextTodos; // Return the updated state for setTodos
              } else {
                console.warn(`Could not find matching incomplete todo item for description: ${completedDesc}, or it was already complete.`);
                return prevTodos; // Return previous state if no update
              }
            });
            break; // Break for todoCompleted case
          }
        } // End of switch statement
      } // End of onUpdate callback function
    ); // End of new WriteAgent constructor call

    // Start the agent process
    agent.start()
      .catch((err) => {
        console.error("Agent failed to start:", err);
        setAgentStatus('Error');
        setAgentError(err.message || 'Agent failed unexpectedly.');
      })
      .finally(() => {
        setIsAgentRunning(false);
      });
  }, [ // Dependencies for useCallback
    notebookId,
    isAgentRunning,
    selectedModel,
    apiKeys,
    setAgentStatus,
    setAgentError,
    setIsAgentRunning,
    sources,
    agentContextSourceIds,
    refreshVfsState,
    setTodos,
    saveNotebookToLocalStorage,
    messages,
    notes
    // toast removed as it's stable
  ]); // End of useCallback for handleStartAgent

  // Memoized TodoPanel
   const MemoizedTodoPanel = useMemo(() => (
     <TodoPanel
       initialTodos={initialTodos || []}
       onSaveTodos={handleSaveTodosState} // Pass the save handler
       onStartAgent={handleStartAgent} // Pass the agent start handler
       isAgentRunning={isAgentRunning}
       agentStatus={agentStatus}
       agentError={agentError}
     />
   ), [initialTodos, handleSaveTodosState, handleStartAgent, isAgentRunning, agentStatus, agentError]); // Dependencies updated

  // Handler for agent context checkbox changes
  const handleAgentContextCheckboxChange = (sourceId: string, checked: boolean | 'indeterminate') => {
    setAgentContextSourceIds(prev => {
      const newSelectedIds = new Set(prev);
      if (checked === true) {
        newSelectedIds.add(sourceId);
      } else {
        newSelectedIds.delete(sourceId);
      }
      console.log("Agent context selection changed:", newSelectedIds);
      return newSelectedIds;
    });
  };

  return (
    <div className="flex h-full space-x-4 p-4">
      {/* Left Side: Agent Context & Task List */}
      <div className="flex flex-col space-y-4 w-1/2">
        <Card className="flex-shrink-0">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Files className="mr-2 h-5 w-5" />
              Agent Context Documents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Select the documents the agent should use as context.
            </p>
            <ScrollArea className="h-40 border rounded-md p-2">
              {sources.length > 0 ? (
                <div className="space-y-2">
                  {sources.map((source) => (
                    <div key={`ctx-${source.id}`} className="flex items-center space-x-2">
                      <Checkbox
                        id={`ctx-select-${source.id}`}
                        checked={agentContextSourceIds.has(source.id)}
                        onCheckedChange={(checked) => handleAgentContextCheckboxChange(source.id, checked)}
                      />
                      <Label
                        htmlFor={`ctx-select-${source.id}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 truncate"
                        title={source.name}
                      >
                        {source.name}
                      </Label>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No sources available.</p>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
        {MemoizedTodoPanel}
      </div>

      {/* Right Side: Output Panel */}
      <div className="w-1/2 flex flex-col">
        {notebookId && <OutputPanel notebookId={notebookId} vfsState={vfsState} refreshVfsState={refreshVfsState} vfsRevision={vfsRevision} />}
      </div>
    </div>
  );
};
