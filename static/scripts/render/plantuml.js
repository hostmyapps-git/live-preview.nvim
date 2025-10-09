let plantUmlServer = "http://localhost:8080";
const plantUmlControls = document.querySelector("#plantUmlControls");
const serverSelect = document.querySelector("#serverSelect");

if (serverSelect) {
	serverSelect.addEventListener("change", e => {
		plantUmlServer = e.target.value;
		updatePlantUmlImages();
	});
}

export function renderPlantUML() {
	const blocks = document.querySelectorAll("code.language-plantuml");
	if (blocks.length > 0) {
		plantUmlControls.style.display = "block";
	} else {
		plantUmlControls.style.display = "none";
	}

	blocks.forEach(block => {
		const source = block.textContent;
		const encoded = window.plantumlEncoder.encode(source);
		const imgUrl = `${plantUmlServer}/svg/${encoded}`;
		const img = document.createElement("img");
		img.classList.add("plantuml");
		img.dataset.source = source;
		img.src = imgUrl;
		img.alt = "PlantUML Diagram";
		img.loading = "lazy";
		block.parentElement.replaceWith(img);
	});
}

export function updatePlantUmlImages() {
	document.querySelectorAll("img.plantuml").forEach(img => {
		const source = img.dataset.source;
		const encoded = window.plantumlEncoder.encode(source);
		img.src = `${plantUmlServer}/svg/${encoded}`;
	});
}
