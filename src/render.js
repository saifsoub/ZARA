import { cryptoId, structuredCloneSafe } from './state.js';

const TAB_DEFS = [
  { id: "agents",  label: "Agents",     icon: "🤖" },
  { id: "prompts", label: "Prompts",    icon: "🧾" },
  { id: "runs",    label: "Runs & Logs",icon: "📡" },
  { id: "deploy",  label: "Deploy",     icon: "🚀" },
  { id: "links",   label: "Links",      icon: "🔗" }
];

/**
 * Create all rendering functions bound to the shared app context.
 *
 * @param {object} ctx
 * @param {function} ctx.getState      - returns current state object
 * @param {function} ctx.setState      - updates current state object
 * @param {function} ctx.getActiveTab  - returns current active tab id
 * @param {function} ctx.setTab        - sets active tab id
 * @param {function} ctx.renderAll     - triggers a full re-render (set after factory call)
 * @param {function} ctx.toast
 * @param {function} ctx.safeOpen
 * @param {function} ctx.escapeHtml
 * @param {function} ctx.fmtTime
 * @param {function} ctx.msToHuman
 * @param {function} ctx.saveState
 * @param {object}   ctx.defaults
 */
export function createRenderers(ctx) {

  /* ── DOM references (stable across renders) ─────────────── */
  const tabsEl        = document.getElementById("tabs");
  const mainTitleEl   = document.getElementById("mainTitle");
  const mainBodyEl    = document.getElementById("mainBody");
  const todayEl       = document.getElementById("today");
  const statusPillEl  = document.getElementById("statusPill");
  const lastSavedEl   = document.getElementById("lastSaved");
  const kAgentsEl     = document.getElementById("kAgents");
  const kPromptsEl    = document.getElementById("kPrompts");
  const kRunsEl       = document.getElementById("kRuns");
  const kModeEl       = document.getElementById("kMode");
  const primaryUrlEl  = document.getElementById("primaryUrl");
  const labModeEl     = document.getElementById("labMode");
  const quickPromptEl = document.getElementById("quickPrompt");

  /* ── Helpers (closures over ctx) ────────────────────────── */
  const { toast, safeOpen, escapeHtml, fmtTime, msToHuman, saveState } = ctx;

  /* ─────────────────────────────────────────────────────────
   * CHROME
   * ─────────────────────────────────────────────────────────*/
  function renderChrome() {
    const state = ctx.getState();
    const d = new Date();
    todayEl.textContent = d.toLocaleString(undefined, {
      weekday: "short", year: "numeric", month: "short", day: "numeric"
    });

    primaryUrlEl.value  = state.primaryUrl || "";
    labModeEl.value     = state.mode || "LAB";
    quickPromptEl.value = state.quickPrompt || "";

    kAgentsEl.textContent  = (state.agents  || []).length;
    kPromptsEl.textContent = (state.prompts || []).length;
    kRunsEl.textContent    = (state.runs    || []).length;
    kModeEl.textContent    = state.mode || "LAB";

    lastSavedEl.textContent = state.lastSaved ? fmtTime(state.lastSaved) : "—";
    statusPillEl.textContent = "Local";
  }

  /* ─────────────────────────────────────────────────────────
   * TABS
   * ─────────────────────────────────────────────────────────*/
  function renderTabs() {
    tabsEl.innerHTML = "";
    TAB_DEFS.forEach(t => {
      const b = document.createElement("button");
      b.className = "tab" + (t.id === ctx.getActiveTab() ? " active" : "");
      b.innerHTML = `<span aria-hidden="true">${t.icon}</span><span>${t.label}</span>`;
      b.addEventListener("click", () => {
        ctx.setTab(t.id);
        renderMain();
        renderTabs();
      });
      tabsEl.appendChild(b);
    });
  }

  /* ─────────────────────────────────────────────────────────
   * MAIN DISPATCHER
   * ─────────────────────────────────────────────────────────*/
  function renderMain() {
    const tab = ctx.getActiveTab();
    if (tab === "agents")  return renderAgents();
    if (tab === "prompts") return renderPrompts();
    if (tab === "runs")    return renderRuns();
    if (tab === "deploy")  return renderDeploy();
    if (tab === "links")   return renderLinks();
  }

  /* ─────────────────────────────────────────────────────────
   * TAB: AGENTS
   * ─────────────────────────────────────────────────────────*/
  function renderAgents() {
    let state = ctx.getState();
    mainTitleEl.innerHTML = `🤖 Agents <span class="pill">run + endpoint-ready</span>`;
    const agents  = state.agents  || [];
    const prompts = state.prompts || [];

    const promptOptions = (selectedId) => {
      const opts = [`<option value="">(No default prompt)</option>`];
      prompts.forEach(p => {
        const sel = p.id === selectedId ? "selected" : "";
        opts.push(`<option value="${escapeHtml(p.id)}" ${sel}>${escapeHtml(p.title)}</option>`);
      });
      return opts.join("");
    };

    mainBodyEl.innerHTML = `
      <div class="row" style="justify-content:space-between;align-items:flex-start;">
        <div>
          <p class="note">
            Click <b>Run</b> to create a run record + output preview.  
            If you add an <b>Endpoint</b>, you can wire this to a real API later (FastAPI, Next.js API, Supabase edge function, etc.).
          </p>
          <p class="hint">Pro move: keep endpoints empty now; build your backend later without changing the UI.</p>
        </div>
        <div class="actions">
          <button class="btn primary small" id="addAgentBtn">➕ Add Agent</button>
          <button class="btn small" id="enableAllAgentsBtn">✅ Enable All</button>
          <button class="btn small" id="disableAllAgentsBtn">🛑 Disable All</button>
        </div>
      </div>

      <div class="hr"></div>

      <div class="list" id="agentsList"></div>
    `;

    const list = document.getElementById("agentsList");
    list.innerHTML = "";

    agents.forEach(a => {
      const enabledBadge  = a.enabled ? `<span class="badge ok">Enabled</span>` : `<span class="badge bad">Disabled</span>`;
      const endpointBadge = a.endpoint ? `<span class="badge warn">Endpoint set</span>` : `<span class="badge">No endpoint</span>`;

      const el = document.createElement("div");
      el.className = "item";
      el.innerHTML = `
        <div class="left">
          <div class="ico" aria-hidden="true">${escapeHtml(a.icon || "🤖")}</div>
          <div>
            <h3>${escapeHtml(a.name || "Unnamed Agent")}</h3>
            <p>${escapeHtml(a.desc || "")}</p>
            <div class="meta">
              ${enabledBadge} ${endpointBadge}
            </div>

            <label>Endpoint (optional)</label>
            <input data-agent="${escapeHtml(a.id)}" data-field="endpoint" placeholder="https://your-api/run" value="${escapeHtml(a.endpoint || "")}" />

            <div class="split">
              <div>
                <label>Default Prompt</label>
                <select data-agent="${escapeHtml(a.id)}" data-field="defaultPromptId">
                  ${promptOptions(a.defaultPromptId || "")}
                </select>
              </div>
              <div>
                <label>Enabled</label>
                <select data-agent="${escapeHtml(a.id)}" data-field="enabled">
                  <option value="true"  ${a.enabled  ? "selected" : ""}>true</option>
                  <option value="false" ${!a.enabled ? "selected" : ""}>false</option>
                </select>
              </div>
            </div>

            <label>Run Input</label>
            <textarea data-agent="${escapeHtml(a.id)}" data-field="runInput" placeholder="${escapeHtml(a.schema?.inputHint || "Describe what you want...")}"></textarea>
          </div>
        </div>
        <div class="actions">
          <button class="btn primary small" data-action="run"       data-agent="${escapeHtml(a.id)}">▶ Run</button>
          <button class="btn small"         data-action="copyAgent" data-agent="${escapeHtml(a.id)}">📋 Copy Agent JSON</button>
          <button class="btn small"         data-action="dup"       data-agent="${escapeHtml(a.id)}">⎘ Duplicate</button>
          <button class="btn danger small"  data-action="del"       data-agent="${escapeHtml(a.id)}">🗑️ Delete</button>
        </div>
      `;
      list.appendChild(el);
    });

    // wire field changes
    mainBodyEl.querySelectorAll("[data-field]").forEach(node => {
      node.addEventListener("change", () => {
        state = ctx.getState();
        const id    = node.getAttribute("data-agent");
        const field = node.getAttribute("data-field");
        const agent = state.agents.find(x => x.id === id);
        if (!agent) return;

        if (field === "enabled") {
          agent.enabled = (node.value === "true");
        } else if (field === "defaultPromptId") {
          agent.defaultPromptId = node.value;
        } else if (field === "endpoint") {
          agent.endpoint = node.value.trim();
        }
        ctx.setState(saveState(state));
        renderChrome();
        toast("Agent updated ✅");
      });
    });

    // top buttons
    document.getElementById("addAgentBtn").addEventListener("click", () => {
      state = ctx.getState();
      const name = prompt("Agent name?");
      if (!name) return;
      const icon = prompt("Icon emoji?", "🤖") || "🤖";
      const desc = prompt("Short description?", "What does it do?") || "";
      state.agents.unshift({
        id: cryptoId(), name, icon, desc,
        enabled: true, endpoint: "", defaultPromptId: "",
        schema: { inputHint: "What should I do?", outputHint: "Structured output." }
      });
      ctx.setState(saveState(state));
      ctx.renderAll();
      toast("Agent added ➕");
    });

    document.getElementById("enableAllAgentsBtn").addEventListener("click", () => {
      state = ctx.getState();
      state.agents.forEach(a => a.enabled = true);
      ctx.setState(saveState(state));
      ctx.renderAll();
      toast("All enabled ✅");
    });

    document.getElementById("disableAllAgentsBtn").addEventListener("click", () => {
      state = ctx.getState();
      state.agents.forEach(a => a.enabled = false);
      ctx.setState(saveState(state));
      ctx.renderAll();
      toast("All disabled 🛑");
    });

    // item action buttons
    mainBodyEl.querySelectorAll("[data-action]").forEach(btn => {
      btn.addEventListener("click", async () => {
        state = ctx.getState();
        const action = btn.getAttribute("data-action");
        const id     = btn.getAttribute("data-agent");
        const agent  = state.agents.find(x => x.id === id);
        if (!agent) return;

        if (action === "del") {
          if (!confirm(`Delete agent "${agent.name}"?`)) return;
          state.agents = state.agents.filter(x => x.id !== id);
          ctx.setState(saveState(state));
          ctx.renderAll();
          toast("Agent deleted 🗑️");
          return;
        }

        if (action === "dup") {
          const copy = structuredCloneSafe(agent);
          copy.id   = cryptoId();
          copy.name = copy.name + " (copy)";
          state.agents.unshift(copy);
          ctx.setState(saveState(state));
          ctx.renderAll();
          toast("Duplicated ⎘");
          return;
        }

        if (action === "copyAgent") {
          try {
            await navigator.clipboard.writeText(JSON.stringify(agent, null, 2));
            toast("Agent JSON copied 📋");
          } catch {
            toast("Clipboard blocked ⚠️");
          }
          return;
        }

        if (action === "run") {
          if (!agent.enabled) { toast("Agent is disabled 🛑"); return; }
          const inputEl = mainBodyEl.querySelector(`textarea[data-agent="${CSS.escape(id)}"][data-field="runInput"]`);
          const input   = (inputEl?.value || "").trim();
          if (!input) { toast("Add run input first ✍️"); return; }

          const promptObj = agent.defaultPromptId
            ? state.prompts.find(p => p.id === agent.defaultPromptId)
            : null;

          const runId = cryptoId();
          const start = performance.now();
          const now   = new Date().toISOString();
          let output = "", status = "ok";

          try {
            output = makeSimulatedOutput(state, agent, promptObj, input);
          } catch (e) {
            status = "fail";
            output = "Error generating output: " + (e?.message || String(e));
          }

          state.runs.unshift({
            id: runId, time: now,
            agentId: agent.id, agentName: agent.name,
            status, durationMs: Math.round(performance.now() - start),
            input, output, endpointUsed: agent.endpoint || ""
          });
          state.runs = state.runs.slice(0, 200);
          ctx.setState(saveState(state));
          renderChrome();
          toast("Run created 📡");
          ctx.setTab("runs");
          renderTabs();
          renderMain();
        }
      });
    });
  }

  function makeSimulatedOutput(state, agent, promptObj, input) {
    const ptitle = promptObj?.title ? `Default Prompt: ${promptObj.title}` : "Default Prompt: (none)";
    const lines = [];
    lines.push(`# ${agent.name} — Output (Simulated Local Mode)`);
    lines.push(`- ${ptitle}`);
    lines.push(`- Mode: ${state.mode}`);
    lines.push("");
    lines.push("## Next steps");
    lines.push("- Clarify acceptance criteria (success looks like…)");
    lines.push("- Break down tasks into 3–7 steps");
    lines.push("- Produce command-ready snippets / file-level edits");
    lines.push("");
    lines.push("## Input");
    lines.push(input);
    lines.push("");
    lines.push("## Suggested actions");
    lines.push("- Create a branch");
    lines.push("- Implement minimal working slice");
    lines.push("- Add a quick test/check");
    lines.push("");
    lines.push("## Snippets");
    lines.push("```");
    lines.push("# example");
    lines.push("git checkout -b lab/feature");
    lines.push("# edit files");
    lines.push("git add . && git commit -m \"feat: add slice\"");
    lines.push("```");
    lines.push("");
    lines.push("## Risks");
    lines.push("- Scope creep → keep the first slice tiny");
    lines.push("- Missing deps → pin versions and add notes");
    return lines.join("\n");
  }

  /* ─────────────────────────────────────────────────────────
   * TAB: PROMPTS
   * ─────────────────────────────────────────────────────────*/
  function renderPrompts() {
    let state = ctx.getState();
    mainTitleEl.innerHTML = `🧾 Prompts <span class="pill">library + CRUD</span>`;
    mainBodyEl.innerHTML = `
      <div class="row" style="justify-content:space-between;align-items:flex-start;">
        <div>
          <p class="note">
            Create reusable prompt templates. Copy them, assign as default for agents, and keep your lab consistent. ✨
          </p>
          <p class="hint">Right-click a prompt card to delete (or use the button).</p>
        </div>
        <div class="actions">
          <button class="btn primary small" id="addPromptBtn">➕ New Prompt</button>
          <button class="btn small" id="copyAllPromptsBtn">📋 Copy All (JSON)</button>
        </div>
      </div>

      <div class="hr"></div>

      <div class="split">
        <div class="card" style="box-shadow:none;background:rgba(255,255,255,.04);border-color:rgba(255,255,255,.08)">
          <div class="card-h">
            <div class="title">✍️ Editor</div>
            <span class="pill">select a prompt</span>
          </div>
          <div class="card-b" id="promptEditor"></div>
        </div>

        <div>
          <div class="list" id="promptsList"></div>
        </div>
      </div>
    `;

    const editor = document.getElementById("promptEditor");
    const list   = document.getElementById("promptsList");

    let selectedId = state.prompts?.[0]?.id || "";
    if (!selectedId) {
      editor.innerHTML = `<p class="note">No prompts yet. Create one ➕</p>`;
      list.innerHTML = "";
      wirePromptButtons();
      return;
    }

    const selectPrompt = (id) => {
      state = ctx.getState();
      selectedId = id;
      const p = state.prompts.find(x => x.id === id);
      if (!p) { editor.innerHTML = `<p class="note">Select a prompt to edit.</p>`; return; }

      editor.innerHTML = `
        <label>Title</label>
        <input id="pTitle" value="${escapeHtml(p.title || "")}" />

        <label>Tags (comma-separated)</label>
        <input id="pTags" value="${escapeHtml((p.tags || []).join(", "))}" />

        <label>Content</label>
        <textarea id="pContent" style="min-height:180px">${escapeHtml(p.content || "")}</textarea>

        <div class="row">
          <button class="btn primary small" id="savePromptBtn">💾 Save Prompt</button>
          <button class="btn danger small" id="delPromptBtn">🗑️ Delete</button>
        </div>
      `;

      document.getElementById("savePromptBtn").addEventListener("click", () => {
        state = ctx.getState();
        const idx = state.prompts.findIndex(x => x.id === id);
        if (idx === -1) return;
        state.prompts[idx].title   = document.getElementById("pTitle").value.trim() || state.prompts[idx].title;
        state.prompts[idx].tags    = document.getElementById("pTags").value.split(",").map(t => t.trim()).filter(Boolean);
        state.prompts[idx].content = document.getElementById("pContent").value;
        ctx.setState(saveState(state));
        ctx.renderAll();
        toast("Prompt saved 💾");
      });

      document.getElementById("delPromptBtn").addEventListener("click", () => {
        state = ctx.getState();
        if (!confirm(`Delete prompt "${p.title}"?`)) return;
        state.prompts = state.prompts.filter(x => x.id !== p.id);
        state.agents.forEach(a => { if (a.defaultPromptId === p.id) a.defaultPromptId = ""; });
        ctx.setState(saveState(state));
        ctx.renderAll();
        toast("Prompt deleted 🗑️");
      });
    };

    // list render
    list.innerHTML = "";
    (state.prompts || []).forEach(p => {
      const el = document.createElement("div");
      el.className = "item";
      el.innerHTML = `
        <div class="left">
          <div class="ico">🧾</div>
          <div>
            <h3>${escapeHtml(p.title)}</h3>
            <p>${escapeHtml((p.tags || []).length ? (p.tags || []).join(" • ") : "No tags")}</p>
            <div class="meta mono">${escapeHtml((p.content || "").slice(0, 120))}${(p.content || "").length > 120 ? "…" : ""}</div>
          </div>
        </div>
        <div class="actions">
          <button class="btn small" data-action="select" data-id="${escapeHtml(p.id)}">✍️ Edit</button>
          <button class="btn small" data-action="copy"   data-id="${escapeHtml(p.id)}">📋 Copy</button>
        </div>
      `;
      el.addEventListener("contextmenu", e => {
        e.preventDefault();
        state = ctx.getState();
        if (confirm(`Delete prompt "${p.title}"?`)) {
          state.prompts = state.prompts.filter(x => x.id !== p.id);
          state.agents.forEach(a => { if (a.defaultPromptId === p.id) a.defaultPromptId = ""; });
          ctx.setState(saveState(state));
          ctx.renderAll();
          toast("Prompt deleted 🗑️");
        }
      });
      list.appendChild(el);
    });

    mainBodyEl.querySelectorAll("[data-action]").forEach(btn => {
      btn.addEventListener("click", async () => {
        state = ctx.getState();
        const action = btn.getAttribute("data-action");
        const id     = btn.getAttribute("data-id");
        const p      = state.prompts.find(x => x.id === id);
        if (!p) return;

        if (action === "select") selectPrompt(id);
        if (action === "copy") {
          try {
            await navigator.clipboard.writeText(p.content || "");
            toast("Prompt copied 📋");
          } catch {
            toast("Clipboard blocked ⚠️");
          }
        }
      });
    });

    wirePromptButtons();
    selectPrompt(selectedId);

    function wirePromptButtons() {
      document.getElementById("addPromptBtn").addEventListener("click", () => {
        state = ctx.getState();
        const title = prompt("Prompt title?");
        if (!title) return;
        state.prompts.unshift({ id: cryptoId(), title, tags: [], content: "Write your prompt here…" });
        ctx.setState(saveState(state));
        ctx.renderAll();
        toast("Prompt created ➕");
      });

      document.getElementById("copyAllPromptsBtn").addEventListener("click", async () => {
        state = ctx.getState();
        try {
          await navigator.clipboard.writeText(JSON.stringify(state.prompts || [], null, 2));
          toast("All prompts copied 📋");
        } catch {
          toast("Clipboard blocked ⚠️");
        }
      });
    }
  }

  /* ─────────────────────────────────────────────────────────
   * TAB: RUNS & LOGS
   * ─────────────────────────────────────────────────────────*/
  function renderRuns() {
    let state = ctx.getState();
    mainTitleEl.innerHTML = `📡 Runs & Logs <span class="pill">history</span>`;
    const runs = state.runs || [];

    mainBodyEl.innerHTML = `
      <div class="row" style="justify-content:space-between;align-items:flex-start;">
        <div>
          <p class="note">Every agent run is logged here with input/output. Export your logs any time.</p>
          <p class="hint">Tip: You can convert "Simulated Local Mode" to real execution by wiring agent endpoints.</p>
        </div>
        <div class="actions">
          <button class="btn small" id="copyRunsBtn">📋 Copy Runs (JSON)</button>
          <button class="btn small" id="clearRunsBtn">🧹 Clear</button>
        </div>
      </div>

      <div class="hr"></div>

      <div class="split">
        <div>
          <div class="list" id="runsList"></div>
        </div>
        <div class="card" style="box-shadow:none;background:rgba(255,255,255,.04);border-color:rgba(255,255,255,.08)">
          <div class="card-h">
            <div class="title">🧠 Run Viewer</div>
            <span class="pill">select a run</span>
          </div>
          <div class="card-b" id="runViewer">
            <p class="note">Select a run to view details.</p>
          </div>
        </div>
      </div>
    `;

    const list   = document.getElementById("runsList");
    const viewer = document.getElementById("runViewer");

    const selectRun = (id) => {
      state = ctx.getState();
      const r = state.runs.find(x => x.id === id);
      if (!r) { viewer.innerHTML = `<p class="note">Run not found.</p>`; return; }
      const badge = r.status === "ok" ? "ok" : (r.status === "fail" ? "bad" : "warn");
      viewer.innerHTML = `
        <div class="row" style="justify-content:space-between;margin-top:0;">
          <div>
            <div class="row" style="margin-top:0;">
              <span class="badge ${badge}">${escapeHtml(r.status || "ok")}</span>
              <span class="badge">${escapeHtml(r.agentName || "")}</span>
              <span class="badge">${escapeHtml(msToHuman(r.durationMs))}</span>
            </div>
            <div class="note" style="margin-top:8px;">
              <span class="mono">${escapeHtml(fmtTime(r.time))}</span>
              ${r.endpointUsed ? ` <span class="sep">•</span> endpoint: <span class="mono">${escapeHtml(r.endpointUsed)}</span>` : ""}
            </div>
          </div>
          <div class="actions">
            <button class="btn small" id="copyRunBtn">📋 Copy Output</button>
            <button class="btn danger small" id="delRunBtn">🗑️ Delete</button>
          </div>
        </div>

        <div class="hr"></div>

        <label>Input</label>
        <div class="codebox">${escapeHtml(r.input || "")}</div>

        <label>Output</label>
        <div class="codebox">${escapeHtml(r.output || "")}</div>
      `;

      document.getElementById("copyRunBtn").addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(r.output || "");
          toast("Output copied 📋");
        } catch {
          toast("Clipboard blocked ⚠️");
        }
      });

      document.getElementById("delRunBtn").addEventListener("click", () => {
        state = ctx.getState();
        if (!confirm("Delete this run?")) return;
        state.runs = state.runs.filter(x => x.id !== r.id);
        ctx.setState(saveState(state));
        ctx.renderAll();
        toast("Run deleted 🗑️");
      });
    };

    list.innerHTML = "";
    if (!runs.length) {
      list.innerHTML = `<p class="note">No runs yet. Go to Agents tab and press Run ▶</p>`;
    } else {
      runs.slice(0, 40).forEach(r => {
        const badge = r.status === "ok" ? "ok" : (r.status === "fail" ? "bad" : "warn");
        const el = document.createElement("div");
        el.className = "item";
        el.innerHTML = `
          <div class="left">
            <div class="ico">📡</div>
            <div>
              <h3>${escapeHtml(r.agentName || "Agent")} <span class="badge ${badge}">${escapeHtml(r.status || "ok")}</span></h3>
              <p>${escapeHtml((r.input || "").slice(0, 120))}${(r.input || "").length > 120 ? "…" : ""}</p>
              <div class="meta mono">${escapeHtml(fmtTime(r.time))} <span class="sep">•</span> ${escapeHtml(msToHuman(r.durationMs))}</div>
            </div>
          </div>
          <div class="actions">
            <button class="btn small" data-action="view" data-id="${escapeHtml(r.id)}">👁️ View</button>
          </div>
        `;
        list.appendChild(el);
      });
      selectRun(runs[0].id);
    }

    mainBodyEl.querySelectorAll('[data-action="view"]').forEach(btn => {
      btn.addEventListener("click", () => selectRun(btn.getAttribute("data-id")));
    });

    document.getElementById("copyRunsBtn").addEventListener("click", async () => {
      state = ctx.getState();
      try {
        await navigator.clipboard.writeText(JSON.stringify(state.runs || [], null, 2));
        toast("Runs copied 📋");
      } catch {
        toast("Clipboard blocked ⚠️");
      }
    });

    document.getElementById("clearRunsBtn").addEventListener("click", () => {
      state = ctx.getState();
      if (!confirm("Clear all runs?")) return;
      state.runs = [];
      ctx.setState(saveState(state));
      ctx.renderAll();
      toast("Runs cleared 🧹");
    });
  }

  /* ─────────────────────────────────────────────────────────
   * TAB: DEPLOY
   * ─────────────────────────────────────────────────────────*/
  function renderDeploy() {
    let state = ctx.getState();
    mainTitleEl.innerHTML = `🚀 Deploy <span class="pill">Pages + Vercel</span>`;
    const dep = state.deploy || structuredCloneSafe(ctx.defaults.deploy);

    mainBodyEl.innerHTML = `
      <div class="split">
        <div>
          <div class="card" style="box-shadow:none;background:rgba(255,255,255,.04);border-color:rgba(255,255,255,.08)">
            <div class="card-h">
              <div class="title">🌐 GitHub Pages (this cockpit)</div>
              <span class="pill">recommended</span>
            </div>
            <div class="card-b">
              <p class="note">
                Push this project to GitHub and enable Pages: Settings → Pages → Branch <b>main</b> → Folder <b>/ (root)</b>.<br>
                The root <code>index.html</code> loads the app automatically.
              </p>
              <div class="hr"></div>
              <div class="codebox">1) git push to main branch
2) Repo → Settings → Pages
3) Source: Deploy from a branch
4) Branch: main, Folder: / (root)
5) Save
6) Your cockpit URL becomes:
   https://&lt;username&gt;.github.io/&lt;repo&gt;/</div>

              <div class="row">
                <button class="btn small" id="openPagesSettings">⚙️ Open Pages Settings</button>
                <button class="btn small" id="openPagesUrl">🌐 Open Pages URL</button>
              </div>
            </div>
          </div>

          <div class="hr"></div>

          <div class="card" style="box-shadow:none;background:rgba(255,255,255,.04);border-color:rgba(255,255,255,.08)">
            <div class="card-h">
              <div class="title">▲ Vercel Deploy Checklist</div>
              <span class="pill">when ready</span>
            </div>
            <div class="card-b">
              <label>Production URL (optional)</label>
              <input id="prodUrl" placeholder="https://yourapp.vercel.app" value="${escapeHtml(dep.productionUrl || "")}" />

              <label>Vercel project/dashboard URL</label>
              <input id="vercelUrl" placeholder="https://vercel.com/..." value="${escapeHtml(dep.vercelProjectUrl || "")}" />

              <div class="hr"></div>

              <div class="codebox">✅ Minimal deploy flow:
- Push to GitHub (main)
- Import project in Vercel
- Set Environment Variables (below)
- Deploy
- Add custom domain (optional)
- Add logs/alerts (optional)</div>

              <div class="row">
                <button class="btn small" id="openVercel">▲ Open Vercel</button>
                <button class="btn small" id="saveDeploy">💾 Save Deploy</button>
              </div>
            </div>
          </div>
        </div>

        <div>
          <div class="card" style="box-shadow:none;background:rgba(255,255,255,.04);border-color:rgba(255,255,255,.08)">
            <div class="card-h">
              <div class="title">🔐 Env Vault (local convenience)</div>
              <span class="pill">store on Vercel ideally</span>
            </div>
            <div class="card-b">
              <p class="note">
                This is local-only and <b>not secure storage</b>. Use it as a scratchpad.
                Real secrets should go in Vercel env vars.
              </p>
              <div class="hr"></div>
              <div class="list" id="envList"></div>

              <div class="row">
                <button class="btn primary small" id="addEnv">➕ Add Env</button>
                <button class="btn small" id="copyEnv">📋 Copy Env (.env)</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    document.getElementById("openPagesSettings").addEventListener("click", () => {
      state = ctx.getState();
      const repo = state.primaryUrl || "";
      try {
        const parsed = new URL(repo);
        if (parsed.hostname === "github.com") {
          safeOpen(repo + "/settings/pages");
          return;
        }
      } catch { /* fall through */ }
      toast("Set Primary URL to your GitHub repo first 🔗");
    });

    document.getElementById("openPagesUrl").addEventListener("click", () => {
      state = ctx.getState();
      const pages = (state.links || []).find(l => {
        try { return new URL(l.url || "").hostname.endsWith(".github.io"); } catch { return false; }
      });
      if (pages) safeOpen(pages.url);
      else toast("Add your Pages URL under Links 🔗");
    });

    document.getElementById("openVercel").addEventListener("click", () => {
      safeOpen(document.getElementById("vercelUrl").value.trim() || "https://vercel.com/dashboard");
    });

    document.getElementById("saveDeploy").addEventListener("click", () => {
      state = ctx.getState();
      state.deploy.productionUrl    = document.getElementById("prodUrl").value.trim();
      state.deploy.vercelProjectUrl = document.getElementById("vercelUrl").value.trim() || "https://vercel.com/dashboard";
      ctx.setState(saveState(state));
      renderChrome();
      toast("Deploy settings saved ✅");
    });

    // env list
    const envList = document.getElementById("envList");
    envList.innerHTML = "";
    (state.deploy.env || []).forEach((e, idx) => {
      const el = document.createElement("div");
      el.className = "item";
      el.innerHTML = `
        <div class="left">
          <div class="ico">🔑</div>
          <div style="width:100%;">
            <h3 class="mono">${escapeHtml(e.key || "KEY")}</h3>
            <p>${escapeHtml(e.note || "")}</p>
            <label>Value</label>
            <input data-env="${idx}" placeholder="value" value="${escapeHtml(e.value || "")}" />
          </div>
        </div>
        <div class="actions">
          <button class="btn small"        data-action="copyOne" data-env="${idx}">📋</button>
          <button class="btn danger small" data-action="delOne"  data-env="${idx}">🗑️</button>
        </div>
      `;
      envList.appendChild(el);
    });

    envList.querySelectorAll("input[data-env]").forEach(inp => {
      inp.addEventListener("change", () => {
        state = ctx.getState();
        const idx = Number(inp.getAttribute("data-env"));
        state.deploy.env[idx].value = inp.value;
        ctx.setState(saveState(state));
        renderChrome();
        toast("Env updated ✅");
      });
    });

    envList.querySelectorAll("[data-action]").forEach(btn => {
      btn.addEventListener("click", async () => {
        state = ctx.getState();
        const action = btn.getAttribute("data-action");
        const idx    = Number(btn.getAttribute("data-env"));
        const item   = state.deploy.env[idx];
        if (!item) return;

        if (action === "delOne") {
          if (!confirm(`Delete env "${item.key}"?`)) return;
          state.deploy.env.splice(idx, 1);
          ctx.setState(saveState(state));
          ctx.renderAll();
          toast("Env deleted 🗑️");
          return;
        }

        if (action === "copyOne") {
          try {
            await navigator.clipboard.writeText(`${item.key}=${item.value || ""}`);
            toast("Copied 📋");
          } catch {
            toast("Clipboard blocked ⚠️");
          }
        }
      });
    });

    document.getElementById("addEnv").addEventListener("click", () => {
      state = ctx.getState();
      const key = prompt("Env key? (e.g., OPENAI_API_KEY)");
      if (!key) return;
      const note = prompt("Note (optional):", "") || "";
      state.deploy.env.unshift({ key, value: "", note });
      ctx.setState(saveState(state));
      ctx.renderAll();
      toast("Env added ➕");
    });

    document.getElementById("copyEnv").addEventListener("click", async () => {
      state = ctx.getState();
      const lines = (state.deploy.env || []).map(x => `${x.key}=${x.value || ""}`);
      try {
        await navigator.clipboard.writeText(lines.join("\n"));
        toast(".env copied 📋");
      } catch {
        toast("Clipboard blocked ⚠️");
      }
    });
  }

  /* ─────────────────────────────────────────────────────────
   * TAB: LINKS
   * ─────────────────────────────────────────────────────────*/
  function renderLinks() {
    let state = ctx.getState();
    mainTitleEl.innerHTML = `🔗 Links <span class="pill">launchers</span>`;
    mainBodyEl.innerHTML = `
      <div class="row" style="justify-content:space-between;align-items:flex-start;">
        <div>
          <p class="note">Your daily launchers. Right-click a link card to remove it.</p>
        </div>
        <div class="actions">
          <button class="btn primary small" id="addLinkBtn">➕ Add Link</button>
          <button class="btn small" id="openAllLinksBtn">🧭 Open All</button>
        </div>
      </div>

      <div class="hr"></div>

      <div class="list" id="linksList"></div>
    `;

    const list = document.getElementById("linksList");
    list.innerHTML = "";

    (state.links || []).forEach((l, idx) => {
      const el = document.createElement("div");
      el.className = "item";
      el.innerHTML = `
        <a class="link left" href="${escapeHtml(l.url)}" target="_blank" rel="noopener noreferrer">
          <div class="ico">${escapeHtml(l.icon || "🔗")}</div>
          <div>
            <h3>${escapeHtml(l.title || "Untitled")}</h3>
            <p>${escapeHtml(l.desc || "")}</p>
            <div class="meta mono">${escapeHtml(l.url || "")}</div>
          </div>
        </a>
        <div class="actions">
          <button class="btn small"        data-action="copy" data-idx="${idx}">📋</button>
          <button class="btn danger small" data-action="del"  data-idx="${idx}">🗑️</button>
        </div>
      `;
      el.addEventListener("contextmenu", e => {
        e.preventDefault();
        state = ctx.getState();
        if (confirm(`Remove link "${l.title}"?`)) {
          state.links.splice(idx, 1);
          ctx.setState(saveState(state));
          ctx.renderAll();
          toast("Link removed 🗑️");
        }
      });
      list.appendChild(el);
    });

    document.getElementById("addLinkBtn").addEventListener("click", () => {
      state = ctx.getState();
      const title = prompt("Link title?");
      if (!title) return;
      const url = prompt("URL (https://...)?");
      if (!url) return;
      const desc = prompt("Description (optional):", "") || "";
      const icon = prompt("Icon emoji (optional):", "🔗") || "🔗";
      state.links.unshift({ title, url, desc, icon });
      ctx.setState(saveState(state));
      ctx.renderAll();
      toast("Link added ➕");
    });

    document.getElementById("openAllLinksBtn").addEventListener("click", () => {
      state = ctx.getState();
      (state.links || []).forEach(l => safeOpen(l.url));
      toast("Opened all 🧭");
    });

    mainBodyEl.querySelectorAll("[data-action]").forEach(btn => {
      btn.addEventListener("click", async () => {
        state = ctx.getState();
        const action = btn.getAttribute("data-action");
        const idx    = Number(btn.getAttribute("data-idx"));
        const l      = state.links[idx];
        if (!l) return;

        if (action === "del") {
          if (!confirm(`Remove link "${l.title}"?`)) return;
          state.links.splice(idx, 1);
          ctx.setState(saveState(state));
          ctx.renderAll();
          toast("Link removed 🗑️");
        }

        if (action === "copy") {
          try {
            await navigator.clipboard.writeText(l.url || "");
            toast("URL copied 📋");
          } catch {
            toast("Clipboard blocked ⚠️");
          }
        }
      });
    });
  }

  /* ─────────────────────────────────────────────────────────
   * FULL RENDER
   * ─────────────────────────────────────────────────────────*/
  function renderAll() {
    renderChrome();
    renderTabs();
    renderMain();
  }

  return { renderAll, renderChrome, renderTabs, renderMain };
}
