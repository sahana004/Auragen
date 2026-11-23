import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Button, Input, Select, Card, Stepper } from "../components/ui";

// The ONLY names generated code can use.
const SCOPE = {
  React, useState, useEffect, useMemo, useCallback, useRef,
  Button, Input, Select, Card, Stepper,
};

// Browser globals hidden from generated code (defence in depth: the backend
// validator already rejects code that mentions them).
const BLOCKED = [
  "window", "document", "fetch", "XMLHttpRequest", "WebSocket", "localStorage",
  "sessionStorage", "globalThis", "self", "navigator", "location", "Function",
  "process", "require", "module", "exports",
];

// js = compiled code from the backend, e.g. "function Wizard({ initialValues, onSubmit }) { ... }"
export function buildWizardComponent(js) {
  if (typeof js !== "string" || !js.trim()) throw new Error("No code to render");

  const scopeNames = Object.keys(SCOPE);
  const blockedNames = BLOCKED.filter((n) => !scopeNames.includes(n));

  const factory = new Function(...scopeNames, ...blockedNames, `"use strict";\n${js}\nreturn Wizard;`);
  const Wizard = factory(...scopeNames.map((n) => SCOPE[n]), ...blockedNames.map(() => undefined));

  if (typeof Wizard !== "function") throw new Error("The generated code did not define a Wizard function");
  return Wizard;
}