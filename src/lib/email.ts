export function normalizeEmail(email: string): string {
  const normalized = email.trim().toLowerCase();
  const atIndex = normalized.lastIndexOf('@');

  if (atIndex === -1) {
    return normalized;
  }

  const localPart = normalized.slice(0, atIndex);
  const domain = normalized.slice(atIndex);
  const plusIndex = localPart.indexOf('+');

  if (plusIndex === -1) {
    return normalized;
  }

  return `${localPart.slice(0, plusIndex)}${domain}`;
}
