import { bootstrapLibraries } from "./bootstrap.js";
import { connectWebSocket } from "./websocket.js";
import { renderContent } from "./render/markdown.js";
import { renderMermaidBlocks, loadMermaidIconPacks } from "./render/mermaid.js";
import { ensurePlantUmlControls, renderPlantUML, updatePlantUmlImages } from "./render/plantuml.js";
import { renderGraphviz } from "./render/graphviz.js";
import { renderChartJs } from "./render/chart.js";
import { renderMath } from "./render/katex.js";
import { highlightAll } from "./render/highlight.js";
import { renderSvgImgBlocks } from "./render/svgimg.js";
import { loadSVGIconPacks } from "./svg/icons.js";
import { appendInlinedStyles, appendInlinedScripts, smoothScrollTo, attachSvgDownloadButtons } from "./utils.js";

const theMother = document.querySelector("#theMother");
let mermaidIconsRegistered = false;
let svgIconsRegistered = false;
let themeListenerRegistered = false;

function applyLuaConfig(cfg) {
	if (!cfg) return;
	const root = document.documentElement;
	const appearance = cfg.general?.defaultAppearance || "light";
	root.setAttribute("data-theme", appearance);
	document.body.classList.remove("light", "dark");
	document.body.classList.add(appearance);
	document.getElementById("themeToggle").value=appearance;
	if (cfg.plantuml?.server) {
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
		let html = "";
		if (data.format === "markdown") {
			html = md.render(data.content);
		} else if (data.format === "textile") {
			html = textile(data.content);
		} else if (data.format === "svg") {
			html = data.content; // 🔹 apply svg directly
		} else {
			html = "<pre>Unknown format: " + data.format + "</pre>";
			let html = renderContent(data);
		}
		theMother.innerHTML = html;
		renderSvgImgBlocks(theMother);

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

		// call Renderer
		await renderMermaidBlocks(data.format);
		await renderGraphviz();
		await renderChartJs();
		renderPlantUML();
		renderMath(theMother);
		highlightAll();
		// insert download buttons
		attachSvgDownloadButtons(theMother);
		appendInlinedStyles(cfg);
		appendInlinedScripts(cfg);
		smoothScrollTo(data);
		setupThemeDropdown(cfg.general?.defaultAppearance || "light");
	} catch (err) {
		theMother.innerHTML = `<pre>Parse Error: ${err.message}</pre>`;
	}
}

// Start WebSocket
connectWebSocket(handleMessage);
