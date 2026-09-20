import ScoreBar from "@/components/ScoreBar";
import SearchResult from "@/components/SearchResult";
import { INTENT_LABELS, type AnalysisResult } from "@/lib/types";

interface CardProps {
  step: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

function Card({ step, title, subtitle, children }: CardProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-start gap-3">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">
          {step}
        </span>
        <div>
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

export default function AnalysisPanel({ analysis }: { analysis: AnalysisResult | null }) {
  if (!analysis) {
    return (
      <div className="p-4 lg:p-0">
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center">
          <h3 className="text-sm font-semibold text-slate-900">NLP analysis</h3>
          <p className="mt-2 text-sm text-slate-500">
            Send a message to see the detected intent, extracted entities and the semantic-search results behind the answer.
          </p>
        </div>
      </div>
    );
  }

  const { intent, entities, hits, responseMode, minSimilarity } = analysis;

  return (
    <div className="space-y-4 p-4 lg:p-0">
      <Card step="1" title="Intent classification" subtitle="Embedding similarity to labelled example sentences">
        <p className="text-lg font-semibold text-indigo-700">{INTENT_LABELS[intent.intent]}</p>
        <p className="text-xs text-slate-500">
          {intent.intent} · score {intent.score.toFixed(2)}
          {intent.runnerUp
            ? ` · runner-up: ${INTENT_LABELS[intent.runnerUp.intent]} (${intent.runnerUp.score.toFixed(2)})`
            : ""}
        </p>
        <ul className="mt-3 space-y-2">
          {intent.ranking.map((entry) => (
            <li key={entry.intent}>
              <div className="mb-1 flex justify-between text-xs text-slate-600">
                <span>{INTENT_LABELS[entry.intent]}</span>
                <span className="tabular-nums">{entry.score.toFixed(2)}</span>
              </div>
              <ScoreBar value={entry.score} tone={entry.intent === intent.intent ? "indigo" : "slate"} />
            </li>
          ))}
        </ul>
      </Card>

      <Card step="2" title="Entity extraction" subtitle="Regular expressions and small dictionaries">
        {entities.length === 0 ? (
          <p className="text-sm text-slate-500">No specific details (order ID, product, dates ...) found in this message.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {entities.map((entity, position) => (
              <li key={`${entity.label}-${entity.value}-${position}`} className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs">
                <span className="text-slate-500">{entity.label}: </span>
                <span className="font-semibold text-slate-900">{entity.value}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card
        step="3"
        title="Semantic search results"
        subtitle={`Query and documents are embedded, then ranked by cosine similarity. Threshold: ${minSimilarity.toFixed(2)}`}
      >
        <div className="space-y-3">
          {hits.map((hit) => (
            <SearchResult key={hit.id} hit={hit} />
          ))}
        </div>
      </Card>

      <Card step="4" title="Response generation">
        {responseMode === "rag" ? (
          <p className="text-sm text-slate-700">
            The documents marked <span className="font-medium">Used for answer</span> were passed to the LLM as context (retrieval-augmented generation). The model is instructed to answer only from them and not to claim access to live order data.
          </p>
        ) : (
          <p className="text-sm text-slate-700">
            No document reached the similarity threshold, so the LLM was not called and a safe fallback message was returned instead of guessing.
          </p>
        )}
      </Card>
    </div>
  );
}
