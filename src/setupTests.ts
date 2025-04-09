import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Make Vitest's vi object available globally as jest for compatibility
// with libraries like fetch-mock-jest.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
global.jest = vi as any; // Use 'as any' and disable the specific lint rule

// Mock PDF.js worker
vi.mock('pdfjs-dist/build/pdf.worker.mjs', () => ({
  PDFWorker: vi.fn()
}));

// Mock react-router-dom
vi.mock('react-router-dom', () => ({
  ...vi.importActual('react-router-dom'),
  useNavigate: () => vi.fn(),
  useParams: () => ({}),
  useLocation: () => ({
    pathname: '/',
    search: '',
    hash: '',
    state: null
  })
}));

// Add custom matchers or global test utilities here
expect.extend({
  toHaveBeenCalledWithMatch(received, ...expectedArgs) {
    const calls = received.mock.calls;
    const pass = calls.some(call =>
      expectedArgs.every((arg, i) =>
        typeof arg === 'object'
          ? expect.objectContaining(arg).asymmetricMatch(call[i])
          : arg === call[i]
      )
    );

    return {
      pass,
      message: () =>
        `expected ${received.mock.calls} to have been called with arguments matching ${expectedArgs}`,
    };
  },
});

// Clean up after each test
afterEach(() => {
  vi.clearAllMocks();
});
