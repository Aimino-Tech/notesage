/**
 * Proxy service for fetching website content
 * This helps bypass CORS restrictions by using server-side requests
 */

// List of available public CORS proxies 
// These are free services that may have rate limits
const PUBLIC_PROXIES = [
  'https://corsproxy.io/?',
  'https://cors-anywhere.herokuapp.com/',
  'https://api.allorigins.win/raw?url='
];

/**
 * Attempts to fetch a URL through multiple proxy services if direct fetching fails
 * @param url The URL to fetch
 * @param timeout Timeout in milliseconds
 * @returns The response text
 */
export async function fetchViaProxy(url: string, timeout: number = 30000): Promise<{ text: string, usedProxy: boolean, proxyUrl?: string }> {
  // First try direct fetch (might work in some environments)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 ChatDocumentCrawler/1.0'
      }
    }).finally(() => clearTimeout(timeoutId));
    
    if (response.ok) {
      console.log(`Direct fetch successful for ${url}`);
      return {
        text: await response.text(),
        usedProxy: false
      };
    }
  } catch (error) {
    console.log(`Direct fetch failed, trying proxies: ${error.message}`);
    // Continue to proxy attempts
  }
  
  // Try each proxy in sequence
  for (const proxyUrl of PUBLIC_PROXIES) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const fullUrl = `${proxyUrl}${encodeURIComponent(url)}`;
      console.log(`Trying proxy: ${fullUrl}`);
      
      const response = await fetch(fullUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 ChatDocumentCrawler/1.0',
          'X-Requested-With': 'XMLHttpRequest' // Required by some proxies
        }
      }).finally(() => clearTimeout(timeoutId));
      
      if (response.ok) {
        console.log(`Proxy fetch successful via ${proxyUrl}`);
        return {
          text: await response.text(),
          usedProxy: true,
          proxyUrl: proxyUrl
        };
      }
    } catch (error) {
      console.log(`Proxy ${proxyUrl} failed: ${error.message}`);
      // Try next proxy
    }
  }
  
  // If all attempts fail
  throw new Error(`Failed to fetch ${url} directly or through any available proxy.`);
}