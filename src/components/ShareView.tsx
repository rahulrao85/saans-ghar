import { useState } from 'react';
import { notice } from '../api';
import { fallbackNotice, noticeFacts, type OutdoorCall } from '../engine/notice';
import type { Language } from '../schemas/facts';
import { AiPrivacyNote, SourceBadge, replyLang, type Reply } from './AiReply';
import { LanguageSelect } from './LanguageSelect';

const CALL_LABEL: Readonly<Record<OutdoorCall, string>> = {
  normal: 'go ahead as usual',
  reduce: 'keep it short and gentle',
  'move-indoors': 'move it indoors',
  cancel: 'cancel outdoor activity',
};

interface Props {
  readonly place: string;
  readonly aqi: number;
  readonly delhiNcr: boolean;
  readonly cleanestHour: number | null;
}

/** A notice for the society or school WhatsApp group; code makes the call, Gemini words it. */
export function ShareView({ place, aqi, delhiNcr, cleanestHour }: Props) {
  const [language, setLanguage] = useState<Language>('en');
  const [result, setResult] = useState<Reply | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const facts = noticeFacts(place, aqi, delhiNcr, cleanestHour);

  const write = async () => {
    setBusy(true);
    setCopied(false);
    try {
      setResult({ ...(await notice({ place, aqi, delhiNcr, cleanestHour, language })), language });
    } catch {
      setResult({ text: fallbackNotice(facts), source: 'rules', language });
    } finally {
      setBusy(false);
    }
  };
  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text).then(
      () => {
        setCopied(true);
      },
      () => {
        setCopied(false);
      },
    );
  };

  return (
    <section className="card stack" aria-labelledby="share-h">
      <h3 id="share-h">Notice for your society or school group</h3>
      <p className="muted">
        Today&apos;s call for outdoor play: <strong>{CALL_LABEL[facts.call]}</strong> (AQI {aqi},{' '}
        {facts.category}
        {facts.grapStage ? `, GRAP Stage ${facts.grapStage} level` : ''}). The rule decides; the AI
        only writes it nicely.
      </p>
      <div className="row">
        <LanguageSelect id="notice-lang" value={language} onChange={setLanguage} />
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => void write()}
          disabled={busy}
        >
          {busy ? 'Writing…' : 'Write the notice'}
        </button>
      </div>
      <div aria-live="polite">
        {result !== null && (
          <div className="stack">
            <SourceBadge source={result.source} />
            <label htmlFor="notice-text" className="sr-only">
              Notice text
            </label>
            <textarea id="notice-text" readOnly value={result.text} lang={replyLang(result)} />
            <div className="actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => void copy(result.text)}
              >
                {copied ? 'Copied' : 'Copy'}
              </button>
              <a
                className="btn btn-accent"
                href={`https://wa.me/?text=${encodeURIComponent(result.text)}`}
                target="_blank"
                rel="noreferrer"
              >
                Share on WhatsApp
              </a>
            </div>
          </div>
        )}
      </div>
      {delhiNcr && (
        <p className="note">
          GRAP stages are the Delhi-NCR action plan; the stage shown is the level this AQI matches,
          not an official order.
        </p>
      )}
      <AiPrivacyNote />
    </section>
  );
}
