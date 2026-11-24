import type { AiText, Language } from '../schemas/facts';

/** An AI or rules reply, with the language it was asked for. */
export interface Reply extends AiText {
  readonly language: Language;
}

/** Built-in replies are always English, whatever language was asked for. */
export function replyLang(reply: Reply): Language {
  return reply.source === 'rules' ? 'en' : reply.language;
}

/** Badge saying whether Gemini wrote the text or the built-in rules did. */
export function SourceBadge({ source }: { readonly source: AiText['source'] }) {
  return (
    <span className="tag tag-accent">
      {source === 'gemini' ? 'Worded by Gemini · numbers checked' : 'Built-in explanation'}
    </span>
  );
}

/** The reply text, tagged with its language so screen readers pronounce Hindi and Marathi. */
export function ReplyText({ reply }: { readonly reply: Reply }) {
  return (
    <p className="prose" lang={replyLang(reply)}>
      {reply.text}
    </p>
  );
}

/** What leaves the device when an AI button is pressed. */
export function AiPrivacyNote() {
  return (
    <p className="note">
      This sends first names, routine labels, your area&apos;s name and the air numbers (never your
      exact location) to Google Gemini to word the reply. If Gemini is unavailable, a built-in
      explanation is shown instead.
    </p>
  );
}
