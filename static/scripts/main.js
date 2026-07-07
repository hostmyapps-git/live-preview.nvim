import { bootstrapLibraries } from "./bootstrap.js";
import { connectWebSocket } from "./websocket.js";
import { renderContent } from "./render/base.js";
import { postProcessDocument } from "./render/pipeline.js";
import { loadMermaidIconPacks } from "./render/mermaid.js";
import { loadSVGIconPacks } from "./svg/icons.js";

const theMother = document.querySelector("#theMother");
let mermaidIconsRegistered = false;
let svgIconsRegistered = false;
let themeListenerRegistered = false;

function applyLuaConfig(cfg) {
	if (!cfg) return;
	const root = document.documentElement;
	const appearance = cfg.general?.defaultAppearance || "light";
	const currentAppearance=root.getAttribute("data-theme");
	if (!currentAppearance){
		root.setAttribute("data-theme", appearance);
		document.body.classList.remove("light", "dark");
		document.body.classList.add(appearance);
		document.getElementById("themeToggle").value=appearance;
	}
	const existingPlantUmlServer=root.getAttribute("data-plantuml-server");
	const hasUserValue = existingPlantUmlServer && existingPlantUmlServer.trim()!=="";
	if (cfg.plantuml?.server && !hasUserValue) {
		const normalized = cfg.plantuml.server.startsWith("http")
			? cfg.plantuml.server
			: `http://${cfg.plantuml.server}`;
		root.setAttribute("data-plantuml-server", normalized);
	}
	window._livePreviewConfig = cfg;
}

async function loadIconPacks(cfg) {
	if (!mermaidIconsRegistered) {
		await loadMermaidIconPacks(cfg);
		mermaidIconsRegistered = true;
	}
	if (!svgIconsRegistered) {
		await loadSVGIconPacks(cfg);
		svgIconsRegistered = true;
	}
}

function setupThemeDropdown(defaultAppearance = "light") {
	if (themeListenerRegistered) return;
	const select = document.getElementById("themeToggle");
	if (!select) return;
	const initial = defaultAppearance;
	document.documentElement.setAttribute("data-theme", initial);
	document.body.classList.remove("light", "dark");
	document.body.classList.add(initial);
	select.value = initial;
	select.addEventListener("change", (e) => {
		const value = e.target.value;
		document.documentElement.setAttribute("data-theme", value);
		document.body.classList.remove("light", "dark");
		document.body.classList.add(value);
	});
	themeListenerRegistered=true;
}

export async function handleMessage(data) {
	console.log(data);
	try {
		const cfg = data.config || {};
		applyLuaConfig(cfg);
		bootstrapLibraries(cfg);
		theMother.innerHTML = renderContent(data);
		if (!(mermaidIconsRegistered && svgIconsRegistered)) {
			await loadIconPacks(cfg);
		}
		if (data.format === "svg") {
			const svgEl = theMother.querySelector("svg");
			if (svgEl) {
				svgEl.setAttribute("width", "100%");
				svgEl.setAttribute("height", "auto");
			}
		}
		await postProcessDocument(data, cfg, theMother);
		setupThemeDropdown(cfg.general?.defaultAppearance || "light");
	} catch (err) {
		theMother.innerHTML = `<pre>Parse Error: ${err.message}</pre>`;
	}
}

// Start WebSocket
connectWebSocket(handleMessage);
