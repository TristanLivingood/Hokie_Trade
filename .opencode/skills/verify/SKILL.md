---
name: verify
description: "Run Hokie Trade tests and quality checks, trace meetup requirements to tests, and save a transparent verification report."
---

# Hokie Trade Verification

## Purpose

Perform a repeatable, evidence-based verification of the current project. This skill checks the implementation and records results; it does not automatically repair code.

## Instructions

### 1. Establish scope

- Read `AGENTS.md` and follow project/course policies.
- Read `docs/requirements/meetup-tab-user-stories.md` and `docs/design/ADR-0001-meetup-tab.md`.
- Inspect `package.json`, `src/meetups/`, `tests/`, and `.github/workflows/ci.yml`.
- Record the current branch and commit hash if Git information is available.

### 2. Requirement traceability

Map every user story and acceptance criterion to one or more test assertions. At minimum, inspect:

- Required meetup location, date, and time validation
- Real calendar dates and valid time bounds
- Past/current meetup rejection
- Daylight-saving-time gaps and ambiguous times
- Proposal creation and participant permissions
- Acceptance, counterproposals, and superseded proposals
- Withdrawal and preservation of an already confirmed meetup
- Expired, duplicate, stale, and invalid actions
- Independent conversations and message handling

Mark criteria NOT COVERED when no test demonstrates them. Do not infer coverage from test names alone.

### 3. Automated quality gates

Run each command independently and capture its exit code and relevant output:

1. `npm test`
2. `npm run lint`
3. `npm run typecheck`

Use `npm ci` only if dependencies are absent and installation is permitted. If installation is unavailable or fails, mark dependent gates NOT RUN and explain why. The existence of a CI workflow is not evidence that the checks passed.

### 4. Test quality and coverage

- Confirm every PM2.1 function has at least one relevant unit test, or that an integration test exercises collaborating functions together.
- Identify missing edge cases and weak assertions.
- The project does not currently declare a dedicated coverage tool or numeric threshold. State this limitation; do not invent a percentage.

### 5. Report

Write `docs/verification-report.md` with:
- Date, branch, commit, and scope
- Requirement-to-test traceability table
- PASS / FAIL / NOT RUN results for each command
- Test-quality and coverage observations
- Prioritized findings
- Overall recommendation: READY, READY WITH FOLLOW-UP, or NOT READY

Any required gate marked FAIL or NOT RUN prevents a READY recommendation. Clearly distinguish code defects from environment limitations.

### 6. Human review

Present the findings for team review. Do not edit source code, tests, dependencies, or quality gates. Any fixes require a separate approved implementation task.
