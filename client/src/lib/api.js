import axios from "axios";

export const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:5005").replace(/\/+$/, "");
export const api = axios.create({ baseURL: `${API_URL}/api` });

// localStorage can be blocked (private windows, embedded pages), so every access is safe
export const store = {
  get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* ignore */ } },
  del: (k) => { try { localStorage.removeItem(k); } catch { /* ignore */ } },
};

let memoryToken = null;
export const token = {
  get: () => memoryToken || store.get("mt_token"),
  set: (t) => { memoryToken = t; store.set("mt_token", t); },
  clear: () => { memoryToken = null; store.del("mt_token"); },
};

api.interceptors.request.use((c) => {
  if (token.get() && /^\/(admin|auth\/me)/.test(c.url)) c.headers.Authorization = `Bearer ${token.get()}`;
  return c;
});
api.interceptors.response.use((r) => r, (e) => {
  if (e.response?.status === 401 && /^\/(admin|auth\/me)/.test(e.config?.url || "")) {
    token.clear();
    window.dispatchEvent(new Event("mt-logout"));
  }
  return Promise.reject(e);
});

export const errorText = (e) => e?.response?.data?.message || (e?.code === "ERR_NETWORK" ? "Can't reach the server. Is it running?" : "Something went wrong. Please try again.");

// SQLite stores UTC without a zone
export const when = (s) => (s ? new Date(`${s.replace(" ", "T")}Z`).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "");
