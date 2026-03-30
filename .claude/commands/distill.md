---
description: "Consolidate all individual intent files into DISTILLED.md. Marks outdated intents as deprecated. Produces a clean summary of current project direction."
---

# /distill — Consolidate Project Intents

You are a project strategist for TCTools (`telus/tctools`). Your job is to read every intent file in `_references/intents/`, understand the current state of each, and produce an updated `DISTILLED.md` that gives any command or agent a clear, concise picture of where the project is heading.

**Rules:**

- Never delete intent files — mark them `deprecated` or `superseded`.
- `DISTILLED.md` is the canonical output. Other commands read this file first.
- Be concise. Each active theme should be 2-4 sentences, not paragraphs.

The user's instructions (if any):

$ARGUMENTS

---

## Phase 1: Gather all intents

1. List all `*.md` files in `_references/intents/` (excluding `README.md` and `DISTILLED.md`).
2. Read each intent file. For every intent, extract:
   - **Title**
   - **Date**
   - **Issue refs** (GH # and bd-ID)
   - **Status** (active / deprecated / superseded)
   - **Intent summary** (1 sentence)
   - **Direction** (1 sentence)
   - **Success criteria** (bullet list)

If there are **no individual intent files** (only README.md and DISTILLED.md), report that there's nothing to distill and stop.

## Phase 2: Cross-reference with live issues

For each active intent, check whether its linked issue(s) still exist and are open:

```bash
# Check GitHub issue status
gh issue view <number> --json state,title --jq '{state,title}'

# Check beads status
bd show <bd-id> --json 2>/dev/null | head -5
```

Update the intent's effective status:

| Intent status | Issue state | Effective status                                          |
| ------------- | ----------- | --------------------------------------------------------- |
| active        | open        | **active** — keep as-is                                   |
| active        | closed      | **completed** — intent achieved, move to completed themes |
| active        | not found   | **orphaned** — flag for review                            |
| deprecated    | any         | **deprecated** — keep as-is                               |
| superseded    | any         | **superseded** — keep as-is                               |

## Phase 3: Identify themes

Group active intents into logical themes. A theme is a coherent area of work (e.g., "Content tools enhancement", "Developer experience", "Infrastructure modernization").

Rules for themes:

- 3-7 themes maximum. If more, merge related intents.
- Each theme needs a clear, short title (3-5 words).
- Order themes by strategic importance (most impactful first).

## Phase 4: Write DISTILLED.md

Overwrite `_references/intents/DISTILLED.md` with this structure:

```markdown
# TCTools — Distilled Project Intents

**Last distilled:** <today's date>

This file is the canonical summary of the current direction, goals, and active intentions for TCTools. Commands (`/sync`, `/new-issue`, `/next`) should read this file first to understand the project's trajectory.

---

## Current Direction

<2-3 sentences summarizing the overall project trajectory right now. What's the big picture?>

### <Theme 1 title>

<2-4 sentences describing this theme — what, why, and where it's heading.>

**Active intents:**

- <intent title> (GH #<n>) — <1 sentence summary>

---

### <Theme 2 title>

...

---

## Completed

Intents whose linked issues have been closed. Kept for context.

- <intent title> (GH #<n>, closed <date>) — <1 sentence outcome>

## Deprecated / Superseded

Intents that were abandoned or replaced by newer direction.

- <intent title> — <reason> → Superseded by: <new intent or "N/A">
```

## Phase 5: Update individual intent files

For any intents whose effective status changed in Phase 2:

1. **Completed intents** (issue closed but intent still says `active`):
   - Update `**Status:**` to `completed` in the individual intent file.

2. **Orphaned intents** (issue not found):
   - Print a warning. Ask the user whether to mark as `deprecated` or investigate.
   - Do NOT auto-deprecate without confirmation.

Do NOT modify intents that are already correctly marked.

## Phase 6: Report

Print a summary:

```
=== Distill Summary ===

Intents processed: <total>
  Active: <count> (across <theme count> themes)
  Completed: <count>
  Deprecated: <count>
  Superseded: <count>
  Orphaned: <count> (flagged for review)

Themes:
  1. <theme title> (<n> intents)
  2. <theme title> (<n> intents)
  ...

Changes made:
  - <intent file> — status updated to <new status>
  - DISTILLED.md — rewritten

No changes needed:
  - <intent files that were already correct>
```
