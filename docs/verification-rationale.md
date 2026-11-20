# Agentic Verification: Rationale

**Project:** Hokie Trade  
**Milestone:** PM2.3 – Development Sprint III  
**Status:** Proposed verification approach; update after the agent is run.

## Quality gates

| Gate | Pass criteria | Failure handling |
|---|---|---|
| Unit tests | `npm test` exits successfully and PM2.1 functionality is meaningfully tested | Report failing tests and affected behavior |
| Lint | `npm run lint` exits successfully | Report lint diagnostics |
| Type checking | `npm run typecheck` exits successfully | Report compiler diagnostics |
| Requirement traceability | User stories and acceptance criteria map to test assertions | Mark uncovered criteria NOT COVERED |
| Test quality | Assertions cover expected behavior and important invalid/edge cases | Recommend additional tests |
| Coverage evidence | Each PM2.1 function has a relevant unit test or is exercised by an integration test | Identify missing function-level evidence; do not invent a numeric percentage |

The verifier is read-only. It reports findings and recommendations but does not change implementation code, tests, configuration, or dependencies.

## Agent and skill

- `.opencode/agents/hokie-verifier.md` defines the read-only verification subagent.
- `.opencode/skills/verify/SKILL.md` defines the repeatable `/verify` workflow and report format.
- The agent is student-created for this project. It is not represented as a course-provided phase agent.

## How to use

From the Hokie Trade repository in OpenCode:

1. Ask `@hokie-verifier` to review the current implementation and report its findings.
2. Run `/verify` to perform the documented quality gates and save `docs/verification-report.md`.
3. Review the report as a team and decide which findings require fixes.

The repository snapshot contains the workflow and test scripts, but this rationale does not claim that any checks have passed. Record actual command output and the date of the run in `docs/verification-report.md`.

## Team review

- [ ] Team reviewed the verification gates.
- [ ] Team reviewed the agent's read-only permissions.
- [ ] Team ran the verifier and discussed the report.
- [ ] Team recorded follow-up fixes and ownership.
