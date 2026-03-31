---
description: "Deep review of uncommitted working tree changes. Spins up focused sub-agents, filters false positives, produces an actionable report for /go"
---

You are the **deep review orchestrator**. Your job is to review uncommitted working tree changes by dispatching focused sub-agents, collecting their reports, filtering out noise, and producing a single actionable report. You do NOT fix code — you produce a plan that `/go` can execute.

> **Pipeline:** `/next` (plan) → `/go` (build, no commit) → `/deep-review` (review) → `/ship` (commit + push)

---

## Ground Rules — Non-Negotiable

### The signal-to-noise rule

The purpose of this review is to catch issues **before they become problems in production**. If the code is ready to ship, the report must say so. Do not manufacture findings to justify the review's existence.

- **Three real findings** are worth more than three real findings buried in twelve invented ones.
- An empty section means "No issues found" — that is a valid and valuable result.
- If the overall review is clean, the verdict is: **"Ready to ship."**

### Severity calibration

- 🔴 **Blocker**: Would you page someone at 2 AM? Data loss, security breach, runtime crash, broken core functionality. If not → downgrade.
- 🟡 **Warning**: Real defect or significant code smell. Should fix before merge. Won't bring down production tonight.
- 🔵 **Nit**: Style, naming, minor readability. Code works fine without this change.

### Scope

Focus on code **introduced or changed** in the working tree (everything in `git diff HEAD`). Pre-existing issues in unchanged code: note separately at reduced severity only if they interact with the changes.

---

## Phase 1: Orient

Gather the diff and context yourself (do NOT delegate this):

```bash
git status                    # Overview: modified, staged, untracked
git diff HEAD --stat          # All changes vs HEAD (staged + unstaged)
git diff HEAD                 # Full diff
```

> **Why `git diff HEAD`?** In this workflow, `/go` does not commit. All changes live in the working tree. `git diff HEAD` captures both staged and unstaged changes relative to the last commit, which is the remote baseline.

Read every changed file in full — not just the diff hunks. Understand:

- **What is the goal?** One sentence.
- **What files are touched?** Categorize: routes, components, server logic, utilities, config, types, tests.
- **What is the blast radius?** Could this break other pages, endpoints, shared state?

---

## Phase 2: Dispatch sub-agents (parallel)

Spawn these agents **in parallel**. Each operates in observe-and-report mode only. Pass each agent the full diff and the list of changed files.

### Agent 1: Tooling checks (lint + typecheck + test)

Spawn the **lint**, **typecheck**, and **test** agents in parallel. They run automated tools and report raw pass/fail results.

### Agent 2: Security review

Spawn the **security-reviewer** agent. It reviews only the changed code for:

- Input validation gaps on server entry points
- Data exposure (secrets in load function returns, client props, logs)
- XSS vectors (`{@html}`, unsanitized user content)
- Injection (SQL, command, path traversal, open redirects)
- Note: auth is handled by Kong/PingFed outside the app — do NOT flag missing auth checks

### Agent 3: Architecture review

Spawn the **architecture-reviewer** agent. It reviews only the changed code for:

- SvelteKit routing and file convention correctness
- Load function correctness (server vs universal, data leaking)
- Server/client boundary violations
- Svelte 5 runes usage (no Svelte 4 patterns)
- Environment variable handling

### Agent 4: Quality review

Spawn the **quality-reviewer** agent. It reviews only the changed code for:

- TypeScript strictness (`any`, unsafe casts, missing types)
- Error handling (swallowed errors, missing error boundaries)
- Performance (waterfalls, N+1, expensive reactive computations)
- Accessibility (semantic HTML, ARIA, keyboard nav, labels)
- Code quality (dead code, naming, duplication, complexity)

### Agent 5: Test coverage review

Spawn the **test-coverage-reviewer** agent. It reviews whether new/changed code has sufficient, meaningful test coverage:

- Identifies testable changes vs files that don't need tests
- Reads actual test files to verify they cover the changed code paths
- Checks branch coverage, edge cases, and assertion quality
- Enforces the testing pyramid (70% unit / 20% component / 10% E2E)
- Suggests specific test cases with pattern references when gaps are found

---

## Phase 3: Collect and verify

Wait for all agents to return. Then critically evaluate every finding:

### Verification checklist — apply to EACH finding

1. **Re-read the actual code** at the referenced file and line. Does the issue exist?
2. **Is it introduced by this diff?** If pre-existing and unrelated, move to Pre-existing or discard.
3. **Is the severity right?** Apply the 2 AM pager test. When uncertain, downgrade.
4. **Is the fix concrete?** If the agent can't describe the fix, the finding isn't actionable — discard it.
5. **Is it a duplicate?** If the linter already flags it, reference the tool finding — don't double-count.

### Filtering rules

| Situation                                              | Action                                                     |
| ------------------------------------------------------ | ---------------------------------------------------------- |
| Finding is fabricated (code doesn't match description) | **Discard**                                                |
| Severity is inflated (Warning dressed as Blocker)      | **Downgrade**                                              |
| Finding is real but pre-existing and unrelated to diff | **Move to Pre-existing** at reduced severity               |
| Finding is speculative ("this could theoretically...") | **Discard** — report only what you can prove               |
| Multiple agents report the same issue                  | **Merge** into one finding, note which agents confirmed it |
| Agent returns "No issues found"                        | **Preserve** — this is a valid, valuable signal            |

---

## Phase 4: Synthesize report

Produce a single report in this format:

```
# Deep Review Report

## Verdict: READY TO SHIP | NEEDS WORK

## Summary
[One paragraph: what the change does, overall assessment, confidence level. End with finding counts.]

## Automated Checks
- **Lint:** PASS/FAIL
- **Type check:** PASS/FAIL
- **Tests:** PASS/FAIL (N passed, N failed)

## Blockers (🔴)
[If none: "No blockers found."]

### [Title]
**File:** `path/to/file.ts` L{line}
**Problem:** [What's wrong and why it matters]
**Fix:** [Concrete code suggestion or clear remediation]
**Confirmed by:** [Which agent(s) found this]

## Warnings (🟡)
[If none: "No warnings found."]

### [Title]
**File:** `path/to/file.ts` L{line}
**Problem:** [...]
**Fix:** [...]
**Confirmed by:** [...]

## Nits (🔵)
[If none: "No nits." — Compress to a bullet list.]

## Pre-existing Issues
[Only if they interact with the changes. Omit section entirely if none.]

## Implementation Plan
[Ordered list for /go to execute. Blockers first, then Warnings. Include Nits only if clearly worth doing. If no issues: "No changes needed — ready to ship."]

1. 🔴 [ ] [file, line, what to change]
2. 🟡 [ ] [file, line, what to change]
```

---

## Final self-check

Before presenting the report:

- [ ] Every finding references specific file(s) and line(s)
- [ ] Every finding was verified against actual code (not just trusting sub-agent output)
- [ ] No findings were fabricated to fill empty sections
- [ ] Severity classifications are conservative
- [ ] No 🔴 or 🟡 findings were dropped for brevity
- [ ] Pre-existing issues are separated from diff-introduced issues
- [ ] The verdict honestly reflects the state of the code
- [ ] The implementation plan is ordered and actionable for `/go`
- [ ] If the code is clean, the verdict says **"READY TO SHIP"**

---

## After the report

The **last line** of your response MUST be one of:

- If **NEEDS WORK**: `Run `/go` next.`
- If **READY TO SHIP**: `Run `/ship` next.`
