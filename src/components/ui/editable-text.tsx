import { useState, useRef, useEffect } from "react";
import { Textarea } from "./textarea";
import { Button } from "./button";
import { Check, X } from "lucide-react";

interface EditableTextProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  multiline?: boolean;
}

export function EditableText({
  value,
  onChange,
  className = "",
  placeholder = "Click to edit",
  multiline = false
}: EditableTextProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleSave = () => {
    onChange(editValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  if (!isEditing) {
    return (
      <div
        className={`cursor-pointer p-2 rounded hover:bg-muted/50 ${className}`}
        onClick={() => {
          setIsEditing(true);
          setEditValue(value);
        }}
      >
        {value || <span className="text-muted-foreground">{placeholder}</span>}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Textarea
        ref={inputRef}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        className="min-h-[60px] resize-none"
        placeholder={placeholder}
        rows={multiline ? 3 : 1}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && !multiline) {
            e.preventDefault();
            handleSave();
          } else if (e.key === "Escape") {
            handleCancel();
          }
        }}
      />
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleSave}
          className="h-7 px-2"
        >
          <Check className="h-4 w-4" />
          <span className="sr-only">Save</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCancel}
          className="h-7 px-2"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Cancel</span>
        </Button>
      </div>
    </div>
  );
}
