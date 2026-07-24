/**
 * Utility functions for exporting notes to Markdown, HTML, and Text.
 */

function elementToMarkdown(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent || "";
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return "";
  }

  const el = node as HTMLElement;
  const tag = el.tagName.toLowerCase();
  const children = Array.from(el.childNodes).map(elementToMarkdown).join("");

  switch (tag) {
    case "h1":
      return `# ${children}\n\n`;
    case "h2":
      return `## ${children}\n\n`;
    case "h3":
      return `### ${children}\n\n`;
    case "p":
      return `${children}\n\n`;
    case "strong":
    case "b":
      return `**${children}**`;
    case "em":
    case "i":
      return `*${children}*`;
    case "u":
      return `_${children}_`;
    case "code":
      return `\`${children}\``;
    case "pre":
      return `\`\`\`\n${children.trim()}\n\`\`\`\n\n`;
    case "blockquote":
      return `> ${children.trim().replace(/\n/g, "\n> ")}\n\n`;
    case "ul":
      return `${children}\n`;
    case "ol":
      return `${children}\n`;
    case "li": {
      const isTask = el.getAttribute("data-type") === "taskItem";
      const isChecked = el.getAttribute("data-checked") === "true";
      const prefix = isTask ? (isChecked ? "- [x] " : "- [ ] ") : "- ";
      return `${prefix}${children.trim()}\n`;
    }
    case "a": {
      const href = el.getAttribute("href") || "#";
      return `[${children}](${href})`;
    }
    case "img": {
      const src = el.getAttribute("src") || "";
      const alt = el.getAttribute("alt") || "Image";
      return `![${alt}](${src})\n\n`;
    }
    case "br":
      return "\n";
    case "hr":
      return "---\n\n";
    default:
      return children;
  }
}

export function htmlToMarkdown(htmlString: string, title: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, "text/html");
  const markdownBody = elementToMarkdown(doc.body).trim();
  return `# ${title}\n\n${markdownBody}`;
}

export function downloadFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export function exportNoteAsMarkdown(title: string, htmlContent: string) {
  const markdown = htmlToMarkdown(htmlContent, title);
  const safeFilename = `${title.replace(/[^a-z0-9_-]/gi, "_").toLowerCase() || "note"}.md`;
  downloadFile(safeFilename, markdown, "text/markdown;charset=utf-8");
}

export function exportNoteAsHtml(title: string, htmlContent: string) {
  const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 2rem auto; padding: 0 1rem; line-height: 1.6; color: #1e293b; }
    h1, h2, h3 { color: #0f172a; }
    code { background: #f1f5f9; padding: 0.2em 0.4em; border-radius: 4px; font-family: monospace; }
    pre { background: #1e293b; color: #f8fafc; padding: 1rem; border-radius: 8px; overflow-x: auto; }
    blockquote { border-left: 4px solid #cbd5e1; margin: 0; padding-left: 1rem; color: #64748b; }
    img { max-width: 100%; height: auto; border-radius: 8px; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  ${htmlContent}
</body>
</html>`;
  const safeFilename = `${title.replace(/[^a-z0-9_-]/gi, "_").toLowerCase() || "note"}.html`;
  downloadFile(safeFilename, fullHtml, "text/html;charset=utf-8");
}

export function exportNoteAsText(title: string, bodyText: string) {
  const content = `${title}\n${"=".repeat(title.length)}\n\n${bodyText}`;
  const safeFilename = `${title.replace(/[^a-z0-9_-]/gi, "_").toLowerCase() || "note"}.txt`;
  downloadFile(safeFilename, content, "text/plain;charset=utf-8");
}
