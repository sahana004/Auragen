"use client";
import { useEffect, useRef, useState } from "react";

const WINDOW_MS = 3000; // how far back we look when measuring
const MIN_SAMPLE_MS = 16; // measure velocity at most ~60 times per second
const MIN_MOVE_PX = 8; // ignore tiny jitters when measuring direction
const TURN_ANGLE_DEG = 100; // a turn sharper than this counts as a direction change
const HESITATION_MS = 3000; // focused but not typing this long = hesitation
const SNAPSHOT_MS = 250; // how often the numbers refresh

const EMPTY_METRICS = {
  avgVelocity: 0,
  peakVelocity: 0,
  directionChanges: 0,
  activeFieldId: null,
  currentHesitationMs: 0,
  totalHesitations: 0,
};

export default function useFrictionTracker({ enabled = true } = {}) {
  const [metrics, setMetrics] = useState(EMPTY_METRICS);
  const [fieldStats, setFieldStats] = useState({});

  // Refs hold raw data without re-rendering on every mouse move.
  const lastPoint = useRef(null); // last point used for velocity
  const anchor = useRef(null); // last point used for direction
  const lastVector = useRef(null); // last movement direction
  const velocities = useRef([]); // [{ t, v }] in px/second
  const turns = useRef([]); // timestamps of sharp turns
  const activeField = useRef(null); // { id, focusedAt, lastChangeAt, counted }
  const stats = useRef({}); // per-field totals
  const totalHesitations = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    const getStats = (id) => {
      if (!stats.current[id]) {
        stats.current[id] = { dwellMs: 0, hesitations: 0, maxHesitationMs: 0 };
      }
      return stats.current[id];
    };

    const isField = (el) =>
      el && el.id && ["INPUT", "SELECT", "TEXTAREA"].includes(el.tagName);

    // ---- mouse movement: velocity + direction changes ----
    const onMouseMove = (e) => {
      const now = performance.now();

      // velocity (pixels per second)
      const p = lastPoint.current;
      if (!p) {
        lastPoint.current = { x: e.clientX, y: e.clientY, t: now };
      } else if (now - p.t >= MIN_SAMPLE_MS) {
        const dist = Math.hypot(e.clientX - p.x, e.clientY - p.y);
        velocities.current.push({ t: now, v: (dist / (now - p.t)) * 1000 });
        lastPoint.current = { x: e.clientX, y: e.clientY, t: now };
      }

      // direction changes
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

    // ---- fields: hesitation ----
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
      getStats(f.id).dwellMs += performance.now() - f.focusedAt;
      activeField.current = null;
    };

    // ---- every 250 ms: clean old data and publish the numbers ----
    const timer = setInterval(() => {
      const now = performance.now();
      const cutoff = now - WINDOW_MS;

      velocities.current = velocities.current.filter((s) => s.t >= cutoff);
      turns.current = turns.current.filter((t) => t >= cutoff);

      const vs = velocities.current.map((s) => s.v);
      const avgVelocity = vs.length ? vs.reduce((a, b) => a + b, 0) / vs.length : 0;
      const peakVelocity = vs.length ? Math.max(...vs) : 0;

      const f = activeField.current;
      let currentHesitationMs = 0;
      if (f) {
        const idle = now - f.lastChangeAt;
        if (idle >= HESITATION_MS) {
          currentHesitationMs = idle;
          const s = getStats(f.id);
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
        const s = getStats(f.id);
        snapshot[f.id] = { ...s, dwellMs: s.dwellMs + (now - f.focusedAt) };
      }

      setMetrics({
        avgVelocity: Math.round(avgVelocity),
        peakVelocity: Math.round(peakVelocity),
        directionChanges: turns.current.length,
        activeFieldId: f ? f.id : null,
        currentHesitationMs: Math.round(currentHesitationMs),
        totalHesitations: totalHesitations.current,
      });
      setFieldStats(snapshot);
    }, SNAPSHOT_MS);

    document.addEventListener("mousemove", onMouseMove, { passive: true });
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    document.addEventListener("input", onChange);
    document.addEventListener("change", onChange);

    return () => {
      clearInterval(timer);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
      document.removeEventListener("input", onChange);
      document.removeEventListener("change", onChange);
    };
  }, [enabled]);

  return { metrics, fieldStats };
}