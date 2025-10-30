export function appendInlinedStyles(cfg) {
	if (!Array.isArray(cfg._inlined_styles)) return;

	cfg._inlined_styles.forEach(style => {
		// check if there is already a style with the same name loaded
		let existing = document.head.querySelector(`style[data-name="${style.name}"]`);

		if (!existing) {
			// create style
			existing = document.createElement("style");
			existing.dataset.name = style.name;
			document.head.appendChild(existing);
			console.log(`🧩 Style added: ${style.name}`);
		}

		// update only if style changed
		if (existing.textContent !== style.content) {
			existing.textContent = style.content;
			console.log(`🔁 Style updated: ${style.name}`);
		}
	});
}

export function appendInlinedScripts(cfg) {
	if (Array.isArray(cfg._inlined_scripts)) {
		cfg._inlined_scripts.forEach(script => {
			const tag = document.createElement("script");
			tag.textContent = script.content;
			tag.dataset.name = script.name;
			document.body.appendChild(tag);
		});
	}
}

export function smoothScrollTo(data) {
	if (!Array.isArray(data.cursor)) return;
	const line = data.cursor[0];
	const textLines = data.content.split("\n");
	const targetText = textLines[line - 1];

	const allBlocks = document.querySelectorAll("pre, code, div, p, table, li");
	for (const el of allBlocks) {
		if ((el.textContent || "").trim() === targetText.trim()) {
			el.scrollIntoView({ behavior: "smooth", block: "nearest" });
			break;
		}
	}
}

function svgToPng(svg, filename = "diagram.png", scale = 2, background = null) {
  // only Root-SVGs, no KaTeX
  if (svg.ownerSVGElement || svg.closest(".katex")) return;
  // clone and inline styles
  const clone = svg.cloneNode(true);
  inlineUseElements(clone);
  inlineActiveStyles(clone);
  inlineComputedStyles(clone);
  fixViewBox(clone);
  // detect size
  const vb = clone.viewBox && clone.viewBox.baseVal;
  const width  = vb ? vb.width  : parseFloat(clone.getAttribute("width"))  || svg.clientWidth  || 800;
  const height = vb ? vb.height : parseFloat(clone.getAttribute("height")) || svg.clientHeight || 600;
  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(clone);
  const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.floor(width  * scale));
    canvas.height= Math.max(1, Math.floor(height * scale));
    const ctx = canvas.getContext("2d");
    // optional background (e.g. white for dark-themes)
    if (background) {
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    // apply viewBox-Offsets
    if (vb) {
      ctx.scale(scale, scale);
      ctx.drawImage(img, -vb.x, -vb.y, width, height);
    } else {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    }
    canvas.toBlob((pngBlob) => {
      const pngUrl = URL.createObjectURL(pngBlob);
      const a = document.createElement("a");
      a.href = pngUrl;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(pngUrl);
      URL.revokeObjectURL(url);
    }, "image/png");
  };
  img.onerror = () => URL.revokeObjectURL(url);
  img.src = url;
}

//apply use elements (escape colons)
function inlineUseElements(svg) {
	// Collect all <use> elements that reference a symbol
	const uses = svg.querySelectorAll("use[href], use[xlink\\:href]");
	if (!uses.length) return;
	// Ensure a <defs> section exists in the target SVG
	let defs = svg.querySelector("defs");
	if (!defs) {
		defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
		svg.prepend(defs);
	}
	const added = new Set(); // Keep track of already-copied symbols
	uses.forEach(use => {
		const ref = use.getAttribute("href") || use.getAttribute("xlink:href");
		if (!ref || !ref.startsWith("#")) return;
		// Extract fragment name (e.g., "#lucide:server" → "lucide:server")
		const fragment = ref.slice(1);
		const safeSelector = `#${CSS.escape(fragment)}`;
		// Look up the symbol in the global document (outside of the cloned SVG)
		const symbol = document.querySelector(safeSelector);
		if (!symbol) {
			console.warn(`[inlineUseElements] No symbol found for ${ref}`);
			return;
		}
		// Copy only once per symbol
		if (added.has(fragment)) return;
		// Clone the symbol (deep copy) and append to defs
		const clonedSymbol = symbol.cloneNode(true);
		defs.appendChild(clonedSymbol);
		added.add(fragment);
	});
	console.log(`[inlineUseElements] Added ${added.size} <symbol> definitions to <defs>.`);
}

// copy stylesheets
function inlineActiveStyles(svg) {
	const styleTag = document.createElement("style");
	let cssText = "";
	const excludeList = ["katex.min.css", "default.min.css", "default.css"];
	for (const sheet of document.styleSheets) {
		// Skip excluded CSS files
		if (sheet.href && excludeList.some(ex => sheet.href.endsWith(ex))) {
			console.log("[inlineActiveStyles] Skipping excluded stylesheet:", sheet.href);
			continue;
		}
		try {
			for (const rule of sheet.cssRules) {
				cssText += rule.cssText + "\n";
			}
		} catch (err) {
			// ignore external files
			console.warn("[inlineActiveStyles] Access denied", sheet.href);
		}
	}
	styleTag.textContent = cssText;
	svg.prepend(styleTag);
}

// apply calculated styles 
function inlineComputedStyles(svg) {
	const elements = svg.querySelectorAll("*");
	elements.forEach(el => {
		const computed = getComputedStyle(el);
		const style = [];
		// 🔹 1. Relevant visual Styles 
		for (const prop of computed) {
			if (
				prop.startsWith("fill") ||
					prop.startsWith("stroke") ||
					prop.startsWith("color") ||
					prop.startsWith("font") ||
					prop.startsWith("width") ||
					prop.startsWith("height")
			) {
				style.push(`${prop}:${computed.getPropertyValue(prop)};`);
			}
		}
		// 🔹 2. CSS Custom Properties 
		const scale = parseFloat(computed.getPropertyValue("--scale")) || 1;
		const translateX = computed.getPropertyValue("--translateX") || "0px";
		const translateY = computed.getPropertyValue("--translateY") || "0px";
		// 🔹 3. Falls ein scale oder translate definiert ist, auf das Element anwenden
		if (scale !== 1 || translateX !== "0px" || translateY !== "0px") {
			const existingTransform = computed.getPropertyValue("transform");
			const newTransform = `${existingTransform} translate(${translateX},${translateY}) scale(${scale})`.trim();
			style.push(`transform:${newTransform};`);
			style.push("transform-box:fill-box;");
			style.push("transform-origin:center;");
		}
		// 🔹 4. apply existing styles
		if (style.length > 0) {
			el.setAttribute("style", style.join(""));
		}
	});
}

function fixViewBox(svg) {
const SVG_NS = "http://www.w3.org/2000/svg";
  const res = { changed: false, dx: 0, dy: 0, viewBox: null };
  // Only process root SVG elements (not nested ones)
  if (svg.ownerSVGElement) return res;
  // Avoid running twice on the same element
  if (svg.__viewBoxFixed) {
    const vb = svg.getAttribute("viewBox");
    if (vb) {
      const [x, y, w, h] = vb.trim().split(/[\s,]+/).map(Number);
      res.viewBox = { x, y, width: w, height: h };
    }
    return res;
  }
  // 1️⃣ If there is no valid viewBox → derive it from geometry
  let vbAttr = svg.getAttribute("viewBox");
  if (!vbAttr || /^0\s+0\s+0\s+0$/.test(vbAttr)) {
    try {
      const bbox = svg.getBBox();
      const width  = bbox && isFinite(bbox.width)  && bbox.width  > 0
        ? bbox.width  : parseFloat(svg.getAttribute("width"))  || svg.clientWidth  || 100;
      const height = bbox && isFinite(bbox.height) && bbox.height > 0
        ? bbox.height : parseFloat(svg.getAttribute("height")) || svg.clientHeight || 100;
      svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
      // Ensure responsive sizing (doesn't affect export)
      if (!svg.hasAttribute("width"))  svg.setAttribute("width",  width);
      if (!svg.hasAttribute("height")) svg.setAttribute("height", height);
      svg.style.maxWidth = "100%";
      svg.style.height = "auto";
      svg.style.display = "block";
      res.changed = true;
      res.viewBox = { x: 0, y: 0, width, height };
    } catch (e) {
      console.warn("[fixViewBox] getBBox() not available:", e);
    }
  }
  // 2️⃣ If viewBox has negative coordinates → shift content into visible area
  vbAttr = svg.getAttribute("viewBox");
  if (vbAttr) {
    const parts = vbAttr.trim().split(/[\s,]+/).map(Number);
    if (parts.length === 4 && parts.every(Number.isFinite)) {
      let [vx, vy, vw, vh] = parts;
      const needX = vx < 0;
      const needY = vy < 0;
      if (needX || needY) {
        const dx = needX ? -vx : 0;
        const dy = needY ? -vy : 0;
        const newW = vw + (needX ? -vx : 0);
        const newH = vh + (needY ? -vy : 0);
        // Wrap all children into a translated <g>
        const wrapper = document.createElementNS(SVG_NS, "g");
        while (svg.firstChild) wrapper.appendChild(svg.firstChild);
        const prevT = wrapper.getAttribute("transform") || "";
        const translate = `translate(${dx} ${dy})`;
        wrapper.setAttribute("transform", prevT ? `${translate} ${prevT}` : translate);
        svg.appendChild(wrapper);
        // Set the normalized viewBox (0,0,…)
        svg.setAttribute("viewBox", `0 0 ${newW} ${newH}`);
        res.changed = true;
        res.dx = dx;
        res.dy = dy;
        res.viewBox = { x: 0, y: 0, width: newW, height: newH };
      } else if (!res.viewBox) {
        res.viewBox = { x: vx, y: vy, width: vw, height: vh };
      }
    }
  }
  svg.__viewBoxFixed = true;
  return res;
}

// Inject minimal CSS once for consistent styling
function ensureToolbarStyles() {
  if (document.getElementById("svg-export-toolbar-styles")) return;
  const style = document.createElement("style");
  style.id = "svg-export-toolbar-styles";
  style.textContent = `
    .svg-export-toolbar {
      display: flex;
      gap: .5rem;
      align-items: center;
      flex-wrap: wrap;
      margin: .5rem 0 1rem 0;
      padding: .5rem .5rem;
      border: 1px solid var(--toolbar-border, rgba(0,0,0,.1));
      border-radius: .5rem;
      background: var(--toolbar-bg, rgba(0,0,0,.03));
    }
    .svg-export-btn {
      appearance: none;
      border: 1px solid var(--btn-border, rgba(0,0,0,.2));
      background: var(--btn-bg, #fff);
      border-radius: .375rem;
      padding: .35rem .6rem;
      font-size: .9rem;
      line-height: 1.1;
      cursor: pointer;
      transition: transform .02s ease-in-out, background .15s, border-color .15s;
    }
    .svg-export-btn:hover { background: var(--btn-bg-hover, #f6f6f6); }
    .svg-export-btn:active { transform: translateY(1px); }
    /* Dark theme defaults (adjust if you already have CSS variables) */
    [data-theme="dark"] .svg-export-toolbar {
      --toolbar-bg: rgba(255,255,255,.04);
      --toolbar-border: rgba(255,255,255,.12);
      --btn-bg: #141414;
      --btn-bg-hover: #1c1c1c;
      --btn-border: rgba(255,255,255,.18);
      color: #eaeaea;
    }
  `;
  document.head.appendChild(style);
}

/**
 * Create a toolbar element with unified buttons and attach click handlers.
 */
function createExportToolbar(svg, index) {
  const toolbar = document.createElement("div");
  toolbar.className = "svg-export-toolbar";
  toolbar.dataset.forSvg = "true";
  // SVG button
  const btnSvg = document.createElement("button");
  btnSvg.type = "button";
  btnSvg.className = "svg-export-btn";
  btnSvg.textContent = "💾 Save SVG";
  // PNG button
  const btnPng = document.createElement("button");
  btnPng.type = "button";
  btnPng.className = "svg-export-btn";
  btnPng.textContent = "🖼️ Save PNG";
  // Click: save SVG
  btnSvg.addEventListener("click", () => {
    const clone = svg.cloneNode(true);
    inlineUseElements(clone);
    inlineActiveStyles(clone);
    inlineComputedStyles(clone);
    fixViewBox(clone);
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(clone);
    const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `diagram-${index + 1}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  });
  // Click: save PNG (white bg for dark theme)
  btnPng.addEventListener("click", () => {
    const theme = document.documentElement.getAttribute("data-theme") || "light";
    const bg = theme === "dark" ? "#ffffff" : null;
    svgToPng(svg, `diagram-${index + 1}.png`, 2, bg);
  });
  toolbar.appendChild(btnSvg);
  toolbar.appendChild(btnPng);
  return toolbar;
}

/**
 * Attach a unified toolbar under each eligible root <svg> inside #theMother.
 * - Buttons look the same (SVG + PNG)
 * - Toolbar is inserted directly after the SVG
 * - Safe to call multiple times (no duplicates)
 */
export function attachSvgDownloadToolbars() {
  ensureToolbarStyles();
  document.querySelectorAll("#theMother svg").forEach((svg, index) => {
    // Skip nested SVGs and KaTeX SVGs
    if (svg.ownerSVGElement) return;
    if (svg.closest(".katex")) return;
    // Skip if a toolbar already exists as the immediate next sibling
    const next = svg.nextElementSibling;
    if (next && next.classList && next.classList.contains("svg-export-toolbar")) return;
    // Insert a fresh toolbar
    const toolbar = createExportToolbar(svg, index);
    svg.insertAdjacentElement("afterend", toolbar);
  });
}

