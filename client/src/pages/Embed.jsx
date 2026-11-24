import ChatPanel from "../components/ChatPanel.jsx";

// The chat on its own, shown inside the widget's frame
export default function Embed() {
  return <ChatPanel source="widget" className="h-dvh" />;
}
