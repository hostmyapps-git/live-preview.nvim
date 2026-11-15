export async function renderArch(format = "markdown", root = document) {
  const selectors = {
    markdown: "code.language-arch",
    textile: "code.arch"
  };

  const selector = selectors[format];

  if (!selector) {
    throw new Error(`[arch.js] Unbekanntes Format: ${format}`);
  }

  if (typeof window.arch?.renderAll !== "function") {
    console.warn("[arch.js] Bibliothek ist noch nicht geladen.");
    return [];
  }

  return window.arch.renderAll({
    root,
    selector
  });
}
