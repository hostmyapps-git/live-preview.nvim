export function connectWebSocket(onMessageCallback, url = "ws://localhost:8765") {
	let ws;
	let reconnectTimer = null;
	let reconnectDelay = 500;

	function connect() {
		if(reconnectTimer){
			clearTimeout(reconnectTimer);
			reconnectTimer=null;
		}
		if (ws){
			ws.onopen = null;
			ws.onmessage = null;
			ws.onclose = null;
			ws.onerror = null;
			try{
				ws.close();
			}
			catch (e){}
		}

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
			reconnectTimer = setTimeout(connect, reconnectDelay);
			reconnectDelay = Math.min(reconnectDelay * 1.5, 4000);
		};

		ws.onerror = (err) => {
			console.warn("[WebSocket ERROR]", err);
		};
	}

	connect();
}
