import { useState } from 'react';
import { explain } from '../api';
import { rulesExplain } from '../engine/explain';
import type { AiText, Language, PlanFacts } from '../schemas/facts';
import { LanguageSelect } from './LanguageSelect';

/** Badge saying whether Gemini wrote the text or the built-in rules did. */
export function SourceBadge({ source }: { readonly source: AiText['source'] }) {
  return (
    <span className="tag tag-accent">
      {source === 'gemini' ? 'Worded by Gemini · numbers checked' : 'Built-in explanation'}
    </span>
  );
}

/** "Explain my plan" in English, Hindi or Marathi; falls back to the rules text offline. */
export function ExplainPanel({ facts }: { readonly facts: PlanFacts }) {
  const [language, setLanguage] = useState<Language>('en');
  const [result, setResult] = useState<AiText | null>(null);
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    try {
      setResult(await explain(facts, language));
    } catch {
      setResult({ text: rulesExplain(facts), source: 'rules' });
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="card stack" aria-labelledby="explain-h">
      <h3 id="explain-h">Explain the plan to the family</h3>
      <div className="row">
        <LanguageSelect id="explain-lang" value={language} onChange={setLanguage} />
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => void run()}
          disabled={busy}
        >
          {busy ? 'Writing…' : 'Explain'}
        </button>
      </div>
      <div aria-live="polite">
        {result !== null && (
          <div className="inset stack">
            <SourceBadge source={result.source} />
            <p className="prose">{result.text}</p>
          </div>
        )}
      </div>
    </section>
  );
}
