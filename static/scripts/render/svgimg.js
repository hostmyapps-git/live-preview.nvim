// render/svgimg.js
export function renderSvgImgBlocks(format) {
	let blocks = [];

	if (format === "markdown") {
		blocks = document.querySelectorAll("code.language-svgimg");
	} else if (format === "textile") {
		blocks = document.querySelectorAll("code.svgimg");
	}
  blocks.forEach(block => {
    try {
      const div = document.createElement("div");
      div.innerHTML = block.textContent;
      const svg = div.querySelector("svg");
      if (svg) {
        svg.classList.add("inline-svg");
        block.parentElement.replaceWith(svg);
      }
    } catch (err) {
      console.error("[SVGIMG Handler] Fehler beim Parsen:", err);
    }
  });
}
