import sanitizeHtml from "sanitize-html";

// Strip ALL HTML from any user-facing text field.
// Applied at write-time (service layer) so nothing unsafe ever touches the DB.
export function sanitizeText(input: string | undefined): string | undefined {
  if (!input) return input;
  return sanitizeHtml(input, { allowedTags: [], allowedAttributes: {} }).trim();
}

// Required version — throws if result is empty after sanitization.
export function sanitizeRequired(input: string, fieldName: string): string {
  const clean = sanitizeHtml(input, {
    allowedTags: [],
    allowedAttributes: {},
  }).trim();
  if (!clean)
    throw new Error(`${fieldName} cannot be empty or contain only HTML tags.`);
  return clean;
}
