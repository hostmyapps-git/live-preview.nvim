const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const path = require("path");
const bodyParser = require("body-parser");
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const payloadLimit = "100mb";
let lastContent = null;


// Middleware
app.use(bodyParser.text({ type: "*/*", limit: payloadLimit}));
app.use(express.static(path.join(__dirname, "static")));
app.use((err, req, res, next) => {
	const fs = require("fs");
	const path = require("path");
	const logPath = path.join(__dirname, "server_error.log");

	// catch typical bodyparser errors
	if (err.type === "entity.too.large" || err.status === 413) {
		const msg = `[${new Date().toISOString()}] ⚠️ Payload to large (${req.headers["content-length"] || "?"} Bytes), only ${payloadLimit} allowed.\n`;
		fs.appendFileSync(logPath, msg);
		console.error(msg.trim());
		return res.status(413).send("Payload Too Large");
	}

	// general fallback
	const msg = `[${new Date().toISOString()}] ❌ unexpected server error: ${err.message}\n`;
	fs.appendFileSync(logPath, msg);
	console.error(msg.trim());
	res.status(500).send("Internal Server Error");
});

// POST /update – Daten von Neovim empfangen
app.post("/update", (req, res) => {
	try {
		const data = JSON.parse(req.body);
		// 🔍 Debug-Log in Datei schreiben
		const fs = require("fs");
		fs.writeFileSync("last_payload.json", req.body);
		lastContent = data;

		wss.clients.forEach((client) => {
			if (client.readyState === WebSocket.OPEN) {
				client.send(JSON.stringify(data));
			}
		});

		res.sendStatus(200);
	} catch (e) {
		console.error("❌ Fehler beim Parsen:", e);
		res.sendStatus(400);
	}
});

// 🛑 POST /exit – Server beenden (z. B. bei VimLeave)
app.post("/exit", (req, res) => {
	console.log("🛑 Exit-Befehl empfangen – Server fährt runter.");
	res.sendStatus(200);
	clearInterval(interval);
	server.close(() => {
		console.log("Server process closed");
		process.exit(0);
	});
});

// WebSocket: Verbindung aufbauen + Ping/Pong
wss.on("connection", (ws) => {
	console.log("🔌 Browser verbunden");
	ws.isAlive = true;

	ws.on("pong", () => {
		ws.isAlive = true;
	});

	if (lastContent) {
		ws.send(JSON.stringify(lastContent));
	}
});

// ♻️ Ping alle 30 Sekunden → hält Verbindung aktiv
const interval = setInterval(() => {
	wss.clients.forEach((ws) => {
		if (ws.isAlive === false) {
			console.log("⚠️ Verbindung getrennt – WebSocket-Termination");
			return ws.terminate();
		}
		ws.isAlive = false;
		ws.ping();
	});
}, 30000);

wss.on("close", () => {
	clearInterval(interval);
});

// 🔒 Server starten mit Fehlerbehandlung
const PORT = 8765;
server.listen(PORT, "127.0.0.1", () => {
	console.log(`✅ Server läuft unter http://localhost:${PORT}`);
});

server.on("error", (err) => {
	if (err.code === "EADDRINUSE") {
		console.error(`❌ Port ${PORT} ist bereits in Verwendung.`);
	} else {
		console.error("❌ Serverfehler:", err);
	}
	process.exit(1);
});
