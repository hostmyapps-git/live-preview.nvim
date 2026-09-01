let plantUmlServer = "http://localhost:8080";
const plantUmlControls = document.querySelector("#plantUmlControls");
const serverSelect = document.querySelector("#serverSelect");

export function ensurePlantUmlControls() {
	const hasPlantUml = document.querySelector("code.language-plantuml") || document.querySelector("code.plantuml") || document.querySelector("img.plantuml");
	const existing = document.getElementById("plantUmlControls");
	if (!hasPlantUml) {
		console.log("no plantuml controls required");
		if (existing) existing.remove();
		return;
	}
	if (existing) return; 
	const dynamicArea = document.getElementById("dynamicControls");
	if (!dynamicArea) return;
	const controls = document.createElement("div");
	controls.id = "plantUmlControls";
	controls.innerHTML = `
<label for="serverSelect">🌐 PlantUML-Server:</label>
<select id="serverSelect">
	<option value="https://www.plantuml.com/plantuml">plantuml.com</option>
	<option value="http://localhost:8080" selected>localhost:8080</option>
</select>
`;
	dynamicArea.appendChild(controls);
	const serverSelect = controls.querySelector("#serverSelect");
	serverSelect.addEventListener("change", (e) => {
		plantUmlServer = e.target.value;
		document.documentElement.setAttribute("data-plantuml-server", plantUmlServer);
		updatePlantUmlImages();
	});
}

function removePlantUmlControls(){
	if (document.getElementById("plantUmlControls")) document.getElementById("plantUmlControls").remove();
		document.documentElement.removeAttribute("data-plantuml-server");
	return true;
}

export function renderPlantUML(format="markdown") {
	console.log("enter renderPlantUML");
	let blocks = [];
	const langIdentifier='plantuml';
	if (format === "markdown") {
		blocks = document.querySelectorAll(`code.language-${langIdentifier}`);
	} 
	else if (format === "textile") {
		blocks = document.querySelectorAll(`code.${langIdentifier}`);
	}
	const plantUmlImages = document.querySelectorAll("img.plantuml");
	console.log("[renderPlantUML]", blocks, blocks.length, plantUmlImages, plantUmlImages.length);
	if (!blocks.length && !plantUmlImages.length) {
		const c = removePlantUmlControls()
		console.log("[renderPlantUML]", "controls removed");
		return c;
	}
	ensurePlantUmlControls();
	console.log("[renderPlantUML]", "plantuml Controls established");
	plantUmlServer = document.documentElement.getAttribute("data-plantuml-server") || plantUmlServer;
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
