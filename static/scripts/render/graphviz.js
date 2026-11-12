export async function renderGraphviz(format="markdown") {
	let blocks = [];
	const langIdentifier='dot';
	if (format === "markdown") {
		blocks = document.querySelectorAll(`code.language-${langIdentifier}`);
	} 
	else if (format === "textile") {
		blocks = document.querySelectorAll(`code.${langIdentifier}`);
	}
	if (!window.Viz || typeof window.Viz.instance !== "function") return;

	const promises = Array.from(blocks).map(async block => {
		const source = block.textContent;
		const container = document.createElement("div");
		try {
			const images = await extractGraphvizImages(source);
			const viz = await Viz.instance();
			const svg = await viz.renderSVGElement(
				source,
				{
					images: images.map(({name,width,height})=>({
						name,
						width,
						height
					}))
				}
			);
			const urls = new Map(images.map(({name,url})=>[name,url]));
			const xlink="http://w3.org/1999/xlink";
			for (const element of svg.querySelectorAll("image")){
				const name = element.getAttribute("href")??
					element.getAttributeNS(xlink,"href");
				if (urls.has(name)){
					element.setAttribute("href",urls.get(name));
					element.setAttributeNS(xlink,"xlink:href",urls.get(name));
				}
			}
			container.appendChild(svg);
		} catch (err) {
			console.error("[viz.js] Error:", err);
			container.innerHTML = `<div class="error"><strong>Graphviz Error:</strong><br>${err.message || err}</div>`;
		}
		block.parentElement.replaceWith(container);
	});

	await Promise.all(promises);
}

async function extractGraphvizImages(source){
	const paths=new Set();
	for (const match of source.matchAll(/\bimage\s*=\s*"([^"]+)"/gi)){
		paths.add(match[1]);
	}
	for (const match of source.matchAll(/<IMG\b[^>]*\bSRC\s*=\s*"([^"]+)"/gi)){
		paths.add(match[1]);
	}
	return Promise.all(Array.from(paths,async name => {
		const url = new URL(name,document.baseURI).href;
		const image = new Image();
		await new Promise((resolve, reject) => {
			image.onload = resolve;
			image.onerror = () => reject(new Error(`Image not loaded: ${url}`));
			image.src = url;
		});
		if (!image.naturalWidth||!image.naturalHeight){
			throw new Error(`Image with non-valid dimension: ${url}`);
		}
		return{
			name,
			url,
			width: image.naturalWidth,
			height: image.naturalHeight
		};
	}));
}
