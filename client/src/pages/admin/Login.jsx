import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Orb from "../../components/Orb.jsx";
import { FadeUp } from "../../components/ui.jsx";
import { api, errorText, token } from "../../lib/api.js";

export default function Login({ onDone }) {
  const [hasOwner, setHasOwner] = useState(null);
  const [f, setF] = useState({ email: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { api.get("/auth/status").then(({ data }) => setHasOwner(data.has_owner)).catch((e) => { setError(errorText(e)); setHasOwner(true); }); }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!hasOwner && f.password !== f.confirm) return setError("The two passwords don't match.");
    setBusy(true);
    setError("");
    try {
      const { data } = await api.post(hasOwner ? "/auth/login" : "/auth/setup", { email: f.email, password: f.password });
      token.set(data.token);
      onDone();
    } catch (err) { setError(errorText(err)); setBusy(false); }
  };
  const field = (k, label, type, auto) => (
    <div>
      <label className="label" htmlFor={`login-${k}`}>{label}</label>
      <input id={`login-${k}`} className="input" type={type} autoComplete={auto} required minLength={k !== "email" && !hasOwner ? 8 : undefined} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
    </div>
  );
  if (hasOwner === null) return <div className="flex min-h-dvh items-center justify-center"><Orb size={56} state="thinking" /></div>;
  return (
    <main className="flex min-h-dvh items-center justify-center p-4">
      <FadeUp className="w-full max-w-sm">
        <div className="card p-7">
          <Orb size={56} />
          <h1 className="mt-4 text-2xl font-bold tracking-tight">{hasOwner ? "Welcome back" : "Set up Miu"}</h1>
          <p className="mt-1 text-sm text-ink-soft">{hasOwner ? "Log in to manage Miu, your twin AI." : "Create the owner account. This can be done only once."}</p>
          <form className="mt-6 space-y-4" onSubmit={submit}>
            {field("email", "Email", "email", "username")}
            {field("password", hasOwner ? "Password" : "Password (8 or more characters)", "password", hasOwner ? "current-password" : "new-password")}
            {!hasOwner && field("confirm", "Confirm password", "password", "new-password")}
            {error && <p role="alert" className="text-sm text-pink-700">{error}</p>}
            <button className="btn-primary w-full py-2.5" disabled={busy}>{busy ? "Please wait..." : hasOwner ? "Log in" : "Create account"}</button>
          </form>
        </div>
        <p className="mt-4 text-center text-sm"><Link className="text-ink-mute hover:text-ink" to="/">Back to Miu</Link></p>
      </FadeUp>
    </main>
  );
}
