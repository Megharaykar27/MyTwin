import { animate, motion, useReducedMotion } from "framer-motion";
import { Check, CircleDashed, Info, MessageCircle, Sparkles, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useProfile } from "../App.jsx";
import ProjectCard from "../components/ProjectCard.jsx";
import { FadeUp } from "../components/ui.jsx";
import { api, errorText } from "../lib/api.js";

const SAMPLE = `Junior Full Stack Developer

We are a small product team building web apps for local businesses. You will work on features from the database to the screen, with help from senior developers.

Requirements:
- Good knowledge of React and JavaScript
- Node.js and REST APIs
- MongoDB or another database
- Git and working in a team

Nice to have:
- TypeScript
- Docker
- AWS`;

function Ring({ score }) {
  const still = useReducedMotion();
  const [n, setN] = useState(still ? score : 0);
  useEffect(() => {
    if (still) { setN(score); return undefined; }
    const c = animate(0, score, { duration: 1, ease: "easeOut", onUpdate: (v) => setN(Math.round(v)) });
    return () => c.stop();
  }, [score, still]);
  const r = 62, len = 2 * Math.PI * r;
  return (
    <div className="relative h-40 w-40 shrink-0" role="img" aria-label={`Score ${score} out of 100`}>
      <svg viewBox="0 0 160 160" className="-rotate-90">
        <circle cx="80" cy="80" r={r} fill="none" stroke="#EDE9FE" strokeWidth="13" />
        <motion.circle cx="80" cy="80" r={r} fill="none" stroke="#8B5CF6" strokeWidth="13" strokeLinecap={score ? "round" : "butt"} strokeDasharray={len} initial={{ strokeDashoffset: still ? len * (1 - score / 100) : len }} animate={{ strokeDashoffset: len * (1 - score / 100) }} transition={{ duration: 1, ease: "easeOut" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center"><span className="text-4xl font-bold tabular-nums">{n}</span><span className="text-xs text-ink-mute">out of 100</span></div>
    </div>
  );
}

function Column({ title, icon: Icon, tone, children, empty }) {
  return (
    <div className={`rounded-3xl border p-4 ${tone}`}>
      <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold"><Icon size={15} /> {title}</h3>
      {children.length ? <ul className="flex flex-wrap gap-1.5">{children}</ul> : <p className="text-xs opacity-70">{empty}</p>}
    </div>
  );
}
const Tag = ({ children, extra }) => <li className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-ink shadow-sm">{children}{extra && <span className="ml-1 font-normal text-ink-mute">{extra}</span>}</li>;

export default function Fit() {
  const { profile } = useProfile();
  const go = useNavigate();
  const [jd, setJd] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [f, setF] = useState(null);
  const result = useRef(null);
  const title = jd.split("\n").map((l) => l.trim()).find(Boolean)?.slice(0, 80) || "this role";

  const check = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { data } = await api.post("/fit", { jd });
      setF(data);
      setTimeout(() => result.current?.scrollIntoView({ block: "start" }), 60);
    } catch (err) { setError(errorText(err)); }
    setBusy(false);
  };

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <FadeUp>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Is {profile.first_name} a good <span className="serif-word">fit?</span></h1>
        <p className="mt-2 text-ink-soft">Paste a job description. The twin compares it with {profile.first_name}'s real skills and shows an honest score.</p>
        <form onSubmit={check} className="card mt-6 p-4 sm:p-5">
          <label className="label" htmlFor="jd">Paste a job description</label>
          <textarea id="jd" className="input thin-scroll resize-y" rows={f ? 6 : 11} maxLength={8000} value={jd} onChange={(e) => setJd(e.target.value)} placeholder={"Job title\n\nRequirements: ...\nNice to have: ..."} />
          {error && <p role="alert" className="mt-2 text-sm text-pink-700">{error}</p>}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button className="btn-primary" disabled={busy || jd.trim().length < 50}><Sparkles size={16} /> {busy ? "Checking..." : "Check my fit"}</button>
            <button type="button" className="btn-ghost" onClick={() => setJd(SAMPLE)}>Use a sample job</button>
            <span className="ml-auto text-xs text-ink-mute">{jd.length} / 8000</span>
          </div>
        </form>
      </FadeUp>

      {f && (
        <div ref={result} className="scroll-mt-20 space-y-5 pt-6" aria-live="polite">
          <FadeUp key={`${f.score}-${f.summary}`} className="space-y-5">
            <div className="card flex flex-col items-center gap-6 p-6 sm:flex-row">
              <Ring score={f.score} />
              <div className="min-w-0 text-center sm:text-left">
                <p className="text-2xl font-bold tracking-tight">{f.verdict}</p>
                <p className="mt-2 leading-relaxed text-ink-soft">{f.summary}</p>
                {f.experience_note && <p className="mt-3 flex gap-2 rounded-2xl bg-lav-50 p-3 text-left text-sm text-lav-700"><Info size={16} className="mt-0.5 shrink-0" /> {f.experience_note}</p>}
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <Column title="Matched" icon={Check} tone="border-emerald-200 bg-mint2/20 text-emerald-900" empty="No direct matches.">
                {[...f.matched.map((s) => <Tag key={s}>{s}</Tag>), ...f.nice.matched.map((s) => <Tag key={s} extra="nice to have">{s}</Tag>)]}
              </Column>
              <Column title="Partial" icon={CircleDashed} tone="border-sky-200 bg-sky2/20 text-sky-900" empty="No partial matches.">
                {f.partial.map((x) => <Tag key={x.skill} extra={`via ${x.via}`}>{x.skill}</Tag>)}
              </Column>
              <Column title="Missing" icon={X} tone="border-pink-200 bg-blush/20 text-pink-900" empty="Nothing missing.">
                {[...f.missing.map((s) => <Tag key={s}>{s}</Tag>), ...f.nice.missing.map((s) => <Tag key={s} extra="nice to have">{s}</Tag>)]}
              </Column>
            </div>
            {f.projects.length > 0 && <section><h2 className="mb-3 text-sm font-semibold">Projects that show it</h2><div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">{f.projects.map((p) => <ProjectCard key={p.slug} project={p} />)}</div></section>}
            {f.talking_points.length > 0 && <section className="card p-5"><h2 className="mb-2 text-sm font-semibold">Talking points</h2><ul className="space-y-1.5 text-sm text-ink-soft">{f.talking_points.map((t) => <li key={t} className="flex gap-2"><span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-lav-400" />{t}</li>)}</ul></section>}
            <button className="btn-ghost" onClick={() => go("/", { state: { question: `Why would you be a good fit for this role: ${title}?` } })}><MessageCircle size={16} /> Ask the twin about this role</button>
          </FadeUp>
        </div>
      )}
    </main>
  );
}
