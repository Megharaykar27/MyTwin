import { Check, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Empty } from "../../components/ui.jsx";
import { api, errorText, when } from "../../lib/api.js";

function Item({ q, open, onDone }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const act = async (fn, ok) => {
    setBusy(true);
    try { await fn(); toast.success(ok); onDone(); } catch (e) { toast.error(errorText(e)); setBusy(false); }
  };
  return (
    <li className="card p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-semibold">{q.question}</h2>
        <span className="text-xs text-ink-mute">{when(q.created_at)} · <button type="button" className="font-medium text-lav-700 hover:underline" onClick={() => open("conversations", { id: q.conv_id })}>See the chat</button></span>
      </div>
      <label className="label mt-3" htmlFor={`a-${q.id}`}>Write the answer</label>
      <textarea id={`a-${q.id}`} className="input" rows={3} maxLength={4000} value={text} onChange={(e) => setText(e.target.value)} placeholder="Write it as yourself, for example: Yes, I can relocate to Bengaluru." />
      <div className="mt-3 flex gap-2">
        <button type="button" className="btn-primary" disabled={busy || !text.trim()} onClick={() => act(() => api.post(`/admin/unanswered/${q.id}/answer`, { answer: text }), "Saved. Miu knows this now.")}><Check size={15} /> Save</button>
        <button type="button" className="btn-ghost" disabled={busy} onClick={() => act(() => api.post(`/admin/unanswered/${q.id}/dismiss`), "Dismissed")}><X size={15} /> Dismiss</button>
      </div>
    </li>
  );
}

export default function Unanswered({ refresh, open }) {
  const [list, setList] = useState(null);
  const load = useCallback(() => api.get("/admin/unanswered").then(({ data }) => setList(data)).catch((e) => toast.error(errorText(e))), []);
  useEffect(() => { load(); }, [load]);
  if (!list) return <p className="text-sm text-ink-mute">Loading...</p>;
  return (
    <>
      <p className="mb-5 text-sm text-ink-soft">Questions Miu couldn't answer. Write an answer once and it becomes a Q&A Miu uses from then on.</p>
      {list.length ? <ul className="space-y-4">{list.map((q) => <Item key={q.id} q={q} open={open} onDone={() => { load(); refresh(); }} />)}</ul> : <Empty>Nothing open. Miu could answer everything.</Empty>}
    </>
  );
}
