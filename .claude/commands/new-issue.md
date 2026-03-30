---
description: "Investigate, create, and track a new issue on GitHub with proper labels, milestone, project assignment, test URLs, and a project intent file."
---

# /new-issue — Create a new GitHub issue for TCTools

You are a project management assistant for the TCTools repo (`telus/tctools`). The user will describe an issue, bug, feature, or epic. Your job is to investigate the problem, gather relevant context from the codebase, and create a well-structured GitHub issue with an optional project intent file.

**Important:** This is a TCTools-only repo. Issues may relate to TCTools features or to dotCMS backend work that TCTools depends on.

**NP base URL:** `https://tctools-np.cloudapps.telus.com`

**Issue domain context:**

- **TCTools** — SvelteKit frontend/tools work. Can be developed with AI agent assistance (faster timelines).
- **dotCMS** — Backend CMS work that must be done inside dotCMS to support TCTools functionality. Manual-only, no AI assistance. Prefixed `[DOTCMS]` in titles.

> **Note:** This command creates GitHub issues only. Beads (bd) task decomposition happens later when an agent picks up the issue to implement (via `/next` → `/go`). Do NOT create bd issues here.

The user's description of the issue:

$ARGUMENTS

---

## Step 1: Understand the user's request

Read the user's description carefully. Determine:

- **Issue type**: Is this a `BUG`, `FEATURE`, `ENHANCEMENT`, `TASK`, `CHORE`, or an `EPIC`?
- **Domain**: Is this a TCTools issue or a `[DOTCMS]` issue (backend CMS work)?
- **Severity/urgency**: Is this critical/breaking? High priority? Normal? Low/nice-to-have?
- **Sprint relevance**: Did the user explicitly say this belongs in the current sprint/milestone? Bugs and breaking issues are automatically assigned to the current sprint milestone; features and epics are only assigned if the user explicitly requests it.
- **Scope**: Is this a single issue or should it be broken into multiple issues?

If the user's description is ambiguous or missing critical details, ask clarifying questions before proceeding. Do not guess at requirements.

## Step 2: Check for duplicates and related issues

**This step is critical.** Before investigating the codebase or creating anything, thoroughly search for existing issues that overlap with the new issue. We must avoid duplicates and properly link related work.

### 2a. Search GitHub issues (open AND closed)

Run multiple searches using different keyword combinations to cast a wide net. Use both broad and specific terms.

```bash
# Search open issues with primary keywords
gh issue list --state open --search "<primary keywords>" --json number,title,labels,milestone,body --limit 20

# Search with alternative/related keywords (synonyms, related concepts)
gh issue list --state open --search "<alternative keywords>" --json number,title,labels,milestone,body --limit 20

# Also check recently closed issues — the problem may have already been addressed
gh issue list --state closed --search "<primary keywords>" --json number,title,labels,milestone,body --limit 10
```

### 2b. Classify each matching issue

For every issue found, classify its relationship to the new issue:

| Relationship             | What it means                                                                 | What to do                                                                                                                                                                    |
| ------------------------ | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Exact duplicate**      | Same problem/request, same scope                                              | **STOP.** Do NOT create a new issue. Tell the user about the existing issue and ask if they want to update/reopen it instead.                                                 |
| **Substantial overlap**  | Covers most of the same ground, maybe slightly different scope                | **STOP.** Present the existing issue to the user. Ask: should we update the existing issue, close it in favor of a new one, or narrow the new issue's scope to avoid overlap? |
| **Tangentially related** | Different issue but in the same area, or loosely connected functionality      | Note the relationship. The new issue should reference these in its "Related issues" section.                                                                                  |
| **Would be resolved by** | An existing issue, if completed, would fix or make this new issue unnecessary | **STOP.** Tell the user. Ask if they'd rather prioritize or update the existing issue instead of creating a new one.                                                          |
| **Blocks this issue**    | The new issue can't be worked on until an existing issue is resolved first    | Proceed with creation, note the blocker in the body.                                                                                                                          |
| **Parent/child**         | The new issue is a sub-task of an existing epic, or vice versa                | Proceed, but link them.                                                                                                                                                       |

### 2c. Decision gate

- If any **exact duplicate** or **substantial overlap** was found → present findings to the user and **wait for their decision** before proceeding.
- If an existing issue **would resolve** this new issue → present it and **wait for confirmation** to proceed.
- Otherwise → proceed to Step 2d, carrying forward the relationship notes for use in the issue body.

### 2d. Review project intents

Before investigating the codebase, understand the project's current direction.

```bash
cat _references/intents/DISTILLED.md
```

Also check recent individual intent files:

```bash
ls _references/intents/*.md | grep -v README.md | grep -v DISTILLED.md | sort -r | head -10
```

Read the most recent 3-5 intent files. Ask:

1. **Does this new issue align with current intents?** If yes, note which intents it supports.
2. **Does this new issue change direction?** If it introduces a new goal, feature area, or architectural approach, it will need a new intent file (created in Step 9).
3. **Does this new issue deprecate or supersede an existing intent?** If so, the intent file will need updating (done in Step 9).

Store this analysis — you'll need it for the issue body (context section) and for creating the intent file.

## Step 3: Investigate the codebase

The goal of investigation is to produce an issue so detailed that an agent or developer can implement it **without asking follow-up questions**. Do NOT skip any sub-step.

1. **Search for relevant code** — use Grep, Glob, and Read to find the files, components, functions, or routes related to the issue.
2. **Identify the affected area** — determine exact file paths, line numbers, and component names. Read the relevant files to understand the current implementation.
3. **Identify existing patterns** — look at how similar functionality is already implemented elsewhere in the codebase. The implementing agent will need to follow these patterns. Note:
   - Component structure and naming conventions used in nearby files.
   - How Svelte 5 runes are used in the affected area (`$state`, `$derived`, `$effect`, `$props`).
   - How tests are written for similar components/functions (find a neighboring `.test.ts` file as a reference).
   - How error handling and loading states are done in related components.
4. **Gather technical details** — for bugs, identify the root cause if possible. For features, identify the integration points and dependencies.
5. **Identify edge cases and constraints** — think through:
   - Mobile and desktop viewports — does the change need responsive handling?
   - Accessibility — are there `aria-*` attributes, keyboard navigation, or screen reader concerns?
   - Error states and empty states.
   - dotCMS API availability — does the feature degrade gracefully if dotCMS is unavailable?

The issue body must include specific file paths, component names, code references, existing patterns, and edge cases — not just a restatement of the user's words.

## Step 4: Fetch current project metadata

Before composing the issue, fetch live repo metadata so that labels, milestones, and conventions stay in sync even when the team changes them.

### 4a. Get today's date

```bash
date +%Y-%m-%d
```

### 4b. Fetch all repository labels

```bash
gh label list --limit 100 --json name,description,color
```

Parse the output and classify every label into one of these categories using **case-insensitive pattern matching**. The exact label names may change over time — never assume a hardcoded list.

| Category     | How to identify                                                                                                   | Purpose                                                 |
| ------------ | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| **Type**     | Name matches a common issue type keyword: bug, feature, enhancement, task, chore, epic, etc.                      | Describes what kind of work this is. Pick **one**.      |
| **Priority** | Name or description contains "priority" or "severity".                                                            | Indicates urgency. Pick **one**.                        |
| **Context**  | Everything else — domain labels (dotCMS, tools), workflow labels (blocked), qualifier labels (QoL, nice-to-have). | Adds categorization. Pick **zero or more** as relevant. |

Store this classified label inventory for use in Steps 5 and 6.

### 4c. Fetch milestones and identify the current sprint

```bash
gh api repos/telus/tctools/milestones --jq '.[] | {number, title, due_on, state, open_issues}'
```

Using today's date, identify the **current sprint milestone**: the sprint milestone whose `due_on` is the nearest future date (or today).

### 4d. Milestone assignment rules

| Issue type              | Condition                                | Milestone              |
| ----------------------- | ---------------------------------------- | ---------------------- |
| Bug                     | Always (unless trivial/cosmetic)         | Current sprint         |
| Breaking/critical issue | Always                                   | Current sprint         |
| Feature or Epic         | User explicitly requested current sprint | Current sprint         |
| Feature or Epic         | User did NOT request current sprint      | No milestone (backlog) |
| Task or Chore           | User explicitly requested current sprint | Current sprint         |
| Task or Chore           | User did NOT request current sprint      | No milestone (backlog) |
| Enhancement             | User explicitly requested current sprint | Current sprint         |
| Enhancement             | User did NOT request current sprint      | No milestone (backlog) |

## Step 5: Compose the GitHub issue

### Title

Follow the existing naming convention with a type prefix in brackets:

- `[BUG] <concise description>`
- `[FEATURE] <concise description>`
- `[ENHANCEMENT] <concise description>`
- `[TASK] <concise description>`
- `[CHORE] <concise description>`
- `[EPIC] <concise description>`

For dotCMS backend work, add the domain prefix:

- `[DOTCMS] [TASK] <concise description>`
- `[DOTCMS] [BUG] <concise description>`

Keep the title short and scannable — under 80 characters when possible.

### Labels

Use the classified label inventory from **Step 4b**. Always apply at least a **type label** and a **priority label**.

1. **Type label** (pick one): From the fetched type labels, select the one that best matches the issue type.
2. **Priority label** (pick one): From the fetched priority labels, select the one that matches the severity.
3. **Context labels** (pick zero or more): Apply any that are relevant — especially `dotCMS` for dotCMS issues, `blocked` if applicable.

**Important:** Only apply labels that actually exist in the fetched inventory. Never invent label names.

### Body

Every issue body must be **implementation-ready** — detailed enough that an agent or developer can produce a complete, tested solution without asking follow-up questions. Use the appropriate template below, filling in every section with specifics from your investigation.

**For bugs:**

```markdown
## Bug

<Clear description of what's wrong>

**Current behavior:**
<What happens now — be specific>

**Expected behavior:**
<What should happen instead>

## Location

- **Component:** `<file path>`
- **Lines:** <line numbers if applicable>
- **Route:** <URL path if applicable>

## Steps to reproduce

1. <step>
2. <step>
3. <step>

## Root cause analysis

<Technical analysis of why the bug occurs, referencing specific code.>

## Suggested fix

<Concrete implementation approach — which files to change, what the change looks like, and any patterns to follow from the existing codebase.>

## Acceptance criteria

- [ ] <The specific broken behavior is fixed>
- [ ] <No visual regression on mobile viewports>
- [ ] <Existing tests still pass>
- [ ] <New or updated tests cover the fix>

## Testing guidance

- **Unit tests:** <What to test — expected inputs/outputs, edge cases. Reference a similar existing test file as a pattern to follow.>
- **Manual verification:** <Steps to visually confirm the fix in the browser>

## Edge cases to consider

- <Edge case 1 — e.g., empty state, missing data, dotCMS unavailable>
- <Edge case 2 — e.g., long text overflow, special characters in content>

## Related issues

- #<number> — <relationship description>
```

**For features and enhancements:**

```markdown
### Problem to solve

<Why this feature is needed — the user pain point or business need>

### Proposed solution

<What we want to build, including the technical approach and how it integrates with existing architecture>

### Implementation guide

- **Files to create:** `<new file paths, if any>`
- **Files to modify:** `<existing file paths>`
- **Existing patterns to follow:** <Reference a similar feature/component already in the codebase that demonstrates the conventions to follow.>
- **Dependencies:** <Libraries, APIs, other issues, or external services this depends on>

### Acceptance criteria

- [ ] <Functional criterion 1 — what the user can do>
- [ ] <Functional criterion 2>
- [ ] <a11y: Interactive elements have proper `aria-*` attributes, keyboard navigation works>
- [ ] <Responsive: Works correctly on mobile (320px+), tablet, and desktop>
- [ ] <Error handling: Graceful degradation when data is unavailable or API fails>
- [ ] <Loading states: Skeleton loaders, `{#await}` blocks, or explicit loading state for async content>
- [ ] <Tests: Unit tests cover core logic; component tests cover UI behavior if applicable>

### Testing guidance

- **Unit tests:** <What pure logic/utilities to test, expected inputs and outputs. Reference a similar test file as a pattern.>
- **Component tests:** <What component behavior to test, if applicable.>
- **Manual verification:** <Steps to confirm the feature works end-to-end in the browser>

### Edge cases to consider

- <Edge case 1 — e.g., no data returned from API, empty arrays>
- <Edge case 2 — e.g., very long content, special characters, missing optional fields>
- <Edge case 3 — e.g., logged-out user, dotCMS API unavailable>

### Out of scope

- <Anything explicitly NOT part of this issue, to prevent scope creep>

### Related issues

- #<number> — <relationship description>
```

**For tasks and chores:**

```markdown
## Description

<What needs to be done and why — include the motivation/business reason>

## Scope

- <Specific deliverable 1>
- <Specific deliverable 2>

## Implementation guide

- **Files to modify:** `<file paths>`
- **Existing patterns to follow:** <Reference similar completed work in the codebase>
- **Approach:** <Step-by-step technical plan>

## Acceptance criteria

- [ ] <Criterion 1 — concrete, verifiable outcome>
- [ ] <Criterion 2>
- [ ] <No regressions: existing tests pass (`pnpm test:unit`)>
- [ ] <Linting and type checks pass (`pnpm check`)>

## Testing guidance

- **Unit tests:** <What to test, if applicable>
- **Verification:** <How to confirm the task is complete>

## Out of scope

- <Anything explicitly NOT part of this task>

## Related issues

- #<number> — <relationship description>
```

**For epics:**

```markdown
## Overview

<High-level description of the epic and its business value>

## Sub-issues

This epic will be broken into the following issues:

- [ ] #<number> — <title> (or "to be created")
- [ ] #<number> — <title>

## Acceptance criteria (epic-level)

- [ ] <High-level criterion 1 — the overall outcome when all sub-issues are complete>
- [ ] <High-level criterion 2>
- [ ] <a11y: All new UI meets accessibility standards>

## Technical notes

- **Scope:** <Areas of the codebase affected>
- **Architecture decisions:** <Any significant design choices, trade-offs, or constraints>
- **Dependencies:** <External dependencies or prerequisites>
- **Existing patterns:** <Reference existing similar features to follow as a model>

## Out of scope

- <What is NOT part of this epic>
```

### Required additions to ALL templates

After filling in the template, append these two sections to the issue body:

**Test URL** — For any issue that touches a UI-visible route, include a direct link to the NP environment so reviewers can test:

```markdown
## Test URL

[<page name>](https://tctools-np.cloudapps.telus.com/<route path>)
```

Use the route that's most relevant to the issue. Common routes:

- `/` — Home/dashboard
- `/tools/search-rank`, `/tools/link-generator`, `/tools/images`, `/tools/image-generator`, `/tools/content-feedback`
- `/debug/auth-test`, `/debug/broken-thumbnails`, `/debug/content-sync`, `/debug/content-counts`, `/debug/fuelix-image`
- `/system/cache-reset`, `/system/index-refresh`
- `/profile`, `/docs`, `/preview/en/news/article/<slug>`

Omit this section only for issues that are purely backend/config/infrastructure with no UI.

**Project context** — A brief note connecting the issue to the project's current direction:

```markdown
## Project context

<1-2 sentences explaining how this issue fits the current project direction. Reference the relevant intent from `_references/intents/DISTILLED.md` if one exists.>
```

## Step 6: Quality gate — review before creating

Before creating the issue, verify it passes this checklist. If any item fails, go back and fix it.

| #   | Check                                                                                                                                                                         | Required for                         |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| 1   | **Acceptance criteria exist** and are specific, testable, and use checkbox format (`- [ ]`).                                                                                  | All types                            |
| 2   | **File paths are concrete** — at least one specific `src/...` path is referenced.                                                                                             | All types                            |
| 3   | **Existing patterns referenced** — the issue points to a specific file or component in the codebase that the implementer should follow as a model.                            | Features, enhancements, tasks        |
| 4   | **Testing guidance included** — the issue describes what tests to write and references an existing test file as a pattern.                                                    | All types                            |
| 5   | **Edge cases listed** — at least 2 edge cases are identified.                                                                                                                 | Bugs, features, enhancements         |
| 6   | **Out of scope defined** — for features/tasks, boundaries are set to prevent scope creep.                                                                                     | Features, enhancements, tasks, epics |
| 7   | **Not a duplicate** — the duplicate/relationship check in Step 2 searched GitHub, and confirmed no existing issue covers this. Any related issues are referenced in the body. | All types                            |
| 8   | **Title is scannable** — type prefix (and domain prefix if dotCMS), under 80 chars.                                                                                           | All types                            |
| 9   | **Labels are valid** — every label applied exists in the fetched inventory from Step 4b.                                                                                      | All types                            |
| 10  | **Labels will be applied** — the create command includes `--label` for the chosen type, priority, and each relevant context label.                                            | All types                            |
| 11  | **Project assignment** — the create command includes `--project "TCTools"` if a TCTools GitHub Project exists.                                                                | All types                            |
| 12  | **Test URL included** — for UI-touching issues, a direct NP link is in the body.                                                                                              | UI issues                            |
| 13  | **Project context included** — the body has a "Project context" section linking to current intents.                                                                           | All types                            |

If writing an epic, also verify each planned sub-issue would independently pass checks 1–7.

## Step 7: Create the GitHub issue

Build and execute the `gh issue create` command. Use a HEREDOC for the body to preserve formatting.

**Required flags:**

- `--title "<title>"`
- `--label "<type label>"` — the one type label from Step 5.
- `--label "<priority label>"` — the one priority label from Step 5.
- `--label "<context label>"` — repeat for each context label chosen in Step 5. Omit only if none apply.
- `--milestone "<milestone title>"` — use the milestone from Step 4d, or omit the flag entirely for backlog items.
- `--project "TCTools"` — if a TCTools project board exists. If the command fails with a permissions error, run `gh auth refresh -s project`.
- `--body "..."` — use HEREDOC as below.

Example:

```bash
gh issue create --title "<title>" --label "<type>" --label "<priority>" --label "<context if any>" --milestone "<milestone or omit>" --project "TCTools" --body "$(cat <<'ISSUE_EOF'
<body content>
ISSUE_EOF
)"
```

If this is an **epic** that should be split into multiple sub-issues:

1. Create the epic issue first.
2. Create each sub-issue with a reference to the parent epic in the body.
3. Update the epic body with links to the created sub-issues.

After creation, capture the new issue number from the output.

## Step 8: Handle blocking relationships

If during the duplicate/relationship check (Step 2) you identified issues that block or are blocked by this new issue:

1. **This issue blocks another**: Comment on the blocked issue:

   ```bash
   gh issue comment <blocked-number> --body "Note: this may be blocked by #<new-number> (<new title>)."
   ```

   If the fetched label inventory contains a "blocked" context label, add it to the blocked issue.

2. **This issue is blocked by another**: Apply the "blocked" label from the inventory to the new issue and note the blocker in the body.

## Step 9: Create project intent file (if needed)

Determine whether this issue introduces or changes the project's direction. An intent file is needed when:

- A new feature area or tool is introduced
- An architectural approach or technical direction changes
- A significant enhancement alters how users interact with existing tools
- A strategic decision affects multiple future issues

**Skip this step** for pure bug fixes, mechanical chores, dependency updates, or tasks that don't change trajectory.

### 9a. Create the intent file

```bash
# File naming: YYYY-MM-DD-<kebab-case-summary>.md
# e.g., 2026-03-20-content-feedback-ai-scoring.md
```

Write the intent file to `_references/intents/`:

```markdown
# <Short intent title>

**Date:** <today's date>
**Issue:** GH #<number>
**Status:** active

## Intent

<1-3 paragraphs describing what we want to accomplish and why. More detailed and strategic than the issue description — this captures the "why behind the why".>

## Direction

<How this fits into the broader project trajectory. What previous work does it build on? What future work does it enable?>

## Success criteria

- <What "done" looks like for this intent — broader than the issue's acceptance criteria>
```

### 9b. Update existing intents (if applicable)

If the intent review in Step 2d identified intents that this new issue deprecates or supersedes:

1. Read the affected intent file.
2. Change its `**Status:**` from `active` to `deprecated` or `superseded`.
3. Add `**Superseded by:** GH #<new-number> / <new intent filename>`.
4. Do NOT delete the file.

## Step 10: Report summary

Print a clear summary of everything created:

```
=== New Issue Summary ===

GitHub:
  Issue: #<number> — <title>
  Type: <type label>
  Priority: <priority label>
  Milestone: <milestone title or "None (backlog)">
  Labels: <comma-separated labels>
  Project: TCTools (if added)
  URL: <issue URL>
  Test URL: <NP URL or "N/A (no UI)">

Intent:
  File: _references/intents/<filename>.md (or "Skipped — no direction change")
  Deprecated: <list of deprecated intents, if any>

Relationships:
  Blocks: #<number> (<title>) — if applicable
  Blocked by: #<number> (<title>) — if applicable

Sub-issues (if epic):
  - #<number> — <title>
  - #<number> — <title>
```

If multiple issues were created, list all of them with their GH numbers.
