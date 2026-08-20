export function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, '').trim();
}

export function sanitizeString(input: unknown): string {
  if (typeof input !== 'string') return '';
  return stripHtml(input).trim();
}
