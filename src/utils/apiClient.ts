/**
 * Enhanced API Client with timeout, retry, and error handling
 */

import { ErrorHandler, withTimeout, retryWithBackoff } from './errorHandler';
import { logger } from './logger';

const DEFAULT_TIMEOUT = 20000; // 20 seconds
const DEFAULT_RETRIES = 2;

interface RequestOptions extends RequestInit {
  timeout?: number;
  retries?: number;
  skipAuth?: boolean;
}

// Import supabase client directly (only used on client side)
// This ensures we use the same instance that has the session
let supabaseInstance: any = null;
let getSessionPromise: Promise<any> | null = null; // Lock to prevent concurrent getSession calls

function getSupabase() {
  if (typeof window === 'undefined') {
    return null; // SSR
  }
  
  if (!supabaseInstance) {
    // Use dynamic import but cache the result
    import('../../lib/supabaseClient').then((module) => {
      supabaseInstance = module.supabase;
    }).catch(() => {
      // Ignore import errors
    });
    
    // Note: Synchronous require() removed - using async import only
  }
  
  return supabaseInstance;
}

class ApiClient {
  private async getAuthToken(): Promise<string | null> {
    try {
      logger.debug('Starting to get auth token', { component: 'apiClient.getAuthToken' });
      
      // First, try to read directly from localStorage (fastest, no async call)
      if (typeof window !== 'undefined') {
        try {
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
          if (supabaseUrl) {
            // Extract project ref from URL (e.g., https://xyz.supabase.co -> xyz)
            const projectRef = supabaseUrl.match(/https?:\/\/([^.]+)\.supabase\.co/)?.[1];
            if (projectRef) {
              // Try multiple possible key formats
              const possibleKeys = [
                `sb-${projectRef}-auth-token`,
                `supabase.auth.token`,
                `sb-${projectRef}-auth-token-code-verifier`,
              ];
              
              // Also check all keys starting with "sb-"
              for (let i = 0; i < window.localStorage.length; i++) {
                const key = window.localStorage.key(i);
                if (key && key.startsWith('sb-') && key.includes(projectRef)) {
                  possibleKeys.push(key);
                }
              }
              
              for (const storageKey of possibleKeys) {
                const storedSession = window.localStorage.getItem(storageKey);
                if (storedSession) {
                  try {
                    const sessionData = JSON.parse(storedSession);
                    // Try different possible token locations
                    const token = sessionData?.access_token 
                      || sessionData?.session?.access_token
                      || sessionData?.currentSession?.access_token;
                    
                    if (token && typeof token === 'string') {
                      logger.debug('Token retrieved from localStorage', { storageKey, component: 'apiClient.getAuthToken' });
                      return token;
                    }
                  } catch (parseError) {
                    // Try to parse as plain string (some formats store token directly)
                    if (storedSession.startsWith('eyJ')) {
                      // Looks like a JWT token
                      logger.debug('Token retrieved from localStorage (JWT format)', { storageKey, component: 'apiClient.getAuthToken' });
                      return storedSession;
                    }
                  }
                }
              }
            }
          }
        } catch (localStorageError) {
          console.warn('[apiClient.getAuthToken] localStorage read failed:', localStorageError);
        }
      }
      
      // If localStorage didn't work, try getSession() with a very short timeout
      logger.debug('localStorage not available, trying getSession()', { component: 'apiClient.getAuthToken' });
      
      // Get supabase instance
      let supabase = getSupabase();
      
      // If not available, try async import
      if (!supabase) {
        logger.debug('Supabase not cached, importing', { component: 'apiClient.getAuthToken' });
        const module = await import('../../lib/supabaseClient');
        supabase = module.supabase;
        supabaseInstance = supabase;
      }
      
      if (!supabase) {
        logger.error('Supabase not available (SSR?)', undefined, { component: 'apiClient.getAuthToken' });
        return null;
      }
      
      logger.debug('Supabase client loaded, getting session', { component: 'apiClient.getAuthToken' });
      
      // Use a lock to prevent concurrent getSession calls (they can block each other)
      if (!getSessionPromise) {
        getSessionPromise = supabase.auth.getSession().finally(() => {
          // Clear the lock after 100ms to allow new calls
          setTimeout(() => {
            getSessionPromise = null;
          }, 100);
        });
      }
      
      const sessionPromise = getSessionPromise;
      
      // Use a very short timeout - getSession should be instant if session exists
      const SESSION_TIMEOUT = 1000; // 1 second (reduced from 2s)
      let timeoutId: NodeJS.Timeout | undefined;
      
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          console.warn('[apiClient.getAuthToken] Session fetch timeout after 1s, falling back to localStorage');
          reject(new Error('Session fetch timeout'));
        }, SESSION_TIMEOUT);
      });
      
      try {
        const sessionResult = await Promise.race([sessionPromise, timeoutPromise]);
        if (timeoutId) clearTimeout(timeoutId);
        const token = sessionResult.data?.session?.access_token || null;
        logger.debug('Session retrieved from getSession()', { hasToken: !!token, component: 'apiClient.getAuthToken' });
        return token;
      } catch (raceError) {
        if (timeoutId) clearTimeout(timeoutId);
        
        // If timeout, try localStorage again as final fallback
        logger.debug('getSession() timed out, trying localStorage fallback', { component: 'apiClient.getAuthToken' });
        if (typeof window !== 'undefined') {
          try {
            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
            if (supabaseUrl) {
              const projectRef = supabaseUrl.match(/https?:\/\/([^.]+)\.supabase\.co/)?.[1];
              if (projectRef) {
                // Try multiple possible key formats
                const possibleKeys = [
                  `sb-${projectRef}-auth-token`,
                  `supabase.auth.token`,
                ];
                
                // Also check all keys starting with "sb-"
                for (let i = 0; i < window.localStorage.length; i++) {
                  const key = window.localStorage.key(i);
                  if (key && key.startsWith('sb-') && key.includes(projectRef)) {
                    possibleKeys.push(key);
                  }
                }
                
                for (const storageKey of possibleKeys) {
                  const storedSession = window.localStorage.getItem(storageKey);
                  if (storedSession) {
                    try {
                      const sessionData = JSON.parse(storedSession);
                      const token = sessionData?.access_token 
                        || sessionData?.session?.access_token
                        || sessionData?.currentSession?.access_token;
                      
                      if (token && typeof token === 'string') {
                        logger.debug('Token retrieved from localStorage fallback', { storageKey, component: 'apiClient.getAuthToken' });
                        return token;
                      }
                    } catch (parseError) {
                      // Try to parse as plain string (some formats store token directly)
                      if (storedSession.startsWith('eyJ')) {
                        logger.debug('Token retrieved from localStorage fallback (JWT format)', { storageKey, component: 'apiClient.getAuthToken' });
                        return storedSession;
                      }
                    }
                  }
                }
              }
            }
          } catch (localStorageError) {
            console.warn('[apiClient.getAuthToken] localStorage fallback failed:', localStorageError);
          }
        }
        
        logger.error('All attempts failed, returning null', undefined, { component: 'apiClient.getAuthToken' });
        return null;
      }
    } catch (error) {
      logger.error('Error in getAuthToken', error, { component: 'apiClient.getAuthToken' });
      ErrorHandler.logError(error, { context: 'getAuthToken' });
      return null;
    }
  }

  private async makeRequest(
    url: string,
    options: RequestOptions = {}
  ): Promise<Response> {
    logger.debug('Starting makeRequest', { url, component: 'apiClient.makeRequest' });
    const {
      timeout = DEFAULT_TIMEOUT,
      skipAuth = false,
      headers = {},
      ...fetchOptions
    } = options;

    // Get auth token if not skipped
    let authToken: string | null = null;
    if (!skipAuth) {
      logger.debug('Getting auth token', { component: 'apiClient.makeRequest' });
      authToken = await this.getAuthToken();
      logger.debug('Auth token retrieved', { hasToken: !!authToken, component: 'apiClient.makeRequest' });
      if (!authToken) {
        throw new Error('Authentication required. Please refresh the page and log in again.');
      }
    } else {
      logger.debug('Skipping auth (skipAuth=true)', { component: 'apiClient.makeRequest' });
    }

    // Prepare headers
    const requestHeaders: Record<string, string> = {
      ...(headers as Record<string, string>),
    };
    
    // Only set Content-Type for requests with body (POST, PUT, PATCH)
    if (fetchOptions.body && !requestHeaders['Content-Type']) {
      requestHeaders['Content-Type'] = 'application/json';
    }

    if (authToken) {
      requestHeaders['Authorization'] = `Bearer ${authToken}`;
    }

    logger.debug('Making request', { url, component: 'apiClient' });
    
    // Create fetch promise with signal support
    const fetchPromise = fetch(url, {
      ...fetchOptions,
      headers: requestHeaders,
      signal: options.signal, // Pass through AbortController signal
    });

    logger.debug('Fetch promise created, waiting for response', { timeout, component: 'apiClient' });
    
    // Add timeout (but respect AbortController signal first)
    const response = await withTimeout(fetchPromise, timeout);
    
    logger.debug('Response received', { status: response.status, statusText: response.statusText, component: 'apiClient' });

    // Handle non-OK responses
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.error || errorData.message || errorMessage;
      } catch {
        if (errorText) {
          errorMessage = errorText;
        }
      }

      const error = new Error(errorMessage) as Error & { statusCode?: number };
      error.statusCode = response.status;
      throw error;
    }

    return response;
  }

  async request<T>(
    url: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const { retries = DEFAULT_RETRIES } = options;
    
    logger.debug('Starting request', { url, method: options.method, retries, component: 'apiClient.request' });

    try {
      logger.debug('Calling retryWithBackoff', { component: 'apiClient.request' });
      const response = await retryWithBackoff(
        () => {
          logger.debug('retryWithBackoff callback executing, calling makeRequest', { component: 'apiClient.request' });
          return this.makeRequest(url, options);
        },
        retries
      );
      logger.debug('Response received from retryWithBackoff', { component: 'apiClient.request' });

      const data = await response.json();
      
      // Check if response contains an error
      if (data && typeof data === 'object' && 'error' in data) {
        const errorMessage = (data.error as { message?: string }).message || 'An error occurred';
        const error = new Error(errorMessage) as Error & { statusCode?: number };
        error.statusCode = response.status;
        throw error;
      }
      
      return data.data || data;
    } catch (error) {
      // Skip logging for aborted requests
      if (error instanceof Error && (error.name === 'AbortError' || error.message.includes('aborted'))) {
        throw error; // Re-throw without logging
      }
      
      // If error is already an Error with statusCode, re-throw it
      if (error instanceof Error && 'statusCode' in error) {
        ErrorHandler.logError(error, { url, method: options.method || 'GET' });
        throw error;
      }
      
      ErrorHandler.logError(error, { url, method: options.method || 'GET' });
      throw new Error(ErrorHandler.getUserMessage(error));
    }
  }

  async get<T>(url: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(url, { ...options, method: 'GET' });
  }

  async post<T>(url: string, body?: unknown, options?: RequestOptions): Promise<T> {
    logger.debug('POST request', { url, hasBody: !!body, component: 'apiClient.post' });
    try {
      const result = await this.request<T>(url, {
        ...options,
        method: 'POST',
        body: JSON.stringify(body),
      });
      logger.debug('Request completed successfully', { component: 'apiClient.post' });
      return result;
    } catch (error) {
      logger.error('Request failed', error, { url, component: 'apiClient.post' });
      throw error;
    }
  }

  async put<T>(url: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(url, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  async delete<T>(url: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(url, { ...options, method: 'DELETE' });
  }
}

export const apiClient = new ApiClient();


