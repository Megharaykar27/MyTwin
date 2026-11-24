import { ArrowLeft, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Empty } from "../../components/ui.jsx";
import { api, errorText, when } from "../../lib/api.js";

const who = (v) => [v.name, v.role, v.company].filter(Boolean).join(" · ") || "Visitor";

function Transcript({ id, onBack, onDeleted }) {
  const [c, setC] = useState(null);
  useEffect(() => { setC(null); api.get(`/admin/conversations/${id}`).then(({ data }) => setC(data)).catch((e) => { toast.error(errorText(e)); onBack(); }); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!c) return <p className="text-sm text-ink-mute">Loading...</p>;
  const remove = async () => {
    if (!window.confirm("Delete this conversation?")) return;
    try { await api.delete(`/admin/conversations/${id}`); onDeleted(); } catch (e) { toast.error(errorText(e)); }
  };
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button type="button" className="btn-ghost" onClick={onBack}><ArrowLeft size={15} /> All conversations</button>
        <span className="text-sm text-ink-soft">{who(c.visitor)} · {c.source} · {when(c.created_at)}</span>
        <button type="button" className="btn-danger ml-auto" onClick={remove}><Trash2 size={15} /> Delete</button>
      </div>
      <ol className="card space-y-4 p-5">
        {c.messages.map((m) => (
          <li key={m.id} className={m.role === "user" ? "flex justify-end" : ""}>
            <div className={`w-fit max-w-[85%] break-words rounded-3xl px-4 py-2.5 text-sm leading-relaxed ${m.role === "user" ? "bg-lav-600 text-white" : "border border-line bg-white"}`}>
              <p className="whitespace-pre-wrap">{m.text.replace(/\*\*/g, "")}</p>
              {m.role === "twin" && (
                <div className="mt-2 space-y-1 border-t border-line pt-2 text-xs text-ink-mute">
                  {m.sources.map((s) => <p key={s.n}>[{s.n}] {s.title} › {s.heading}</p>)}
                  <p>Engine: {m.engine}{m.unanswered && <span className="ml-2 rounded-full bg-pink-50 px-2 py-0.5 text-pink-700">{m.resolved ? "Was unanswered" : "Unanswered"}</span>}{m.feedback !== 0 && <span className="ml-2">{m.feedback > 0 ? "👍" : "👎"}</span>}</p>
                </div>
              )}
            </div>
          </li>
        ))}
      </ol>
    </>
  );
}

export default function Conversations({ refresh, open, params }) {
  const [list, setList] = useState(null);
  const id = params.get("id");
  const load = useCallback(() => api.get("/admin/conversations").then(({ data }) => setList(data)).catch((e) => toast.error(errorText(e))), []);
  useEffect(() => { load(); }, [load]);
  if (id) return <Transcript id={id} onBack={() => open("conversations")} onDeleted={() => { load(); refresh(); open("conversations"); }} />;
  if (!list) return <p className="text-sm text-ink-mute">Loading...</p>;
  if (!list.length) return <Empty>No conversations yet.</Empty>;
  return (
    <ul className="card divide-y divide-line overflow-hidden">
      {list.map((c) => (
        <li key={c.id}>
          <button type="button" onClick={() => open("conversations", { id: c.id })} className="flex w-full items-center gap-4 px-5 py-3.5 text-left transition hover:bg-lav-50">
            <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{who(c.visitor)}</span><span className="block truncate text-sm text-ink-soft">{c.first_question || "No questions yet"}</span></span>
            <span className="shrink-0 text-right text-xs text-ink-mute"><span className="block">{when(c.last_at)}</span><span className="block">{c.messages} messages{c.source === "widget" ? " · widget" : ""}</span></span>
          </button>
        </li>
      ))}
    </ul>
  );
}
