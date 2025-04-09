import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { TodoItem } from '@/types/types';
import { Trash2, Bot } from 'lucide-react';
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";

// --- TodoPanel Component ---
export interface TodoPanelProps { // Export the interface
  initialTodos: TodoItem[];
  onSaveTodos: (newTodos: TodoItem[]) => void;
  onStartAgent: (todos: TodoItem[]) => void;
  isAgentRunning: boolean;
  agentStatus: string;
  agentError: string;
}

export const TodoPanel: React.FC<TodoPanelProps> = ({ // Export the component
  initialTodos,
  onSaveTodos,
  onStartAgent,
  isAgentRunning,
  agentStatus,
  agentError,
}) => {
  const [todos, setTodos] = useState<TodoItem[]>(initialTodos);
  const [newTodoText, setNewTodoText] = useState('');

  useEffect(() => {
    setTodos(initialTodos);
  }, [initialTodos]);

  const handleAddTodo = () => {
    if (newTodoText.trim() === '') return;
    const newTodo: TodoItem = {
      id: crypto.randomUUID(),
      text: newTodoText.trim(),
      completed: false,
    };
    const updatedTodos = [...todos, newTodo];
    setTodos(updatedTodos);
    onSaveTodos(updatedTodos); // Call the prop function
    setNewTodoText('');
  };

  const handleToggleComplete = (id: string) => {
    const updatedTodos = todos.map((todo): TodoItem => {
      if (todo.id === id) {
        const isNowCompleted = !todo.completed;
        return {
          ...todo,
          completed: isNowCompleted,
          completedBy: isNowCompleted ? 'user' : undefined
        };
      }
      return todo;
    });
    setTodos(updatedTodos);
    onSaveTodos(updatedTodos); // Call the prop function
  };

  const handleDeleteTodo = (id: string) => {
    const updatedTodos = todos.filter(todo => todo.id !== id);
    setTodos(updatedTodos);
    onSaveTodos(updatedTodos); // Call the prop function
  };

  return (
    <Card className="flex-1 flex flex-col">
      <CardHeader>
        <CardTitle>Agent Task List</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col space-y-4">
        <div className="flex w-full items-center space-x-2">
          <Input
            type="text"
            placeholder="Add a new task..."
            value={newTodoText}
            onChange={(e) => setNewTodoText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddTodo()}
          />
          <Button onClick={handleAddTodo}>Add</Button>
        </div>
        <ScrollArea className="flex-1 border rounded-md p-2">
          {todos.length > 0 ? (
            <div className="space-y-2">
              {todos.map((todo) => (
                <div key={todo.id} className="flex items-center space-x-2 group">
                  <Checkbox
                    id={`todo-${todo.id}`}
                    checked={todo.completed}
                    onCheckedChange={() => handleToggleComplete(todo.id)}
                  />
                  <Label
                    htmlFor={`todo-${todo.id}`}
                    className={`flex-grow text-sm ${todo.completed ? 'line-through text-muted-foreground' : ''}`}
                  >
                    {todo.completed && todo.completedBy === 'ai' && (
                      <Bot className="inline-block h-4 w-4 mr-1 text-blue-500" aria-label="Completed by AI" />
                    )}
                    {todo.text}
                  </Label>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                    onClick={() => handleDeleteTodo(todo.id)}
                    aria-label={`Delete todo: ${todo.text}`}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No tasks yet.</p>
          )}
        </ScrollArea>
        <div className="flex flex-col items-end space-y-2">
           <Button onClick={() => onStartAgent(todos)} disabled={isAgentRunning}>
             {isAgentRunning ? 'Agent Running...' : 'Complete Tasks'}
           </Button>
           {agentStatus && (
             <p className={`text-sm ${agentError ? 'text-red-500' : 'text-muted-foreground'}`}>
               Status: {agentStatus} {agentError && ` - Error: ${agentError}`}
             </p>
           )}
         </div>
      </CardContent>
    </Card>
  );
};
