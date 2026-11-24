import { CheckCircle2, Send } from "lucide-react";
import { useId, useState } from "react";
import { api, errorText } from "../lib/api.js";

export default function LeadForm({ firstName = "Megha", convId, message = "", visitor = {}, compact = false, onSent }) {
  const id = useId();
  const [f, setF] = useState({ name: visitor.name || "", email: "", company: visitor.company || "", message });
  const [state, setState] = useState("idle");
  const [error, setError] = useState("");
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault();
    setState("sending");
    setError("");
    try {
      await api.post("/leads", { ...f, conv_id: convId || undefined });
      setState("sent");
      onSent?.();
    } catch (err) { setError(errorText(err)); setState("idle"); }
  };
  if (state === "sent") return <p role="status" className="flex items-center gap-2 text-sm text-ink"><CheckCircle2 size={18} className="text-emerald-500" /> Sent. {firstName} will get back to you by email.</p>;
  const field = (k, label, props = {}) => (
    <div className={props.wide ? "sm:col-span-2" : ""}>
      <label className="label" htmlFor={`${id}-${k}`}>{label}</label>
      <input id={`${id}-${k}`} className="input" value={f[k]} onChange={set(k)} maxLength={120} {...props.input} />
    </div>
  );
  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
      {field("name", "Your name", { input: { required: true, autoComplete: "name" } })}
      {field("email", "Your email", { input: { required: true, type: "email", autoComplete: "email" } })}
      {field("company", "Company (optional)", { wide: true, input: { autoComplete: "organization" } })}
      <div className="sm:col-span-2">
        <label className="label" htmlFor={`${id}-message`}>Message</label>
        <textarea id={`${id}-message`} className="input resize-none" rows={compact ? 2 : 4} required maxLength={2000} value={f.message} onChange={set("message")} />
      </div>
      {error && <p role="alert" className="text-sm text-pink-700 sm:col-span-2">{error}</p>}
      <button className="btn-primary justify-self-start" disabled={state === "sending"}><Send size={15} /> {state === "sending" ? "Sending..." : "Send message"}</button>
    </form>
  );
}
