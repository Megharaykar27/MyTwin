import { Mail, MailOpen, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Empty } from "../../components/ui.jsx";
import { api, errorText, when } from "../../lib/api.js";

export default function Inbox({ refresh, open }) {
  const [list, setList] = useState(null);
  const [id, setId] = useState(null);
  const load = useCallback(() => api.get("/admin/leads").then(({ data }) => setList(data)).catch((e) => toast.error(errorText(e))), []);
  useEffect(() => { load(); }, [load]);
  if (!list) return <p className="text-sm text-ink-mute">Loading...</p>;
  if (!list.length) return <Empty>No messages yet. They appear here when someone uses "Leave a message".</Empty>;
  const lead = list.find((l) => l.id === id);
  const act = async (fn) => { try { await fn(); await load(); refresh(); } catch (e) { toast.error(errorText(e)); } };
  const mark = (l, read) => act(() => api.patch(`/admin/leads/${l.id}`, { read }));
  const pick = (l) => { setId(l.id); if (!l.read) mark(l, true); };
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,340px)_1fr]">
      <ul className="card divide-y divide-line self-start overflow-hidden">
        {list.map((l) => (
          <li key={l.id}>
            <button type="button" onClick={() => pick(l)} className={`block w-full px-4 py-3 text-left transition hover:bg-lav-50 ${l.id === id ? "bg-lav-50" : ""}`}>
              <span className="flex items-baseline justify-between gap-2"><span className={`truncate text-sm ${l.read ? "" : "font-bold"}`}>{!l.read && <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-lav-600" />}{l.name}{l.company && <span className="font-normal text-ink-mute"> · {l.company}</span>}</span><span className="shrink-0 text-[11px] text-ink-mute">{when(l.created_at)}</span></span>
              <span className={`block truncate text-xs ${l.read ? "text-ink-mute" : "font-semibold text-ink-soft"}`}>{l.message}</span>
            </button>
          </li>
        ))}
      </ul>
      {lead ? (
        <article className="card self-start p-6">
          <h2 className="text-lg font-semibold">{lead.name}</h2>
          <p className="break-all text-sm text-ink-soft">{lead.email}{lead.company && ` · ${lead.company}`}</p>
          <p className="text-xs text-ink-mute">{when(lead.created_at)}</p>
          <p className="my-5 whitespace-pre-wrap break-words leading-relaxed">{lead.message}</p>
          <div className="flex flex-wrap gap-2">
            <a className="btn-primary" href={`mailto:${lead.email}?subject=${encodeURIComponent("Your message through Miu, my twin AI")}`}><Mail size={15} /> Reply by email</a>
            <button type="button" className="btn-ghost" onClick={() => mark(lead, !lead.read)}><MailOpen size={15} /> Mark as {lead.read ? "unread" : "read"}</button>
            {lead.conv_id && <button type="button" className="btn-ghost" onClick={() => open("conversations", { id: lead.conv_id })}>See the chat</button>}
            <button type="button" className="btn-danger" onClick={() => window.confirm("Delete this message?") && act(async () => { await api.delete(`/admin/leads/${lead.id}`); setId(null); })}><Trash2 size={15} /> Delete</button>
          </div>
        </article>
      ) : <Empty>Choose a message to read it.</Empty>}
    </div>
  );
}
