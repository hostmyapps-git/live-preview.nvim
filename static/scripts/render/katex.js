export function renderMath(rootEl) {
	if (window.renderMathInElement) {
		window.renderMathInElement(rootEl, {
			delimiters: [
				{ left: "$$", right: "$$", display: true },
				{ left: "$", right: "$", display: false }
			],
			strict: false
		});
	}
}
