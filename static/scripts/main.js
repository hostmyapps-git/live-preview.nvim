import { bootstrapLibraries } from "./bootstrap.js";
import { connectWebSocket } from "./websocket.js";
import { renderContent } from "./render/markdown.js";
import { renderMermaidBlocks, loadMermaidIconPacks } from "./render/mermaid.js";
import { renderPlantUML, updatePlantUmlImages } from "./render/plantuml.js";
import { renderGraphviz } from "./render/graphviz.js";
import { renderMath } from "./render/katex.js";
import { highlightAll } from "./render/highlight.js";
import { renderSvgImgBlocks } from "./render/svgimg.js";
import { loadSVGIconPacks } from "./svg/icons.js";
import { appendInlinedStyles, appendInlinedScripts, smoothScrollTo, attachSvgDownloadButtons } from "./utils.js";

const theMother = document.querySelector("#theMother");
let mermaidIconsRegistered = false;
let svgIconsRegistered = false;

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

export async function handleMessage(data) {
	try {
		const cfg = data.config || {};
		console.log(cfg);
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
		renderPlantUML();
		renderMath(theMother);
		highlightAll();
		// insert download buttons
		attachSvgDownloadButtons(theMother);

		appendInlinedStyles(cfg);
		appendInlinedScripts(cfg);
		smoothScrollTo(data);

	} catch (err) {
		theMother.innerHTML = `<pre>Parse Error: ${err.message}</pre>`;
	}
}

// Start WebSocket
connectWebSocket(handleMessage);
