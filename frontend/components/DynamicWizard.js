"use client";
import React, { Suspense, lazy, useEffect, useMemo } from "react";
import ErrorBoundary from "./ErrorBoundary";
import { buildWizardComponent } from "../lib/wizardRuntime";

// Short fingerprint of the code, used to reset the error boundary when new code arrives.
const fingerprint = (s) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return String(h);
};

function Skeleton() {
  return (
    <div className="mx-auto max-w-xl animate-pulse space-y-4 p-4">
      <div className="h-6 w-1/2 rounded bg-gray-200" />
      <div className="h-40 rounded-xl bg-gray-100" />
      <div className="h-10 w-1/3 rounded bg-gray-200" />
      <p className="text-sm text-gray-500">Building your simplified form...</p>
    </div>
  );
}

function DefaultFallback({ message }) {
  return (
    <div className="mx-auto max-w-xl rounded-xl border border-red-200 bg-red-50 p-5">
      <p className="font-semibold text-red-800">We could not load the simplified form.</p>
      <p className="mt-1 text-sm text-red-700">Your original form is still available. ({message})</p>
    </div>
  );
}

export default function DynamicWizard({ code, initialValues = {}, onSubmit = () => {}, onError, fallback }) {
  // Turn the code string into a lazily loaded component, so Suspense can show a loading state.
  const built = useMemo(() => {
    if (!code) return { empty: true };
    try {
      const Wizard = buildWizardComponent(code);
      return { Component: lazy(() => Promise.resolve({ default: Wizard })) };
    } catch (err) {
      return { error: err };
    }
  }, [code]);

  useEffect(() => {
    if (built.error && onError) onError(built.error);
  }, [built, onError]);

  const renderFallback = (error) =>
    fallback ? fallback(error) : <DefaultFallback message={error.message} />;

  if (built.empty) return null;
  if (built.error) return renderFallback(built.error);

  const Wizard = built.Component;
  return (
    <ErrorBoundary key={fingerprint(code)} onError={onError} fallback={renderFallback}>
      <Suspense fallback={<Skeleton />}>
        <Wizard initialValues={initialValues} onSubmit={onSubmit} />
      </Suspense>
    </ErrorBoundary>
  );
}