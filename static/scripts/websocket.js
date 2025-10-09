export function connectWebSocket(onMessageCallback, url = "ws://localhost:8765") {
	let ws;
	let reconnectDelay = 1000;

	function connect() {
		ws = new WebSocket(url);

		ws.onopen = () => {
			console.log(`[WebSocket] ✅ Connection established (${url})`);
			reconnectDelay = 1000;
		};

		ws.onmessage = (event) => {
			try {
				const data = JSON.parse(event.data);
				onMessageCallback(data);
			} catch (err) {
				console.error("[WebSocket] Parse Error:", err);
			}
		};

		ws.onclose = () => {
			console.warn(`[WebSocket] ⚠️ Connection lost – Reconnect in ${reconnectDelay}ms`);
			setTimeout(connect, reconnectDelay);
			reconnectDelay = Math.min(reconnectDelay * 2, 30000);
		};

		ws.onerror = (err) => {
			console.error("[WebSocket ERROR]", err.message);
			ws.close();
		};
	}

	connect();
}
