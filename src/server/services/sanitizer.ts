/**
 * devflow log sanitizer: Strips out sensitive credentials, API keys, private keys,
 * passwords, and tokens before storing or displaying logs, or sending to AI.
 */

const SECRET_PATTERNS: RegExp[] = [
  // GitHub Personal Access Tokens and OAuth tokens
  /ghp_[a-zA-Z0-9]{36,}/g,
  /gho_[a-zA-Z0-9]{36,}/g,
  /ghu_[a-zA-Z0-9]{36,}/g,
  /ghs_[a-zA-Z0-9]{36,}/g,
  /ghr_[a-zA-Z0-9]{36,}/g,
  /github_pat_[a-zA-Z0-9_]{50,}/g,

  // Bearer tokens & Authorization headers
  /Bearer\s+[a-zA-Z0-9_\-\.]{20,}/gi,
  /Authorization:\s*['"]?[^\r\n'"]+['"]?/gi,

  // Generic API Keys and Secrets
  /(?:api[_-]?key|secret[_-]?key|access[_-]?token|auth[_-]?token|private[_-]?key)\s*[:=]\s*['"]?[a-zA-Z0-9_\-\.]{16,}['"]?/gi,

  // AWS Access Key ID and Secret
  /(?:A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}/g,
  /(?:aws_secret_access_key|aws_access_key_id)\s*=\s*['"]?[a-zA-Z0-9\/+=]{16,}['"]?/gi,

  // RSA / SSH Private Keys
  /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,

  // Passwords in connection strings or env vars
  /postgres:\/\/[^:]+:([^@]+)@/g,
  /mysql:\/\/[^:]+:([^@]+)@/g,
  /mongodb(?:\+srv)?:\/\/[^:]+:([^@]+)@/g,
  /(?:password|passwd|pwd)\s*[:=]\s*['"]?[^\r\n'"]{6,}['"]?/gi,

  // Google API keys
  /AIza[0-9A-Za-z\-_]{35}/g,

  // Slack tokens
  /xox[baprs]-[0-9a-zA-Z]{10,48}/g,

  // Docker config auth base64
  /"auth":\s*"[a-zA-Z0-9+\/=]{20,}"/g,
];

export function sanitizeLog(rawLog: string): string {
  if (!rawLog) return '';
  let sanitized = rawLog;

  for (const pattern of SECRET_PATTERNS) {
    sanitized = sanitized.replace(pattern, (match) => {
      if (match.startsWith('-----BEGIN')) {
        return '-----BEGIN PRIVATE KEY-----\n[REDACTED PRIVATE KEY]\n-----END PRIVATE KEY-----';
      }
      if (match.toLowerCase().includes('authorization:') || match.toLowerCase().startsWith('bearer ')) {
        return 'Authorization: Bearer [REDACTED_TOKEN]';
      }
      if (match.includes('://')) {
        return match.replace(/:([^@]+)@/, ':[REDACTED_PASSWORD]@');
      }
      const parts = match.split(/[:=]/);
      if (parts.length > 1) {
        return `${parts[0]}=[REDACTED_SECRET]`;
      }
      return '[REDACTED_SECRET]';
    });
  }

  // Strip ANSI escape codes for pure plaintext storage/diagnosis
  sanitized = sanitized.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');

  return sanitized;
}
