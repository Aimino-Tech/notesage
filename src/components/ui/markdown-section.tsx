import { useState } from "react";
import { Textarea } from "./textarea";
import { Button } from "./button";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import type { Components } from "react-markdown";

interface MarkdownSectionProps {
  content: string;
  onChange: (content: string) => void;
  className?: string;
}

export function MarkdownSection({ content, onChange, className = "" }: MarkdownSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(content);

  const handleSave = () => {
    onChange(editValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(content);
    setIsEditing(false);
  };

  if (!isEditing) {
    return (
      <div
        className={`relative cursor-pointer p-4 rounded transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group ${className}`}
        tabIndex={0}
        role="button"
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            setIsEditing(true);
            setEditValue(content);
          }
        }}
        onClick={() => {
          setIsEditing(true);
          setEditValue(content);
        }}
      >
        <div className="prose dark:prose-invert max-w-none [&_pre]:bg-muted [&_pre]:p-4 [&_pre]:rounded [&_code]:text-sm [&_table]:border [&_td]:border [&_th]:border [&_th]:p-2 [&_td]:p-2">
          {/* This div shows the "Click to edit" overlay on hover */}
          <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity bg-muted/20 flex items-center justify-center"> {/* Removed backdrop-blur-[1px] */}
            <span className="text-sm font-medium text-muted-foreground bg-background/90 px-2 py-1 rounded">Click to edit</span>
          </div>
          {typeof content === 'string' ? (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeHighlight]}
              components={{
                ul: ({node, ...props}) => <ul className="list-disc pl-6 space-y-1 my-2" {...props} />,
                ol: ({node, ...props}) => <ol className="list-decimal pl-6 space-y-1 my-2" {...props} />,
                h1: ({node, ...props}) => <h1 className="text-2xl font-bold mt-6 mb-4 first:mt-0" {...props} />,
                h2: ({node, ...props}) => <h2 className="text-xl font-semibold mt-5 mb-3 first:mt-0" {...props} />,
                h3: ({node, ...props}) => <h3 className="text-lg font-medium mt-4 mb-2" {...props} />,
                p: ({node, ...props}) => <p className="my-3 first:mt-0 last:mb-0" {...props} />,
                li: ({children, ...props}) => {
                  if (typeof children[0] === 'string') {
                    const text = children[0];
                    const isTask = text.startsWith('[ ] ') || text.startsWith('[x] ');
                    if (isTask) {
                      const checked = text.startsWith('[x] ');
                      return (
                        <li className="flex items-start gap-2" {...props}>
                          <input 
                            type="checkbox" 
                            checked={checked} 
                            readOnly 
                            className="mt-1.5 h-4 w-4 rounded border border-primary checked:bg-primary checked:border-primary dark:border-primary-foreground"
                          />
                          <span>{text.slice(4)}</span>
                        </li>
                      );
                    }
                  }
                  return <li className="mt-1" {...props}>{children}</li>;
                }
              }}
            >
              {content}
            </ReactMarkdown>
          ) : (
            <pre className="bg-muted p-4 rounded font-mono text-sm leading-relaxed">{JSON.stringify(content, null, 2)}</pre>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Textarea
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        className="min-h-[200px] font-mono text-sm leading-relaxed p-4 resize-y"
        autoFocus
        placeholder="Enter markdown text"
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            handleSave();
          }
          if (e.key === 'Escape') {
            e.preventDefault();
            handleCancel();
          }
        }}
      />
      <div className="flex justify-end gap-2">
        <Button variant="default" size="sm" onClick={handleSave}>
          Save Changes
        </Button>
        <Button variant="ghost" size="sm" onClick={handleCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
