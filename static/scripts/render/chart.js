export async function renderChartJs() {
	const blocks = document.querySelectorAll("code.language-chart");
	const promises = Array.from(blocks).map(async block => {
		const source = block.textContent;
		const container = document.createElement("div");
		container.classList.add("chartjs-container");
		container.style.position = "relative";
		container.style.minHeight = "120px";
		container.style.width="800px";
		container.style.border = "1px dashed #999";
		container.style.borderRadius = "8px";
		container.style.padding = "0.5rem";
		container.style.marginBottom = "1rem";
		container.style.background = "rgba(0,0,0,0.02)";
		container.style.display = "flex";
		container.style.alignItems = "center";
		container.style.justifyContent = "center";
		try {
			const config = JSON.parse(source);
			const canvas=document.createElement("canvas");
			container.classList.add("chartjs-container");
			container.appendChild(canvas);
			block.parentElement.replaceWith(container);
			const chart=new Chart(canvas.getContext("2d"),config);
		} catch (err) {
			const errorBox = document.createElement("div");
			errorBox.style.color = "#b00020";
			errorBox.style.background = "#fff0f0";
			errorBox.style.padding = "0.75rem";
			errorBox.style.border = "1px solid #b00020";
			errorBox.style.borderRadius = "6px";
			errorBox.style.fontFamily = "monospace";
			errorBox.style.fontSize = "0.9rem";
			errorBox.style.whiteSpace = "pre-wrap";
			errorBox.textContent =
				"⚠️ Fehler beim Rendern des Chart:\n" +
					(err.message || err.toString()) +
					"\n\nQuelle:\n" +
					source.substring(0, 300) + // nur den Anfang anzeigen
					(source.length > 300 ? "\n..." : "");

			block.parentElement.replaceWith(container);
			container.appendChild(errorBox);
		}
	});
	await Promise.all(promises);
}
