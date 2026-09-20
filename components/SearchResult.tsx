import ScoreBar from "@/components/ScoreBar";
import { INTENT_LABELS, type SearchHit } from "@/lib/types";

export default function SearchResult({ hit }: { hit: SearchHit }) {
  const overlapPercent = Math.round(hit.keywordOverlap * 100);

  let insight: string | null = null;
  if (hit.rank === 1 && hit.usedForAnswer) {
    insight =
      hit.keywordOverlap < 0.5
        ? `Ranked first by meaning: only ${overlapPercent}% of the query's key words literally appear in this document.`
        : `Ranked first: ${overlapPercent}% of the query's key words also appear literally in this document.`;
  }

  return (
    <article
      className={`rounded-xl border p-3 ${
        hit.usedForAnswer ? "border-indigo-200 bg-indigo-50/50" : "border-slate-200 bg-slate-50"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-500">
            #{hit.rank} · {INTENT_LABELS[hit.category]}
          </p>
          <h4 className="text-sm font-semibold text-slate-900">{hit.title}</h4>
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
            hit.usedForAnswer ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"
          }`}
        >
          {hit.usedForAnswer ? "Used for answer" : "Below threshold"}
        </span>
      </div>

      <div className="mt-3 space-y-2">
        <div>
          <div className="mb-1 flex justify-between text-xs text-slate-600">
            <span>Semantic similarity (cosine)</span>
            <span className="font-semibold tabular-nums text-slate-900">{hit.similarity.toFixed(2)}</span>
          </div>
          <ScoreBar value={hit.similarity} tone="indigo" />
        </div>
        <div>
          <div className="mb-1 flex justify-between text-xs text-slate-600">
            <span>Keyword overlap</span>
            <span className="font-semibold tabular-nums text-slate-900">{overlapPercent}%</span>
          </div>
          <ScoreBar value={hit.keywordOverlap} tone="slate" />
        </div>
      </div>

      {insight && <p className="mt-3 text-xs font-medium text-indigo-700">{insight}</p>}

      <p className={`mt-3 text-sm leading-relaxed text-slate-700 ${hit.rank === 1 ? "" : "line-clamp-3"}`}>
        {hit.content}
      </p>

      {hit.keywords.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {hit.keywords.map((keyword) => (
            <span key={keyword} className="rounded-md bg-white px-1.5 py-0.5 text-[11px] text-slate-500 ring-1 ring-slate-200">
              {keyword}
            </span>
          ))}
        </div>
      )}
    </article>
  );
}
