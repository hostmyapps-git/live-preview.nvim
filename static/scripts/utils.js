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

export function attachSvgDownloadButtons() {
	document.querySelectorAll("#theMother svg").forEach((svg, index) => {
		const btn = document.createElement("button");
		// avoid katex svg elementes
		if (svg.closest(".katex")) return;
		// avoid duplicated buttons
		if (svg.nextElementSibling?.classList?.contains("svg-download-btn")) return;
		btn.textContent = "⬇️ save";
		btn.classList.add("svg-download-btn");
		btn.style.display = "block";
		btn.style.margin = "1rem 0";
		btn.style.cursor = "pointer";
		btn.addEventListener("click", () => {
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
		svg.insertAdjacentElement("afterend", btn);
	});
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
	// 1️⃣apply only if no viewbox
	const vb = svg.getAttribute("viewBox");
	if (!vb || vb === "0 0 0 0") {
		try {
			const bbox = svg.getBBox();
			const width =
				parseFloat(svg.getAttribute("width")) || bbox.width || 100;
			const height =
				parseFloat(svg.getAttribute("height")) || bbox.height || 100;

			// 2️⃣viewbox fallback
			svg.setAttribute("viewBox", `0 0 ${width} ${height}`);

			// 3️⃣apply only if not exists
			if (!svg.hasAttribute("width")) svg.setAttribute("width", width);
			if (!svg.hasAttribute("height")) svg.setAttribute("height", height);

			// 4️⃣responsive
			svg.style.maxWidth = "100%";
			svg.style.height = "auto";
			svg.style.display = "block";
		} catch (err) {
			console.warn("[fixViewBox] no bbox:", err);
		}
	}
}



