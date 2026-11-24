import { useState, type SyntheticEvent } from 'react';
import { ask } from '../api';
import { rulesAnswer } from '../engine/answer';
import type { AiText, PlanFacts } from '../schemas/facts';
import { SourceBadge } from './ExplainPanel';

interface Turn {
  readonly question: string;
  readonly answer: AiText;
}

/** Ask about the plan; Gemini answers by calling our own tools, the rules answer offline. */
export function AskView({ facts }: { readonly facts: PlanFacts }) {
  const [question, setQuestion] = useState('');
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);
  const first = facts.items[0]?.member;
  const suggestions = [
    'When is the best time to go out today?',
    ...(first === undefined ? [] : [`What should ${first} do today?`]),
    'Do masks help?',
    'How much does the plan save?',
  ];

  const send = async (q: string) => {
    const text = q.trim();
    if (text === '' || busy) return;
    setBusy(true);
    setQuestion('');
    let answer: AiText;
    try {
      answer = await ask(facts, text);
    } catch {
      answer = { text: rulesAnswer(text, facts), source: 'rules' };
    }
    setTurns((t) => [...t, { question: text, answer }]);
    setBusy(false);
  };
  const submit = (e: SyntheticEvent) => {
    e.preventDefault();
    void send(question);
  };

  return (
    <section className="card stack" aria-labelledby="ask-h">
      <h3 id="ask-h">Ask about your plan</h3>
      <div className="chips">
        {suggestions.map((s) => (
          <button
            key={s}
            type="button"
            className="btn btn-secondary btn-small"
            onClick={() => void send(s)}
            disabled={busy}
          >
            {s}
          </button>
        ))}
      </div>
      <div className="chat" aria-live="polite">
        {turns.map((t, i) => (
          <div key={i} className="chat">
            <p className="bubble bubble-user">{t.question}</p>
            <div className="bubble bubble-bot stack">
              <SourceBadge source={t.answer.source} />
              <p>{t.answer.text}</p>
            </div>
          </div>
        ))}
        {busy && <p className="muted">Checking the numbers…</p>}
      </div>
      <form className="row" onSubmit={submit}>
        <div className="field">
          <label htmlFor="ask-q">Your question (any language)</label>
          <input
            id="ask-q"
            type="text"
            maxLength={300}
            value={question}
            onChange={(e) => {
              setQuestion(e.target.value);
            }}
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={busy || question.trim() === ''}>
          Ask
        </button>
      </form>
      <p className="note">
        Every number in an answer comes from our calculations; replies with any other number are
        replaced by the built-in answer.
      </p>
    </section>
  );
}
