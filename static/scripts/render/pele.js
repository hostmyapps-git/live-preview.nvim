export async function renderPele(format="markdown") {
	let blocks = [];
	const langIdentifier='pele';
	if (format === "markdown") {
		blocks = document.querySelectorAll(`code.language-${langIdentifier}`);
	} 
	else if (format === "textile") {
		blocks = document.querySelectorAll(`code.${langIdentifier}`);
	}
	if (!window.pele) return;
	const peleOptions = {
		icons: (name) => {
			try{
				const safeSelector=`#${CSS.escape(name)}`;
				const symbol = document.querySelector(safeSelector);
				if (symbol) {
					const svg=document.createElementNS("http://www.w3.org/2000/svg","svg");
					svg.setAttribute("viewBox",symbol.getAttribute("viewBox") || "0 0 24 24");
					svg.setAttribute("width","24");
					svg.setAttribute("height","24");
					svg.innerHTML=symbol.innerHTML;
					return svg.outerHTML;
				}
			}
			catch (e){
				console.error("[Pele Icons] Icon Error: ",name,e);
			}
			return null;
		}
	};

	const promises = Array.from(blocks).map(async block => {
		try {
			await pele.mount (block, block.textContent, peleOptions);
		} catch (err) {
			console.error("[pele.js] Error:", err);
		}
	});

	await Promise.all(promises);
}
