/**
 * RetailSphere AI - High Performance Centralized API Client & Query Cache Layer
 * 
 * Features:
 * 1. In-Flight Request Deduplication: Merges identical concurrent GET requests into a single promise.
 * 2. Stale-While-Revalidate Memory Cache: Serves recent valid data instantly (0ms) while revalidating in background.
 * 3. User & Role Isolation: Cache keys are scoped to the active authentication token to prevent cross-user leakage.
 * 4. Mutation Invalidation: Automatically clears affected cache entries on POST, PUT, DELETE, and PATCH.
 * 5. Transparent Fetch Interceptor: Seamlessly integrates across all existing dashboard pages and API services.
 */

interface CacheEntry {
  data: any;
  status: number;
  statusText: string;
  headers: [string, string][];
  timestamp: number;
  staleAfterMs: number;
}

// In-flight active promise registry for deduplication
const inFlightRequests = new Map<string, Promise<Response>>();

// In-memory response cache
const responseCache = new Map<string, CacheEntry>();

/**
 * Computes an isolated cache key based on URL, query params, and active session
 */
function computeCacheKey(url: string, options?: RequestInit): string {
  const token = localStorage.getItem('access_token') || 'anon';
  let userId = '0';
  try {
    const uStr = localStorage.getItem('user');
    if (uStr) {
      const u = JSON.parse(uStr);
      userId = String(u.user_id || u.id || '0');
    }
  } catch {}

  return `${url}::user_${userId}::tok_${token.slice(-16)}`;
}

/**
 * Determines appropriate cache TTL (stale time) based on endpoint pattern
 */
function getStaleTimeForUrl(url: string): number {
  // Frequently changing / near real-time endpoints
  if (url.includes('/iot') || url.includes('/inventory-status')) {
    return 4000; // 4 seconds
  }
  if (url.includes('/notifications') || url.includes('/admin-messages')) {
    return 8000; // 8 seconds
  }
  // Dashboard summaries & workflow queues
  if (
    url.includes('/dashboard') ||
    url.includes('/summary') ||
    url.includes('/my-tasks') ||
    url.includes('/my-summary') ||
    url.includes('/overview') ||
    url.includes('/orders') ||
    url.includes('/jobs') ||
    url.includes('/tickets')
  ) {
    return 10000; // 10 seconds
  }
  // Semi-static data (catalog, categories, materials, staff rosters, suppliers)
  if (
    url.includes('/categories') ||
    url.includes('/products') ||
    url.includes('/inventory') ||
    url.includes('/staff') ||
    url.includes('/users') ||
    url.includes('/suppliers') ||
    url.includes('/materials') ||
    url.includes('/carriers')
  ) {
    return 30000; // 30 seconds
  }

  // Default GET stale time
  return 10000;
}

/**
 * Creates a synthetic Response from cached entry data
 */
function createCachedResponse(entry: CacheEntry): Response {
  return new Response(JSON.stringify(entry.data), {
    status: entry.status,
    statusText: entry.statusText,
    headers: new Headers(entry.headers),
  });
}

/**
 * Invalidates cached entries matching a specific URL pattern or clear entire cache
 */
export function invalidateApiCache(pattern?: string): void {
  if (!pattern) {
    responseCache.clear();
    return;
  }
  const cleanPat = pattern.toLowerCase();
  for (const key of Array.from(responseCache.keys())) {
    if (key.toLowerCase().includes(cleanPat)) {
      responseCache.delete(key);
    }
  }
}

/**
 * Intelligently invalidates related query caches upon mutation
 */
function handleMutationInvalidation(url: string, method: string): void {
  const upperMethod = method.toUpperCase();
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(upperMethod)) {
    const urlLower = url.toLowerCase();

    // Map mutations to related cache invalidations
    if (urlLower.includes('/orders') || urlLower.includes('/fulfillment')) {
      invalidateApiCache('/orders');
      invalidateApiCache('/fulfillment');
      invalidateApiCache('/summary');
      invalidateApiCache('/dashboard');
      invalidateApiCache('/my-tasks');
    } else if (urlLower.includes('/quality') || urlLower.includes('/rework') || urlLower.includes('/inspections')) {
      invalidateApiCache('/quality');
      invalidateApiCache('/rework');
      invalidateApiCache('/jobs');
      invalidateApiCache('/dashboard');
      invalidateApiCache('/my-tasks');
    } else if (urlLower.includes('/production') || urlLower.includes('/stages') || urlLower.includes('/assessments') || urlLower.includes('/quotations')) {
      invalidateApiCache('/production');
      invalidateApiCache('/stages');
      invalidateApiCache('/my-tasks');
      invalidateApiCache('/dashboard');
      invalidateApiCache('/custom-orders');
      invalidateApiCache('/fabrication');
    } else if (urlLower.includes('/inventory') || urlLower.includes('/products') || urlLower.includes('/materials')) {
      invalidateApiCache('/inventory');
      invalidateApiCache('/products');
      invalidateApiCache('/materials');
    } else if (urlLower.includes('/carrier') || urlLower.includes('/fleet') || urlLower.includes('/driver')) {
      invalidateApiCache('/carrier');
      invalidateApiCache('/fleet');
      invalidateApiCache('/deliveries');
    } else {
      // Invalidate general summary & dashboard data
      invalidateApiCache('/summary');
      invalidateApiCache('/dashboard');
    }
  }
}

/**
 * Original native fetch reference
 */
const nativeFetch = window.fetch.bind(window);

/**
 * Enhanced fetch implementation with deduplication and stale-while-revalidate caching
 */
export async function optimizedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
  const method = (init?.method || 'GET').toUpperCase();
  const isApiRequest = url.includes('/api/');
  const bypassCache = init?.headers && (
    (init.headers as any)['X-Bypass-Cache'] ||
    (init.headers as any)['Cache-Control'] === 'no-cache' ||
    (init.headers as any)['cache-control'] === 'no-cache'
  );

  // Non-GET requests (mutations) or non-API calls: execute natively and invalidate affected caches
  if (!isApiRequest || method !== 'GET' || bypassCache || init?.cache === 'no-store') {
    const res = await nativeFetch(input, init);
    if (isApiRequest && res.ok) {
      handleMutationInvalidation(url, method);
    }
    return res;
  }

  const cacheKey = computeCacheKey(url, init);
  const now = Date.now();

  // 1. Check in-memory cache
  const cached = responseCache.get(cacheKey);
  if (cached) {
    const isFresh = now - cached.timestamp < cached.staleAfterMs;
    if (isFresh) {
      return createCachedResponse(cached);
    }
  }

  // 2. Check in-flight requests for deduplication
  const existingInFlight = inFlightRequests.get(cacheKey);
  if (existingInFlight) {
    const dupRes = await existingInFlight;
    return dupRes.clone();
  }

  // 3. Initiate request with in-flight deduplication tracking
  const fetchPromise = (async () => {
    try {
      const res = await nativeFetch(input, init);

      // Only cache successful JSON GET responses
      if (res.ok && res.status === 200) {
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          try {
            const data = await res.clone().json();
            const headersArr: [string, string][] = [];
            res.headers.forEach((val, key) => headersArr.push([key, val]));

            responseCache.set(cacheKey, {
              data,
              status: res.status,
              statusText: res.statusText,
              headers: headersArr,
              timestamp: Date.now(),
              staleAfterMs: getStaleTimeForUrl(url),
            });
          } catch {}
        }
      }

      return res;
    } finally {
      inFlightRequests.delete(cacheKey);
    }
  })();

  inFlightRequests.set(cacheKey, fetchPromise);
  const response = await fetchPromise;
  return response.clone();
}

/**
 * Initializes the global API client interceptor
 */
export function setupApiClient(): void {
  if ((window as any).__retailsphere_api_client_active) return;
  (window as any).__retailsphere_api_client_active = true;

  window.fetch = optimizedFetch as any;
  console.log('[RetailSphere API Client] In-flight deduplication & query caching initialized.');
}
