import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Bot, Loader2, Sparkles, User } from "lucide-react";
import { sendAssistantMessage } from "@/services/api";
import { useStore } from "@/lib/store";

export default function ChatBot() {
  const { user } = useStore();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "bot",
      text: "Hello! I'm AirMate Assistant. Ask me about actual flight prices, baggage rules, delay forecasts, or your own bookings.",
    },
  ]);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (open) {
      scrollToBottom();
    }
  }, [messages, open]);

  const quickPrompts = [
    "Cheapest flight right now?",
    user ? "What are my upcoming flights?" : "How do I check my booking?",
    "What is the baggage allowance?",
    "How does flight cancellation refund work?",
  ];

  async function handleSend(textToSend) {
    const text = (textToSend || input).trim();
    if (!text || loading) return;

    setMessages((prev) => [...prev, { role: "user", text }]);
    setInput("");
    setLoading(true);

    try {
      const res = await sendAssistantMessage(text);
      setMessages((prev) => [
        ...prev,
        {
          role: "bot",
          text: res.reply || "I am currently unable to fetch details for this request.",
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "bot",
          text:
            "I could not connect to the live flight operations service right now. Please verify your connection or try again shortly.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    handleSend();
  }

  return (
    <>
      {open ? (
        <div className="fixed bottom-20 right-4 z-50 flex h-[32rem] w-[min(26rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl animate-in fade-in zoom-in-95">
          {/* Header */}
          <div className="sky-panel flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <div className="grid size-7 place-items-center rounded-lg bg-primary text-primary-foreground">
                <Bot className="size-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-foreground block leading-none">
                  AirMate Assistant
                </span>
                <span className="text-[10px] text-muted-foreground">
                  Live flight & booking intelligence
                </span>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="rounded-lg p-1 text-muted-foreground hover:bg-secondary"
              aria-label="Close assistant"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Quick Prompts Bar */}
          <div className="border-b border-border/60 bg-secondary/30 px-3 py-2 flex items-center gap-1.5 overflow-x-auto scrollbar-none text-[11px]">
            {quickPrompts.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(q)}
                disabled={loading}
                className="whitespace-nowrap rounded-lg border border-border bg-background px-2.5 py-1 text-muted-foreground hover:border-primary hover:text-foreground transition-colors disabled:opacity-50"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Message History */}
          <div className="flex-1 space-y-3 overflow-y-auto p-4 text-xs">
            {messages.map((m, i) => (
              <div
                key={i}
                className={
                  "flex flex-col " +
                  (m.role === "bot" ? "items-start" : "items-end")
                }
              >
                <div
                  className={
                    "max-w-[88%] rounded-2xl px-3.5 py-2.5 leading-relaxed whitespace-pre-wrap " +
                    (m.role === "bot"
                      ? "bg-secondary text-secondary-foreground rounded-tl-xs shadow-xs"
                      : "bg-primary text-primary-foreground rounded-tr-xs shadow-xs")
                  }
                >
                  {m.text}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-secondary/60 rounded-xl px-3 py-2 w-fit">
                <Loader2 className="size-3.5 animate-spin text-primary" />
                <span>Checking live flight catalog and bookings...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Form */}
          <form onSubmit={handleSubmit} className="flex gap-2 border-t border-border p-3 bg-card">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about flights, PNR, baggage..."
              disabled={loading}
              className="flex-1 rounded-xl border border-input bg-background px-3 py-2 text-xs outline-none focus:border-primary disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground disabled:opacity-50 hover:opacity-95 shrink-0"
              aria-label="Send"
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            </button>
          </form>
        </div>
      ) : null}

      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-5 right-4 z-50 grid size-13 place-items-center rounded-full sky-panel shadow-2xl transition-transform hover:scale-105 border border-primary/20"
        aria-label="Open AI assistant"
      >
        <MessageCircle className="size-6 text-primary" />
      </button>
    </>
  );
}
