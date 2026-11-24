/* MyTwin widget: adds a round chat button to any page.
   <script src="http://localhost:5005/widget.js" data-app="http://localhost:5177" defer></script> */
(function () {
  if (window.__mytwin) return;
  window.__mytwin = true;

  var script = document.currentScript || document.querySelector('script[src*="widget.js"][data-app]');
  var app = ((script && script.getAttribute("data-app")) || "http://localhost:5177").replace(/\/+$/, "");
  var label = "Ask Megha's AI twin";

  var style = document.createElement("style");
  style.textContent =
    ".mytwin-btn{position:fixed;right:20px;bottom:20px;width:60px;height:60px;border:0;border-radius:50%;padding:0;cursor:pointer;z-index:2147483000;background:conic-gradient(from 40deg,#A78BFA,#7DD3FC,#6EE7B7,#F9A8D4,#A78BFA);box-shadow:inset 0 0 14px rgba(255,255,255,.75),0 8px 24px -8px rgba(22,20,31,.45);transition:transform .2s}" +
    ".mytwin-btn:before{content:'';position:absolute;left:13px;top:9px;width:22px;height:13px;border-radius:50%;background:rgba(255,255,255,.75);filter:blur(3px);transform:rotate(-25deg)}" +
    ".mytwin-btn:hover{transform:scale(1.06)}.mytwin-btn:focus-visible,.mytwin-close:focus-visible{outline:3px solid #8B5CF6;outline-offset:3px}" +
    ".mytwin-tip{position:fixed;right:90px;bottom:36px;padding:7px 12px;border-radius:999px;background:#16141F;color:#fff;font:500 13px/1.2 system-ui,sans-serif;opacity:0;pointer-events:none;transition:opacity .2s;z-index:2147483000;white-space:nowrap}" +
    ".mytwin-btn:hover+.mytwin-tip,.mytwin-btn:focus-visible+.mytwin-tip{opacity:1}" +
    ".mytwin-box{position:fixed;right:20px;bottom:92px;width:380px;height:600px;max-height:calc(100vh - 112px);border-radius:24px;overflow:hidden;background:#fff;border:1px solid #ECEAF3;box-shadow:0 24px 64px -24px rgba(22,20,31,.45);z-index:2147483001;display:none}" +
    ".mytwin-box.mytwin-open{display:block}.mytwin-box iframe{width:100%;height:100%;border:0;display:block}" +
    ".mytwin-close{position:absolute;right:10px;top:10px;width:32px;height:32px;border:0;border-radius:50%;background:#F5F3FF;color:#16141F;font:600 18px/1 system-ui,sans-serif;cursor:pointer}" +
    "@media (max-width:479px){.mytwin-box{right:0;bottom:0;width:100%;height:100%;max-height:none;border-radius:0;border:0}}" +
    "@media (prefers-reduced-motion:reduce){.mytwin-btn,.mytwin-tip{transition:none}}";
  document.head.appendChild(style);

  var button = document.createElement("button");
  button.type = "button";
  button.className = "mytwin-btn";
  button.setAttribute("aria-label", label);
  button.setAttribute("aria-expanded", "false");

  var tip = document.createElement("span");
  tip.className = "mytwin-tip";
  tip.textContent = label;

  var box = document.createElement("div");
  box.className = "mytwin-box";
  box.setAttribute("role", "dialog");
  box.setAttribute("aria-label", label);

  var close = document.createElement("button");
  close.type = "button";
  close.className = "mytwin-close";
  close.setAttribute("aria-label", "Close chat");
  close.textContent = "×";
  box.appendChild(close);

  function toggle(open) {
    if (open && !box.querySelector("iframe")) { // load the chat only when it's needed
      var frame = document.createElement("iframe");
      frame.src = app + "/embed";
      frame.title = label;
      frame.allow = "microphone";
      box.insertBefore(frame, close);
    }
    box.classList.toggle("mytwin-open", open);
    button.setAttribute("aria-expanded", String(open));
    (open ? close : button).focus();
  }
  button.addEventListener("click", function () { toggle(!box.classList.contains("mytwin-open")); });
  close.addEventListener("click", function () { toggle(false); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && box.classList.contains("mytwin-open")) toggle(false); });

  function mount() { document.body.appendChild(button); document.body.appendChild(tip); document.body.appendChild(box); }
  if (document.body) mount(); else document.addEventListener("DOMContentLoaded", mount);
})();
