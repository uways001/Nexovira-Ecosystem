/**
 * NEXOVIRA Centralized Domain Configuration & Open-Redirect Prevention Security Engine
 * Automatically detects public domain from runtime environment, validates destinations,
 * prevents open redirects, and manages multi-domain affiliate tracking.
 */

export interface SystemDomainConfig {
  primaryDomain: string;
  approvedDomains: string[];
  defaultAffiliateDomain: string;
  allowSubdomains: boolean;
  environment: 'production' | 'staging' | 'development';
}

export const DEFAULT_APPROVED_DOMAINS = [
  'nexovira.com',
  'www.nexovira.com',
  'run.app', // Cloud Run preview deployments (*.run.app)
  'localhost',
  '127.0.0.1'
];

/**
 * Gets the current active origin (e.g. "https://ais-dev-t44c5bar464ucbfj3t7hot-164035881293.europe-west3.run.app")
 * or fallback to default production origin if executed server-side.
 */
export function getCurrentPublicOrigin(): string {
  if (typeof window !== 'undefined' && window.location && window.location.origin) {
    return normalizeUrl(window.location.origin);
  }
  return 'https://nexovira.com';
}

/**
 * Normalizes a URL or origin string:
 * - Trims whitespace
 * - Ensures lowercase protocol and hostname
 * - Removes trailing slashes
 * - Cleans double slashes in paths
 */
export function normalizeUrl(urlStr: string): string {
  if (!urlStr) return '';
  let clean = urlStr.trim();
  
  // If missing protocol, prepend https://
  if (!clean.startsWith('http://') && !clean.startsWith('https://') && !clean.startsWith('/')) {
    clean = `https://${clean}`;
  }

  try {
    if (clean.startsWith('http://') || clean.startsWith('https://')) {
      const parsed = new URL(clean);
      const origin = `${parsed.protocol}//${parsed.host.toLowerCase()}`;
      const path = parsed.pathname.replace(/\/+/g, '/').replace(/\/$/, '');
      const search = parsed.search;
      return `${origin}${path}${search}`;
    }
  } catch (e) {
    // If URL parsing fails, return trimmed
  }
  return clean.replace(/\/$/, '');
}

/**
 * Extract domain/hostname from a full URL or host string
 */
export function extractHostname(urlOrHost: string): string {
  if (!urlOrHost) return '';
  let str = urlOrHost.trim().toLowerCase();
  if (str.startsWith('http://') || str.startsWith('https://')) {
    try {
      return new URL(str).hostname;
    } catch (e) {
      // fallback
    }
  }
  return str.split('/')[0].split(':')[0];
}

/**
 * SECURITY GUARD: Validates whether a domain/hostname is an approved NEXOVIRA domain.
 * Prevents Open Redirect vulnerability to malicious external websites.
 */
export function isApprovedNexoviraDomain(urlOrHost: string, extraApprovedDomains: string[] = []): boolean {
  if (!urlOrHost) return false;
  const hostname = extractHostname(urlOrHost);

  // Always approve current browser host
  if (typeof window !== 'undefined' && window.location) {
    const currentHost = window.location.hostname.toLowerCase();
    if (hostname === currentHost) return true;
  }

  const allApproved = [...DEFAULT_APPROVED_DOMAINS, ...extraApprovedDomains].map((d) => d.toLowerCase());

  for (const approved of allApproved) {
    if (hostname === approved || hostname.endsWith(`.${approved}`)) {
      return true;
    }
  }

  return false;
}

/**
 * SECURITY GUARD: Checks if a destination path is allowed for affiliate deep-linking.
 * Rejects javascript:, data:, external absolute URLs, and internal sensitive routes.
 */
export function isAllowedDestinationPath(pathStr: string): boolean {
  if (!pathStr) return false;
  const clean = pathStr.trim();

  // Reject javascript:, data:, and malicious protocol attempts
  if (/^(javascript|data|vbscript|file):/i.test(clean)) {
    return false;
  }

  // Reject open redirect attempts starting with double slashes (e.g. //malicious.com)
  if (clean.startsWith('//')) {
    return false;
  }

  // Reject external HTTP/HTTPS redirects
  if (clean.startsWith('http://') || clean.startsWith('https://')) {
    return false;
  }

  // Reject sensitive internal pages
  const forbiddenPrefixes = [
    '/admin',
    '/seller',
    '/affiliate',
    '/signin',
    '/signup',
    '/auth'
  ];

  const lowerPath = clean.toLowerCase();
  for (const forbidden of forbiddenPrefixes) {
    if (lowerPath === forbidden || lowerPath.startsWith(`${forbidden}/`)) {
      return false;
    }
  }

  // Allowed public paths include /, /product/*, /service/*, /course/*, /ebook/*, /marketplace, /academy, /services, /ebooks, /cart, /wishlist, etc.
  return clean.startsWith('/');
}

/**
 * Generates an authoritative affiliate deep-link for any content item or page.
 * Uses current domain dynamically while preserving target paths and pre-existing query parameters.
 */
export function buildAffiliateDeepLink(params: {
  affiliateCode: string;
  targetPath: string; // e.g. "/product/prod-123"
  linkId?: string;
  customDomain?: string;
}): string {
  const { affiliateCode, targetPath, linkId, customDomain } = params;

  // Determine base domain
  let baseOrigin = getCurrentPublicOrigin();
  if (customDomain && isApprovedNexoviraDomain(customDomain)) {
    baseOrigin = normalizeUrl(customDomain);
  }

  // Sanitize destination path
  let safePath = targetPath.trim();
  if (!isAllowedDestinationPath(safePath)) {
    safePath = '/marketplace';
  }

  // Ensure path starts with /
  if (!safePath.startsWith('/')) {
    safePath = `/${safePath}`;
  }

  // Build the tracking URL using ref structure: /ref/{affiliateCode}?target={safePath}&linkId={linkId}
  const urlObj = new URL(`${baseOrigin}/ref/${encodeURIComponent(affiliateCode.trim().toUpperCase())}`);
  urlObj.searchParams.set('target', safePath);
  if (linkId) {
    urlObj.searchParams.set('linkId', linkId);
  }

  return urlObj.toString();
}

/**
 * Parses and merges query parameters while preserving existing ones.
 */
export function mergeQueryParams(targetPath: string, extraParams: Record<string, string>): string {
  if (!targetPath) return '/';
  
  try {
    const dummyOrigin = 'https://nexovira.local';
    const parsed = new URL(targetPath.startsWith('/') ? `${dummyOrigin}${targetPath}` : targetPath);
    
    Object.keys(extraParams).forEach((key) => {
      if (extraParams[key] !== undefined && extraParams[key] !== null) {
        parsed.searchParams.set(key, extraParams[key]);
      }
    });

    return `${parsed.pathname}${parsed.search}`;
  } catch (e) {
    return targetPath;
  }
}

/**
 * Cross-browser Clipboard API helper with reliable textarea fallback for iOS, Android, and Desktop.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (!text) return false;

  if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      console.warn('Navigator clipboard failed, attempting fallback copy execution:', e);
    }
  }

  // Fallback method using hidden textarea and execCommand
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.top = '0';
    textArea.style.left = '0';
    textArea.style.width = '2em';
    textArea.style.height = '2em';
    textArea.style.padding = '0';
    textArea.style.border = 'none';
    textArea.style.outline = 'none';
    textArea.style.boxShadow = 'none';
    textArea.style.background = 'transparent';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.error('Fallback clipboard copy failed:', err);
    return false;
  }
}
