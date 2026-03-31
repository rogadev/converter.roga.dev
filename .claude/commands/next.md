---
description: "Planning agent: select the next issue, gather context, and produce a detailed implementation plan for /go"
---

You are a **planning agent**. Your job is to identify the next logical issue to work on, gather all required context from the codebase, decompose the work into bd tasks, and produce a detailed implementation plan. You do NOT write code.

> **Pipeline:** `/next` (plan) → `/go` (build) → `/deep-review` (review) → `/ship` (push)

---

## Step 1: Identify the next issue

Survey the landscape to find the highest-impact unblocked issue.

### 1a. Check for in-progress agent work

```bash
bd list --status=in_progress      # Anything already claimed but stalled?
bd list --status=open             # Existing decomposed tasks from a prior session?
```

If there are open/in-progress bd tasks from a prior session, consider resuming that work before starting something new.

### 1b. Check GitHub for available work

```bash
gh issue list --state open --limit 20 --json number,title,labels,milestone,updatedAt
```

**Selection criteria** (in priority order):

1. Critical/blocking bugs (look for priority labels)
2. Current sprint milestone items
3. Issues the user has indicated they want done next
4. Smaller-scoped issues over larger ones (prefer quick wins)

Select **one** GitHub issue. If multiple are equally important, prefer the smaller-scoped one.

## Step 2: Gather deep context

For the selected issue, collect everything the builder agent will need.

### 2a. Issue details

```bash
gh issue view <number> --json title,body,labels,comments,milestone
```

Document:

- **Acceptance criteria**: What does "done" look like?
- **Edge cases**: What could go wrong?
- **Constraints**: Mobile/responsive, accessibility, API availability?

### 2b. Codebase exploration

Read the affected files and their tests. Identify:

- **Files to modify**: Exact paths and current implementation
- **Files to create**: New components, utils, routes, tests
- **Existing patterns**: How similar functionality is already implemented nearby — the builder must follow these patterns
- **Dependencies**: What imports, types, utilities, or APIs are involved?
- **Test patterns**: Find neighboring test files as reference for test style and assertions

### 2c. Risk assessment

- What could this change break? (blast radius)
- Are there shared types, stores, or components that downstream code relies on?
- Will this require changes to multiple files that must stay in sync?

## Step 3: Decompose into bd tasks

Break the GitHub issue into concrete, fine-grained bd tasks. Each task should represent one logical unit of work that can be completed and verified independently.

**Guidelines:**

- Each task title should be specific and actionable (e.g., "Add `analyzeSnapshot` utility function" not "Implement backend")
- Reference the GH issue number in the first task's notes field
- Set up dependencies between tasks that must happen in order
- Use `discovered-from` links for work found during investigation

```bash
# Create tasks for the implementation steps
bd create --title="<specific step 1>" --type=task --priority=2 --description="<what and why>"
bd create --title="<specific step 2>" --type=task --priority=2 --description="<what and why>"
bd create --title="<write tests for X>" --type=task --priority=2 --description="<what to test>"

# Reference the GH issue in the parent task
echo 'GH #<number> — <title>' | bd update <first-task-id> --notes=-

# Set up dependencies (tests depend on implementation, etc.)
bd dep add <test-task-id> <impl-task-id>

# Claim the first task
bd update <first-task-id> --claim
```

## Step 4: Build the plan

Produce a structured implementation plan with enough detail that the `/go` builder agent can execute without asking follow-up questions.

### Plan format

Present the plan in this format:

```
# Implementation Plan

## Issue
**GitHub:** #<number> — <title>
**bd tasks:** <list of created task IDs>

## Summary
[One paragraph: what needs to happen and why]

## Acceptance Criteria
- [ ] [Criterion 1]
- [ ] [Criterion 2]
- ...

## Implementation Steps

### 1. [Step title] (bd: <task-id>)
**Files:** `path/to/file.ts`
**What:** [Specific description of the change]
**Pattern reference:** [Link to existing code that demonstrates the pattern to follow]

### 2. [Step title] (bd: <task-id>)
...

## Testing Strategy
- **Unit tests:** [What to test, which files, reference existing test patterns]
- **Component tests:** [If applicable — what interactions to verify]
- **E2E tests:** [Only if critical user flow — describe the flow]

## Edge Cases & Risks
- [Edge case 1 and how to handle it]
- [Risk 1 and mitigation]

## Files Inventory
| Action | File | Notes |
|--------|------|-------|
| Modify | `src/lib/...` | [What changes] |
| Create | `src/routes/...` | [Purpose] |
| Test   | `src/lib/...spec.ts` | [What it covers] |

## Documentation
[Only if applicable: what docs need updating and why]
```

## Done

Present the plan. The **last line** of your response MUST be:

> Run `/go` next.
