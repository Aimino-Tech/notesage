import { Notebook } from "@/types/types";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";
import { enUS } from "date-fns/locale";
import { FileText, MoreVertical, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface NotebookCardProps {
  notebook: Notebook;
  className?: string;
  isPlaceholder?: boolean;
  isFirstPlaceholder?: boolean;
  onOpenCreateDialog?: () => void; // Add the new prop
  onRename?: (id: string, newTitle: string) => void;
  onDuplicate?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function NotebookCard({ 
  notebook, 
  className, 
  isPlaceholder, 
  isFirstPlaceholder,
  onOpenCreateDialog, // Destructure the new prop
  onRename,
  onDuplicate,
  onDelete 
}: NotebookCardProps) {
  if (isPlaceholder) {
    return (
      <Card
        className={cn(
          "h-full transition-all duration-300 shadow-none text-gray-500",
          isFirstPlaceholder
            ? "hover:shadow-md hover:translate-y-[-2px] cursor-pointer bg-gray-100 dark:bg-gray-800"
            : "bg-gray-100 dark:bg-gray-800",
          className
        )}
        // Add onClick handler for the placeholder
        onClick={() => {
          if (onOpenCreateDialog) {
            onOpenCreateDialog();
          }
        }}
      >
        <CardHeader className="pb-2 flex justify-center">
          <div className="flex justify-center items-center h-full">
            <div className="flex items-center justify-center">
              {isPlaceholder ? (
                <Plus className="h-10 w-10 text-gray-500 dark:text-gray-500" />
              ) : (
                <FileText className="h-5 w-5 text-gray-500 dark:text-gray-500" />
              )}
            </div>
          </div>
          <CardTitle
            className={cn(
              "mt-2 text-center h-0 overflow-hidden",
              isFirstPlaceholder ? "text-secondary-foreground" : "text-gray-500"
            )}
          >
            {isFirstPlaceholder ? "" : notebook.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="min-h-[5rem] flex items-center justify-center">
        </CardContent>
        <CardFooter className="text-xs flex justify-between hidden">
        </CardFooter>
      </Card>
    );
  }

  return (
      <Card
        className={cn(
          "h-full transition-all duration-300 hover:shadow-md hover:translate-y-[-2px]",
          isFirstPlaceholder ? "bg-secondary-foreground text-secondary" : "",
          isPlaceholder ? "" : "hover:shadow-md hover:translate-y-[-2px]",
          className
        )}
      >
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <Link to={isFirstPlaceholder && isPlaceholder ? "/create-notebook" : `/notebook/${notebook.id}`} className="flex-1">
              <div className="p-2 rounded-full bg-notebook-100 dark:bg-notebook-900 inline-block">
                <FileText className="h-5 w-5 text-notebook-600 dark:text-notebook-400" />
              </div>
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8"
                  onClick={(e) => e.preventDefault()} // Prevent navigation
                >
                  <MoreVertical className="h-4 w-4" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem 
                  onSelect={(event) => {
                    event.preventDefault();
                    if (onRename) onRename(notebook.id, notebook.title);
                  }}
                >
                  Rename
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onSelect={(event) => {
                    event.preventDefault();
                    if (onDuplicate) onDuplicate(notebook.id);
                  }}
                >
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="text-destructive"
                  onSelect={(event) => {
                    event.preventDefault();
                    if (onDelete) onDelete(notebook.id);
                  }}
                >
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <Link to={isFirstPlaceholder && isPlaceholder ? "/create-notebook" : `/notebook/${notebook.id}`} className="block">
            <CardTitle className="mt-2 line-clamp-2 h-12">{notebook.title}</CardTitle>
          </Link>
        </CardHeader>
        <Link to={isFirstPlaceholder && isPlaceholder ? "/create-notebook" : `/notebook/${notebook.id}`} className="block">
          <CardContent>
            <p className="text-sm text-muted-foreground line-clamp-2 min-h-[2.5rem]">
              {notebook.description || "No description provided"}
            </p>
          </CardContent>
          <CardFooter className="text-xs text-muted-foreground flex justify-between">
            <span>
              {formatDistanceToNow(notebook.dateModified, { addSuffix: true, locale: enUS })}
            </span>
            <span>{notebook.sources.length} Sources</span>
          </CardFooter>
        </Link>
      </Card>
  );
}
