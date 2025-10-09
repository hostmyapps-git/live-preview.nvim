export function highlightAll() {
	document.querySelectorAll("pre code").forEach(block => {
		window.hljs.highlightElement(block);
	});
}
