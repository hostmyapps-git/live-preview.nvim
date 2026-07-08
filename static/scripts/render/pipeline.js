import { renderMermaidBlocks } from "./mermaid.js";
import { renderGraphviz } from "./graphviz.js";
import { renderChartJs } from "./chart.js";
import { renderPlantUML } from "./plantuml.js";
import { renderTikzBlocks } from "./tikz.js";
import { renderSvgImgBlocks } from "./svgimg.js";
import { renderD2 } from "./d2.js";
import { renderMath } from "./katex.js";
import { highlightAll } from "./highlight.js";
import { appendInlinedStyles, appendInlinedScripts, smoothScrollTo, attachSvgDownloadToolbars } from "../utils.js";

export async function postProcessDocument(data, cfg, root) {
	const format = data?.format || "markdown";
	const steps = [
		() => renderMermaidBlocks(format),
		() => renderGraphviz(),
		() => renderChartJs(),
		() => renderPlantUML(),
		() => renderTikzBlocks(format),
		() => renderSvgImgBlocks(format),
		() => renderD2(format),
		() => renderMath(root),
		() => highlightAll(),
		() => attachSvgDownloadToolbars(),
		() => appendInlinedStyles(cfg),
		() => appendInlinedScripts(cfg),
		() => smoothScrollTo(data),
	];
	for (const step of steps) {
		try{
			await step();
		}
		catch (err){
			console.error(err);
		}
	}
}
