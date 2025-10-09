export async function renderGraphviz() {
  const blocks = document.querySelectorAll("code.language-dot");
  if (!window.Viz || typeof window.Viz.instance !== "function") return;

  const viz = await Viz.instance();
  const promises = Array.from(blocks).map(async block => {
    const source = block.textContent;
    try {
      const svg = await viz.renderSVGElement(source);
      const container = document.createElement("div");
      container.appendChild(svg);
      block.parentElement.replaceWith(container);
    } catch (err) {
      console.error("[viz.js] Error:", err);
    }
  });

  await Promise.all(promises);
}
