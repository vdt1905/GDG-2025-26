const BACKSLASH = String.fromCharCode(92);

/**
 * Convert literal "\n" / "\t" escape sequences into real whitespace.
 *
 * Gemini's structured output intermittently double-escapes control characters,
 * so a report arrives with the two characters \ and n where a line break should
 * be — which markdown renders as visible "\n\n" and collapses the document into
 * one paragraph. The API now normalises this at the source, but reports already
 * saved to Firestore still carry it, so the UI repairs it on read too.
 *
 * Real newlines pass through untouched.
 */
export function unescapeLiteralNewlines(text) {
    return String(text ?? "")
        .split(BACKSLASH + "r" + BACKSLASH + "n").join("\n")
        .split(BACKSLASH + "n").join("\n")
        .split(BACKSLASH + "t").join("    ");
}

export default unescapeLiteralNewlines;
