// Markdown -> jsPDF renderer for the diagnosis report.
//
// The old code did `reportText.replace(/[*#]/g, '')` and dumped the result
// through splitTextToSize. That deleted every heading and bullet marker (leaving
// stray leading spaces), kept literal "\n" escapes as visible text, and fed
// emoji to jsPDF's Helvetica -- which encodes WinAnsi only, so the stethoscope
// emoji came out as "Ø>Þz". This parses the markdown instead.

import { unescapeLiteralNewlines } from "./markdownText.js";

const HEADING = { 1: { size: 13, before: 5, after: 2.6 }, 2: { size: 12, before: 4.5, after: 2.4 },
                  3: { size: 11, before: 4, after: 2.2 }, 4: { size: 10, before: 3.2, after: 2 } };
const BODY_SIZE = 10;
const LINE_HEIGHT = 5;
const PARA_GAP = 2.4;

const TEAL = [13, 148, 136];
const SLATE_900 = [15, 23, 42];
const SLATE_300 = [203, 213, 225];

// Characters Helvetica/WinAnsi can't represent, listed by code point so this
// file stays plain ASCII (a literal NBSP trips eslint's no-irregular-whitespace).
const SUBSTITUTIONS = [
    [[0x2018, 0x2019, 0x201b], "'"],        // curly single quotes
    [[0x201c, 0x201d], '"'],                // curly double quotes
    [[0x2013, 0x2014], "-"],                // en/em dash
    [[0x2026], "..."],                      // ellipsis
    [[0x00a0, 0x2007, 0x202f], " "],        // non-breaking spaces
];
const NON_LATIN1 = new RegExp(
    "[^" + String.fromCharCode(0) + "-" + String.fromCharCode(0xff) + "]", "g"
);

/**
 * Make a model-produced string safe for jsPDF's standard fonts.
 * Converts literal "\n" escapes, normalises unicode punctuation, and drops
 * anything outside Latin-1 (emoji) rather than printing mojibake.
 */
export function sanitizeForPdf(text) {
    let out = unescapeLiteralNewlines(text).replace(/\r\n?/g, "\n");
    for (const [codes, replacement] of SUBSTITUTIONS) {
        for (const code of codes) {
            out = out.split(String.fromCharCode(code)).join(replacement);
        }
    }
    return out.replace(NON_LATIN1, "").replace(/[ \t]+$/gm, "");
}

// "Topical **retinoids** nightly" -> [{text:"Topical ",bold:false},{text:"retinoids",bold:true},...]
function inlineSegments(text) {
    const out = [];
    const re = /(\*\*|__)(.+?)\1/g;
    let last = 0, m;
    while ((m = re.exec(text)) !== null) {
        if (m.index > last) out.push({ text: text.slice(last, m.index), bold: false });
        out.push({ text: m[2], bold: true });
        last = m.index + m[0].length;
    }
    if (last < text.length) out.push({ text: text.slice(last), bold: false });
    return out
        .map((s) => ({ ...s, text: s.text.replace(/[*_`]/g, "") }))
        .filter((s) => s.text.length > 0);
}

/**
 * Render markdown into `doc`, flowing across pages.
 * Returns the y position after the last line.
 */
export function renderMarkdownToPdf(doc, markdown, opts = {}) {
    const {
        x = 14,
        y = 0,
        width = 180,
        pageTop = 25,
        pageBottom = 20,
        indent = 5,
    } = opts;
    const pageHeight = doc.internal.pageSize.getHeight();
    let cursorY = y;

    const nextPageIfNeeded = (needed) => {
        if (cursorY + needed > pageHeight - pageBottom) {
            doc.addPage();
            cursorY = pageTop;
            return true;
        }
        return false;
    };

    // Word-wrap a list of {text, bold} segments, measuring each in its own font.
    const drawSegments = (segments, startX, maxWidth, size, color, forceBold) => {
        doc.setFontSize(size);
        doc.setTextColor(color[0], color[1], color[2]);
        let lineX = startX;
        nextPageIfNeeded(LINE_HEIGHT);

        for (const seg of segments) {
            const bold = forceBold || seg.bold;
            doc.setFont("helvetica", bold ? "bold" : "normal");
            // Keep the spaces so words rejoin correctly across segment boundaries.
            const words = seg.text.split(/(\s+)/).filter((w) => w !== "");
            for (const word of words) {
                const w = doc.getTextWidth(word);
                if (lineX + w > startX + maxWidth && /\S/.test(word)) {
                    cursorY += LINE_HEIGHT;
                    nextPageIfNeeded(0);
                    lineX = startX;
                    doc.setFont("helvetica", bold ? "bold" : "normal");
                }
                if (lineX === startX && /^\s+$/.test(word)) continue;  // no leading space
                doc.text(word, lineX, cursorY);
                lineX += w;
            }
        }
        cursorY += LINE_HEIGHT;
    };

    const lines = sanitizeForPdf(markdown).split("\n");
    let inFence = false;

    for (const raw of lines) {
        const line = raw.trimEnd();

        if (/^\s*```/.test(line)) { inFence = !inFence; continue; }   // drop fence markers
        if (!line.trim()) { cursorY += PARA_GAP; continue; }

        // Horizontal rule -> thin divider (the report footer sits under one).
        if (!inFence && /^\s*([-*_])\1{2,}\s*$/.test(line)) {
            nextPageIfNeeded(4);
            cursorY += 1.5;
            doc.setDrawColor(SLATE_300[0], SLATE_300[1], SLATE_300[2]);
            doc.setLineWidth(0.2);
            doc.line(x, cursorY, x + width, cursorY);
            cursorY += 3.5;
            continue;
        }

        const heading = !inFence && line.match(/^\s*(#{1,6})\s+(.*)$/);
        if (heading) {
            const level = Math.min(heading[1].length, 4);
            const h = HEADING[level];
            cursorY += h.before;
            nextPageIfNeeded(h.size * 0.6);
            drawSegments(inlineSegments(heading[2]), x, width, h.size, TEAL, true);
            cursorY += h.after;
            continue;
        }

        const bullet = !inFence && line.match(/^(\s*)[-*+]\s+(.*)$/);
        if (bullet) {
            const depth = Math.min(Math.floor(bullet[1].length / 2), 2);
            const bx = x + depth * indent;
            doc.setFontSize(BODY_SIZE);
            nextPageIfNeeded(LINE_HEIGHT);
            // Drawn, not typed: the bullet glyph depends on the font's encoding
            // and can come out as a replacement character in some viewers.
            doc.setFillColor(SLATE_900[0], SLATE_900[1], SLATE_900[2]);
            doc.circle(bx + 1, cursorY - 1.1, 0.6, "F");
            drawSegments(inlineSegments(bullet[2]), bx + 4, width - (bx - x) - 4, BODY_SIZE, SLATE_900);
            continue;
        }

        const numbered = !inFence && line.match(/^(\s*)(\d+)[.)]\s+(.*)$/);
        if (numbered) {
            const depth = Math.min(Math.floor(numbered[1].length / 2), 2);
            const bx = x + depth * indent;
            const marker = numbered[2] + ".";
            doc.setFont("helvetica", "bold");
            doc.setFontSize(BODY_SIZE);
            doc.setTextColor(SLATE_900[0], SLATE_900[1], SLATE_900[2]);
            nextPageIfNeeded(LINE_HEIGHT);
            doc.text(marker, bx, cursorY);
            const off = doc.getTextWidth(marker) + 1.8;
            drawSegments(inlineSegments(numbered[3]), bx + off, width - (bx - x) - off, BODY_SIZE, SLATE_900);
            continue;
        }

        drawSegments(inlineSegments(line.trim()), x, width, BODY_SIZE, SLATE_900);
    }

    return cursorY;
}
