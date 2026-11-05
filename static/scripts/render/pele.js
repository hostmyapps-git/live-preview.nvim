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

	const promises = Array.from(blocks).map(async block => {
		try {
			await pele.mount (block, block.textContent);
		} catch (err) {
			console.error("[pele.js] Error:", err);
		}
	});

	await Promise.all(promises);
}
