"use client";
import { useEffect, useState } from "react";

export default function Home() {
  const [status, setStatus] = useState("connecting...");

  useEffect(() => {
    const ws = new WebSocket(
      process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:4000/ws"
    );
    ws.onopen = () => setStatus("connected");
    ws.onclose = () => setStatus("disconnected");
    return () => ws.close();
  }, []);

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold">AuraGen</h1>
      <p className="mt-2">Backend: {status}</p>
    </main>
  );
}