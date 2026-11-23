# Working in this repo

This repo holds agent skills, shipped as one Claude Code plugin (`xinnan-skills`) through this repo's own marketplace (`xinnan`).

## Layout rules

- Each skill is a folder `skills/<bucket>/<skill-name>/` containing `SKILL.md`. The folder name matches the `name` in the frontmatter (lowercase, hyphens).
- Buckets:
  - `learning/`: reading, studying and reviewing documents. Promoted.
  - `in-progress/`: beta. Linked locally for feedback, never shipped in the plugin.
  - `deprecated/`: retired. Not linked, not shipped.
  - Add a new promoted bucket (for example `engineering/`, `productivity/`) when a skill doesn't fit; give it a `README.md`.
- Every promoted skill must appear in three places: its bucket `README.md`, the top-level `README.md` (name linked to its `SKILL.md`), and `.claude-plugin/plugin.json`'s `skills` array. Non-promoted skills appear in none of them except their own bucket `README.md`.
- After touching either manifest, run `claude plugin validate . --strict` and bump `version` in `plugin.json`.

## Writing a skill

- `SKILL.md` frontmatter: `name`, `description`. The description says what it does and when to use it, with the trigger phrases a user would actually type, in one or two sentences.
- For a skill that should only run when typed as a slash command, add `disable-model-invocation: true` and list it under **User-invoked** in the READMEs.
- Keep `SKILL.md` short and procedural. Put long reference material in sibling `.md` files and large or reusable code in `assets/` or `scripts/`, and point to them by relative path. Never paste generated code into `SKILL.md`.
- A skill must work without this repo being present: everything it needs lives inside its own folder.
- Any skill that starts a subagent says to start it with a fresh context.

## active-reader specifics

- The reader page is `skills/learning/active-reader/assets/reader.js` + `reader.css`. Change them only when asked to change how the reader looks or behaves; keep the current visual design.
- No quiz and no end-of-document summary: the user removed them on purpose.
- After changing the assets, rebuild a test page with `node skills/learning/active-reader/scripts/build-page.mjs <some doc.md>` and open it.
