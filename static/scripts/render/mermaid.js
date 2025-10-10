let mermaidInitialized = false;

export async function loadMermaidIconPacks(cfg) {
	const packs = [];
	const added = new Set();
	console.group("🧩 Mermaid Iconpack Loader");
	// 1️⃣Local iconpacks → fetch 
	for (const json of cfg.mermaid?.iconsets || []) {
		if (!json.path) continue;
		if (added.has(json.name)) {
			console.log(`⏭️ Skipping duplicate (already added): ${json.name}`);
			continue;
		}
		// identify abolute pathes (~ oder /Users/) vs. /iconpacks/
		const isExternalPath = json.path.startsWith("~") || json.path.startsWith("/") && !json.path.startsWith("/iconpacks/");
		if (isExternalPath) {
			console.warn(`⚠️ Skipping external path (should be inlined): ${json.path}`);
			continue;
		}
		console.log("🌐 Fetching iconpack from", json.path);
		added.add(json.name);
		packs.push({
			name: json.name,
			loader: async () => {
				try {
					const res = await fetch(json.path);
					if (!res.ok) throw new Error(`HTTP ${res.status}`);
					const data = await res.json();
					console.log(data);
					console.log(`✅ Loaded ${json.name}:`, Object.keys(data.icons || data).length, "icons");
					return data;
				} catch (err) {
					console.error(`❌ Failed to load iconpack ${json.name}:`, err);
					return {};
				}
			}
		});
	}
	// 2️⃣ Inline-Iconpacks aus cfg._inlined_iconsets
	for (const inline of cfg._inlined_iconsets || []) {
		if (inline.section !== "mermaid") continue;
		if (added.has(inline.name)) {
			console.log(`⏭️ Skipping duplicate inline pack: ${inline.name}`);
			continue;
		}
		console.log("📦 Using inlined iconpack:", inline.name);
		try {
			console.log(inline.name, inline);
			const parsed = JSON.parse(inline.content);
			const icons = parsed.icons || parsed;
			for (const [name, icon] of Object.entries(icons)) {
				console.log(icon);
				const w = icon.width || parsed.width || 24;
				const h = icon.height || parsed.height || 24;
				icon.width = String(w);
				icon.height = String(h);
				if (!icon.viewBox) icon.viewBox = `0 0 ${w} ${h}`;
				console.log(icon.width, icon.height, icon.viewBox);
			}
			const iconCount = Object.keys(parsed.icons || parsed).length;
			console.log(`✅ Parsed inline pack "${inline.name}" with ${iconCount} icons`);
			packs.push({
				name: inline.name,
				loader: async () => { 
					try {
						const data = await Promise.resolve(parsed); 
						console.log(data);
						console.log(`✅ Loaded ${data.prefix}:`, Object.keys(data.icons || data).length, "icons");
						return data; 
					} catch (err) {
						console.error(`❌ Failed to load iconpack ${data.prefix}:`, err);
						return {};
					}
				}
			});
			added.add(inline.name);
		} catch (err) {
			console.error(`❌ Failed to parse inline iconpack "${inline.name}":`, err);
		}
	}
	console.groupEnd();
	// 3️⃣ register
	try {
		console.log(packs);
		window.mermaid.registerIconPacks(packs);
		console.log("🔗 Mermaid Iconpacks registered:", packs.map(p => p.name));
	} catch (err) {
		console.warn("[loadMermaidIconPacks] Failed to register icon packs:", err);
	}
}

export async function renderMermaidBlocks(format) {
	let mermaidBlocks = [];

	if (format === "markdown") {
		mermaidBlocks = document.querySelectorAll("code.language-mermaid");
	} else if (format === "textile") {
		mermaidBlocks = document.querySelectorAll("code.mermaid");
	}

	// Convert all code blocks into .mermaid containers
	mermaidBlocks.forEach(block => {
		const source = block.textContent;
		const container = document.createElement("div");
		container.classList.add("mermaid");
		container.textContent = source;
		block.parentElement.replaceWith(container);
	});

	// Initialize Mermaid once
	if (!mermaidInitialized) {
		mermaid.initialize({ startOnLoad: false });
		mermaidInitialized = true;
	}

	// Render and attach buttons once rendering is done
	try {
		await mermaid.init(undefined, document.querySelectorAll(".mermaid"));
		console.log("✅ Mermaid diagrams rendered");
	} catch (err) {
		console.error("[renderMermaidBlocks] Mermaid rendering failed:", err);
	}
}
