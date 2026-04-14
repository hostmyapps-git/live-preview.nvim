
export async function renderTikzBlocks(format) {
	let tikzBlocks = [];

	if (format === "markdown") {
		tikzBlocks = document.querySelectorAll("code.language-tikz");
	} else if (format === "textile") {
		tikzBlocks = document.querySelectorAll("code.tikz");
	}

	// Convert all code blocks into .tikz containers
	tikzBlocks.forEach(block => {
		const source = block.textContent;
		const container = document.createElement("div");
		container.classList.add("tikz");
		container.textContent = source;
		block.parentElement.replaceWith(container);
	});
	await Tikz.renderAll();
}
