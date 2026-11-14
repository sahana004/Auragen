require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const { WebSocketServer } = require("ws");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "auragen-backend" });
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: "/ws" });

wss.on("connection", (socket) => {
  console.log("Client connected");
  socket.send(
    JSON.stringify({ type: "connected", message: "AuraGen backend ready" })
  );

  socket.on("message", (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      console.log("Received:", msg.type);
    } catch (err) {
      console.error("Invalid message", err.message);
    }
  });

  socket.on("close", () => console.log("Client disconnected"));
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () =>
  console.log(`Backend running on http://localhost:${PORT}`)
);