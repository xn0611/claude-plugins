# Xinnan's skills

Agent skills I use every day, shipped as one Claude Code plugin.

## Skills

- **[active-reader](./skills/active-reader/SKILL.md)**: Learn a topic or review a document the way you review a pull request. Leave comments with the **+** gutter and each one gets a reply in its thread right away while you keep reading. **Finish & follow up** opens Go deeper. A tutor answers when you're learning; a senior reviewer (Blocking / Should fix / Nit) answers when you're reviewing a design doc, RFC or spec.

  Try: "teach me about OpenAPI", or attach a design doc and say "review this with me".

## Install

**Claude Code (plugin):**

```
/plugin marketplace add xn0611/claude-plugins
/plugin install xinnan-skills@xinnan
```

**Claude Code (from a clone, while editing):** `git clone https://github.com/xn0611/claude-plugins.git`, then `claude --plugin-dir claude-plugins`.

**claude.ai and the desktop app:** zip the `skills/active-reader` folder (right-click → Send to → Compressed (zipped) folder) and upload it in Claude's skills settings.

## Token cost

Rough figures for active-reader, at about 4 characters per token.

**In your Claude session**

- **Description: ~150 tokens**, loaded in every session whether or not the skill runs. This is the only always-on cost.
- **`SKILL.md`: ~1,600 tokens**, loaded only when the skill starts. The claude.ai loader adds ~500 more, plus a silent `git clone`.
- **Writing the lesson: ~1,500–3,000 output tokens** for 900–1,800 words. This is the biggest cost, and about what the same answer would cost in chat.
- **Publishing: close to zero.** `reader.js` and `reader.css` (~10,500 tokens) are published straight from disk and never enter the conversation.

**In the page** (counts against your claude.ai usage, not the session)

- **Each comment: ~3,000–4,000 tokens in**, because it sends the whole document with it, so the answer has full context. Replies are a few hundred tokens each.
- **Replying in a thread: ~3,000–4,000 tokens**, because it also sends the whole document, plus that thread.
- **Go deeper suggestions: ~1,000–2,000 tokens**, because it sends the headings and your comments, not the whole document.

**The expensive case:** without an Artifact tool, the page can't call Claude. You copy the review as a prompt into chat, which puts the whole document back into the conversation on every round.

## Contributing

Issues and pull requests are welcome. `main` only changes through pull requests. See [CLAUDE.md](./CLAUDE.md) for the rules when adding or changing a skill.
