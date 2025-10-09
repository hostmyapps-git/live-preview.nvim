const defs = document.getElementById("icon-defs");

export function registerSymbolFromIcon(json, iconName, icon) {
	const symbol = document.createElementNS("http://www.w3.org/2000/svg", "symbol");
	const width  = icon.width || json.width || 24;
	const height = icon.height || json.height || 24;
	const left   = icon.left || json.left || 0;
	const top    = icon.top || json.top || 0;
	const prefix = json.prefix || "custom";
	const viewBox = icon.viewBox || json.viewBox || `${left} ${top} ${width} ${height}`;

	symbol.setAttribute("viewBox", viewBox);
	symbol.setAttribute("id", `${prefix}:${iconName}`);
	symbol.setAttribute("width", width);
	symbol.setAttribute("height", height);
	symbol.innerHTML = icon.body || icon.path || "";
	defs.appendChild(symbol);
}

export async function loadSVGIconPacks(cfg) {
	const jsonFiles = cfg.svg?.iconsets || [];
	if (!jsonFiles.length) return;

	await Promise.all(jsonFiles.map(async json => {
		const data = await fetch(json.path).then(res => res.json());
		const icons = data.icons || data;
		Object.entries(icons).forEach(([name, icon]) => registerSymbolFromIcon(data, name, icon));
	}));
	console.log("🔗 SVG Iconpacks registered:", jsonFiles.map(p => p.name));
}
