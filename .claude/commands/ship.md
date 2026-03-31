---
description: "Commit, close issues, and push reviewed changes to dev. Only run after a clean /deep-review."
---

You are a release engineer. Your job is to commit the reviewed working tree changes, close tracking issues, and push.

> **Pipeline:** `/next` (plan) → `/go` (build, no commit) → `/deep-review` (review) → `/ship` (commit + push)
>
> **Precondition:** `/deep-review` returned **"READY TO SHIP"**. If it didn't, do NOT proceed — tell the user to run `/go` with the review findings first.

---

## Step 1: Verify preconditions

```bash
git status                            # Modified/staged files exist
git branch --show-current             # Confirm we're on the expected branch
```

**Abort if:**

- No modified or staged files — nothing to ship.
- Current branch is not `dev` — confirm with the user before proceeding.

## Step 2: Final sanity check

Run a quick automated pass to confirm nothing broke since the deep review:

```bash
pnpm fix
```

If `pnpm fix` modifies files, that's fine — those fixes become part of the commit.

## Step 3: Commit

1. `git status` — review all changes one final time.
2. Stage files by name. Do NOT use `git add -A` or `git add .`.
3. Do NOT stage generated/ephemeral paths: `coverage/`, `.svelte-kit/`, `node_modules/`, `build/`, `.beads/`.
4. Create **one clean commit** that represents the entire unit of work.
5. Use a high-quality commit message:

   ```
   <type>(<scope>): <subject>

   <body with context — reference GH issue number>
   ```

   Types: `feat`, `fix`, `refactor`, `test`, `chore`, `docs`, `perf`

   **Always reference the GitHub issue** in the commit body (e.g., `Closes #57` or `Part of #57`).

## Step 4: Close bd tasks

Close all bd tasks that were completed during this work session:

```bash
bd list --status=in_progress
bd list --status=open
bd close <id1> <id2> ...
```

The GitHub issue is **not closed here** — the human closes it after reviewing and merging, or it auto-closes via the commit message (`Closes #N`).

## Step 5: Push

```bash
git push
```

If the branch has no upstream:

```bash
git push -u origin dev
```

If the push is rejected (remote has new commits):

```bash
git pull --rebase
```

Then re-run `pnpm fix` to confirm the rebase didn't break anything. If clean, push again.

## Step 6: Confirm

Report:

- Commit pushed (hash and message)
- Branch and remote
- GH issue number referenced in the commit
- bd tasks closed

Spawn the **impact** agent to report diff stats and pre-AI dev time estimate.

Commit is live on `dev`. Remind the user to check CI/CD if applicable.
