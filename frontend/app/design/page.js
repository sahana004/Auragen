"use client";
import { useState } from "react";
import { Button, Input, Select, Card, Stepper } from "../../components/ui";

export default function DesignPage() {
  const [name, setName] = useState("");
  const [loan, setLoan] = useState("");
  const [step, setStep] = useState(0);
  const steps = ["Personal", "Income", "Loan"];

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-8">
      <h1 className="text-2xl font-bold">Design system preview</h1>

      <Card title="Stepper" subtitle="Click Next and Back to move through steps">
        <Stepper steps={steps} current={step} />
        <div className="mt-4 flex gap-2">
          <Button variant="secondary" size="sm" disabled={step === 0} onClick={() => setStep(step - 1)}>
            Back
          </Button>
          <Button size="sm" disabled={step === steps.length - 1} onClick={() => setStep(step + 1)}>
            Next
          </Button>
        </div>
      </Card>

      <Card title="Inputs">
        <div className="space-y-4">
          <Input
            id="name"
            label="Full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            hint="As on your PAN card"
            required
          />
          <Input id="bad" label="Email with an error" value="abc" onChange={() => {}} error="Enter a valid email address" />
          <Select
            id="loan"
            label="Loan type"
            options={["Personal loan", "Home loan", "Car loan"]}
            value={loan}
            onChange={(e) => setLoan(e.target.value)}
          />
        </div>
      </Card>

      <Card title="Buttons">
        <div className="flex flex-wrap gap-3">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
          <Button disabled>Disabled</Button>
        </div>
      </Card>
    </main>
  );
}