import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  readFileVFS,
  writeFileVFS,
  mkdirVFS,
  listFilesVFS,
  getFileSystemStateVFS,
  VFSState,
  VFSNode,
  // deleteNodeVFS, // Removed unused import
  exportToZipVFS // Import export function for potential future tests
} from './vfs'; // Adjust path as needed

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    key: (index: number) => Object.keys(store)[index] || null,
    get length() {
      return Object.keys(store).length;
    }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock URL.createObjectURL and revokeObjectURL for export test setup
global.URL.createObjectURL = vi.fn(() => 'blob:mockurl/mock-guid');
global.URL.revokeObjectURL = vi.fn();

// Mock document.createElement('a') and related methods
const mockLink = {
  href: '',
  download: '',
  click: vi.fn(),
  appendChild: vi.fn(),
  removeChild: vi.fn(),
};
// Cast mockLink to unknown first, then to HTMLAnchorElement
vi.spyOn(document, 'createElement').mockImplementation(() => mockLink as unknown as HTMLAnchorElement);
vi.spyOn(document.body, 'appendChild').mockImplementation(() => null); // Return null
vi.spyOn(document.body, 'removeChild').mockImplementation(() => null); // Return null


const TEST_NOTEBOOK_ID = 'test-notebook-123';

describe('Virtual File System (VFS)', () => {
  beforeEach(() => {
    // Clear mock localStorage before each test
    localStorageMock.clear();
    // Reset mocks for download link
    vi.clearAllMocks();
  });

  it('should initialize with an empty root folder', () => {
    const state = getFileSystemStateVFS(TEST_NOTEBOOK_ID);
    expect(state).toEqual({ '/': { type: 'folder', children: {} } });
  });

  it('should create a file successfully', () => {
    const success = writeFileVFS(TEST_NOTEBOOK_ID, '/myfile.txt', 'Hello VFS!');
    expect(success).toBe(true);
    const content = readFileVFS(TEST_NOTEBOOK_ID, '/myfile.txt');
    expect(content).toBe('Hello VFS!');
  });

  it('should create nested folders and a file', () => {
    const success = writeFileVFS(TEST_NOTEBOOK_ID, '/docs/notes/memo.md', '# Memo');
    expect(success).toBe(true);
    const content = readFileVFS(TEST_NOTEBOOK_ID, '/docs/notes/memo.md');
    expect(content).toBe('# Memo');
    const state = getFileSystemStateVFS(TEST_NOTEBOOK_ID);
    expect(state['/']?.children?.['docs']?.type).toBe('folder');
    expect(state['/']?.children?.['docs']?.children?.['notes']?.type).toBe('folder');
    expect(state['/']?.children?.['docs']?.children?.['notes']?.children?.['memo.md']?.type).toBe('file');
  });

   it('should overwrite an existing file', () => {
    writeFileVFS(TEST_NOTEBOOK_ID, '/config.txt', 'initial');
    const success = writeFileVFS(TEST_NOTEBOOK_ID, '/config.txt', 'updated');
    expect(success).toBe(true);
    const content = readFileVFS(TEST_NOTEBOOK_ID, '/config.txt');
    expect(content).toBe('updated');
  });

  it('should create a folder using mkdirVFS', () => {
    const success = mkdirVFS(TEST_NOTEBOOK_ID, '/new-folder/subfolder');
    expect(success).toBe(true);
    const state = getFileSystemStateVFS(TEST_NOTEBOOK_ID);
    expect(state['/']?.children?.['new-folder']?.type).toBe('folder');
    expect(state['/']?.children?.['new-folder']?.children?.['subfolder']?.type).toBe('folder');
  });

   it('mkdirVFS should return true if folder already exists', () => {
    mkdirVFS(TEST_NOTEBOOK_ID, '/existing');
    const success = mkdirVFS(TEST_NOTEBOOK_ID, '/existing');
    expect(success).toBe(true);
  });

  it('should list files and folders in a directory', () => {
    writeFileVFS(TEST_NOTEBOOK_ID, '/file1.txt', '1');
    mkdirVFS(TEST_NOTEBOOK_ID, '/folder1');
    writeFileVFS(TEST_NOTEBOOK_ID, '/folder1/file2.txt', '2');

    const rootListing = listFilesVFS(TEST_NOTEBOOK_ID, '/');
    expect(rootListing).toEqual(expect.arrayContaining(['file1.txt', 'folder1']));
    expect(rootListing?.length).toBe(2);

    const folderListing = listFilesVFS(TEST_NOTEBOOK_ID, '/folder1');
    expect(folderListing).toEqual(['file2.txt']);

     const emptyFolderListing = listFilesVFS(TEST_NOTEBOOK_ID, '/folder1/empty'); // Non-existent
     expect(emptyFolderListing).toBeNull();

     mkdirVFS(TEST_NOTEBOOK_ID, '/emptyFolder');
     const trulyEmptyListing = listFilesVFS(TEST_NOTEBOOK_ID, '/emptyFolder');
     expect(trulyEmptyListing).toEqual([]);
  });

  it('should return null when reading a non-existent file', () => {
    const content = readFileVFS(TEST_NOTEBOOK_ID, '/not-a-file.txt');
    expect(content).toBeNull();
  });

   it('should return null when reading a folder as a file', () => {
    mkdirVFS(TEST_NOTEBOOK_ID, '/myfolder');
    const content = readFileVFS(TEST_NOTEBOOK_ID, '/myfolder');
    expect(content).toBeNull();
  });

  it('should fail to write a file to the root path', () => {
    const success = writeFileVFS(TEST_NOTEBOOK_ID, '/', 'root content');
    expect(success).toBe(false);
  });

  it('should fail to write a file if path traverses through a file', () => {
    writeFileVFS(TEST_NOTEBOOK_ID, '/afile.txt', 'content');
    const success = writeFileVFS(TEST_NOTEBOOK_ID, '/afile.txt/nested.txt', 'nested');
    expect(success).toBe(false);
  });

   it('should fail to create a folder where a file exists', () => {
    writeFileVFS(TEST_NOTEBOOK_ID, '/myfile', 'content');
    const success = mkdirVFS(TEST_NOTEBOOK_ID, '/myfile');
    expect(success).toBe(false);
  });

   it('should fail to write a file where a folder exists', () => {
    mkdirVFS(TEST_NOTEBOOK_ID, '/myfolder');
    const success = writeFileVFS(TEST_NOTEBOOK_ID, '/myfolder', 'content');
    expect(success).toBe(false);
  });

  // Basic test for export setup (doesn't validate zip content deeply)
  it('exportToZipVFS should attempt to generate and download a zip', async () => {
    writeFileVFS(TEST_NOTEBOOK_ID, '/test.txt', 'zip content');
    mkdirVFS(TEST_NOTEBOOK_ID, '/folder');
    writeFileVFS(TEST_NOTEBOOK_ID, '/folder/nested.md', '# Nested');

    await exportToZipVFS(TEST_NOTEBOOK_ID, 'export.zip');

    // Check if download link creation and click were attempted
    expect(document.createElement).toHaveBeenCalledWith('a');
    expect(mockLink.click).toHaveBeenCalled();
    expect(mockLink.download).toBe('export.zip');
    expect(global.URL.createObjectURL).toHaveBeenCalled();
    expect(global.URL.revokeObjectURL).toHaveBeenCalled();
  });

});
