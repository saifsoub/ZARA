export const STORAGE_KEY = "personal_ai_lab_cockpit_v1";

export function cryptoId() {
  if (window.crypto && crypto.getRandomValues) {
    const a = new Uint32Array(2);
    crypto.getRandomValues(a);
    return a[0].toString(16) + a[1].toString(16);
  }
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

export function structuredCloneSafe(obj) {
  try { return structuredClone(obj); } catch { return JSON.parse(JSON.stringify(obj)); }
}

export const defaults = {
  primaryUrl: "https://github.com/saifsoub/future-tax-innovator",
  mode: "LAB",
  quickPrompt:
`You are my Personal AI Lab Orchestrator.
Rules:
- Be fast, structured, and execution-ready.
- Provide direct actions, not theory.
- If something is missing, ask only ONE question.
Output format:
- Next steps
- Command-ready snippets
- Checklists`,
  links: [
    { title: "GitHub Repo", url: "https://github.com/saifsoub/future-tax-innovator", desc: "Main lab repository.", icon: "🐙" },
    { title: "Copilot Agents Folder", url: "https://github.com/saifsoub/future-tax-innovator/tree/main/.github/agents", desc: "Agent configs in repo.", icon: "🤖" },
    { title: "GitHub Pages (if enabled)", url: "https://saifsoub.github.io/future-tax-innovator/", desc: "Public cockpit link.", icon: "🌐" },
    { title: "Vercel Dashboard", url: "https://vercel.com/dashboard", desc: "Deploy, env vars, logs.", icon: "▲" }
  ],
  agents: [
    {
      id: cryptoId(),
      name: "Builder Agent",
      icon: "🛠️",
      desc: "Generates architecture, scaffolds modules, writes code patches.",
      enabled: true,
      endpoint: "",
      defaultPromptId: "",
      schema: {
        inputHint: "Describe what you want built (feature, folder, code change)…",
        outputHint: "Patch plan + code blocks."
      }
    },
    {
      id: cryptoId(),
      name: "Research Agent",
      icon: "🔎",
      desc: "Collects requirements, compares options, creates decision matrices.",
      enabled: true,
      endpoint: "",
      defaultPromptId: "",
      schema: {
        inputHint: "What are we researching? Include constraints + target output.",
        outputHint: "Structured findings + recommendations."
      }
    },
    {
      id: cryptoId(),
      name: "Ops / Deploy Agent",
      icon: "🚀",
      desc: "Preps releases, checklists, env vars, deploy steps.",
      enabled: true,
      endpoint: "",
      defaultPromptId: "",
      schema: {
        inputHint: "Deploy target (Pages/Vercel) + repo + desired domain…",
        outputHint: "Step-by-step deploy plan + commands."
      }
    }
  ],
  prompts: [
    {
      id: cryptoId(),
      title: "Orchestrator Default",
      tags: ["core", "orchestrator"],
      content:
`You are my Personal AI Lab Orchestrator.
Always respond as:
1) What I should do next (max 7 bullets)
2) The exact commands/snippets
3) Risks & mitigations (short)
No fluff.`
    },
    {
      id: cryptoId(),
      title: "Code Patch Mode",
      tags: ["dev", "patch"],
      content:
`Act as a senior engineer.
Return:
- Plan
- File tree changes
- Code blocks per file (with filename headers)
- Test steps`
    },
    {
      id: cryptoId(),
      title: "Decision Matrix Mode",
      tags: ["strategy", "matrix"],
      content:
`Build an objective scoring matrix:
Criteria (weighted), scoring (0-5), rationale, recommendation.
Keep it crisp and executive.`
    }
  ],
  runs: [],
  deploy: {
    vercelProjectUrl: "https://vercel.com/dashboard",
    productionUrl: "",
    env: [
      { key: "OPENAI_API_KEY", value: "", note: "If using OpenAI (store on Vercel ideally)." },
      { key: "SUPABASE_URL", value: "", note: "Your Supabase instance URL." },
      { key: "SUPABASE_ANON_KEY", value: "", note: "Public anon key (still keep on server where possible)." }
    ]
  },
  lastSaved: null
};

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredCloneSafe(defaults);
    const parsed = JSON.parse(raw);
    const s = { ...structuredCloneSafe(defaults), ...parsed };
    s.links = Array.isArray(s.links) ? s.links : structuredCloneSafe(defaults.links);
    s.agents = Array.isArray(s.agents) ? s.agents : structuredCloneSafe(defaults.agents);
    s.prompts = Array.isArray(s.prompts) ? s.prompts : structuredCloneSafe(defaults.prompts);
    s.runs = Array.isArray(s.runs) ? s.runs : [];
    s.deploy = { ...structuredCloneSafe(defaults.deploy), ...(s.deploy || {}) };
    s.deploy.env = Array.isArray(s.deploy.env) ? s.deploy.env : structuredCloneSafe(defaults.deploy.env);
    return s;
  } catch {
    return structuredCloneSafe(defaults);
  }
}

export function saveState(next) {
  next.lastSaved = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}
