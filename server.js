const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const path = require("path");
const bodyParser = require("body-parser");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

let lastContent = null;

// Middleware
app.use(bodyParser.text({ type: "*/*" }));
app.use(express.static(path.join(__dirname, "static")));

// POST /update – Daten von Neovim empfangen
app.post("/update", (req, res) => {
  try {
	const data = JSON.parse(req.body);
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
