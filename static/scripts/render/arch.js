export async function loadArchIconPacks(cfg = {}) {
  const arch = window.arch;
  if (typeof arch?.registerIconPack !== "function") {
    throw new Error("[arch.js] Library not loaded yet");
  }
  const registered = new Set(arch.getIconPacks());
  const loaded = [];
  const failed = [];
  // Inline first;
  // if not successful fetch
  const sources = [
    ...(cfg._inlined_iconsets || [])
      .filter(pack => pack?.section === "arch")
      .map(pack => ({ ...pack, inline: true })),
    ...(cfg.arch?.iconsets || [])
      .filter(pack => pack?.path)
      .map(pack => ({ ...pack, inline: false }))
  ];
  for (const pack of sources) {
    if (registered.has(pack.name)) continue;

    try {
      if (!pack.name) {
        throw new Error("Iconpack with no name.");
      }
      let data;
      if (pack.inline) {
        data = JSON.parse(pack.content);
      } else {
        if (pack.path.startsWith("~")) {
          throw new Error(
            "file path must be embedded by Preview-Plugin."
          );
        }
        const url = new URL(pack.path, document.baseURI);
        if (!["http:", "https:"].includes(url.protocol)) {
          throw new Error(
            "this pack needs to be provided inline"
          );
        }
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${url}`);
        }
        data = await response.json();
      }
      arch.registerIconPack(pack.name, data);
      registered.add(pack.name);
      loaded.push(pack.name);
    } catch (error) {
      failed.push({
        name: pack.name,
        path: pack.path,
        error
      });
      console.warn(
        `[arch.js] Iconpack "${pack.name ?? "(with  no name)"}" ` +
        "skipped",
        error
      );
    }
  }
  return { loaded, failed };
}

export async function renderArch(format = "markdown", root = document, cfg = {}) {
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
	await loadArchIconPacks(cfg);

	return window.arch.renderAll({
		root,
		selector
	});
}
