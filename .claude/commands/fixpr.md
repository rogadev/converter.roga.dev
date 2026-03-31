---
description: "Fix failing PR checks: fetch CI failures + review comments, diagnose, fix, verify, commit, and push."
---

# /fixpr — Fix Failing Pull Request

You are a senior engineer responding to a broken PR. Your job is to surgically identify every failing check and unresolved review comment, fix them all, verify the fix, and push a clean commit — fast.

> **This is a standalone command.** It does not require the `/next` → `/go` pipeline. It's designed for rapid triage of a PR that was already submitted and is failing CI or has review feedback.

The user's instructions (if any):

$ARGUMENTS

---

## Step 1: Identify the PR

```bash
gh pr view --json number,title,headRefName,state,statusCheckRollup,reviewDecision,url \
  --jq '{number,title,branch:.headRefName,state,checks:.statusCheckRollup,reviewDecision,url}'
```

If no PR is found for the current branch, check `$ARGUMENTS` for a PR number. If still nothing:

```bash
gh pr list --state open --json number,title,headRefName --jq '.[] | {number,title,branch:.headRefName}'
```

Present the list and ask the user which PR to fix. Once identified, store the PR number.

**Abort if:** PR is merged or closed — nothing to fix.

Make sure the local branch matches the PR's head branch:

```bash
git branch --show-current
```

If they don't match, ask the user before switching.

## Step 2: Gather all failures (parallel)

Run these three commands to collect every problem:

### 2a. CI check status

```bash
gh pr checks --json name,state,bucket,link,workflow \
  --jq '[.[] | select(.bucket == "fail")]'
```

If all checks pass (empty result), note "CI is green" and skip to Step 2c.

### 2b. Failed CI logs

For each failed check, get the workflow run ID and pull the failed logs:

```bash
# Get the latest run for this PR's branch
gh run list --branch "$(git branch --show-current)" --limit 5 \
  --json databaseId,status,conclusion,name,event \
  --jq '[.[] | select(.conclusion == "failure")]'
```

For the most recent failed run:

```bash
gh run view <run-id> --log-failed 2>&1
```

The output will contain the actual error messages, stack traces, and failed commands. This is the primary diagnostic input.

**Parse the failures into categories:**

| Category       | Indicators                                                           |
| -------------- | -------------------------------------------------------------------- |
| **Lint**       | `pnpm lint`, ESLint errors, Prettier diff                            |
| **Type check** | `pnpm check`, svelte-check, `TS2xxx` errors, type mismatches         |
| **Build**      | `pnpm build`, Vite errors, import resolution, missing modules        |
| **Test**       | `pnpm test`, assertion failures, timeout, missing test files         |
| **Deploy**     | Docker build, Skaffold, Cloud Deploy, Helm — usually infra, not code |

### 2c. Review comments

```bash
gh pr view --json reviews,comments \
  --jq '{
    reviews: [.reviews[] | select(.state != "APPROVED" and .state != "DISMISSED") | {author:.author.login,state,body}],
    comments: [.comments[] | {author:.author.login,body,createdAt}]
  }'
```

Also fetch inline review comments (the most actionable ones):

```bash
gh api "repos/{owner}/{repo}/pulls/$(gh pr view --json number --jq '.number')/comments" \
  --jq '[.[] | select(.position != null) | {path,line:.original_line,body,author:.user.login,created:.created_at}]'
```

### 2d. Triage summary

Produce a concise triage list:

```
=== PR #<number> Triage ===

CI Failures:
  🔴 Lint: <error count> errors (files: ...)
  🔴 Type check: <error count> errors (files: ...)
  🟢 Build: passing
  ⚪ Tests: not run (blocked by earlier failure)

Review Comments:
  - @reviewer: "<summary of comment>" → file.ts L42
  - @reviewer: "<summary of comment>" → component.svelte L18

Total issues: <N>
```

## Step 3: Reproduce locally

Before touching any code, confirm the failures reproduce locally. Run the checks that match the failed categories:

```bash
# Always run all three — CI runs them sequentially and stops on first failure,
# so later checks may have hidden failures too
pnpm lint 2>&1 | tail -50
pnpm check 2>&1 | tail -80
pnpm build 2>&1 | tail -50
```

Compare local output to CI logs. If local passes but CI fails, investigate environment differences (Node version, dependencies, env vars).

If local reproduces the same failures → proceed to Step 4.

## Step 4: Plan the fixes

For each failure, determine the fix strategy:

### Lint failures

Read the specific error messages. Common fixes:

- Unused imports/variables → remove them
- Formatting → `pnpm lint:fix` handles most automatically
- ESLint rule violations → fix the code, never add `eslint-disable`

### Type check failures

Read the `svelte-check` / TypeScript errors with file paths and line numbers. For each:

1. Read the file at the referenced line.
2. Understand the type mismatch.
3. Fix with proper types — don't use `any` or `as` casts unless absolutely necessary.

### Build failures

Usually import resolution or missing exports. Read the Vite error, trace the import chain, fix the source.

### Test failures

Read the assertion diff. Understand what changed and whether the test expectation or the code is wrong:

- If the code is correct and the test is stale → update the test.
- If the code introduced a regression → fix the code.

### Review comments

For each inline comment:

1. Read the file at the referenced location.
2. Read surrounding context (±20 lines).
3. Determine if the reviewer's point is valid.
4. If valid → implement the fix.
5. If it's a misunderstanding → note it for the commit message body (don't ignore it silently).

## Step 5: Implement fixes

Work through the fix plan. Order:

1. **Lint fixes first** — run `pnpm lint:fix` to auto-fix what it can, then manually fix the rest.
2. **Type fixes** — these often cascade, so fix root cause types first.
3. **Build fixes** — usually resolved by lint/type fixes above.
4. **Test fixes** — update assertions or fix code regressions.
5. **Review comment fixes** — address inline feedback.

After each category, run the relevant check to confirm progress:

```bash
pnpm lint          # After lint fixes
pnpm check         # After type fixes
pnpm build         # After build fixes
pnpm test:unit --run  # After test fixes
```

## Step 6: Verify — hard gate

All checks must pass. Run the full suite:

```bash
pnpm fix
```

Then spawn the **lint**, **typecheck**, and **test** agents in parallel for independent verification.

**If any agent reports FAIL:**

1. Read the failure.
2. Fix it.
3. Re-run `pnpm fix` and re-spawn all three agents.
4. Repeat until all pass.

## Step 7: Commit and push

Stage only the files you changed (never `git add .` or `git add -A`):

```bash
git status
git add <file1> <file2> ...
```

Commit with a clear message that references the PR:

```
fix(<scope>): resolve PR #<number> check failures

<What was wrong and what was fixed. Be specific.>

- Fixed: <lint/type/test/build issue summary>
- Addressed: <reviewer comment summary, if applicable>
```

Push:

```bash
git push
```

If rejected:

```bash
git pull --rebase
pnpm fix    # Verify rebase didn't break anything
git push
```

## Step 8: Report

```
=== PR Fix Summary ===

PR: #<number> — <title>
Branch: <branch>
Commit: <hash>

Fixed:
  ✅ Lint: <N> errors resolved (<brief description>)
  ✅ Type check: <N> errors resolved (<brief description>)
  ✅ Build: <status>
  ✅ Tests: <N> failures resolved (<brief description>)

Review comments addressed:
  ✅ @<reviewer>: <summary of what was fixed>

Pushed to origin/<branch>. CI should re-run automatically.
Monitor: gh pr checks --watch
```

If any review comments were disagreed with, note them:

```
Needs discussion:
  💬 @<reviewer>: "<comment summary>" — <your reasoning>
```
