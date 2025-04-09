import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown'; // Removed incorrect type import
import type { Element } from 'hast'; // Import Element type for node
import remarkGfm from 'remark-gfm';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils'; // Assuming you have a utility for class names

interface EditableMarkdownProps {
  initialValue: string;
  onSave: (value: string) => void;
  className?: string;
  viewClassName?: string;
  editClassName?: string;
  completedDescriptions?: Set<string>; // Add prop for completed items
}

// Define a more specific props type for CustomListItem
interface CustomListItemProps extends React.ComponentPropsWithoutRef<'li'> {
  node?: Element; // Type for the hast node
  children?: React.ReactNode;
  completedDescriptions?: Set<string>;
  // ReactMarkdown might pass other props like 'index', 'ordered', 'checked' etc.
}

// Custom component to render list items with checkmarks if completed
const CustomListItem: React.FC<CustomListItemProps> = ({ node, children, completedDescriptions, ...props }) => {
  // Attempt to extract plain text content from children
  let textContent = '';
  if (children && Array.isArray(children)) {
    children.forEach(child => {
      if (typeof child === 'string') {
        textContent += child;
      } else if (child && typeof child === 'object' && 'props' in child && child.props.children) {
        // Basic handling for nested elements like paragraphs within list items
        if (Array.isArray(child.props.children)) {
          // Use React.ReactNode for the type of 'c'
          textContent += child.props.children.map((c: React.ReactNode) => typeof c === 'string' ? c : '').join('');
        } else if (typeof child.props.children === 'string') {
          textContent += child.props.children;
        }
      }
    });
  }
  textContent = textContent.trim();

  // Check if this item's text content is in the completed set.
  // Use the destructured 'completedDescriptions' prop directly.
  const isCompleted = completedDescriptions?.has(textContent);

  // Render the list item, adding a checkmark if completed
  // Note: 'props' here contains the remaining attributes for the <li> element
  return (
    <li {...props}>
      {isCompleted ? '✅ ' : ''}
      {children}
    </li>
  );
};


export const EditableMarkdown: React.FC<EditableMarkdownProps> = ({
  initialValue,
  onSave,
  className,
  viewClassName,
  editClassName,
  completedDescriptions = new Set(), // Destructure with default
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [currentValue, setCurrentValue] = useState(initialValue);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setCurrentValue(initialValue);
  }, [initialValue]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      // Auto-adjust height
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [isEditing]);

  const handleSave = () => {
    onSave(currentValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setCurrentValue(initialValue); // Revert changes
    setIsEditing(false);
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCurrentValue(e.target.value);
    // Auto-adjust height while typing
    e.target.style.height = 'auto';
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  return (
    <div className={cn("relative group", className)}>
      {isEditing ? (
        <div className={cn("space-y-2", editClassName)}>
          <Textarea
            ref={textareaRef}
            value={currentValue}
            onChange={handleTextareaChange}
            className="w-full min-h-[100px] resize-none overflow-hidden" // Basic styling, adjust as needed
            rows={3} // Initial rows, height adjusts automatically
          />
          <div className="flex justify-end space-x-2">
            <Button variant="ghost" size="sm" onClick={handleCancel}>Cancel</Button>
            <Button size="sm" onClick={handleSave}>Save</Button>
          </div>
        </div>
      ) : (
        <div
          className={cn("prose dark:prose-invert max-w-none cursor-pointer p-2 rounded border border-transparent group-hover:border-muted transition-colors", viewClassName)}
          onClick={() => setIsEditing(true)}
          title="Click to edit"
        >
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              // Customize the 'li' element rendering, passing completedDescriptions explicitly
              li: (props) => <CustomListItem {...props} completedDescriptions={completedDescriptions} />,
            }}
          >
            {currentValue || '*Click to add content*'}
          </ReactMarkdown>
        </div>
      )}
    </div>
  );
};
