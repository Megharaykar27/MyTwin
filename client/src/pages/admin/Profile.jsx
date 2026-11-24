import { Save } from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useProfile } from "../../App.jsx";
import { ChipInput } from "../../components/ui.jsx";
import { api, errorText } from "../../lib/api.js";

const FIELDS = [["name", "Full name"], ["first_name", "First name"], ["ai_name", "Twin AI's name"], ["headline", "Headline", true], ["location", "Location"], ["email", "Email"], ["linkedin", "LinkedIn link"], ["github", "GitHub link"], ["portfolio", "Portfolio link"], ["tone", "Tone of the answers"], ["availability", "Availability", true]];

function ProjectRow({ project, onSaved }) {
  const [p, setP] = useState(project);
  const save = async (change) => {
    const next = { ...p, ...change };
    setP(next);
    try {
      const { data } = await api.patch(`/admin/projects/${p.slug}`, { tagline: next.tagline || "", cover: next.cover || "", demo: next.demo || "", featured: next.featured, sort: Number(next.sort) || 0 });
      setP(data);
      onSaved();
    } catch (e) { toast.error(errorText(e)); }
  };
  const input = (k, label, cls = "") => <input aria-label={`${p.name}: ${label}`} placeholder={label} className={`input px-3 py-1.5 text-xs ${cls}`} value={p[k] ?? ""} onChange={(e) => setP({ ...p, [k]: e.target.value })} onBlur={() => String(p[k] ?? "") !== String(project[k] ?? "") && save({})} />;
  return (
    <tr>
      <td className="px-5 py-2.5 font-medium">{p.name}</td>
      <td className="px-2 text-center"><input type="checkbox" aria-label={`${p.name}: featured`} className="h-4 w-4 accent-violet-600" checked={p.featured} onChange={(e) => save({ featured: e.target.checked })} /></td>
      <td className="w-20 px-2">{input("sort", "Order")}</td>
      <td className="px-2">{input("tagline", "Tagline")}</td>
      <td className="px-2">{input("cover", "Cover link")}</td>
      <td className="px-2 pr-5">{input("demo", "Demo link")}</td>
    </tr>
  );
}

export default function Profile() {
  const { reload } = useProfile();
  const [f, setF] = useState(null);
  const [projects, setProjects] = useState([]);
  const [busy, setBusy] = useState(false);
  const loadProjects = () => api.get("/admin/projects").then(({ data }) => setProjects(data));
  useEffect(() => { api.get("/admin/profile").then(({ data }) => setF(data)).catch((e) => toast.error(errorText(e))); loadProjects().catch(() => {}); }, []);
  if (!f) return <p className="text-sm text-ink-mute">Loading...</p>;
  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    try { const { data } = await api.put("/admin/profile", f); setF({ accent: "#7C5CFF", show_email: true, ...data }); await reload(); toast.success("Profile saved"); } catch (err) { toast.error(errorText(err)); }
    setBusy(false);
  };
  const chips = (k, label, max) => <div className="sm:col-span-2"><label className="label" htmlFor={`p-${k}`}>{label}</label><ChipInput id={`p-${k}`} value={f[k] || []} max={max} onChange={(v) => setF({ ...f, [k]: v })} /></div>;
  return (
    <div className="space-y-5">
      <form onSubmit={save} className="card grid gap-4 p-5 sm:grid-cols-2">
        {FIELDS.map(([k, label, wide]) => <div key={k} className={wide ? "sm:col-span-2" : ""}><label className="label" htmlFor={`p-${k}`}>{label}</label><input id={`p-${k}`} className="input" value={f[k] || ""} onChange={(e) => setF({ ...f, [k]: e.target.value })} /></div>)}
        <div className="sm:col-span-2"><label className="label" htmlFor="p-intro">Welcome message</label><textarea id="p-intro" className="input" rows={3} maxLength={600} value={f.intro || ""} onChange={(e) => setF({ ...f, intro: e.target.value })} /></div>
        {chips("skills", "Skills", 80)}
        {chips("hobbies", "Hobbies", 20)}
        {chips("suggested", "Suggested questions (up to 6)", 6)}
        <div><label className="label" htmlFor="p-accent">Accent colour</label><input id="p-accent" type="color" className="h-10 w-20 cursor-pointer rounded-2xl border border-line bg-white p-1" value={f.accent || "#7C5CFF"} onChange={(e) => setF({ ...f, accent: e.target.value })} /></div>
        <label className="flex items-center gap-2 self-end pb-2 text-sm text-ink-soft"><input type="checkbox" className="h-4 w-4 accent-violet-600" checked={f.show_email !== false} onChange={(e) => setF({ ...f, show_email: e.target.checked })} /> Show my email on the public page</label>
        <div className="sm:col-span-2"><button className="btn-primary" disabled={busy}><Save size={15} /> {busy ? "Saving..." : "Save profile"}</button></div>
      </form>
      <section className="card overflow-hidden">
        <h2 className="p-5 pb-3 text-sm font-semibold">Projects <span className="font-normal text-ink-mute">(changes save by themselves)</span></h2>
        <div className="thin-scroll overflow-x-auto pb-3">
          <table className="w-full min-w-[820px] text-sm">
            <thead><tr className="border-y border-line text-left text-xs text-ink-mute"><th className="px-5 py-2 font-medium">Project</th><th className="px-2 py-2 font-medium">Featured</th><th className="px-2 py-2 font-medium">Order</th><th className="px-2 py-2 font-medium">Tagline</th><th className="px-2 py-2 font-medium">Cover</th><th className="px-2 py-2 font-medium">Demo</th></tr></thead>
            <tbody className="divide-y divide-line">{projects.map((p) => <ProjectRow key={p.slug} project={p} onSaved={() => { loadProjects().catch(() => {}); reload(); }} />)}</tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
