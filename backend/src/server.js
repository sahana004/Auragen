require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const { WebSocketServer } = require("ws");

const app = express();
app.use(cors());
app.use(express.json());

// Latest telemetry per browser session. The Cognitive Load Score reads this later.
const sessions = new Map();

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "auragen-backend" });
});

app.get("/sessions", (req, res) => {
  res.json([...sessions.values()]);
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: "/ws" });

wss.on("connection", (socket) => {
  let sessionId = null;
  console.log("Client connected");
  socket.send(JSON.stringify({ type: "connected", message: "AuraGen backend ready" }));

  socket.on("message", (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }

    if (msg.type === "hello") {
      sessionId = msg.sessionId;
      sessions.set(sessionId, {
        sessionId,
        page: msg.page,
        connectedAt: Date.now(),
        packets: 0,
        metrics: null,
        fields: {},
      });
      console.log(`[${sessionId.slice(0, 8)}] session started on ${msg.page}`);
    }

    if (msg.type === "telemetry" && sessions.has(msg.sessionId)) {
      const s = sessions.get(msg.sessionId);
      s.packets += 1;
      s.metrics = msg.metrics;
      s.fields = msg.fields;
      s.updatedAt = Date.now();

      const m = msg.metrics;
      console.log(
        `[${msg.sessionId.slice(0, 8)}] speed=${m.avgVelocity} turns=${m.directionChanges} ` +
          `rage=${m.rageClicksRecent} errors=${m.clickErrorsRecent} field=${m.activeFieldId || "-"}`
      );
    }
  });

  socket.on("close", () => {
    console.log("Client disconnected");
    if (sessionId) sessions.delete(sessionId);
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));