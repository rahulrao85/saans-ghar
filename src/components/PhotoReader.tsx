import { useState, type ChangeEvent } from 'react';
import { messageOf, readPhoto } from '../api';
import { shrinkImage } from './shrinkImage';

/** Highest PM2.5 any consumer monitor shows; anything above is a typo. */
const MAX_PM25 = 2000;

interface Props {
  readonly onReading: (pm25: number) => void;
}

type State =
  | { kind: 'idle' }
  | { kind: 'busy' }
  | { kind: 'found'; value: number }
  | { kind: 'error'; message: string };

/** What the photo reading says, with a confirm button when a number was found. */
function PhotoStatus({ state, onConfirm }: { state: State; onConfirm: (value: number) => void }) {
  return (
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
              onConfirm(state.value);
            }}
          >
            Yes, use it
          </button>
        </div>
      )}
    </div>
  );
}

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
      setState({ kind: 'error', message: messageOf(error) });
    }
  };

  const confirmTyped = () => {
    const value = Number(typed);
    if (Number.isFinite(value) && value >= 0 && value <= MAX_PM25) {
      onReading(Math.round(value));
      setState({ kind: 'idle' });
    } else {
      setState({ kind: 'error', message: `Enter a PM2.5 value from 0 to ${MAX_PM25} µg/m³.` });
    }
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
      <PhotoStatus
        state={state}
        onConfirm={(value) => {
          onReading(value);
          setState({ kind: 'idle' });
        }}
      />
      <div className="row">
        <div className="field">
          <label htmlFor="typed-pm">Or type the indoor PM2.5 (µg/m³)</label>
          <input
            id="typed-pm"
            type="number"
            min={0}
            max={MAX_PM25}
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
