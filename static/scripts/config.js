// 🌍 Globale standard config for LivePreview

export const config = {
	websocket: {
		url: "ws://localhost:8765",
		reconnectDelay: 1000,
		maxReconnectDelay: 30000,
	},

	plantuml: {
		server: "http://localhost:8080",
		defaultFormat: "svg",
	},

	mermaid: {
		startOnLoad: false,
		iconsets: [
			{ name: "logos", path: "iconpacks/logos.json" },
			{ name: "fa6-solid", path: "iconpacks/fa6-solid.json" },
			{ name: "tabler", path: "iconpacks/tabler.json" },
			{ name: "affinity", path: "iconpacks/affinity.json" },
			{ name: "lucide", path: "iconpacks/lucide.json" },
		],
	},

	svg: {
		iconsets: [
			{ name: "logos", path: "iconpacks/logos.json" },
			{ name: "fa6-solid", path: "iconpacks/fa6-solid.json" },
			{ name: "tabler", path: "iconpacks/tabler.json" },
			{ name: "affinity", path: "iconpacks/affinity.json" },
			{ name: "lucide", path: "iconpacks/lucide.json" },
		],
	},

	katex: {
		delimiters: [
			{ left: "$$", right: "$$", display: true },
			{ left: "$", right: "$", display: false },
		],
		strict: false,
	},

	general: {
		autoscroll: true,
		width: "100%",
	},
};
