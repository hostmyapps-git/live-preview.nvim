import { D2 } from "/libs/d2.js/index.js";

let d2InstancePromise=null;
let d2Instance=null;
const svgCache=new Map();

export function getD2(){
	if (d2Instance) return Promise.resolve(d2Instance);
	if (d2InstancePromise) return d2InstancePromise;
	d2InstancePromise = (async()=>{
		const inst=new D2();
		d2Instance=inst;
		return d2Instance;
	})();
	return d2InstancePromise;
}
export async function renderD2(format) {
	let d2Blocks = [];

	if (format === "markdown") {
		d2Blocks = document.querySelectorAll("code.language-d2");
	} else if (format === "textile") {
		mermaidBlocks = document.querySelectorAll("code.d2");
	}

	// Convert all code blocks into .mermaid containers
	if (d2Blocks.length >=0) {
		try{
			const d2 = await getD2();
			for(const block of d2Blocks){
				const source = block.textContent;
				console.log(source);
				const result = await d2.compile(source);
				console.log(result);
				const svgStr= await d2.render(result.diagram, result.renderOptions);
				const parser=new DOMParser();
				const svg=parser.parseFromString(svgStr,"image/svg+xml").documentElement;
				block.parentElement.replaceWith(svg);
			}
		} catch (err){
			console.error("[D2 Handler] Fehler beim Parsen: ", err);
		}
	}
}
