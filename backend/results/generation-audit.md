# Generation audit

- Date: 2026-11-21
- Model: groq / openai/gpt-oss-120b
- Runs: 10  |  Fully valid: 8  (80%)
- Generation errors: 0
- Average time: 7.2 s  |  Average size: 321.5 lines

## Per-check pass rate

| Check | Passed | Rate |
|---|---|---|
| Parses as valid JSX | 9/10 | 90% |
| Default-exports a Wizard function | 10/10 | 100% |
| Has no import or require | 10/10 | 100% |
| No network, eval or storage calls | 10/10 | 100% |
| Uses only allowed components | 10/10 | 100% |
| Starts state from initialValues | 10/10 | 100% |
| Includes every form field | 10/10 | 100% |
| Uses the Stepper component | 10/10 | 100% |
| Calls onSubmit | 10/10 | 100% |
| Has Back and Next buttons | 9/10 | 90% |
| Adds a hint for the friction field | 9/10 | 90% |

## Runs

| # | Scenario | Result | Time | Lines | Failed checks |
|---|---|---|---|---|---|
| 1 | PAN format errors | FAIL | 9.4 s | 284 | Parses as valid JSX (Unterminated string constant. (284:17)); Has Back and Next buttons |
| 2 | Invalid email | PASS | 6.5 s | 325 | none |
| 3 | Date of birth confusion | PASS | 7.4 s | 317 | none |
| 4 | Monthly income unsure | PASS | 7.3 s | 343 | none |
| 5 | Loan amount out of range | PASS | 6.9 s | 346 | none |
| 6 | Phone number errors | PASS | 7.3 s | 337 | none |
| 7 | Employer name hesitation | PASS | 6.9 s | 287 | none |
| 8 | Existing EMI confusion | PASS | 6.5 s | 314 | none |
| 9 | Address textarea | PASS | 7 s | 350 | none |
| 10 | Tenure dropdown | FAIL | 6.6 s | 312 | Adds a hint for the friction field |
