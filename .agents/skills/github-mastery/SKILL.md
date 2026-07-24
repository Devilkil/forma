---
name: github-mastery
description: Complete playbook for inspecting, managing, and interacting with Git and GitHub repositories safely and effectively.
version: 1.0.0
---

# GitHub Mastery & Git Best Practices

This skill equips the agent with rules, commands, and safety workflows for working with Git repositories and GitHub CLI (`gh`).

---

## 1. Safety Rules & Pre-Checks

Before executing ANY Git write command (`git push`, `git checkout -b`, `git commit`), always run these non-destructive checks:

1. **Verify repository state:**
   ```bash
   git status
   ```
2. **Check unstaged and staged diffs:**
   ```bash
   git diff
   git diff --staged
   ```
3. **Verify current branch and remotes:**
   ```bash
   git branch --show-current
   git remote -v
   ```
4. **Safety Boundaries:**
   - NEVER run `git push --force` or `git push -f` on default branches (`main`, `master`).
   - NEVER destroy uncommitted changes with `git reset --hard` or `git clean -fd` without explicit user confirmation or stashing first (`git stash`).
   - Always verify `.gitignore` before committing large files or sensitive credentials.

---

## 2. Inspection & Repository Diagnostics

Use non-destructive inspection commands to inspect history and state:

- **Recent Commit History:**
  ```bash
  git log -n 10 --oneline --graph --decorate
  ```
- **File History & Blame:**
  ```bash
  git log -p -n 5 -- <file_path>
  git blame <file_path>
  ```
- **Check Stash List:**
  ```bash
  git stash list
  ```
- **List Local & Remote Branches:**
  ```bash
  git branch -a
  ```

---

## 3. Branching & Commit Workflows

### Branch Naming Conventions
- Features: `feature/<short-description>`
- Bug Fixes: `fix/<short-description>`
- Refactoring: `refactor/<short-description>`
- Documentation: `docs/<short-description>`

### Atomic Conventional Commits
Format: `<type>(<scope>): <short summary>`

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `perf`

```bash
git add <specific_files>
git commit -m "feat(auth): implement JWT token refresh handling"
```

---

## 4. GitHub CLI (`gh`) Integration

Leverage `gh` for GitHub platform interactions:

### Pull Requests
- **List PRs:** `gh pr list --state open`
- **View PR details:** `gh pr view <pr-number-or-url>`
- **Create PR:**
  ```bash
  gh pr create --title "feat: title" --body "Description of changes" --base main
  ```
- **Check PR Checks/CI:** `gh pr checks`

### Issues
- **List Issues:** `gh issue list --limit 10`
- **View Issue:** `gh issue view <issue-number>`
- **Create Issue:** `gh issue create --title "title" --body "body"`

### Repository & Releases
- **Repo Status:** `gh repo view`
- **List Releases:** `gh release list`

---

## 5. Merging & Conflict Resolution Workflow

1. **Fetch and Sync:**
   ```bash
   git fetch origin
   ```
2. **Rebase or Merge Target Branch:**
   ```bash
   git checkout feature/branch
   git merge origin/main
   ```
3. **Resolve Conflicts:**
   - Inspect conflicting files via `git status`.
   - Resolve conflict markers (`<<<<<<<`, `=======`, `>>>>>>>`).
   - Run tests to ensure resolution validity.
   - Stage resolved files: `git add <resolved-file>`
   - Finalize commit: `git commit --no-edit`

---

## 6. Undo & Emergency Recovery

- **Undo last commit (keep changes staged):**
  ```bash
  git reset --soft HEAD~1
  ```
- **Undo last commit (keep changes unstaged):**
  ```bash
  git reset HEAD~1
  ```
- **Recover lost commits or branch states:**
  ```bash
  git reflog
  git checkout -b recovery-branch <commit-hash-from-reflog>
  ```
- **Temporary Stash:**
  ```bash
  git stash save "work in progress"
  git stash pop
  ```
