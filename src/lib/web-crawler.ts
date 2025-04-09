/**
 * Utility functions for fetching and extracting text content from websites
 */
import { fetchViaProxy } from './proxy-service';

/**
 * Detailed error class for website crawling issues
 */
export class WebCrawlError extends Error {
  public statusCode?: number;
  public url: string;
  public errorType: 'NETWORK' | 'HTTP_ERROR' | 'CONTENT_EXTRACTION' | 'CORS' | 'TIMEOUT' | 'UNKNOWN' | 'PROXY_ERROR';
  
  constructor(message: string, url: string, errorType: WebCrawlError['errorType'], statusCode?: number) {
    super(message);
    this.name = 'WebCrawlError';
    this.url = url;
    this.errorType = errorType;
    this.statusCode = statusCode;
  }
}

/**
 * Fetches and extracts the main textual content from a given URL
 * @param url The URL to crawl
 * @param options Optional configurations for the crawl operation
 * @returns A promise that resolves to the extracted text content
 */
export async function crawlWebsiteContent(
  url: string, 
  options: { timeout?: number, useProxy?: boolean } = {}
): Promise<string> {
  // Normalize URL
  let validatedUrl: string;
  try {
    // Make sure URL is valid and has http/https protocol
    validatedUrl = url.startsWith('http') ? url : `https://${url}`;
    // Validate URL format
    new URL(validatedUrl);
  } catch (error) {
    throw new WebCrawlError(
      `Invalid URL format: ${url}`, 
      url, 
      'UNKNOWN'
    );
  }
  
  try {
    const timeoutMs = options.timeout || 30000; // Default 30-second timeout
    const useProxy = options.useProxy !== undefined ? options.useProxy : true; // Default to using proxy

    // Use our proxy service instead of direct fetch
    let htmlContent: string;
    // Adjust type/initial value to match usage later
    let proxyInfo: { usedProxy: boolean; proxyUrl?: string } = { usedProxy: false, proxyUrl: undefined };

    if (useProxy) {
      try {
        const proxyResponse = await fetchViaProxy(validatedUrl, timeoutMs);
        htmlContent = proxyResponse.text;
        proxyInfo = proxyResponse;
        
        console.log(`Successfully fetched ${validatedUrl}${proxyResponse.usedProxy ? ' via proxy: ' + proxyResponse.proxyUrl : ' directly'}`);
      } catch (proxyError) {
        console.error('Proxy fetch failed:', proxyError);
        throw new WebCrawlError(
          `Failed to fetch website via proxy: ${proxyError.message}`,
          validatedUrl,
          'PROXY_ERROR'
        );
      }
    } else {
      // Fall back to original direct fetch if proxies are disabled
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      let response: Response | undefined; // Declare response outside try

      try {
          response = await fetch(validatedUrl, { // Assign inside try
            signal: controller.signal,
            headers: {
              'User-Agent': 'Mozilla/5.0 ChatDocumentCrawler/1.0'
            }
          });
      } finally {
          clearTimeout(timeoutId); // Clear timeout regardless of fetch outcome
      }

      if (!response) { // Check if response is defined (it should be unless fetch itself threw an error caught below)
        throw new Error("Fetch returned undefined response unexpectedly.");
      }

      if (!response.ok) {
        throw new WebCrawlError(
          `Failed to fetch website: ${response.status} ${response.statusText}`,
          validatedUrl,
          'HTTP_ERROR',
          response.status
        );
      }
      
      // Ensure we're dealing with HTML content
      const contentType = response.headers.get('content-type');
      if (contentType && !contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) {
        throw new WebCrawlError(
          `Unsupported content type: ${contentType}. Only HTML content is supported.`,
          validatedUrl,
          'CONTENT_EXTRACTION'
        );
      }
      
      htmlContent = await response.text();
    }
    
    if (!htmlContent || htmlContent.trim().length === 0) {
      throw new WebCrawlError(
        'Received empty response from server',
        validatedUrl, 
        'CONTENT_EXTRACTION'
      );
    }
    
    // Extract text content from HTML
    const extractedContent = extractTextFromHtml(htmlContent);
    
    // Add a small note at the end if we used a proxy
    if (proxyInfo.usedProxy) {
      return extractedContent + `\n\n[Content retrieved via CORS proxy due to website security restrictions]`;
    }
    
    return extractedContent;
    
  } catch (error) {
    console.error(`Error crawling website ${validatedUrl}:`, error);
    
    // Handle AbortController timeout
    if (error.name === 'AbortError') {
      throw new WebCrawlError(
        `Request timeout after ${options.timeout || 30000}ms`,
        validatedUrl,
        'TIMEOUT'
      );
    }
    
    // Handle CORS errors specifically
    if (error.message?.includes('CORS') || error.message?.includes('cross-origin')) {
      throw new WebCrawlError(
        `Cross-origin (CORS) request blocked: The Same Origin Policy disallows reading from ${validatedUrl}. Try enabling the proxy option.`,
        validatedUrl,
        'CORS'
      );
    }
    
    // Handle network errors (like DNS resolution failures)
    if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
      throw new WebCrawlError(
        `Network error: Unable to connect to ${validatedUrl}. The website may be down, unreachable, or blocking requests. Try using a different URL or check your internet connection.`,
        validatedUrl,
        'NETWORK'
      );
    }
    
    // Pass through WebCrawlError instances
    if (error instanceof WebCrawlError) {
      throw error;
    }
    
    // Default error handling
    throw new WebCrawlError(
      `Error crawling website: ${error instanceof Error ? error.message : String(error)}`,
      validatedUrl,
      'UNKNOWN'
    );
  }
}

/**
 * Extracts readable text content from HTML while removing scripts, styles, and other non-content elements
 * @param html HTML string to process
 * @returns Extracted text content
 */
function extractTextFromHtml(html: string): string {
  // Create a DOM parser to work with the HTML
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  // Check for parsing errors
  const parserError = doc.querySelector('parsererror');
  if (parserError) {
    throw new WebCrawlError(
      'HTML parsing failed: Invalid or malformed HTML',
      '',
      'CONTENT_EXTRACTION'
    );
  }
  
  // Remove scripts, styles, and other non-content elements
  const elementsToRemove = [
    'script', 'style', 'noscript', 'iframe', 'svg', 
    'header', 'footer', 'nav', 'aside'
  ];
  
  elementsToRemove.forEach(tag => {
    const elements = doc.getElementsByTagName(tag);
    for (let i = elements.length - 1; i >= 0; i--) {
      const element = elements[i];
      if (element.parentNode) {
        element.parentNode.removeChild(element);
      }
    }
  });
  
  // Extract the main content (prefer main content areas)
  const mainContent = doc.querySelector('main') || 
                     doc.querySelector('article') || 
                     doc.querySelector('#content') || 
                     doc.querySelector('.content') ||
                     doc.body;
  
  // Get the text content
  let content = '';
  if (mainContent) {
    content = mainContent.textContent || '';
    // Clean up the text content
    content = content
      .replace(/\s+/g, ' ')  // Replace multiple whitespace with single space
      .replace(/\n+/g, '\n') // Replace multiple newlines with single newline
      .trim();
  }
  
  // If content is empty or very short, fallback to body content
  if (content.length < 50 && mainContent !== doc.body) { // Lowered threshold from 100 to 50
    content = doc.body.textContent || '';
    content = content
      .replace(/\s+/g, ' ')
      .replace(/\n+/g, '\n')
      .trim();
  }
  
  // Ensure we return some minimum content
  if (!content || content.length < 10) {
    throw new WebCrawlError(
      'No meaningful content could be extracted from the webpage',
      '',
      'CONTENT_EXTRACTION'
    );
  }
  
  return content;
}
