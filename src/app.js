import { loadState, saveState, defaults, structuredCloneSafe, STORAGE_KEY } from './state.js';
import { createRenderers } from './render.js';

/* ── Mutable shared state ────────────────────────────────── */
let state     = loadState();
let activeTab = "agents";

/* ── Utility functions ───────────────────────────────────── */
function toast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 1600);
}

function safeOpen(url) {
  if (!url) return;
  window.open(url, "_blank", "noopener,noreferrer");
}

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function fmtTime(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  } catch { return "—"; }
}

function msToHuman(ms) {
  if (ms == null) return "—";
  const s = Math.round(ms / 100) / 10;
  return s < 60 ? `${s}s` : `${Math.round(s / 60)}m`;
}

/* ── Build render context ────────────────────────────────── */
// ctx.renderAll is filled in after createRenderers() returns,
// so render functions read it lazily via the object property.
const ctx = {
  getState()       { return state; },
  setState(s)      { state = s; },
  getActiveTab()   { return activeTab; },
  setTab(tab)      { activeTab = tab; },
  renderAll:       null,   // assigned below
  toast,
  safeOpen,
  escapeHtml,
  fmtTime,
  msToHuman,
  saveState,
  defaults,
  structuredCloneSafe,
};

const renderers  = createRenderers(ctx);
ctx.renderAll    = renderers.renderAll;
const renderAll  = renderers.renderAll;

/* ── DOM references for sidebar fields ──────────────────── */
const primaryUrlEl  = document.getElementById("primaryUrl");
const labModeEl     = document.getElementById("labMode");
const quickPromptEl = document.getElementById("quickPrompt");

/* ── Top-level event wiring ─────────────────────────────── */
document.getElementById("openPrimary").addEventListener("click", () => safeOpen(state.primaryUrl));

document.getElementById("copyQuick").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(quickPromptEl.value || "");
    toast("Quick prompt copied ✅");
  } catch {
    toast("Clipboard blocked (needs HTTPS) ⚠️");
  }
});

document.getElementById("exportBtn").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "personal-ai-lab-cockpit.json";
  a.click();
  URL.revokeObjectURL(a.href);
  toast("Exported ⬇️");
});

document.getElementById("resetBtn").addEventListener("click", () => {
  if (!confirm("Reset to defaults? This clears your saved local config.")) return;
  localStorage.removeItem(STORAGE_KEY);
  state     = loadState();
  activeTab = "agents";
  renderAll();
  toast("Reset done ♻️");
});

document.getElementById("saveBtn").addEventListener("click", () => {
  state.primaryUrl  = primaryUrlEl.value.trim();
  state.mode        = labModeEl.value;
  state.quickPrompt = quickPromptEl.value;
  state = saveState(state);
  renderAll();
  toast("Saved ✅");
});

document.getElementById("importBtn").addEventListener("click", () => {
  document.getElementById("importFile").click();
});

document.getElementById("importFile").addEventListener("change", async (e) => {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  try {
    const txt      = await file.text();
    const incoming = JSON.parse(txt);
    const merged   = { ...structuredCloneSafe(defaults), ...incoming };
    state     = saveState(merged);
    activeTab = "agents";
    renderAll();
    toast("Imported ⬆️");
  } catch {
    toast("Import failed ⚠️");
  } finally {
    e.target.value = "";
  }
});

/* ── Init ───────────────────────────────────────────────── */
renderAll();
