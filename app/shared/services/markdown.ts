import { Marked } from "marked";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Show notes are written by any podcaster and read by the public, so raw html
// in the markdown is shown as text rather than rendered.
const notes = new Marked({
  gfm: true,
  renderer: {
    html(token) {
      return escapeHtml(token.text);
    },
  },
});

export function renderNotes(markdown: string): string {
  return notes.parse(markdown, { async: false }) as string;
}
