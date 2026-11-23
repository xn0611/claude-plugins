# Working in this repo

This repo holds agent skills, shipped as one Claude Code plugin (`xinnan-skills`) through this repo's own marketplace (`xinnan`).

## Layout

- Each skill is a folder `skills/<skill-name>/` containing `SKILL.md`. The folder name matches the `name` in the frontmatter (lowercase, hyphens). The plugin ships every folder under `skills/`.
- List every skill in `README.md`, its name linked to its `SKILL.md`.
- After touching either manifest in `.claude-plugin/`, run `claude plugin validate .` and bump `version` in `plugin.json`.

## Writing a skill

- `SKILL.md` frontmatter: `name`, `description`. The description says what it does and when to use it, with the trigger phrases a user would actually type, in one or two sentences.
- For a skill that should only run when typed as a slash command, add `disable-model-invocation: true`.
- Keep `SKILL.md` short and procedural. Put long reference material in sibling `.md` files and large or reusable code in `assets/` or `scripts/`, and point to them by relative path. Never paste generated code into `SKILL.md`.
- A skill must work without this repo being present: everything it needs lives inside its own folder.
- Any skill that starts a subagent says to start it with a fresh context.

## active-reader specifics

- The reader page is `skills/active-reader/assets/reader.js` + `reader.css`. Change them only when asked to change how the reader looks or behaves; keep the current visual design.
- No quiz and no end-of-document summary: the user removed them on purpose. The end of the page is **Go deeper** (questions about the whole document, suggested next topics); keep it from turning into either.
- After changing the assets, rebuild a test page with `node skills/active-reader/scripts/build-page.mjs <some doc.md>` and open it.
