// render/svgimg.js
export function renderSvgImgBlocks(container) {
  const blocks = container.querySelectorAll("code.language-svgimg");
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
