// Formats notes for prompts. Each note gets a short label (N1, N2, ...) the
// model can cite, which we map back to real note IDs afterward.

export type PromptNote = {
  id: string;
  title: string;
  topic: string;
  lecture_date: string;
  content: string;
  author?: string;
};

// Keeps any one note from crowding out the rest of the prompt.
const MAX_CHARS_PER_NOTE = 20000;

function escapeTag(text: string): string {
  return text.replace(/<\/?note\b[^>]*>/gi, "");
}

export function notesToPrompt(notes: PromptNote[], labelPrefix = "N"): { text: string; labels: Map<string, string> } {
  const labels = new Map<string, string>();
  const text = notes
    .map((note, index) => {
      const label = `${labelPrefix}${index + 1}`;
      labels.set(label, note.id);
      const body = note.content.length > MAX_CHARS_PER_NOTE
        ? `${note.content.slice(0, MAX_CHARS_PER_NOTE)}\n[...note shortened...]`
        : note.content;
      const attrs = [
        `label="${label}"`,
        `date="${note.lecture_date}"`,
        `title="${escapeAttr(note.title)}"`,
        note.topic ? `topic="${escapeAttr(note.topic)}"` : "",
        note.author ? `author="${escapeAttr(note.author)}"` : "",
      ]
        .filter(Boolean)
        .join(" ");
      return `<note ${attrs}>\n${escapeTag(body)}\n</note>`;
    })
    .join("\n\n");
  return { text, labels };
}

function escapeAttr(value: string): string {
  return value.replace(/"/g, "'").replace(/[<>]/g, "");
}

/** Map labels like "N2" back to note IDs, dropping anything unknown. */
export function labelsToIds(found: string[], labels: Map<string, string>): string[] {
  const ids = found.map((label) => labels.get(label.trim().toUpperCase())).filter((id): id is string => Boolean(id));
  return [...new Set(ids)];
}
