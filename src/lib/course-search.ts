/**
 * Recognize complete invite codes in the Find a course search field.
 * Ordinary course names, codes, and instructor searches remain unchanged.
 */
export function inviteCodeFromSearchQuery(query: string): string | null {
  const normalized = query.trim().toUpperCase();
  return /^[0-9A-F]{12}$/.test(normalized) ? normalized : null;
}
