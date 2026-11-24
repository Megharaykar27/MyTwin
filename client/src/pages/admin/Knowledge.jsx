import { Eye, FileUp, FlaskConical, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { Empty, GitHubIcon, Modal } from "../../components/ui.jsx";
import { api, errorText, when } from "../../lib/api.js";

const BADGE = { resume: ["Resume", "bg-lav-100 text-lav-700"], github: ["GitHub", "bg-slate-100 text-slate-700"], note: ["Note", "bg-sky-100 text-sky-800"], qa: ["Q&A", "bg-emerald-100 text-emerald-800"] };
const Badge = ({ source }) => <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${BADGE[source]?.[1]}`}>{BADGE[source]?.[0] || source}</span>;

function ResumeCard({ onDone }) {
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);
  const [r, setR] = useState(null);
  const input = useRef(null);
  const upload = async (file) => {
    if (!file || busy) return;
    setBusy(true);
    const form = new FormData();
    form.append("file", file);
    try { const { data } = await api.post("/admin/resume", form); setR(data); toast.success("Resume updated"); onDone(); } catch (e) { toast.error(errorText(e)); }
    setBusy(false);
    if (input.current) input.current.value = "";
  };
  return (
    <section className="card p-5">
      <h2 className="mb-3 text-sm font-semibold">Update resume</h2>
      <button type="button" disabled={busy} onClick={() => input.current.click()} onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={(e) => { e.preventDefault(); setOver(false); upload(e.dataTransfer.files[0]); }}
        className={`flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed p-6 text-sm text-ink-soft transition hover:border-lav-300 hover:bg-lav-50 ${over ? "border-lav-400 bg-lav-50" : "border-line"}`}>
        <FileUp size={22} className="text-lav-500" />
        {busy ? "Reading your resume..." : "Drop a PDF, DOCX or TXT here, or click to choose"}
        <span className="text-xs text-ink-mute">This replaces the current resume. Max 5 MB.</span>
      </button>
      <input ref={input} type="file" accept=".pdf,.docx,.txt" className="hidden" aria-label="Resume file" onChange={(e) => upload(e.target.files[0])} />
      {r && <p role="status" className="mt-3 text-xs text-ink-soft">Found {r.sections.length} sections: {[...new Set(r.sections)].join(", ")}. {r.hidden_phones} phone number{r.hidden_phones === 1 ? "" : "s"} hidden.</p>}
    </section>
  );
}

function GithubCard({ user, onDone }) {
  const [name, setName] = useState(user || "");
  const [forks, setForks] = useState(false);
  const [busy, setBusy] = useState(false);
  const [r, setR] = useState(null);
  useEffect(() => { setName((n) => n || user || ""); }, [user]);
  const sync = async (e) => {
    e.preventDefault();
    setBusy(true);
    try { const { data } = await api.post("/admin/github/sync", { username: name, include_forks: forks }); setR(data); toast.success(`Synced ${data.repos.length} repos`); onDone(); } catch (err) { toast.error(errorText(err)); }
    setBusy(false);
  };
  return (
    <section className="card p-5">
      <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold"><GitHubIcon /> Sync GitHub</h2>
      <form onSubmit={sync} className="space-y-3">
        <div><label className="label" htmlFor="gh-user">GitHub username</label><input id="gh-user" className="input" required value={name} onChange={(e) => setName(e.target.value)} /></div>
        <label className="flex items-center gap-2 text-sm text-ink-soft"><input type="checkbox" className="h-4 w-4 accent-violet-600" checked={forks} onChange={(e) => setForks(e.target.checked)} /> Include forks</label>
        <button className="btn-primary" disabled={busy}><RefreshCw size={15} className={busy ? "animate-spin" : ""} /> {busy ? "Syncing..." : "Sync now"}</button>
      </form>
      {r && <p role="status" className="mt-3 text-xs text-ink-soft">Synced from {r.user}: {r.repos.join(", ") || "no public repos"}.</p>}
    </section>
  );
}

function TestBox() {
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [r, setR] = useState(null);
  const ask = async (e) => {
    e.preventDefault();
    setBusy(true);
    try { const { data } = await api.post("/admin/test-question", { text: q }); setR(data); } catch (err) { toast.error(errorText(err)); }
    setBusy(false);
  };
  return (
    <section className="card p-5">
      <h2 className="flex items-center gap-1.5 text-sm font-semibold"><FlaskConical size={15} /> Test the twin</h2>
      <p className="mb-3 text-xs text-ink-mute">Ask something and see the answer with the facts behind it. Nothing is saved.</p>
      <form onSubmit={ask} className="flex gap-2"><input className="input" aria-label="Test question" maxLength={600} value={q} onChange={(e) => setQ(e.target.value)} placeholder="What is your tech stack?" /><button className="btn-primary shrink-0" disabled={busy || !q.trim()}>{busy ? "..." : "Ask"}</button></form>
      {r && (
        <div className="mt-4 grid gap-4 lg:grid-cols-2" aria-live="polite">
          <div className="rounded-2xl bg-lav-50 p-4 text-sm leading-relaxed"><p className="whitespace-pre-wrap break-words">{r.text.replace(/\*\*/g, "")}</p><p className="mt-3 text-xs text-ink-mute">Engine: {r.engine}{r.unanswered && " · marked as unanswered"}</p></div>
          <div className="space-y-2">
            {r.hits.length ? r.hits.map((h, i) => (
              <div key={h.id} className="rounded-2xl border border-line p-3 text-xs"><p className="flex justify-between gap-2 font-semibold"><span className="min-w-0 truncate">[{i + 1}] {h.title} › {h.heading}</span><span className="tabular-nums text-lav-700">{h.score.toFixed(2)}</span></p><p className="mt-1 line-clamp-2 text-ink-soft">{h.text}</p></div>
            )) : <Empty>No matching facts.</Empty>}
          </div>
        </div>
      )}
    </section>
  );
}

function Editor({ doc, onClose, onSaved }) {
  const qa = doc.source === "qa";
  const [f, setF] = useState({ title: doc.title || "", body: doc.body || "" });
  const [error, setError] = useState("");
  const save = async (e) => {
    e.preventDefault();
    try {
      if (doc.id) await api.put(`/admin/knowledge/${doc.id}`, f); else await api.post("/admin/knowledge", { ...f, source: doc.source });
      toast.success("Saved");
      onSaved();
    } catch (err) { setError(errorText(err)); }
  };
  return (
    <Modal wide title={`${doc.id ? "Edit" : "Add"} ${qa ? "Q&A" : "note"}`} onClose={onClose}>
      <form onSubmit={save} className="space-y-4">
        <div><label className="label" htmlFor="doc-title">{qa ? "Question" : "Title"}</label><input id="doc-title" className="input" required maxLength={200} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></div>
        <div><label className="label" htmlFor="doc-body">{qa ? "Answer" : "Note"}</label><textarea id="doc-body" className="input" rows={8} required value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} /></div>
        {error && <p role="alert" className="text-sm text-pink-700">{error}</p>}
        <button className="btn-primary">Save</button>
      </form>
    </Modal>
  );
}

export default function Knowledge({ overview, refresh }) {
  const [docs, setDocs] = useState(null);
  const [edit, setEdit] = useState(null);
  const [view, setView] = useState(null);
  const load = useCallback(() => { refresh(); return api.get("/admin/knowledge").then(({ data }) => setDocs(data)).catch((e) => toast.error(errorText(e))); }, [refresh]);
  useEffect(() => { load(); }, [load]);
  const get = async (id, fn) => { try { fn((await api.get(`/admin/knowledge/${id}`)).data); } catch (e) { toast.error(errorText(e)); } };
  const remove = async (d) => {
    if (!window.confirm(`Delete "${d.title}"? The twin will forget it.`)) return;
    try { await api.delete(`/admin/knowledge/${d.id}`); load(); } catch (e) { toast.error(errorText(e)); }
  };
  return (
    <div className="space-y-5">
      <TestBox />
      <div className="grid gap-5 lg:grid-cols-2"><ResumeCard onDone={load} /><GithubCard user={overview?.github_user} onDone={load} /></div>
      <section className="card overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 p-5 pb-3">
          <h2 className="mr-auto text-sm font-semibold">What the twin knows</h2>
          <button type="button" className="btn-ghost" onClick={() => setEdit({ source: "note" })}><Plus size={15} /> Add note</button>
          <button type="button" className="btn-ghost" onClick={() => setEdit({ source: "qa" })}><Plus size={15} /> Add Q&A</button>
        </div>
        {!docs ? <p className="p-5 text-sm text-ink-mute">Loading...</p> : (
          <div className="thin-scroll overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead><tr className="border-y border-line text-left text-xs text-ink-mute"><th className="px-5 py-2 font-medium">Source</th><th className="px-2 py-2 font-medium">Title</th><th className="px-2 py-2 font-medium">Sections</th><th className="px-2 py-2 font-medium">Updated</th><th className="px-5 py-2"><span className="sr-only">Actions</span></th></tr></thead>
              <tbody className="divide-y divide-line">
                {docs.map((d) => (
                  <tr key={d.id}>
                    <td className="px-5 py-2.5"><Badge source={d.source} /></td>
                    <td className="max-w-[260px] truncate px-2 py-2.5 font-medium" title={d.title}>{d.title}</td>
                    <td className="px-2 py-2.5 tabular-nums text-ink-soft">{d.chunks}</td>
                    <td className="whitespace-nowrap px-2 py-2.5 text-ink-mute">{when(d.updated_at)}</td>
                    <td className="whitespace-nowrap px-5 py-1.5 text-right">
                      <button type="button" className="icon-btn" aria-label={`View ${d.title}`} onClick={() => get(d.id, setView)}><Eye size={15} /></button>
                      {["note", "qa"].includes(d.source) && <button type="button" className="icon-btn" aria-label={`Edit ${d.title}`} onClick={() => get(d.id, setEdit)}><Pencil size={15} /></button>}
                      <button type="button" className="icon-btn hover:bg-pink-50 hover:text-pink-700" aria-label={`Delete ${d.title}`} onClick={() => remove(d)}><Trash2 size={15} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {edit && <Editor doc={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); load(); }} />}
      {view && <Modal wide title={view.title} onClose={() => setView(null)}><div className="space-y-4 text-sm">{view.chunks.map((c) => <div key={c.id}><p className="font-semibold">{c.heading}</p><p className="whitespace-pre-wrap break-words text-ink-soft">{c.text}</p></div>)}</div></Modal>}
    </div>
  );
}
