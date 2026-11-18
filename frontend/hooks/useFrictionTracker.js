"use client";
import { useCallback, useEffect, useRef, useState } from "react";

const WINDOW_MS = 3000; // look-back for speed and direction changes
const EVENT_WINDOW_MS = 10000; // look-back for rage clicks and errors
const MIN_SAMPLE_MS = 16;
const MIN_MOVE_PX = 8;
const TURN_ANGLE_DEG = 100;
const HESITATION_MS = 3000;
const SNAPSHOT_MS = 250; // how often the numbers refresh
const SEND_MS = 500; // how often we send them to the backend
const RAGE_CLICKS = 3; // this many clicks...
const RAGE_WINDOW_MS = 1000; // ...within this time...
const RAGE_RADIUS_PX = 40; // ...inside this radius = rage click
const DEFAULT_WS_URL = "ws://localhost:4000/ws";

const EMPTY_METRICS = {
  avgVelocity: 0,
  peakVelocity: 0,
  directionChanges: 0,
  activeFieldId: null,
  currentHesitationMs: 0,
  totalHesitations: 0,
  rageClicksRecent: 0,
  rageClicksTotal: 0,
  clickErrorsRecent: 0,
  clickErrorsTotal: 0,
  clicksRecent: 0,
};

const ensure = (obj, id) => {
  if (!obj[id]) obj[id] = { dwellMs: 0, hesitations: 0, maxHesitationMs: 0, errors: 0 };
  return obj[id];
};

export default function useFrictionTracker({
  enabled = true,
  socketUrl = process.env.NEXT_PUBLIC_WS_URL || DEFAULT_WS_URL,
} = {}) {
  const [metrics, setMetrics] = useState(EMPTY_METRICS);
  const [fieldStats, setFieldStats] = useState({});
  const [connection, setConnection] = useState("connecting");

  // Refs hold raw data without re-rendering on every event.
  const lastPoint = useRef(null);
  const anchor = useRef(null);
  const lastVector = useRef(null);
  const velocities = useRef([]);
  const turns = useRef([]);
  const activeField = useRef(null);
  const stats = useRef({});
  const totalHesitations = useRef(0);

  const clickLog = useRef([]); // { t, x, y }
  const rageEvents = useRef([]); // timestamps
  const rageTotal = useRef(0);
  const lastRageAt = useRef(0);
  const errorEvents = useRef([]); // timestamps
  const errorTotal = useRef(0);

  const latestMetrics = useRef(EMPTY_METRICS);
  const latestFields = useRef({});

  // The form calls this when the user hits a validation error.
  const reportValidationError = useCallback((fieldId) => {
    errorEvents.current.push(performance.now());
    errorTotal.current += 1;
    if (fieldId && fieldId !== "submit") ensure(stats.current, fieldId).errors += 1;
  }, []);

  // ---------- tracking ----------
  useEffect(() => {
    if (!enabled) return;

    const isField = (el) =>
      el && el.id && ["INPUT", "SELECT", "TEXTAREA"].includes(el.tagName);

    const onMouseMove = (e) => {
      const now = performance.now();

      const p = lastPoint.current;
      if (!p) {
        lastPoint.current = { x: e.clientX, y: e.clientY, t: now };
      } else if (now - p.t >= MIN_SAMPLE_MS) {
        const dist = Math.hypot(e.clientX - p.x, e.clientY - p.y);
        velocities.current.push({ t: now, v: (dist / (now - p.t)) * 1000 });
        lastPoint.current = { x: e.clientX, y: e.clientY, t: now };
      }

      const a = anchor.current;
      if (!a) {
        anchor.current = { x: e.clientX, y: e.clientY };
        return;
      }
      const dx = e.clientX - a.x;
      const dy = e.clientY - a.y;
      const dist = Math.hypot(dx, dy);
      if (dist >= MIN_MOVE_PX) {
        const v = lastVector.current;
        if (v) {
          const cos = (v.dx * dx + v.dy * dy) / (Math.hypot(v.dx, v.dy) * dist);
          const angle = (Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI;
          if (angle >= TURN_ANGLE_DEG) turns.current.push(now);
        }
        lastVector.current = { dx, dy };
        anchor.current = { x: e.clientX, y: e.clientY };
      }
    };

    // rage clicks: several fast clicks in the same small area
    const onClick = (e) => {
      const now = performance.now();
      clickLog.current.push({ t: now, x: e.clientX, y: e.clientY });
      clickLog.current = clickLog.current.filter((c) => now - c.t <= EVENT_WINDOW_MS);

      const burst = clickLog.current.filter(
        (c) =>
          now - c.t <= RAGE_WINDOW_MS &&
          Math.hypot(c.x - e.clientX, c.y - e.clientY) <= RAGE_RADIUS_PX
      );
      if (burst.length >= RAGE_CLICKS && now - lastRageAt.current > RAGE_WINDOW_MS) {
        lastRageAt.current = now;
        rageEvents.current.push(now);
        rageTotal.current += 1;
      }
    };

    // click errors: pressing something that is disabled
    const onMouseDown = (e) => {
      const el = document.elementFromPoint(e.clientX, e.clientY);
      if (el && el.closest("[disabled], [aria-disabled='true']")) {
        errorEvents.current.push(performance.now());
        errorTotal.current += 1;
      }
    };

    const onFocusIn = (e) => {
      if (!isField(e.target)) return;
      const now = performance.now();
      activeField.current = { id: e.target.id, focusedAt: now, lastChangeAt: now, counted: false };
    };

    const onChange = (e) => {
      const f = activeField.current;
      if (f && e.target.id === f.id) {
        f.lastChangeAt = performance.now();
        f.counted = false;
      }
    };

    const onFocusOut = (e) => {
      const f = activeField.current;
      if (!f || e.target.id !== f.id) return;
      ensure(stats.current, f.id).dwellMs += performance.now() - f.focusedAt;
      activeField.current = null;
    };

    const timer = setInterval(() => {
      const now = performance.now();
      const cutoff = now - WINDOW_MS;
      const eventCutoff = now - EVENT_WINDOW_MS;

      velocities.current = velocities.current.filter((s) => s.t >= cutoff);
      turns.current = turns.current.filter((t) => t >= cutoff);
      clickLog.current = clickLog.current.filter((c) => c.t >= eventCutoff);
      rageEvents.current = rageEvents.current.filter((t) => t >= eventCutoff);
      errorEvents.current = errorEvents.current.filter((t) => t >= eventCutoff);

      const vs = velocities.current.map((s) => s.v);
      const avgVelocity = vs.length ? vs.reduce((a, b) => a + b, 0) / vs.length : 0;
      const peakVelocity = vs.length ? Math.max(...vs) : 0;

      const f = activeField.current;
      let currentHesitationMs = 0;
      if (f) {
        const idle = now - f.lastChangeAt;
        if (idle >= HESITATION_MS) {
          currentHesitationMs = idle;
          const s = ensure(stats.current, f.id);
          s.maxHesitationMs = Math.max(s.maxHesitationMs, idle);
          if (!f.counted) {
            f.counted = true;
            s.hesitations += 1;
            totalHesitations.current += 1;
          }
        }
      }

      const snapshot = {};
      Object.keys(stats.current).forEach((id) => (snapshot[id] = { ...stats.current[id] }));
      if (f) {
        const s = ensure(stats.current, f.id);
        snapshot[f.id] = { ...s, dwellMs: s.dwellMs + (now - f.focusedAt) };
      }

      const next = {
        avgVelocity: Math.round(avgVelocity),
        peakVelocity: Math.round(peakVelocity),
        directionChanges: turns.current.length,
        activeFieldId: f ? f.id : null,
        currentHesitationMs: Math.round(currentHesitationMs),
        totalHesitations: totalHesitations.current,
        rageClicksRecent: rageEvents.current.length,
        rageClicksTotal: rageTotal.current,
        clickErrorsRecent: errorEvents.current.length,
        clickErrorsTotal: errorTotal.current,
        clicksRecent: clickLog.current.length,
      };

      latestMetrics.current = next;
      latestFields.current = snapshot;
      setMetrics(next);
      setFieldStats(snapshot);
    }, SNAPSHOT_MS);

    document.addEventListener("mousemove", onMouseMove, { passive: true });
    document.addEventListener("click", onClick);
    document.addEventListener("mousedown", onMouseDown, true);
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    document.addEventListener("input", onChange);
    document.addEventListener("change", onChange);

    return () => {
      clearInterval(timer);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("click", onClick);
      document.removeEventListener("mousedown", onMouseDown, true);
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
      document.removeEventListener("input", onChange);
      document.removeEventListener("change", onChange);
    };
  }, [enabled]);

  // ---------- streaming to the backend ----------
  useEffect(() => {
    if (!enabled || !socketUrl) return;

    const sessionId =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : String(Date.now()) + Math.random().toString(16).slice(2);

    let ws = null;
    let closed = false;
    let retries = 0;
    let retryTimer = null;

    const connect = () => {
      if (closed) return;
      setConnection("connecting");
      ws = new WebSocket(socketUrl);

      ws.onopen = () => {
        retries = 0;
        setConnection("connected");
        ws.send(
          JSON.stringify({ type: "hello", sessionId, page: window.location.pathname, t: Date.now() })
        );
      };

      ws.onclose = () => {
        if (closed) return;
        setConnection("disconnected");
        retries += 1;
        retryTimer = setTimeout(connect, Math.min(1000 * 2 ** retries, 10000));
      };

      ws.onerror = () => ws.close();
    };

    connect();

    const sendTimer = setInterval(() => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            type: "telemetry",
            sessionId,
            t: Date.now(),
            metrics: latestMetrics.current,
            fields: latestFields.current,
          })
        );
      }
    }, SEND_MS);

    return () => {
      closed = true;
      clearInterval(sendTimer);
      clearTimeout(retryTimer);
      if (ws) ws.close();
    };
  }, [enabled, socketUrl]);

  return { metrics, fieldStats, connection, reportValidationError };
}