/**
 * Turns literal escape codes such as "√" back into the characters they stand for. Gemini
 * sometimes escapes maths symbols twice, and papers read before this fix stored them that way.
 */
export const decodeEscapes = (text: string) =>
  text.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex: string) => String.fromCharCode(parseInt(hex, 16)));

export const wordCount = (text = '') => (text.trim() ? text.trim().split(/\s+/).length : 0);
