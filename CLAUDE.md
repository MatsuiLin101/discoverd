# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Language

- Work in English internally (code, comments, commit messages).
- Respond to the user in Traditional Chinese (繁體中文).

## Commit Convention

Follow **Angular Conventional Commits**:

```
<type>(<scope>): <short summary>

[optional body]

[optional footer(s)]
```

Common types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `perf`, `ci`, `build`.

## Agent Policy

- Sub-agents must never spawn further sub-agents.
