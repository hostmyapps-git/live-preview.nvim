let mermaidInitialized = false;

export async function loadMermaidIconPacks(cfg) {
	const jsonFiles = cfg.mermaid?.iconsets || [];
	if (!jsonFiles.length) return;

	const packs = jsonFiles.map(json => ({
		name: json.name,
		loader: () => fetch(json.path).then(res => res.json())
	}));

	try {
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
