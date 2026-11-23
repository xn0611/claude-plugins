#!/usr/bin/env node
// Build one self-contained Active Reader page (no server needed) from a doc.md.
// Usage: node build-page.mjs <doc.md> [out.html]
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const [, , docPath, outArg] = process.argv;
if (!docPath) {
  console.error("Usage: node build-page.mjs <doc.md> [out.html]");
  process.exit(1);
}
const assets = join(dirname(fileURLToPath(import.meta.url)), "..", "assets");
const css = readFileSync(join(assets, "reader.css"), "utf8");
const js = readFileSync(join(assets, "reader.js"), "utf8");
const doc = readFileSync(docPath, "utf8");
const title = (doc.match(/^title:\s*(.+)$/m) || doc.match(/^#\s+(.+)$/m) || [, "Active Reader"])[1].trim();
// JSON-encode the doc and neutralise "</script" so it can't close the tag early.
const docJson = JSON.stringify(doc).replace(/<\/script/gi, "<\\/script");
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} — Active Reader</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,400;6..72,500;6..72,600&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
${css}
</style>
</head>
<body>
<script>window.ACTIVE_READER_DOC = ${docJson};</script>
<script>
${js}
</script>
</body>
</html>
`;
const out = resolve(outArg || docPath.replace(/\.md$/i, "") + ".html");
writeFileSync(out, html);
console.log(out);
