🚀 The Daily Development Lifecycle
Follow this sequence every time you sit down to code, modify a feature, or finalize your project.

1. Preparation (Before you start coding)
Always start by ensuring your local code is up to date.

Action: git checkout main

Action: git pull origin main

Why? This prevents "pull before push" errors later by making sure your computer knows about all current changes.

2. Implementation (The "Feature" Phase)
Do not write code directly on main. Keep it clean.

Action: git checkout -b feature-your-new-feature

Why? If you break the code, you only break your feature branch, not your stable project.

3. Verification & Saving (The "Commit" Phase)
Once your feature works, save it locally.

Action: git status (Check what changed).

Action: git add . (Stage the changes).

Action: git commit -m "Describe what you added/fixed"

Why? This creates a clear history of your progress.

4. Integration (Merging to Stable)
Bring your finished feature into the project.

Action: git checkout main

Action: git merge feature-your-new-feature

Why? This merges your polished work into the stable project.

5. Final Synchronization (The "Push" Phase)
Send your work to GitHub.

Action: git push origin main

Why? This ensures your project on GitHub matches the code on your computer.

Situation,Action Sequence
Accidentally added wrong files,git reset <filename>
"""Detached HEAD"" error",git checkout -b temp-save-branch
"""Overwritten by checkout"" error",git commit (then switch branches)
Git keeps tracking posts.json,"Create .gitignore, add posts.json, then git rm --cached posts.json"

💡 Pro Tips for your Final Project
Never ignore the .gitignore: By listing posts.json, node_modules, and .env files in your .gitignore, you keep your repository professional and secure.

Small Commits: Try to commit every time you finish a small task. It makes it easier to "go back in time" if you ever delete a function by mistake.

The "Golden Rule": Always Pull before you Push. It is the single most important habit for avoiding git conflicts.