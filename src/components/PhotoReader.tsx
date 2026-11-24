import { useState, type ChangeEvent } from 'react';
import { readPhoto } from '../api';
import { shrinkImage } from './shrinkImage';

interface Props {
  readonly onReading: (pm25: number) => void;
}

type State =
  | { kind: 'idle' }
  | { kind: 'busy' }
  | { kind: 'found'; value: number }
  | { kind: 'error'; message: string };

/** Snap a monitor or purifier display; Gemini reads it, you confirm, or type it yourself. */
export function PhotoReader({ onReading }: Props) {
  const [state, setState] = useState<State>({ kind: 'idle' });
  const [typed, setTyped] = useState('');

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file === undefined) return;
    setState({ kind: 'busy' });
    try {
      const { base64, mimeType } = await shrinkImage(file);
      const reading = await readPhoto(base64, mimeType);
      setState(
        reading.pm25 === null
          ? { kind: 'error', message: 'No PM2.5 number was clear in that photo. Type it below.' }
          : { kind: 'found', value: reading.pm25 },
      );
    } catch (error) {
      setState({ kind: 'error', message: (error as Error).message });
    }
  };

  const confirmTyped = () => {
    const value = Number(typed);
    if (Number.isFinite(value) && value >= 0 && value <= 2000) onReading(Math.round(value));
  };

  return (
    <section className="card stack" aria-labelledby="photo-h">
      <h3 id="photo-h">Have an air monitor or purifier with a display?</h3>
      <p className="muted">
        Take a photo of its PM2.5 number. Gemini reads it; you confirm it. The photo is not stored.
      </p>
      <div className="field">
        <label htmlFor="photo">Photo of the display</label>
        <input
          id="photo"
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(e) => void onFile(e)}
        />
      </div>
      <div aria-live="polite">
        {state.kind === 'busy' && <p className="muted">Reading the display…</p>}
        {state.kind === 'error' && <p className="alert">{state.message}</p>}
        {state.kind === 'found' && (
          <div className="actions">
            <p>
              It reads <strong>{state.value} µg/m³</strong>. Is that right?
            </p>
            <button
              type="button"
              className="btn btn-primary btn-small"
              onClick={() => {
                onReading(state.value);
                setState({ kind: 'idle' });
              }}
            >
              Yes, use it
            </button>
          </div>
        )}
      </div>
      <div className="row">
        <div className="field">
          <label htmlFor="typed-pm">Or type the indoor PM2.5 (µg/m³)</label>
          <input
            id="typed-pm"
            type="number"
            min={0}
            max={2000}
            value={typed}
            onChange={(e) => {
              setTyped(e.target.value);
            }}
          />
        </div>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={confirmTyped}
          disabled={typed === ''}
        >
          Compare with outdoors
        </button>
      </div>
    </section>
  );
}
