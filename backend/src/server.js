require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const { WebSocketServer } = require("ws");
const { createScorer } = require("./cognitiveLoad");

const app = express();
app.use(cors());
app.use(express.json());

// Latest telemetry per browser session, and one scorer per session.
const sessions = new Map();
const scorers = new Map();

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
        score: 0,
        level: "calm",
        triggerCount: 0,
        lastTrigger: null,
      });
      scorers.set(sessionId, createScorer());
      console.log(`[${sessionId.slice(0, 8)}] session started on ${msg.page}`);
    }

    if (msg.type === "telemetry" && sessions.has(msg.sessionId) && msg.metrics) {
      const s = sessions.get(msg.sessionId);
      const result = scorers.get(msg.sessionId).update(msg.metrics, msg.fields || {});

      s.packets += 1;
      s.metrics = msg.metrics;
      s.fields = msg.fields || {};
      s.score = result.score;
      s.level = result.level;
      s.updatedAt = Date.now();

      // Tell the browser its current score (the frontend will show this later)
      socket.send(JSON.stringify({ type: "score", score: result.score, level: result.level }));

      const m = msg.metrics;
      console.log(
        `[${msg.sessionId.slice(0, 8)}] score=${String(result.score).padStart(3)} (${result.level}) ` +
          `speed=${m.avgVelocity} turns=${m.directionChanges} rage=${m.rageClicksRecent} ` +
          `errors=${m.clickErrorsRecent} field=${m.activeFieldId || "-"}`
      );

      if (result.trigger) {
        s.triggerCount += 1;
        s.lastTrigger = result.trigger;
        const why = result.trigger.reasons.map((r) => r.label).join(", ");
        const field = result.trigger.frictionPoint ? result.trigger.frictionPoint.fieldId : "unknown";
        console.log(
          `\n>>> FRICTION TRIGGER [${msg.sessionId.slice(0, 8)}] score=${result.trigger.score} ` +
            `field=${field} reasons: ${why}\n`
        );
        // This is the event that will start the LLM in Week 2
        socket.send(JSON.stringify({ type: "friction_trigger", ...result.trigger }));
      }
    }
  });

  socket.on("close", () => {
    console.log("Client disconnected");
    if (sessionId) {
      sessions.delete(sessionId);
      scorers.delete(sessionId);
    }
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));