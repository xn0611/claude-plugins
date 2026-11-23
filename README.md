# Xinnan's skills

Agent skills I use every day, shipped as one Claude Code plugin.

## Skills

- **[active-reader](./skills/active-reader/SKILL.md)**: Learn a topic or review a document the way you review a pull request. Leave comments with the **+** gutter, keep reading, then submit them all at once and get a reply in each thread. A tutor answers when you're learning; a senior reviewer (Blocking / Should fix / Nit) answers when you're reviewing a design doc, RFC or spec.

  Try: "teach me about OpenAPI", or attach a design doc and say "review this with me".

## Install

**Claude Code (plugin):**

```
/plugin marketplace add xn0611/claude-plugins
/plugin install xinnan-skills@xinnan
```

**Claude Code (from this folder, while editing):** `claude --plugin-dir G:/projects/claude-plugins`.

**claude.ai and the desktop app:** run `scripts\package-skill.ps1 active-reader` and upload `dist\active-reader.zip` in Claude's skills settings.

See [CLAUDE.md](./CLAUDE.md) for the rules when adding a skill.
