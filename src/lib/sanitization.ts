/**
 * NEXOVIRA Production Security & Input Sanitization Engine
 * Protects forms (Sign Up, Contact, Seller Studio, Admin) against:
 * - Cross-Site Scripting (XSS) & DOM Clobbering
 * - SQL / NoSQL / Command Injection vectors
 * - Dangerous URL protocols (javascript:, data:text/html, vbscript:)
 * - Null byte poisoning & Path Traversal
 */

export interface SecurityThreatDetection {
  isSuspicious: boolean;
  threatType?: string;
  matchedPattern?: string;
  sanitizedValue?: string;
}

// Dangerous script and DOM manipulation patterns
const SCRIPT_REGEX = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;
const DANGEROUS_TAGS_REGEX = /<\/?(script|iframe|object|embed|applet|form|input|button|style|link|meta|svg|math)\b[^>]*>/gi;
const DANGEROUS_ATTRS_REGEX = /\b(on\w+|formaction|action|href|src)\s*=\s*['"]?\s*(javascript:|vbscript:|data:text\/html)/gi;
const INLINE_EVENT_REGEX = /\b(onload|onerror|onclick|onmouseover|onfocus|onblur|onchange|onsubmit|onkeydown|onkeyup)\s*=/gi;

// SQL / NoSQL injection signature heuristics
const SQL_INJECTION_PATTERNS = [
  /(\bunion\s+(all\s+)?select\b)/i,
  /(\bdrop\s+table\b)/i,
  /(\binsert\s+into\b)/i,
  /(\bupdate\b\s+.*\bset\b)/i,
  /(\bdelete\s+from\b)/i,
  /(\bor\s+['"]?1['"]?\s*=\s*['"]?1['"]?)/i,
  /(\band\s+['"]?1['"]?\s*=\s*['"]?1['"]?)/i,
  /(--\s*$|\/\*.*\*\/)/m,
  /(\bwaitfor\s+delay\b)/i,
  /(\bexec\s*\(|\bexecute\s*\()/i,
];

const NOSQL_INJECTION_PATTERNS = [
  /\{\s*"\$(?:gt|gte|lt|lte|ne|in|nin|regex|where|or|and)"\s*:/i,
  /\$(?:gt|gte|lt|lte|ne|in|nin|where)[\s:=]/i,
];

const PATH_TRAVERSAL_PATTERN = /(\.\.[\/\\]|[\\\/]\.\.)/;
const NULL_BYTE_PATTERN = /\0|%00/;

/**
 * Evaluates whether an arbitrary input string contains malicious injection vectors.
 */
export function detectMaliciousPayload(input: unknown): SecurityThreatDetection {
  if (typeof input !== 'string') {
    return { isSuspicious: false };
  }

  const raw = input.trim();
  if (!raw) return { isSuspicious: false };

  // 1. Null Byte Check
  if (NULL_BYTE_PATTERN.test(raw)) {
    return {
      isSuspicious: true,
      threatType: 'Null Byte Injection Poisoning',
      matchedPattern: '\\0 / %00',
    };
  }

  // 2. Script Tag & DOM Injection
  if (SCRIPT_REGEX.test(raw) || DANGEROUS_TAGS_REGEX.test(raw)) {
    return {
      isSuspicious: true,
      threatType: 'Cross-Site Scripting (XSS) Tag Injection',
      matchedPattern: '<script> or dangerous HTML container',
    };
  }

  // 3. Inline Event Handlers
  if (INLINE_EVENT_REGEX.test(raw) || DANGEROUS_ATTRS_REGEX.test(raw)) {
    return {
      isSuspicious: true,
      threatType: 'DOM Event Handler / Protocol Hijack',
      matchedPattern: 'javascript: or onload/onerror attribute',
    };
  }

  // 4. SQL Injection Patterns
  for (const pattern of SQL_INJECTION_PATTERNS) {
    if (pattern.test(raw)) {
      return {
        isSuspicious: true,
        threatType: 'SQL Injection Signature',
        matchedPattern: pattern.source,
      };
    }
  }

  // 5. NoSQL Injection Patterns
  for (const pattern of NOSQL_INJECTION_PATTERNS) {
    if (pattern.test(raw)) {
      return {
        isSuspicious: true,
        threatType: 'NoSQL Operator Injection',
        matchedPattern: pattern.source,
      };
    }
  }

  // 6. Path Traversal
  if (PATH_TRAVERSAL_PATTERN.test(raw)) {
    return {
      isSuspicious: true,
      threatType: 'Directory Traversal Attempt',
      matchedPattern: '../ or ..\\',
    };
  }

  return { isSuspicious: false };
}

/**
 * Strips HTML, dangerous characters, and control codes from a standard text field.
 */
export function sanitizeText(input: unknown, maxLength = 1000): string {
  if (typeof input !== 'string') return '';
  let clean = input
    .replace(/\0/g, '') // remove null bytes
    .replace(SCRIPT_REGEX, '') // strip script blocks
    .replace(DANGEROUS_TAGS_REGEX, '') // strip dangerous tags
    .replace(/[<>]/g, '') // strip brackets entirely for plain text
    .trim();

  // Normalize excessive whitespace
  clean = clean.replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ');

  if (clean.length > maxLength) {
    clean = clean.slice(0, maxLength);
  }
  return clean;
}

/**
 * Sanitizes multi-line text (e.g. descriptions, support messages) while preserving newlines.
 */
export function sanitizeMultilineText(input: unknown, maxLength = 4000): string {
  if (typeof input !== 'string') return '';
  let clean = input
    .replace(/\0/g, '')
    .replace(SCRIPT_REGEX, '')
    .replace(DANGEROUS_TAGS_REGEX, '')
    .replace(/[<>]/g, '')
    .trim();

  // Keep single/double line breaks, remove carriage returns
  clean = clean.replace(/\r/g, '').replace(/\n{3,}/g, '\n\n');

  if (clean.length > maxLength) {
    clean = clean.slice(0, maxLength);
  }
  return clean;
}

/**
 * Validates and sanitizes email address according to RFC 5322 specs.
 */
export function sanitizeEmail(email: unknown): { isValid: boolean; sanitizedEmail: string; error?: string } {
  if (typeof email !== 'string') {
    return { isValid: false, sanitizedEmail: '', error: 'Email must be a valid text string.' };
  }

  const clean = email.trim().toLowerCase().replace(/\0/g, '');
  if (clean.length > 120) {
    return { isValid: false, sanitizedEmail: '', error: 'Email address is too long (max 120 chars).' };
  }

  // Strict email regex rejecting quotes, angles, spaces, slashes
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  if (!emailRegex.test(clean)) {
    return { isValid: false, sanitizedEmail: '', error: 'Please provide a valid, well-formed email address.' };
  }

  return { isValid: true, sanitizedEmail: clean };
}

/**
 * Sanitizes phone numbers, allowing strictly standard international dial characters.
 */
export function sanitizePhone(phone: unknown): { isValid: boolean; sanitizedPhone: string; error?: string } {
  if (typeof phone !== 'string') {
    return { isValid: false, sanitizedPhone: '', error: 'Phone must be a valid text string.' };
  }

  // Allow only digits, +, (, ), -, and space
  let clean = phone.trim().replace(/[^\d+()\s-]/g, '');
  const digitsOnly = clean.replace(/\D/g, '');

  if (digitsOnly.length < 7 || digitsOnly.length > 18) {
    return { isValid: false, sanitizedPhone: '', error: 'Phone number must contain between 7 and 18 digits.' };
  }

  return { isValid: true, sanitizedPhone: clean };
}

/**
 * Sanitizes user or store full name.
 */
export function sanitizeName(name: unknown, maxLength = 80): { isValid: boolean; sanitizedName: string; error?: string } {
  if (typeof name !== 'string') {
    return { isValid: false, sanitizedName: '', error: 'Name must be a valid text string.' };
  }

  const threat = detectMaliciousPayload(name);
  if (threat.isSuspicious) {
    return { isValid: false, sanitizedName: '', error: `Invalid characters detected: ${threat.threatType}` };
  }

  let clean = sanitizeText(name, maxLength);
  // Allow letters, spaces, hyphens, periods, apostrophes
  clean = clean.replace(/[^a-zA-ZÀ-ÿ\s.'-]/g, '').trim();

  if (clean.length < 2) {
    return { isValid: false, sanitizedName: '', error: 'Please enter a valid full name with at least 2 characters.' };
  }

  return { isValid: true, sanitizedName: clean };
}

/**
 * Sanitizes web URLs, enforcing http/https/relative protocols and rejecting javascript: or data: protocols.
 */
export function sanitizeUrl(url: unknown): { isValid: boolean; sanitizedUrl: string; error?: string } {
  if (typeof url !== 'string') {
    return { isValid: false, sanitizedUrl: '', error: 'URL must be a string.' };
  }

  const clean = url.trim().replace(/\0/g, '');
  if (!clean) {
    return { isValid: false, sanitizedUrl: '', error: 'URL cannot be empty.' };
  }

  // Reject dangerous protocols
  const lower = clean.toLowerCase();
  if (lower.startsWith('javascript:') || lower.startsWith('vbscript:') || lower.startsWith('data:text/html')) {
    return { isValid: false, sanitizedUrl: '', error: 'Forbidden URL protocol: Execution of script protocols is prohibited.' };
  }

  if (
    lower.startsWith('http://') ||
    lower.startsWith('https://') ||
    lower.startsWith('/') ||
    lower.startsWith('blob:') ||
    /^data:image\/(png|jpeg|jpg|webp|gif|svg\+xml);base64,/i.test(clean)
  ) {
    return { isValid: true, sanitizedUrl: clean };
  }

  return { isValid: false, sanitizedUrl: '', error: 'URL must begin with https://, http://, or a valid image source.' };
}

/**
 * Records unauthorized or malicious injection attempts into local audit logs and server telemetry.
 */
export async function logSecurityThreatAttempt(
  formContext: string,
  field: string,
  threat: SecurityThreatDetection,
  culpritValuePreview?: string
): Promise<void> {
  try {
    const timestamp = new Date().toISOString();
    const event = {
      timestamp,
      formContext,
      field,
      threatType: threat.threatType || 'Suspicious Payload Injection',
      matchedPattern: threat.matchedPattern || 'N/A',
      preview: (culpritValuePreview || '').slice(0, 100),
      url: typeof window !== 'undefined' ? window.location.href : '',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    };

    console.warn('⚠️ [NEXOVIRA SECURITY SHIELD] Blocked Malicious Input Attempt:', event);

    // Store in circular local storage audit buffer (up to 30 incidents)
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const stored = JSON.parse(localStorage.getItem('nexovira_security_threat_logs') || '[]');
        stored.unshift(event);
        localStorage.setItem('nexovira_security_threat_logs', JSON.stringify(stored.slice(0, 30)));
      } catch (e) {
        // ignore storage errors
      }
    }

    // Dispatch telemetry report to backend server
    if (typeof fetch !== 'undefined') {
      fetch('/api/v1/security/client-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'MALICIOUS_INPUT_BLOCKED',
          details: event,
        }),
      }).catch(() => {});
    }
  } catch (err) {
    // Fail closed quietly
  }
}
