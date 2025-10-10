const defs = document.getElementById("icon-defs");

/**
 * Register a single <symbol> element into the shared <defs>.
 */
export function registerSymbolFromIcon(json, iconName, icon) {
  const symbol = document.createElementNS("http://www.w3.org/2000/svg", "symbol");
  const width = icon.width || json.width || 24;
  const height = icon.height || json.height || 24;
  const left = icon.left || json.left || 0;
  const top = icon.top || json.top || 0;
  const prefix = json.prefix || "custom";
  const viewBox = icon.viewBox || json.viewBox || `${left} ${top} ${width} ${height}`;
  symbol.setAttribute("viewBox", viewBox);
  symbol.setAttribute("id", `${prefix}:${iconName}`);
  symbol.setAttribute("width", width);
  symbol.setAttribute("height", height);
  symbol.innerHTML = icon.body || icon.path || "";
  defs.appendChild(symbol);
}

/**
 * Load and register all SVG iconpacks (local or inline).
 */
export async function loadSVGIconPacks(cfg) {
  const localFiles = cfg.svg?.iconsets || [];
  const inlineFiles = cfg._inlined_iconsets?.filter(i => i.section === "svg") || [];

  if (!localFiles.length && !inlineFiles.length) {
    console.warn("[loadSVGIconPacks] No iconsets defined (svg nor inline)");
    return;
  }

  // 1️⃣ Lokale Iconpacks im static-Verzeichnis
  for (const iconset of localFiles) {
    const { name, path } = iconset;
    try {
      const resolvedPath = path.startsWith("/")
        ? path
        : "/" + path.replace(/^\.\//, "");
      console.log(`🌐 Fetching SVG iconpack from ${resolvedPath}`);
      const res = await fetch(resolvedPath);
      const data = await res.json();
      const icons = data.icons || data;
      Object.entries(icons).forEach(([iconName, icon]) =>
        registerSymbolFromIcon(data, iconName, icon)
      );
      console.log(`✅ Registered local SVG iconpack: ${name} (${Object.keys(icons).length} icons)`);
    } catch (err) {
      console.error(`❌ Failed to load SVG iconpack ${name}:`, err);
    }
  }

  // 2️⃣ Inline-Iconpacks außerhalb des Serverpfads
  for (const inline of inlineFiles) {
    try {
      console.log(`📦 Using inlined SVG iconpack: ${inline.name}`);
      const parsed = JSON.parse(inline.content);
      const icons = parsed.icons || parsed;
      Object.entries(icons).forEach(([iconName, icon]) =>
        registerSymbolFromIcon(parsed, iconName, icon)
      );
      console.log(`✅ Registered inline SVG iconpack: ${inline.name} (${Object.keys(icons).length} icons)`);
    } catch (err) {
      console.error(`❌ Failed to parse inline SVG iconpack "${inline.name}":`, err);
    }
  }
}
