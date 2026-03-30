---
description: "Sync app state and GitHub issues. Review and triage open GitHub issues — evaluate relevance, close stale/completed issues, roll overdue sprint items forward."
---

# /sync — GitHub Issue Triage & Sprint Maintenance

You are a project management agent for TCTools (`telus/tctools`). Your job is to review the current state of GitHub issues, ensure sprint milestones are current, close issues that are already done, and flag stale or out-of-scope items.

> **Note:** This command operates on **GitHub Issues only**. Beads (bd) is the agent's working memory for task decomposition — it is not synced with GitHub. See AGENTS.md for the two-system philosophy.

**NP base URL:** `https://tctools-np.cloudapps.telus.com`

The user's request (if any):

$ARGUMENTS

---

## Phase 1: Load project intents

Before evaluating any issue, understand where the project is heading.

```bash
cat _references/intents/DISTILLED.md
```

Also scan recent individual intent files for context not yet distilled:

```bash
ls _references/intents/*.md | grep -v README.md | grep -v DISTILLED.md | head -20
```

Read any recent intent files (last 5-10 by date prefix). Store this context — you'll need it in Phase 3.

---

## Phase 2: Gather current state

### 2a. Determine today's date

```bash
date +%Y-%m-%d
```

### 2b. Fetch milestones and identify the current sprint

```bash
gh api repos/telus/tctools/milestones --jq '.[] | {number, title, due_on, state, open_issues, closed_issues}'
```

Identify the **current sprint**: the sprint milestone whose `due_on` is the nearest future date (or today). Identify any **overdue sprints**: sprint milestones whose `due_on` has passed but still have `open_issues > 0`.

### 2c. Roll overdue sprint issues forward

For each overdue sprint milestone that still has open issues:

1. List the open issues in that milestone:

   ```bash
   gh issue list --milestone "<overdue milestone title>" --state open --json number,title,labels,assignees
   ```

2. **Exclude `[WAITING]` issues.** Do not move any issue whose title starts with `[WAITING]`. Those are backlog items — leave their milestone unchanged or clear it.

3. For each remaining open issue, move it to the **current sprint** milestone:

   ```bash
   gh issue edit <number> --milestone "<current sprint title>"
   ```

4. Leave a comment explaining the rollover:
   ```bash
   gh issue comment <number> --body "Rolled over from \"<old milestone>\" (due <due date>) to \"<current milestone>\" — sprint deadline passed with this issue still open."
   ```

### 2d. Fetch all open GitHub issues

```bash
gh issue list --state open --json number,title,body,labels,milestone,createdAt,updatedAt --limit 200
```

---

## Phase 3: Relevance evaluation

For **every open issue**, evaluate whether it's still relevant.

### 3a. Relevance criteria

For each open issue, ask:

1. **Is it already done?** Check the codebase — has this feature/fix already been implemented? Search for the key files, routes, or components mentioned in the issue. If the acceptance criteria are met, close it with evidence.

2. **Does it align with current intents?** Compare the issue's goal against `DISTILLED.md` and recent intents. If the project has pivoted away from this direction, mark it.

3. **Is it stale?** Has it been open for a long time with no progress and no recent discussion? Check `updatedAt` / last activity.

4. **Is there a superseding issue?** Does a newer issue cover the same ground better or more completely?

### 3b. Relevance verdicts

For each issue, assign a verdict:

| Verdict          | Meaning                                                      | Action                                         |
| ---------------- | ------------------------------------------------------------ | ---------------------------------------------- |
| **Active**       | Aligned with current intents, still needed                   | Keep open. No action.                          |
| **Already done** | The work has been completed but the issue wasn't closed      | Close with evidence.                           |
| **Out of scope** | Project direction has shifted; this no longer fits           | Recommend closing. Mark with rationale.        |
| **Stale**        | No activity in 60+ days, low priority, no intent backing     | Recommend closing or deprioritizing.           |
| **Superseded**   | A newer issue covers this better                             | Recommend closing in favor of the newer issue. |
| **Needs update** | Still relevant but the description is outdated or incomplete | Flag for update.                               |

### 3c. Presenting verdicts

Group issues by verdict and present to the user:

```
=== Relevance Review ===

Active (N issues)
  - #12 — Search rank tool improvements
  - #15 — Content feedback enhancements

Already done (N issues)
  - #8 — Image generator basic flow [Evidence: src/routes/tools/image-generator/+page.svelte exists, all AC met]

Out of scope (N issues)
  - #5 — Multi-language support [Reason: No intent supports i18n; current direction is English-only tooling]

Stale (N issues)
  - #3 — Dashboard redesign [Last updated: 2025-11-02, no intent backing]

Superseded (N issues)
  - #6 — Old content preview [Superseded by: #14 — New preview architecture]

Needs update (N issues)
  - #10 — Broken thumbnails debug page [Body references old file paths]
```

**Wait for user confirmation** before closing any issues marked out of scope, stale, or superseded. Auto-close only "already done" issues (with evidence).

---

## Phase 4: Issue quality check

For every active issue, verify it meets quality standards:

- Has a **type label** and **priority label**
- Has **acceptance criteria** (checkbox format)
- Has **file paths** referenced (at least one `src/...` path)
- Has a **test URL** for UI-facing issues

Flag any issues that are missing these for update.

---

## Phase 5: Report

Print a comprehensive report:

```
=== Sync Report ===

Overview
  GitHub issues: N open
  Current sprint: <milestone title> (due <date>)

Sprint changes
  - Rolled #<N>: <title> (from "<old milestone>")
  ...

Relevance verdicts
  Active: N
  Already done: N (auto-closed)
  Out of scope: N (awaiting confirmation)
  Stale: N (awaiting confirmation)
  Superseded: N (awaiting confirmation)
  Needs update: N

Quality flags
  - #<N> — missing priority label
  - #<N> — missing acceptance criteria
  ...

Action needed from you
  - Confirm closing N out-of-scope issues
  - Confirm closing N stale issues
  - Review N issues needing updates
```

If the user confirms closures, execute them. Otherwise, leave them open.
