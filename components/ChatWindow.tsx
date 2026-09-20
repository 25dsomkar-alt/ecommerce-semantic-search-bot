"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import AnalysisPanel from "@/components/AnalysisPanel";
import MessageBubble from "@/components/MessageBubble";
import {
  MAX_MESSAGE_LENGTH,
  type ChatApiError,
  type ChatApiSuccess,
  type ChatMessage,
} from "@/lib/types";

type Tab = "chat" | "analysis";

const SAMPLE_QUESTIONS = [
  "I returned my headphones last week but haven't received my money yet.",
  "I ordered shoes five days ago and they still haven't arrived.",
  "My card payment failed at checkout.",
  "Can I cancel my order before it ships?",
  "How long does delivery usually take?",
  "I want to return order ORD12345 because the shoes are damaged.",
];

function isChatSuccess(data: unknown): data is ChatApiSuccess {
  const candidate = data as ChatApiSuccess | null;
  return (
    typeof candidate === "object" &&
    candidate !== null &&
    typeof candidate.reply === "string" &&
    typeof candidate.analysis === "object" &&
    candidate.analysis !== null
  );
}

function isChatError(data: unknown): data is ChatApiError {
  const candidate = data as ChatApiError | null;
  return typeof candidate === "object" && candidate !== null && typeof candidate.error?.message === "string";
}

export default function ChatWindow() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("chat");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const idCounter = useRef(0);

  const nextId = () => {
    idCounter.current += 1;
    return `msg-${Date.now()}-${idCounter.current}`;
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isLoading]);

  const selectedAnalysis = messages.find((message) => message.id === selectedId)?.analysis ?? null;

  async function sendMessage(rawText: string) {
    const text = rawText.trim();
    if (!text || isLoading) {
      return;
    }

    setMessages((previous) => [...previous, { id: nextId(), role: "user", content: text }]);
    setInput("");
    setIsLoading(true);

    try {
      let response: Response;
      try {
        response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text }),
        });
      } catch {
        throw new Error("Could not reach the server. Please check your internet connection and try again.");
      }

      const data: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(isChatError(data) ? data.error.message : "Something went wrong. Please try again.");
      }
      if (!isChatSuccess(data)) {
        throw new Error("The server sent an unexpected response. Please try again.");
      }

      const assistantMessage: ChatMessage = {
        id: nextId(),
        role: "assistant",
        content: data.reply,
        analysis: data.analysis,
      };
      setMessages((previous) => [...previous, assistantMessage]);
      setSelectedId(assistantMessage.id);
    } catch (error) {
      const content = error instanceof Error && error.message ? error.message : "Something went wrong. Please try again.";
      setMessages((previous) => [...previous, { id: nextId(), role: "assistant", content, isError: true }]);
    } finally {
      setIsLoading(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage(input);
  }

  function showAnalysis(messageId: string) {
    setSelectedId(messageId);
    setActiveTab("analysis");
  }

  function resetChat() {
    setMessages([]);
    setSelectedId(null);
    setActiveTab("chat");
  }

  const tabClass = (tab: Tab) =>
    `h-11 rounded-lg text-sm font-medium transition-colors ${
      activeTab === tab ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-100"
    }`;

  return (
    <div className="flex h-dvh flex-col bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-6 w-6">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8 10h8M8 14h5M21 12c0 4.418-4.03 8-9 8a10.2 10.2 0 0 1-3.6-.64L3 21l1.4-3.7C3.5 15.9 3 14.5 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8Z"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-base font-semibold leading-tight text-slate-900 sm:text-lg">ShopEase AI Support</h1>
              <p className="text-xs text-slate-500 sm:text-sm">Semantic Search Assistant</p>
            </div>
          </div>
          <button
            type="button"
            onClick={resetChat}
            disabled={messages.length === 0 || isLoading}
            className="h-10 rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            New chat
          </button>
        </div>
        <div className="bg-amber-50 px-4 py-1.5 text-center text-xs text-amber-800">
          Demonstration system: it has no access to real orders, payments or refunds.
        </div>
      </header>

      <nav className="grid grid-cols-2 gap-1 border-b border-slate-200 bg-white p-1 lg:hidden" role="tablist" aria-label="View">
        <button type="button" role="tab" aria-selected={activeTab === "chat"} onClick={() => setActiveTab("chat")} className={tabClass("chat")}>
          Chat
        </button>
        <button type="button" role="tab" aria-selected={activeTab === "analysis"} onClick={() => setActiveTab("analysis")} className={tabClass("analysis")}>
          NLP Analysis
        </button>
      </nav>

      <main className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 gap-4 lg:p-4">
        <section
          className={`${activeTab === "chat" ? "flex" : "hidden"} min-h-0 flex-1 flex-col bg-white lg:flex lg:rounded-2xl lg:border lg:border-slate-200 lg:shadow-sm`}
        >
          <div className="flex flex-1 flex-col space-y-4 overflow-y-auto bg-slate-50 px-4 py-4 sm:px-6" aria-live="polite">
            {messages.length === 0 ? (
              <div className="my-auto text-center">
                <h2 className="text-xl font-semibold text-slate-900">Welcome to AI Customer Support</h2>
                <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
                  Ask me about orders, returns, payments, refunds, cancellations, or delivery.
                </p>
                <div className="mx-auto mt-6 grid max-w-lg gap-2 text-left sm:grid-cols-2">
                  {SAMPLE_QUESTIONS.map((question) => (
                    <button
                      key={question}
                      type="button"
                      onClick={() => void sendMessage(question)}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 shadow-sm hover:border-indigo-300 hover:bg-indigo-50"
                    >
                      {question}
                    </button>
                  ))}
                </div>
                <p className="mx-auto mt-6 max-w-md text-xs text-slate-500">
                  Every answer comes with an NLP analysis: detected intent, extracted entities and the semantic-search results it was based on.
                </p>
              </div>
            ) : (
              messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  isSelected={message.id === selectedId}
                  onShowAnalysis={showAnalysis}
                />
              ))
            )}

            {isLoading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl rounded-bl-md border border-slate-200 bg-white px-4 py-3 shadow-sm">
                  <span className="flex gap-1" aria-hidden="true">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: "0ms" }} />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: "150ms" }} />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: "300ms" }} />
                  </span>
                  <span className="text-sm text-slate-500">Searching the knowledge base…</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <form onSubmit={handleSubmit} className="border-t border-slate-200 bg-white p-3 sm:p-4">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                maxLength={MAX_MESSAGE_LENGTH}
                placeholder="Type your message..."
                aria-label="Your message"
                enterKeyHint="send"
                autoComplete="off"
                className="h-12 min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-4 text-base outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="h-12 rounded-xl bg-indigo-600 px-5 text-base font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Send
              </button>
            </div>
          </form>
        </section>

        <aside
          className={`${activeTab === "analysis" ? "block" : "hidden"} min-h-0 flex-1 overflow-y-auto lg:block lg:w-[26rem] lg:flex-none`}
        >
          <AnalysisPanel analysis={selectedAnalysis} />
        </aside>
      </main>
    </div>
  );
}
