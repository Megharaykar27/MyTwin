import { Building2, CircleHelp, Inbox, MessageCircle, MessagesSquare, Sparkles, Target, ThumbsUp } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Empty } from "../../components/ui.jsx";

const day = (d) => new Date(`${d}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

export default function Overview({ overview: o, open }) {
  if (!o) return <p className="text-sm text-ink-mute">Loading...</p>;
  const votes = o.feedback.helpful + o.feedback.not_helpful;
  const cards = [
    ["Conversations", o.totals.conversations, MessagesSquare, "conversations"],
    ["Questions", o.totals.questions, MessageCircle, "conversations"],
    ["Unread messages", o.totals.unread_leads, Inbox, "inbox"],
    ["Unanswered", o.totals.unanswered, CircleHelp, "unanswered"],
    ["Job-fit checks", o.totals.fit_checks, Target],
    ["Helpful answers", votes ? `${Math.round((100 * o.feedback.helpful) / votes)}%` : "–", ThumbsUp],
  ];
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        {cards.map(([name, n, Icon, to]) => {
          const body = <><Icon size={17} className="text-lav-500" /><p className="mt-3 text-2xl font-bold tabular-nums">{n}</p><p className="text-xs text-ink-soft">{name}</p></>;
          return to ? <button key={name} type="button" onClick={() => open(to)} className="card p-4 text-left transition hover:border-lav-200">{body}</button> : <div key={name} className="card p-4">{body}</div>;
        })}
      </div>
      <section className="card p-5">
        <h2 className="mb-4 text-sm font-semibold">Last 14 days</h2>
        <div className="h-60">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={o.chart} margin={{ left: -24, right: 8, top: 4 }}>
              <defs><linearGradient id="q" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#8B5CF6" stopOpacity={0.35} /><stop offset="1" stopColor="#8B5CF6" stopOpacity={0.02} /></linearGradient></defs>
              <CartesianGrid stroke="#ECEAF3" vertical={false} />
              <XAxis dataKey="date" tickFormatter={day} tick={{ fontSize: 11, fill: "#8D8AA0" }} axisLine={false} tickLine={false} minTickGap={24} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#8D8AA0" }} axisLine={false} tickLine={false} />
              <Tooltip labelFormatter={day} contentStyle={{ borderRadius: 16, border: "1px solid #ECEAF3", fontSize: 12 }} />
              <Area type="monotone" dataKey="questions" name="Questions" stroke="#7C3AED" strokeWidth={2} fill="url(#q)" isAnimationActive={false} />
              <Area type="monotone" dataKey="conversations" name="Conversations" stroke="#7DD3FC" strokeWidth={2} fill="#7DD3FC" fillOpacity={0.12} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-2 flex gap-4 text-xs text-ink-soft"><span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-lav-600" /> Questions</span><span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-sky2" /> Conversations</span></p>
      </section>
      <div className="grid gap-5 lg:grid-cols-3">
        <section className="card p-5">
          <h2 className="mb-3 text-sm font-semibold">Top questions</h2>
          {o.top_questions.length ? <ol className="space-y-2 text-sm">{o.top_questions.map((q) => <li key={q.question} className="flex justify-between gap-3"><span className="min-w-0 truncate text-ink-soft" title={q.question}>{q.question}</span><span className="font-semibold tabular-nums">{q.n}</span></li>)}</ol> : <Empty>No questions yet.</Empty>}
        </section>
        <section className="card p-5">
          <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold"><Building2 size={15} /> Companies</h2>
          {o.companies.length ? <ul className="space-y-2 text-sm">{o.companies.map((c) => <li key={c.name} className="flex justify-between gap-3"><span className="min-w-0 truncate text-ink-soft">{c.name}</span><span className="font-semibold tabular-nums">{c.n}</span></li>)}</ul> : <Empty>No companies yet.</Empty>}
        </section>
        <section className="card p-5">
          <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold"><Sparkles size={15} /> AI mode</h2>
          {o.ai === "gemini"
            ? <p className="text-sm text-ink-soft"><span className="font-semibold text-emerald-600">Gemini is on.</span> Answers are written naturally from your facts.</p>
            : <div className="space-y-2 text-sm text-ink-soft"><p><span className="font-semibold text-lav-700">Basic mode.</span> Answers come straight from your notes.</p><p>For natural answers: get a free key at <a className="text-lav-700 underline" href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">aistudio.google.com/apikey</a>, put it in <code className="rounded bg-lav-50 px-1">server/.env</code> as <code className="rounded bg-lav-50 px-1">GEMINI_API_KEY</code>, then restart.</p></div>}
        </section>
      </div>
    </div>
  );
}
