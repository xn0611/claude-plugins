# Xinnan's skills

Small, composable agent skills I use every day. Each skill is a folder with a `SKILL.md` (and any assets or scripts it needs), so they work in Claude Code, claude.ai and any agent that reads Agent Skills.

## Skills

### Learning

- **[review-mode](./skills/learning/review-mode/SKILL.md)**: Read any document the way you review a pull request. Leave questions and comments inline with the **+** gutter, keep reading, then submit them all at once and get a reply in each thread. Two modes: **learn** (a tutor explains, re-explains and corrects) and **review** (a senior reviewer assesses design docs, RFCs and specs with Blocking / Should fix / Nit severity).

  Try: "teach me how gRPC streaming works in review mode", or attach a design doc and say "review this with me".

## Install

### Claude Code: as a plugin (updates with `git pull` + reinstall)

From inside Claude Code:

```
/plugin marketplace add G:/projects/claude-plugins
/plugin install xinnan-skills@xinnan
```

Once this repo is on GitHub, others can use `/plugin marketplace add <github-user>/claude-plugins` instead.

### Claude Code: linked straight from this folder (edits apply immediately)

```powershell
powershell -ExecutionPolicy Bypass -File scripts\link-skills.ps1
```

This links every skill outside `deprecated/` into `%USERPROFILE%\.claude\skills` with directory junctions (no admin rights needed). Re-run it after adding or renaming a skill. Use either the plugin or the links, not both, or every skill shows up twice.

### claude.ai and the Claude desktop app

Zip a skill and upload it in Claude's skills settings (or ask Claude in a chat to save it for you):

```powershell
powershell -ExecutionPolicy Bypass -File scripts\package-skill.ps1 review-mode
```

The zip lands in `dist\`. Re-upload it after changing the skill.

## Layout

```
.claude-plugin/
  marketplace.json   this repo as a plugin marketplace
  plugin.json        the plugin, and the exact list of skills it ships
skills/
  learning/          promoted: shipped in the plugin
    review-mode/
      SKILL.md
      assets/        the reader page (reader.js, reader.css, index.html)
      scripts/       build-page.mjs: builds a self-contained page offline
  in-progress/       beta: linked locally, not shipped in the plugin
  deprecated/        no longer used
scripts/
  link-skills.ps1    link skills into ~/.claude/skills (Windows)
  link-skills.sh     same, macOS/Linux
  package-skill.ps1  zip one skill for claude.ai upload
```

See [CLAUDE.md](./CLAUDE.md) for the rules when adding a skill.
