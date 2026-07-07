export function renderContent(data) {
	switch (data.format){
		case "markdown":
			return window.markdownit({ html: true }).render(data.content);
		case "textile":
			return window.textile(data.content);
		case "svg":
		case "html":
			return data.content;
		default:
			return `<pre>Unknown format: ${data.format}</pre>`;
	}
}
