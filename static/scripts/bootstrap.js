// 🚀 Bootstrapper: load all global libs and init for all modules

export function bootstrapLibraries(injectedConfig) {
	// Use the config from the message, or from global scope, or fallback defaults
	const config =
		injectedConfig ||
			window.livePreviewConfig ||
			{
				mermaid: { startOnLoad: false },
				stylesheets: [],
				libraries: [],
			};

	// Markdown
	if (!window.markdownit) {
		console.warn("⚠️ markdown-it not found. Did you include markdown-it.min.js?");
	} else {
		window.md = window.markdownit({ html: true });
	}

	// Textile
	if (!window.textile) {
		console.warn("⚠️ textile.js not found. Textile rendering disabled.");
	}

	// Mermaid
	if (!window.mermaid) {
		console.warn("⚠️ mermaid.min.js not found. Mermaid diagrams disabled.");
	} 
	// Highlight.js
	if (!window.hljs) {
		console.warn("⚠️ highlight.js not found. Syntax highlighting disabled.");
	}

	// KaTeX
	if (!window.renderMathInElement) {
		console.warn("⚠️ KaTeX not found. Math rendering disabled.");
	}
}
