// Virtual File System using localStorage
import { splitFileContent, createSplitFileIndex, FileSplit, detectLargeFile } from './utils';

// Define the structure for the VFS stored in localStorage
export interface VFSNode { 
  type: 'file' | 'folder';
  content?: string; // For files
  children?: Record<string, VFSNode>; // For folders { filename: VFSNode }
}

export type VFSState = Record<string, VFSNode>; // Added export, Root is always a folder '/'

const VFS_STORAGE_PREFIX = 'notebookVFS_';
const MAX_FILE_LINES = 500; // Maximum number of lines allowed per file

// Flag to control verbose logging - can be disabled during tests
export let VFS_VERBOSE_LOGGING = process.env.NODE_ENV !== 'test';

// Helper function to get the VFS state for a specific notebook
function getVFSState(notebookId: string): VFSState {
  const storedState = localStorage.getItem(`${VFS_STORAGE_PREFIX}${notebookId}`);
  if (storedState) {
    try {
      return JSON.parse(storedState);
    } catch (e) {
      if (VFS_VERBOSE_LOGGING) {
        console.error("Failed to parse VFS state from localStorage:", e);
      }
      // Fallback to default empty state if parsing fails
    }
  }
  // Default state: an empty root folder
  return { '/': { type: 'folder', children: {} } };
}

// Helper function to save the VFS state for a specific notebook
function saveVFSState(notebookId: string, state: VFSState): void {
  try {
    localStorage.setItem(`${VFS_STORAGE_PREFIX}${notebookId}`, JSON.stringify(state));
  } catch (e) {
    if (VFS_VERBOSE_LOGGING) {
      console.error("Failed to save VFS state to localStorage:", e);
    }
    // Handle potential storage quota errors
  }
}

// Helper to navigate to a node, creating folders if necessary (for write operations)
function findNode(
  state: VFSState,
  pathSegments: string[],
  createFolders: boolean = false
): VFSNode | null {
  let currentNode: VFSNode = state['/'];
  if (!currentNode || currentNode.type !== 'folder') return null; // Should not happen

  for (let i = 0; i < pathSegments.length; i++) {
    const segment = pathSegments[i];
    if (!segment) continue; // Skip empty segments (e.g., from leading/trailing slashes)

    if (!currentNode.children) {
      if (createFolders) {
        currentNode.children = {};
      } else {
        return null; // Path segment requires children, but none exist
      }
    }

     let nextNode = currentNode.children[segment];

     if (!nextNode) {
       // If createFolders is true, create the missing folder regardless of its position
       if (createFolders) {
         nextNode = { type: 'folder', children: {} };
         currentNode.children[segment] = nextNode;
       } else {
        return null; // Node not found
      }
    }

    // Check if we are trying to traverse into a file as if it were a folder
    if (nextNode.type === 'file' && i < pathSegments.length - 1) {
       if (VFS_VERBOSE_LOGGING) {
         console.error(`Path error: Cannot traverse into file '${segment}'`);
       }
       return null;
    }

    currentNode = nextNode;
  }
  return currentNode;
}

// Helper to get parent node and final segment name
function getParentNodeAndName(
  state: VFSState,
  pathSegments: string[],
  createFolders: boolean = false
): { parentNode: VFSNode | null; name: string | null } {
    if (pathSegments.length === 0) return { parentNode: null, name: null };
    const name = pathSegments[pathSegments.length - 1];
    const parentPathSegments = pathSegments.slice(0, -1);
    const parentNode = findNode(state, parentPathSegments, createFolders);
    return { parentNode, name };
}

/**
 * Checks if a file needs to be split and splits it into multiple files if necessary.
 * @param content The file content to check.
 * @param filePath The original file path.
 * @returns An array of objects containing paths and content segments.
 */
function splitLargeFile(content: string, filePath: string): Array<{ path: string, content: string }> {
  const lines = content.split('\n');
  
  // If the file is small enough, return it as-is
  if (lines.length <= MAX_FILE_LINES) {
    return [{ path: filePath, content }];
  }
  
  // Split the file into chunks
  const result: Array<{ path: string, content: string }> = [];
  
  // Get the base name and extension for creating split files
  const pathParts = filePath.split('/');
  const fileName = pathParts.pop() || '';
  const fileNameWithoutExt = fileName.includes('.') 
    ? fileName.substring(0, fileName.lastIndexOf('.')) 
    : fileName;
  const extension = fileName.includes('.') 
    ? fileName.substring(fileName.lastIndexOf('.')) 
    : '';
  const basePath = pathParts.join('/') + (pathParts.length > 0 ? '/' : '');
  
  // Calculate total number of chunks
  const chunks = Math.ceil(lines.length / MAX_FILE_LINES);
  
  for (let i = 0; i < chunks; i++) {
    const startLine = i * MAX_FILE_LINES;
    const endLine = Math.min((i + 1) * MAX_FILE_LINES, lines.length);
    const chunkContent = lines.slice(startLine, endLine).join('\n');
    
    // Create a path for the chunk file (e.g., /path/to/file_part1.md)
    const chunkPath = `${basePath}${fileNameWithoutExt}_part${i + 1}${extension}`;
    
    result.push({ path: chunkPath, content: chunkContent });
  }
  
  return result;
}

// --- Public VFS API ---

/**
 * Reads the content of a file from the VFS.
 * @param notebookId The ID of the current notebook.
 * @param filePath The path to the file (e.g., "/docs/introduction.md").
 * @returns The file content as a string, or null if not found or not a file.
 */
export function readFileVFS(notebookId: string, filePath: string): string | null {
  const state = getVFSState(notebookId);
  const segments = filePath.split('/').filter(Boolean); // Normalize path
  const node = findNode(state, segments);

  if (node && node.type === 'file') {
    return node.content ?? '';
  }
  if (VFS_VERBOSE_LOGGING) {
    console.warn(`readFileVFS: File not found or not a file: ${filePath}`);
  }
  return null;
}

/**
 * Writes content to a file in the VFS, creating parent folders if necessary.
 * Overwrites the file if it already exists.
 * Automatically splits files that exceed MAX_FILE_LINES into multiple files.
 * @param notebookId The ID of the current notebook.
 * @param filePath The path to the file (e.g., "/docs/introduction.md").
 * @param content The content to write.
 * @returns Object with success status and message if file was split.
 */
export function writeFileVFS(notebookId: string, filePath: string, content: string): { success: boolean; message?: string } {
  // First check if the file is large and needs splitting
  const { isLarge, message, lineCount } = detectLargeFile(content, MAX_FILE_LINES);
  
  // Use our enhanced file splitting utility
  const fileParts = splitFileContent(content, filePath, MAX_FILE_LINES);
  
  // If file doesn't need splitting, or there's only one part, write directly
  if (fileParts.length === 1 && fileParts[0].path === filePath) {
    const success = writeFileToDisk(notebookId, filePath, content);
    return { success };
  }
  
  // Log large file detection
  if (VFS_VERBOSE_LOGGING) {
    console.log(message);
  }
  
  // File needs to be split - write each part
  let success = true;
  for (const part of fileParts) {
    const partSuccess = writeFileToDisk(notebookId, part.path, part.content);
    if (!partSuccess && VFS_VERBOSE_LOGGING) {
      console.error(`Failed to write part file: ${part.path}`);
      success = false;
    }
  }
  
  // Create an index file that references all parts using our helper function
  if (success && fileParts.length > 1) {
    const indexContent = createSplitFileIndex(filePath, fileParts);
    success = writeFileToDisk(notebookId, filePath, indexContent);
  }
  
  return { success, message: isLarge ? message : undefined };
}

/**
 * Internal helper function that performs the actual file write operation.
 * @param notebookId The ID of the current notebook.
 * @param filePath The path to the file.
 * @param content The content to write.
 * @returns True if successful, false otherwise.
 */
function writeFileToDisk(notebookId: string, filePath: string, content: string): boolean {
  const state = getVFSState(notebookId);
  const segments = filePath.split('/').filter(Boolean);
  if (segments.length === 0) {
      if (VFS_VERBOSE_LOGGING) {
        console.error("writeFileVFS: Invalid file path '/'");
      }
      return false; // Cannot write to root
  }

  const { parentNode, name } = getParentNodeAndName(state, segments, true); // Create folders

  if (!parentNode || parentNode.type !== 'folder' || !name) {
    if (VFS_VERBOSE_LOGGING) {
      console.error(`writeFileVFS: Could not find or create parent folder for: ${filePath}`);
    }
    return false;
  }

  if (!parentNode.children) {
      parentNode.children = {}; // Ensure children object exists
  }

  // Check if trying to overwrite a folder
  if (parentNode.children[name]?.type === 'folder') {
      if (VFS_VERBOSE_LOGGING) {
        console.error(`writeFileVFS: Cannot overwrite folder with a file: ${filePath}`);
      }
      return false;
  }

  parentNode.children[name] = { type: 'file', content: content };
  saveVFSState(notebookId, state);
  return true;
}

/**
 * Creates a folder in the VFS, including any necessary parent folders.
 * @param notebookId The ID of the current notebook.
 * @param folderPath The path to the folder (e.g., "/docs/images").
 * @returns True if successful or folder already exists, false otherwise.
 */
export function mkdirVFS(notebookId: string, folderPath: string): boolean {
  const state = getVFSState(notebookId);
  const segments = folderPath.split('/').filter(Boolean);
  if (segments.length === 0) return true; // Root always exists

  const node = findNode(state, segments, true); // Create folders

  if (node && node.type === 'folder') {
    saveVFSState(notebookId, state); // Save state in case folders were created
    return true;
  } else if (node && node.type === 'file') {
      if (VFS_VERBOSE_LOGGING) {
        console.error(`mkdirVFS: Cannot create folder, a file exists at path: ${folderPath}`);
      }
      return false;
  } else {
      // This case should ideally be handled by findNode creating folders,
      // but add a fallback check.
      const { parentNode, name } = getParentNodeAndName(state, segments, true);
       if (!parentNode || parentNode.type !== 'folder' || !name) {
           if (VFS_VERBOSE_LOGGING) {
             console.error(`mkdirVFS: Could not find or create parent folder for: ${folderPath}`);
           }
           return false;
       }
        if (!parentNode.children) parentNode.children = {};
        parentNode.children[name] = { type: 'folder', children: {} };
        saveVFSState(notebookId, state);
        return true;
  }
}

/**
 * Lists the contents (files and folders) of a directory.
 * @param notebookId The ID of the current notebook.
 * @param folderPath The path to the folder (e.g., "/docs").
 * @returns An array of names, or null if the path is not a folder.
 */
export function listFilesVFS(notebookId: string, folderPath: string): string[] | null {
  const state = getVFSState(notebookId);
  const segments = folderPath.split('/').filter(Boolean);
  const node = findNode(state, segments);

  if (node && node.type === 'folder' && node.children) {
    return Object.keys(node.children);
  }
   if (node && node.type === 'folder' && !node.children) {
       return []; // Empty folder
   }
  if (VFS_VERBOSE_LOGGING) {
    console.warn(`listFilesVFS: Folder not found or not a folder: ${folderPath}`);
  }
  return null;
}

/**
 * Deletes a file from the VFS.
 * @param notebookId The ID of the current notebook.
 * @param filePath The path to the file to delete.
 * @returns True if successful, false otherwise (e.g., not found, is a folder).
 */
export function deleteFileVFS(notebookId: string, filePath: string): boolean {
  const state = getVFSState(notebookId);
  const segments = filePath.split('/').filter(Boolean);
  if (segments.length === 0) {
    if (VFS_VERBOSE_LOGGING) {
      console.error("deleteFileVFS: Cannot delete root '/'");
    }
    return false;
  }

  const { parentNode, name } = getParentNodeAndName(state, segments, false); // Don't create folders

  if (!parentNode || parentNode.type !== 'folder' || !name || !parentNode.children || !parentNode.children[name]) {
    if (VFS_VERBOSE_LOGGING) {
      console.warn(`deleteFileVFS: File not found: ${filePath}`);
    }
    return false; // File or parent not found
  }

  if (parentNode.children[name].type === 'folder') {
    if (VFS_VERBOSE_LOGGING) {
      console.error(`deleteFileVFS: Cannot delete a folder using this function: ${filePath}`);
    }
    return false; // Tried to delete a folder
  }

  delete parentNode.children[name];
  saveVFSState(notebookId, state);
  return true;
}

/**
 * Deletes all files and folders within the VFS for a notebook, resetting it.
 * @param notebookId The ID of the current notebook.
 */
export function deleteAllFilesVFS(notebookId: string): void {
  // Reset to the default empty root state
  const defaultState: VFSState = { '/': { type: 'folder', children: {} } };
  saveVFSState(notebookId, defaultState);
  if (VFS_VERBOSE_LOGGING) {
    console.log(`deleteAllFilesVFS: Cleared VFS for notebook ${notebookId}`);
  }
}


/**
 * Retrieves the entire VFS state for a notebook.
 * Useful for passing to UI components like the FileExplorer.
 * @param notebookId The ID of the current notebook.
 * @returns The VFS state object.
 */
export function getFileSystemStateVFS(notebookId: string): VFSState {
    return getVFSState(notebookId);
}

// --- Export Functionality ---
import JSZip from 'jszip';

/**
 * Enable or disable verbose logging for VFS operations.
 * Useful for silencing log output during tests.
 * @param enabled Whether to enable or disable logging
 */
export function setVFSLogging(enabled: boolean): void {
  VFS_VERBOSE_LOGGING = enabled;
}

/**
 * Recursively adds VFS nodes to a JSZip instance.
 * @param zip The JSZip instance.
 * @param node The current VFSNode.
 * @param currentPath The path prefix for the current node.
 */
function addNodeToZip(zip: JSZip, node: VFSNode, currentPath: string) {
  if (node.type === 'file') {
    // Add file content, ensure path doesn't start with '/' for zip structure
    zip.file(currentPath.substring(1), node.content || '');
  } else if (node.type === 'folder' && node.children) {
    // Create a folder entry (optional, but good practice)
    // zip.folder(currentPath.substring(1)); // JSZip creates folders implicitly
    // Recursively add children
    for (const name in node.children) {
      addNodeToZip(zip, node.children[name], `${currentPath}${name}${node.children[name].type === 'folder' ? '/' : ''}`);
    }
  }
}

/**
 * Exports the VFS state for a notebook as a Zip file Blob.
 * @param notebookId The ID of the current notebook.
 * @param zipFileName The desired name for the output zip file (e.g., "notebook-export.zip").
 * @returns A Promise resolving to the Zip file Blob.
 */
export async function exportToZipVFS(notebookId: string, zipFileName: string = 'workspace-export.zip'): Promise<void> {
  const state = getVFSState(notebookId);
  const zip = new JSZip();

  // Start recursion from the root's children
  if (state['/'] && state['/'].children) {
    addNodeToZip(zip, state['/'], '/');
  }

  try {
    const blob = await zip.generateAsync({ type: 'blob' });

    // Trigger download in the browser
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = zipFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href); // Clean up blob URL

  } catch (error) {
    console.error("Failed to generate or download zip file:", error);
    // TODO: Propagate error to UI?
    throw error; // Re-throw for calling function to handle
  }
}
