import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { crawlWebsiteContent, WebCrawlError } from '../web-crawler';
import { fetchViaProxy } from '../proxy-service';

// Mock the proxy service
vi.mock('../proxy-service', () => ({
  fetchViaProxy: vi.fn()
}));

// Mock the global fetch function
const mockResponse = vi.fn();
const mockFetch = vi.fn().mockImplementation(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    statusText: 'OK',
    text: () => Promise.resolve(mockResponse()),
    headers: {
      get: (name: string) => name === 'content-type' ? 'text/html' : null
    },
    // Implement finally correctly for Promise chain
    finally: function(callback) {
      return Promise.resolve(this).then(
        (value) => {
          try {
            return callback ? callback() : undefined;
          } finally {
            return value;
          }
        },
        (reason) => {
          try {
            return callback ? callback() : undefined;
          } finally {
            throw reason;
          }
        }
      );
    }
  })
);
vi.stubGlobal('fetch', mockFetch);

// Mock DOMParser
const mockParseFromString = vi.fn();
const mockDOMParser = vi.fn(() => ({
  parseFromString: mockParseFromString
}));
vi.stubGlobal('DOMParser', mockDOMParser);

describe('Web Crawler', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Reset fetch mock to default implementation for each test
    mockFetch.mockImplementation(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        statusText: 'OK',
        text: () => Promise.resolve(mockResponse()),
        headers: {
          get: (name: string) => name === 'content-type' ? 'text/html' : null
        },
        // Implement finally correctly for Promise chain
        finally: function(callback) {
          return Promise.resolve(this).then(
            (value) => {
              try {
                return callback ? callback() : undefined;
              } finally {
                return value;
              }
            },
            (reason) => {
              try {
                return callback ? callback() : undefined;
              } finally {
                throw reason;
              }
            }
          );
        }
      })
    );
    
    // Default mock responses
    mockResponse.mockReturnValue('<html><body><p>Test content</p></body></html>');
    mockParseFromString.mockReturnValue({
      querySelector: (selector: string) => {
        if (selector === 'main') return { textContent: 'Main content', parentNode: null };
        return null;
      },
      body: {
        textContent: 'Body content'
      },
      // Wrap the implementation in vi.fn() to make it a spy
      getElementsByTagName: vi.fn(() => []) 
    });
  });

  // afterEach(() => {
  //   // Rely on beforeEach clear/reset
  // });

  it('should fetch content from a URL with http protocol', async () => {
    const testHtml = '<html><body><main><p>Test content</p></main></body></html>';
    mockResponse.mockReturnValue(testHtml);
    
    const result = await crawlWebsiteContent('https://example.com', { useProxy: false });

    expect(mockFetch).toHaveBeenCalledWith('https://example.com', expect.any(Object));
    // Expect 'Body content' due to fallback logic for short main content
    expect(result).toBe('Body content');
  });

  it('should add https protocol if missing', async () => {
    mockResponse.mockReturnValue('<html><body><p>Test content</p></body></html>');
    
    mockParseFromString.mockReturnValue({
      querySelector: () => null,
      body: {
        textContent: 'Body content'
      },
      getElementsByTagName: () => []
    });

    await crawlWebsiteContent('example.com', { useProxy: false });

    expect(mockFetch).toHaveBeenCalledWith('https://example.com', expect.any(Object));
  });

  it('should fall back to body content if main content areas not found', async () => {
    mockParseFromString.mockReturnValue({
      querySelector: () => null,
      body: {
        textContent: 'Body content'
      },
      getElementsByTagName: () => []
    });

    const result = await crawlWebsiteContent('https://example.com', { useProxy: false });

    expect(result).toBe('Body content');
  });

  it('should handle fetch errors', async () => {
    mockFetch.mockImplementationOnce(() => 
      Promise.resolve({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      })
    );

    await expect(crawlWebsiteContent('https://example.com', { useProxy: false })).rejects.toThrow(
      /Failed to fetch website/
    );
  });

  it('should use proxy service when direct fetch fails', async () => {
    // Mock direct fetch to fail
    mockFetch.mockImplementationOnce(() => Promise.reject(new Error('Network error')));
    
    // Mock proxy service to succeed
    const proxyMockResponse = '<html><body><article>Proxy content</article></body></html>';
    vi.mocked(fetchViaProxy).mockResolvedValue({
      text: proxyMockResponse,
      usedProxy: true,
      proxyUrl: 'https://corsproxy.io/?'
    });

    mockParseFromString.mockReturnValue({
      querySelector: (selector) => {
        if (selector === 'article') return { textContent: 'Proxy content', parentNode: null };
        return null;
      },
      body: { textContent: 'Body content' },
      getElementsByTagName: () => []
    });

    const result = await crawlWebsiteContent('https://example.com');

    expect(fetchViaProxy).toHaveBeenCalledWith('https://example.com', expect.any(Number));
    // Expect 'Body content' due to fallback logic for short proxy content
    expect(result).toContain('Body content');
    expect(result).toContain('[Content retrieved via CORS proxy');
  });

  it('should throw a WebCrawlError with appropriate error type for different failures', async () => {
    // Test CORS error
    mockFetch.mockImplementationOnce(() => Promise.reject(new Error('Failed to fetch: CORS policy')));
    await expect(crawlWebsiteContent('https://example.com', { useProxy: false }))
      .rejects.toThrow(WebCrawlError);
    
    // Reset for next test
    mockFetch.mockReset();

    // Test timeout error
    const abortError = new Error('The operation was aborted');
    abortError.name = 'AbortError';
    mockFetch.mockImplementationOnce(() => Promise.reject(abortError));
    await expect(crawlWebsiteContent('https://example.com', { useProxy: false }))
      .rejects.toThrow(/timeout/i);
    
    // Reset for next test
    mockFetch.mockReset();

    // Test invalid content type
    mockFetch.mockImplementationOnce(() => 
      Promise.resolve({
        ok: true,
        headers: {
          get: () => 'application/json'
        }
      })
    );
    await expect(crawlWebsiteContent('https://example.com', { useProxy: false }))
      .rejects.toThrow(/Unsupported content type/);
  });

  it('should parse and clean HTML content correctly', async () => {
    const messyHtml = `
      <html>
        <head>
          <script>var test = 'should be removed';</script>
          <style>body { font-size: 16px; }</style>
        </head>
        <body>
          <header>Site header</header>
          <nav>Navigation</nav>
          <main>
            <h1>Main   Content</h1>
            <p>This is   the    main content with extra   spaces</p>
            <p>It should be   cleaned   up</p>
          </main>
          <footer>Footer content</footer>
        </body>
      </html>
    `;

    mockResponse.mockReturnValue(messyHtml);
    mockParseFromString.mockReturnValue({
      querySelector: (selector) => {
        if (selector === 'main') return { 
          textContent: 'Main   Content This is   the    main content with extra   spaces It should be   cleaned   up',
          parentNode: null
        };
        return null;
      },
      body: { textContent: 'Full body content' },
      // Wrap the implementation in vi.fn() to make it a spy
      getElementsByTagName: vi.fn((tag) => {
        // Return mock elements that should be removed
        return tag === 'script' || tag === 'style' ? [{ parentNode: { removeChild: vi.fn() } }] : [];
      })
    });

    const result = await crawlWebsiteContent('https://example.com', { useProxy: false });
    
    // Check if the content is properly cleaned (spaces normalized)
    expect(result).toBe('Main Content This is the main content with extra spaces It should be cleaned up');
    
    // Ensure script elements were targeted for removal
    expect(mockParseFromString.mock.results[0].value.getElementsByTagName).toHaveBeenCalledWith('script');
    expect(mockParseFromString.mock.results[0].value.getElementsByTagName).toHaveBeenCalledWith('style');
  });
});
