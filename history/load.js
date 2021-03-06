// Initialize scripts after the page is loaded

window.addEventListener('load', async () => {
	await ExtStorage.init();
	Formatter.init();
	ContextMenu.init();

	await CitationList.init();
	Main.init();
});
