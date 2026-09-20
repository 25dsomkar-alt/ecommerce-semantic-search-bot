import { INTENT_LABELS, type ChatMessage } from "@/lib/types";

interface MessageBubbleProps {
  message: ChatMessage;
  isSelected: boolean;
  onShowAnalysis: (messageId: string) => void;
}

export default function MessageBubble({ message, isSelected, onShowAnalysis }: MessageBubbleProps) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-indigo-600 px-4 py-2.5 text-[15px] leading-relaxed text-white">
          {message.content}
        </div>
      </div>
    );
  }

  const { analysis } = message;
  const topHit = analysis?.hits[0];

  return (
    <div className="flex justify-start">
      <div className="max-w-[92%] sm:max-w-[85%]">
        <div
          className={`whitespace-pre-wrap break-words rounded-2xl rounded-bl-md border px-4 py-3 text-[15px] leading-relaxed ${
            message.isError
              ? "border-red-200 bg-red-50 text-red-800"
              : "border-slate-200 bg-white text-slate-800 shadow-sm"
          }`}
        >
          {message.isError ? `⚠️ ${message.content}` : message.content}
        </div>

        {analysis && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-medium text-indigo-700">
              Intent: {INTENT_LABELS[analysis.intent.intent]}
            </span>
            {topHit?.usedForAnswer && (
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
                Top match: {topHit.title} · {topHit.similarity.toFixed(2)}
              </span>
            )}
            <button
              type="button"
              onClick={() => onShowAnalysis(message.id)}
              className={`h-9 rounded-full border px-3 text-xs font-medium transition-colors ${
                isSelected
                  ? "border-indigo-600 bg-indigo-600 text-white"
                  : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              View NLP analysis
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
