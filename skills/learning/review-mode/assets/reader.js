/* Active Reader — reusable page. Loads ./doc.md (with a small front-matter block:
   title, mode: learn|review, source) and turns it into a PR-review-style reader. */
(function () {
  "use strict";

  // ---------- shell ----------
  document.body.innerHTML = `
<header class="top"><div class="topin">
  <div class="brand">Active Reader <span id="docTitle"></span></div>
  <span class="modepill" id="modePill"></span>
  <div class="progress" title="Reading progress"><i id="prog"></i></div>
  <button class="ghost" id="copyMdBtn" title="Copy the document, comments and answers">Copy as Markdown</button>
</div></header>
<div class="layout">
  <main><article class="doc" id="doc"><div class="loading">Loading…</div></article></main>
  <aside class="side">
    <div class="panel">
      <h3>Your review</h3>
      <div class="sub" id="howto"></div>
      <div class="stats">
        <div class="stat"><b id="sPend">0</b><span>pending</span></div>
        <div class="stat"><b id="sDone">0</b><span>answered</span></div>
        <div class="stat"><b id="sRead">0%</b><span>read</span></div>
      </div>
      <div class="list" id="list"></div>
      <button class="primary wide" id="submitBtn" disabled>Finish &amp; submit review</button>
      <div class="status" id="status"></div>
      <button class="ghost wide" id="copyBtn" style="display:none;margin-top:6px">Copy review as a prompt</button>
      <div id="pasteBox" style="display:none;margin-top:8px">
        <textarea id="pasteText" placeholder="Paste the JSON answer here…" style="min-height:70px;font-family:'IBM Plex Mono',monospace;font-size:12px"></textarea>
        <button class="wide" id="pasteBtn" style="margin-top:6px">Show answers inline</button>
      </div>
    </div>
  </aside>
</div>
<div id="selpop"><button id="selBtn">💬 Comment on selection</button></div>`;

  // ---------- helpers ----------
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const inline = (s) =>
    esc(s)
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, "$1<em>$2</em>");
  const plain = (s) => String(s).replace(/\*\*|`/g, "");
  const fmtBody = (s) => esc(s).replace(/`([^`]+)`/g, "<code>$1</code>").replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  const hash = (s) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return "d" + (h >>> 0).toString(36); };

  function parseFront(text) {
    const meta = { title: "", mode: "learn", source: "" };
    const m = text.match(/^---\s*\n([\s\S]*?)\n---\s*\n?/);
    let body = text;
    if (m) {
      body = text.slice(m[0].length);
      for (const line of m[1].split("\n")) {
        const kv = line.match(/^(\w+)\s*:\s*(.*)$/);
        if (kv) meta[kv[1].toLowerCase()] = kv[2].trim().replace(/^["']|["']$/g, "");
      }
    }
    if (meta.mode !== "review") meta.mode = "learn";
    if (!meta.title) { const h = body.match(/^#\s+(.+)$/m); meta.title = h ? plain(h[1]) : "Document"; }
    return { meta, body };
  }

  function parseDoc(src) {
    const lines = src.replace(/\r/g, "").split("\n");
    const blocks = []; let para = [];
    const flush = () => { if (para.length) { blocks.push({ t: "p", x: para.join(" ") }); para = []; } };
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (/^```/.test(l)) { flush(); const buf = []; i++; while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++]); blocks.push({ t: "code", x: buf.join("\n") }); continue; }
      if (/^#\s+/.test(l)) { flush(); blocks.push({ t: "h1", x: l.replace(/^#\s+/, "") }); }
      else if (/^#{2,6}\s+/.test(l)) { flush(); blocks.push({ t: "h2", x: l.replace(/^#+\s+/, "") }); }
      else if (/^\s*([-*]|\d+\.)\s+/.test(l)) { flush(); blocks.push({ t: "li", x: l.replace(/^\s*([-*]|\d+\.)\s+/, "") }); }
      else if (/^>\s?/.test(l)) { flush(); blocks.push({ t: "quote", x: l.replace(/^>\s?/, "") }); }
      else if (!l.trim()) flush();
      else para.push(l.trim());
    }
    flush();
    return blocks.map((b, n) => ({ ...b, id: "b" + (n + 1) }));
  }

  // ---------- mode text ----------
  const TEXT = {
    learn: {
      kinds: { question: "Question", comment: "Comment", confused: "Not clear to me" },
      ph: { question: "What are you wondering about?", comment: "Your thought, connection or objection…", confused: "Which part loses you?" },
      howto: "Hover any paragraph and press <b>+</b>, or select a phrase, to leave a question or comment. Keep reading — nothing is sent until you submit.",
      empty: "No comments yet. When something surprises you, confuses you, or reminds you of something, leave a note.",
      who: "Tutor",
      follow: "Push back, ask for an example, or explain it back in your own words.",
    },
    review: {
      kinds: { question: "Question", comment: "Suggestion", confused: "Concern" },
      ph: { question: "What does the doc leave unclear?", comment: "What would you change, and why?", confused: "What could go wrong here?" },
      howto: "Hover any paragraph and press <b>+</b>, or select a phrase, to leave a question, suggestion or concern. Keep reading — nothing is sent until you submit.",
      empty: "No comments yet. Flag anything unclear, risky, missing or worth changing.",
      who: "Reviewer",
      follow: "Push back, add context, or ask how the author should fix it.",
    },
  };

  // ---------- state ----------
  let meta = { title: "", mode: "learn", source: "" };
  let docSrc = "", blocks = [], threads = [], maxSeen = 0, openComposer = null, busy = false;
  const T = () => TEXT[meta.mode];
  const key = () => "activeReader:" + hash(docSrc);
  function save() { try { localStorage.setItem(key(), JSON.stringify({ threads, maxSeen })); } catch (e) {} }
  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(key()) || "null");
      if (s) { threads = s.threads || []; maxSeen = s.maxSeen || 0; }
    } catch (e) {}
  }

  // ---------- render ----------
  function blockHTML(b) {
    if (b.t === "h1") return `<h1>${inline(b.x)}</h1>`;
    if (b.t === "h2") return `<h2>${inline(b.x)}</h2>`;
    if (b.t === "li") return `<div class="li"><div>${inline(b.x)}</div></div>`;
    if (b.t === "quote") return `<blockquote>${inline(b.x)}</blockquote>`;
    if (b.t === "code") return `<pre><code>${esc(b.x)}</code></pre>`;
    return `<p>${inline(b.x)}</p>`;
  }

  function renderDoc() {
    blocks = parseDoc(docSrc);
    $("docTitle").textContent = "· " + meta.title;
    document.title = meta.title + " — Active Reader";
    $("modePill").textContent = meta.mode === "learn" ? "Learn" : "Review";
    $("modePill").className = "modepill " + meta.mode;
    $("howto").innerHTML = T().howto;
    const doc = $("doc"); doc.innerHTML = "";
    if (meta.source) { const s = document.createElement("div"); s.className = "srcline"; s.textContent = meta.source; doc.appendChild(s); }
    for (const b of blocks) {
      const el = document.createElement("div"); el.className = "blk"; el.id = b.id; el.dataset.id = b.id;
      el.innerHTML = `<div class="gut"><button class="add" title="Add a comment" aria-label="Add comment">+</button></div><div class="cnt">${blockHTML(b)}</div><div></div><div class="threads"></div>`;
      el.querySelector(".add").onclick = () => openFor(b.id, "");
      doc.appendChild(el);
    }
    const end = document.createElement("div"); end.className = "endmark";
    end.innerHTML = `<span>End of document.</span><button class="primary" id="submit2">Submit my review</button>`;
    doc.appendChild(end);
    $("submit2").onclick = submitReview;
    observe(); renderAll();
  }

  function renderAll() {
    for (const b of blocks) {
      const el = $(b.id); if (!el) continue;
      const ts = threads.filter((t) => t.blockId === b.id);
      el.classList.toggle("has", ts.length > 0);
      el.querySelector(".threads").innerHTML =
        ts.map(threadHTML).join("") + (openComposer && openComposer.blockId === b.id && !openComposer.editId ? composerHTML(openComposer) : "");
      highlight(el, b, ts);
    }
    wire(); renderSide(); save();
  }

  function highlight(el, b, ts) {
    if (b.t === "code") return;
    const cnt = el.querySelector(".cnt"); cnt.innerHTML = blockHTML(b);
    const quotes = ts.map((t) => t.quote).filter(Boolean);
    if (!quotes.length) return;
    const walker = document.createTreeWalker(cnt, NodeFilter.SHOW_TEXT);
    const nodes = []; while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const q of quotes) for (const n of nodes) {
      const i = n.nodeValue.indexOf(q); if (i < 0 || !n.parentNode) continue;
      const r = document.createRange(); r.setStart(n, i); r.setEnd(n, i + q.length);
      const m = document.createElement("mark"); m.className = "q"; try { r.surroundContents(m); } catch (e) {} break;
    }
  }

  function threadHTML(t) {
    const editing = openComposer && openComposer.editId === t.id;
    let h = `<div class="card" id="card-${t.id}">`;
    if (editing) h += composerHTML(openComposer);
    else h += `<div class="msg"><div class="meta"><b>You</b><span class="badge k-${t.kind}">${T().kinds[t.kind]}</span>${t.status === "pending" ? '<span class="pending-tag">Pending</span>' : ""}
      <div class="acts">${t.status === "pending" ? `<button class="ghost" data-edit="${t.id}">Edit</button><button class="ghost" data-del="${t.id}">Delete</button>` : ""}</div></div>
      ${t.quote ? `<div class="quote">“${esc(t.quote)}”</div>` : ""}<div class="body">${fmtBody(t.text)}</div></div>`;
    for (const m of t.msgs || []) {
      h += m.role === "ai"
        ? `<div class="msg ai"><div class="meta"><b>${T().who}</b>${m.verdict ? `<span class="badge v">${esc(m.verdict)}</span>` : ""}</div><div class="body">${fmtBody(m.text)}</div></div>`
        : `<div class="msg"><div class="meta"><b>You</b><span>follow-up</span></div><div class="body">${fmtBody(m.text)}</div></div>`;
    }
    if (t.status === "answered") {
      h += t.busy
        ? `<div class="msg"><span class="spinner"></span><span style="color:var(--muted)">${T().who} is replying…</span></div>`
        : `<div class="composer" style="border-top:1px solid var(--line)"><textarea data-follow="${t.id}" placeholder="Reply to continue this thread… (Ctrl+Enter)" style="min-height:38px"></textarea>
           <div class="row"><span class="hint">${T().follow}</span><button data-send="${t.id}">Reply</button></div></div>`;
    }
    return h + "</div>";
  }

  function composerHTML(c) {
    const k = c.kind || "question";
    return `<div class="card"><div class="composer">
      ${c.quote ? `<div class="quote">“${esc(c.quote)}”</div>` : ""}
      <div class="kinds">${Object.keys(T().kinds).map((x) => `<button class="k-${x} ${x === k ? "on" : ""}" data-kind="${x}">${T().kinds[x]}</button>`).join("")}</div>
      <textarea id="ctext" placeholder="${T().ph[k]}">${esc(c.text || "")}</textarea>
      <div class="row"><span class="hint">Ctrl+Enter to add · Esc to cancel</span><button id="ccancel">Cancel</button><button class="primary" id="csave">${c.editId ? "Update" : "Add to review"}</button></div>
    </div></div>`;
  }

  function wire() {
    document.querySelectorAll("[data-kind]").forEach((b) => (b.onclick = () => { openComposer.text = $("ctext").value; openComposer.kind = b.dataset.kind; renderAll(); focusComposer(); }));
    if ($("csave")) {
      $("csave").onclick = saveComposer;
      $("ccancel").onclick = () => { openComposer = null; renderAll(); };
      $("ctext").onkeydown = (e) => {
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); saveComposer(); }
        if (e.key === "Escape") { openComposer = null; renderAll(); }
      };
    }
    document.querySelectorAll("[data-edit]").forEach((b) => (b.onclick = () => {
      const t = threads.find((x) => x.id === b.dataset.edit);
      openComposer = { blockId: t.blockId, quote: t.quote, kind: t.kind, text: t.text, editId: t.id }; renderAll(); focusComposer();
    }));
    document.querySelectorAll("[data-del]").forEach((b) => (b.onclick = () => { threads = threads.filter((x) => x.id !== b.dataset.del); renderAll(); }));
    document.querySelectorAll("[data-send]").forEach((b) => (b.onclick = () => followUp(b.dataset.send)));
    document.querySelectorAll("[data-follow]").forEach((ta) => (ta.onkeydown = (e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); followUp(ta.dataset.follow); } }));
  }
  function focusComposer() { const t = $("ctext"); if (t) { t.focus(); t.setSelectionRange(t.value.length, t.value.length); } }
  function openFor(blockId, quote) { openComposer = { blockId, quote, kind: "question", text: "" }; renderAll(); focusComposer(); }
  function saveComposer() {
    const text = $("ctext").value.trim(); if (!text) { $("ctext").focus(); return; }
    if (openComposer.editId) { const t = threads.find((x) => x.id === openComposer.editId); t.text = text; t.kind = openComposer.kind; }
    else threads.push({ id: "c" + Date.now().toString(36), blockId: openComposer.blockId, quote: openComposer.quote || "", kind: openComposer.kind || "question", text, status: "pending", msgs: [] });
    openComposer = null; renderAll();
  }

  function renderSide() {
    const pend = threads.filter((t) => t.status === "pending"), done = threads.filter((t) => t.status === "answered");
    $("sPend").textContent = pend.length; $("sDone").textContent = done.length;
    const order = Object.fromEntries(blocks.map((b, i) => [b.id, i]));
    const all = [...threads].sort((a, b) => order[a.blockId] - order[b.blockId]);
    $("list").innerHTML = all.length
      ? all.map((t) => `<div class="item ${t.status === "answered" ? "done" : ""}" data-jump="${t.id}"><span class="dot k-${t.kind}"></span><span class="t">${esc(t.text)}</span>${t.status === "answered" ? '<span style="color:var(--accent)">✓</span>' : ""}</div>`).join("")
      : `<div class="empty">${T().empty}</div>`;
    document.querySelectorAll("[data-jump]").forEach((n) => (n.onclick = () => {
      const c = $("card-" + n.dataset.jump);
      if (c) { c.scrollIntoView({ behavior: "smooth", block: "center" }); c.classList.remove("flash"); void c.offsetWidth; c.classList.add("flash"); }
    }));
    $("submitBtn").disabled = busy || !pend.length;
    $("submitBtn").textContent = busy ? "Reviewing…" : pend.length ? `Finish & submit review (${pend.length})` : "Finish & submit review";
    if ($("submit2")) $("submit2").disabled = busy || !pend.length;
  }

  // ---------- reading progress ----------
  let io;
  function observe() {
    if (io) io.disconnect();
    io = new IntersectionObserver((es) => {
      for (const e of es) if (e.isIntersecting) {
        const i = blocks.findIndex((b) => b.id === e.target.id);
        if (i + 1 > maxSeen) { maxSeen = i + 1; updProg(); save(); }
      }
    }, { threshold: 0.6 });
    blocks.forEach((b) => io.observe($(b.id))); updProg();
  }
  function updProg() { const p = blocks.length ? Math.round((100 * maxSeen) / blocks.length) : 0; $("prog").style.width = p + "%"; $("sRead").textContent = p + "%"; }

  // ---------- selection → comment ----------
  const pop = $("selpop"); let selInfo = null;
  document.addEventListener("mouseup", (e) => {
    if (pop.contains(e.target)) return;
    setTimeout(() => {
      const s = window.getSelection(); const txt = s && s.toString().trim();
      if (!txt || txt.length < 2) { pop.style.display = "none"; return; }
      const node = s.anchorNode && (s.anchorNode.nodeType === 1 ? s.anchorNode : s.anchorNode.parentElement);
      const blk = node && node.closest(".blk"); const cnt = node && node.closest(".cnt");
      if (!blk || !cnt) { pop.style.display = "none"; return; }
      const r = s.getRangeAt(0).getBoundingClientRect();
      selInfo = { blockId: blk.dataset.id, quote: txt.replace(/\s+/g, " ").slice(0, 300) };
      pop.style.left = r.left + window.scrollX + r.width / 2 - 80 + "px"; pop.style.top = r.top + window.scrollY - 40 + "px"; pop.style.display = "block";
    }, 0);
  });
  $("selBtn").onclick = () => { pop.style.display = "none"; if (selInfo) { openFor(selInfo.blockId, selInfo.quote); window.getSelection().removeAllRanges(); } };

  // ---------- LLM ----------
  let samplePromise = null;
  const getSample = () => {
    if (!samplePromise) samplePromise = (window.claude && window.claude.use ? window.claude.use("sample") : Promise.resolve(null)).catch(() => null);
    return samplePromise;
  };

  const RULES = {
    learn: `You are a patient, rigorous tutor. A learner just read the document below and, like a code reviewer leaving comments on a pull request, attached questions and comments to specific blocks (ids in brackets). Respond so their understanding gets deeper, not just to hand over facts.

For each item:
- "question": answer it directly and correctly, using the document's own framing where possible; add a concrete example if it helps.
- "confused": figure out what is probably tripping them up, then re-explain that idea a different way (analogy, small example, or step-by-step).
- "comment": if it's right, confirm and extend it with one new insight. If it contains a misconception, say so plainly and correct it. Don't flatter.
- End a reply with one short probing question back only when it would genuinely test their understanding.
- verdict is one word: "answered", "clarified", "confirmed", or "corrected".`,
    review: `You are a senior reviewer helping a reader evaluate the document below (a design doc, RFC, spec or similar). Like comments on a pull request, they attached questions ("question"), suggestions ("comment") and concerns ("confused") to specific blocks (ids in brackets). Be candid and specific; agree when they are right, push back when they are not.

For each item:
- question: answer from the document if it answers it, and say where (block id or section); if it does not, say that is a gap in the document.
- concern: assess it honestly (real risk, partly valid, or already addressed — point to where). Start the reply with "Blocking:", "Should fix:" or "Nit:". Give a concrete fix or the question to put to the author.
- suggestion: say whether it improves the design and what it trades off.
- verdict is one word: "agree", "partly", "disagree", "answered" or "gap".`,
  };

  function docForPrompt() { return blocks.map((b) => `[${b.id}] ${b.t === "code" ? "CODE:\n" + b.x : plain(b.x)}`).join("\n"); }
  function buildPrompt(pend) {
    const prior = threads.filter((t) => t.status === "answered").slice(-8).map((t) => `- (${t.kind}) ${t.text}`).join("\n");
    const items = pend.map((t) => ({ id: t.id, block: t.blockId, kind: t.kind, highlighted: t.quote || null, note: t.text }));
    return `${RULES[meta.mode]}

Keep each reply to roughly 2–6 sentences. Plain text; \`backticks\` for code identifiers and **bold** sparingly. You may go beyond the document when needed, but say when you do.

Reply with ONLY a JSON object, no prose before or after:
{"replies":[{"id":"...","verdict":"...","reply":"..."}]}

DOCUMENT: ${meta.title}
${docForPrompt()}
${prior ? `\nEARLIER COMMENTS FROM THIS READER (already answered, for context):\n${prior}\n` : ""}
NEW COMMENTS:
${JSON.stringify(items, null, 1)}`;
  }
  function parseJSON(text) {
    try { return JSON.parse(text); } catch (e) {}
    const a = text.indexOf("{"), b = text.lastIndexOf("}");
    if (a >= 0 && b > a) { try { return JSON.parse(text.slice(a, b + 1)); } catch (e) {} }
    return null;
  }
  function setStatus(msg, err) { $("status").innerHTML = msg; $("status").className = "status" + (err ? " err" : ""); }

  function applyReplies(text) {
    const data = parseJSON(text);
    if (!data || !Array.isArray(data.replies)) return -1;
    let n = 0;
    for (const r of data.replies) {
      const t = threads.find((x) => x.id === r.id);
      if (t && t.status === "pending") { t.msgs.push({ role: "ai", text: r.reply || "", verdict: r.verdict || "" }); t.status = "answered"; n++; }
    }
    return n;
  }

  function offline() { $("copyBtn").style.display = "block"; $("pasteBox").style.display = "block"; }

  async function submitReview() {
    const pend = threads.filter((t) => t.status === "pending"); if (!pend.length) return;
    const sample = await getSample();
    if (!sample) { offline(); setStatus("Copy the review as a prompt, paste it into Claude, then paste Claude’s JSON answer below."); return; }
    busy = true; renderSide();
    const left = blocks.length - maxSeen;
    setStatus(`<span class="spinner"></span>Reviewing your ${pend.length} comment${pend.length > 1 ? "s" : ""}…${left > 0 ? ` (${left} block${left > 1 ? "s" : ""} not read yet)` : ""}`);
    try {
      const res = await sample(buildPrompt(pend), { modelTier: "default", cache: false });
      const n = applyReplies(res.text || "");
      if (n < 0) throw { message: "Could not read the reply. Try submitting again." };
      setStatus(`${n} repl${n === 1 ? "y" : "ies"} added inline. Reply in any thread to keep going.`);
      busy = false; renderAll();
      const first = pend.find((t) => t.status === "answered");
      if (first) { const c = $("card-" + first.id); c && c.scrollIntoView({ behavior: "smooth", block: "center" }); }
    } catch (e) {
      busy = false; renderSide();
      if (e && e.code === "not_granted") { setStatus("Permission to ask Claude was declined. You can copy the review as a prompt instead.", true); offline(); }
      else if (e && e.code === "rate_limited") setStatus("Rate limited — wait a minute and submit again.", true);
      else setStatus(esc((e && e.message) || "Something went wrong."), true);
    }
  }

  async function followUp(id) {
    const t = threads.find((x) => x.id === id); const ta = document.querySelector(`[data-follow="${id}"]`);
    const text = ta && ta.value.trim(); if (!text) return;
    const sample = await getSample(); if (!sample) { setStatus("Asking Claude isn’t available in this view.", true); return; }
    t.msgs.push({ role: "you", text }); t.busy = true; renderAll();
    const blk = blocks.find((b) => b.id === t.blockId);
    const role = meta.mode === "learn" ? "a patient, rigorous tutor helping a learner" : "a senior reviewer helping a reader evaluate";
    const setup = `You are ${role} reading "${meta.title}". They left a ${T().kinds[t.kind].toLowerCase()} on this passage:\n"""${plain(blk ? blk.x : "")}"""${t.quote ? `\nThey highlighted: "${t.quote}"` : ""}\n\nTheir original note: ${t.text}\n\nContinue the thread. Be direct and correct; ${meta.mode === "learn" ? "if they explain something back, tell them precisely what's right and what's off" : "hold your position when you are right and concede clearly when they are"}. 2–6 sentences, plain text, no JSON.`;
    const conv = [{ role: "user", content: setup }];
    for (const m of t.msgs) {
      const r = m.role === "ai" ? "assistant" : "user";
      const last = conv[conv.length - 1];
      if (last.role === r) last.content += "\n\n" + m.text; else conv.push({ role: r, content: m.text });
    }
    try {
      const res = await sample(conv, { modelTier: "default", cache: false });
      t.msgs.push({ role: "ai", text: (res.text || "").trim() });
    } catch (e) {
      t.msgs.pop();
      setStatus(e && e.code === "rate_limited" ? "Rate limited — try again shortly." : esc((e && e.message) || "Reply failed."), true);
    }
    t.busy = false; renderAll();
  }

  function toMarkdown() {
    const out = [docSrc.trim(), "", "---", "", `## Comments (${meta.mode})`, ""];
    for (const b of blocks) for (const t of threads.filter((x) => x.blockId === b.id)) {
      out.push(`### ${T().kinds[t.kind]} on: ${t.quote ? "“" + t.quote + "”" : plain(b.x).slice(0, 80) + "…"}`, "", `**You:** ${t.text}`, "");
      for (const m of t.msgs || []) out.push(`**${m.role === "ai" ? T().who : "You"}${m.verdict ? " (" + m.verdict + ")" : ""}:** ${m.text}`, "");
    }
    return out.join("\n");
  }

  $("submitBtn").onclick = submitReview;
  $("copyBtn").onclick = async () => {
    const pend = threads.filter((t) => t.status === "pending");
    try { await navigator.clipboard.writeText(buildPrompt(pend.length ? pend : threads)); setStatus("Copied. Paste it into a Claude chat."); }
    catch (e) { setStatus("Copy was blocked by the browser.", true); }
  };
  $("copyMdBtn").onclick = async () => {
    try { await navigator.clipboard.writeText(toMarkdown()); setStatus("Copied the document with your comments and answers as Markdown."); }
    catch (e) { setStatus("Copy was blocked by the browser.", true); }
  };
  $("pasteBtn").onclick = () => {
    const n = applyReplies($("pasteText").value);
    if (n < 0) { setStatus("That doesn’t look like the JSON answer. Paste the whole reply.", true); return; }
    $("pasteText").value = ""; setStatus(`${n} repl${n === 1 ? "y" : "ies"} added inline.`); renderAll();
  };
  getSample().then((s) => { if (!s) offline(); });

  // ---------- boot ----------
  // A self-contained page sets window.ACTIVE_READER_DOC; a published page serves ./doc.md.
  (typeof window.ACTIVE_READER_DOC === "string"
    ? Promise.resolve(window.ACTIVE_READER_DOC)
    : fetch("doc.md", { cache: "no-store" }).then((r) => { if (!r.ok) throw new Error(r.status); return r.text(); }))
    .then((text) => { const p = parseFront(text); meta = p.meta; docSrc = p.body; load(); renderDoc(); })
    .catch(() => { $("doc").innerHTML = '<div class="loading">Couldn’t load doc.md for this page.</div>'; });
})();
