//  This utility file cleans up different types of data returned by your API and converts them into a plain text string.

// 1. String Input (with JSON Check)

// What it does: If the input is a string, it checks if it is hidden JSON text. If it is, it decodes it; otherwise, it keeps the string as-is.

// Example: Passing "[\"Data\", \"loaded\"]" turns into "Data loaded".

// 2. Array of Content Blocks

// What it does: If the input is a list (array), it pulls the .text property out of each item and joins them with spaces.

// Example: Passing [{ text: "File" }, { text: "saved." }] turns into "File saved.".

// 3. Single Object

// What it does: If the input is a single object, it extracts and returns the .text property value.

// Example: Passing { text: "Task complete", status: 200 } turns into "Task complete".

// 4. Fallback

// What it does: If the input is a number or unrecognized type, it forces it into a standard text string.

// Example: Passing the number 500 turns into "500".


type ContentBlock = {
  type?: string;
  text?: string;
  extras?: Record<string, unknown>;
};

export function extractAnswerText(raw: unknown): string {
  // Case 1: Already a clean string
  if (typeof raw === "string") {
    // Check if it's actually a stringified JSON array (starts with '[')
    const trimmed = raw.trim();
    if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
      try {
        const parsed = JSON.parse(trimmed);
        return extractAnswerText(parsed);
      } catch {
        // Not valid JSON, treat as plain text
        return raw;
      }
    }
    return raw;
  }

  // Case 2: Array of content blocks
  if (Array.isArray(raw)) {
    return raw
      .map((block) => {
        if (typeof block === "string") return block;
        if (block && typeof block === "object" && "text" in block) {
          return (block as ContentBlock).text ?? "";
        }
        return "";
      })
      .join(" ")
      .trim();
  }

  // Case 3: Single object with a text field
  if (raw && typeof raw === "object" && "text" in raw) {
    return (raw as ContentBlock).text ?? "";
  }

  // Fallback
  return String(raw ?? "");
}