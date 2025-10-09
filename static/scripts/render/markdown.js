export function renderContent(data) {
	if (data.format === "markdown") return window.markdownit({ html: true }).render(data.content);
	if (data.format === "textile") return window.textile(data.content);
	return `<pre>Unknown format: ${data.format}</pre>`;
}
