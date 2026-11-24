// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AskView } from '../../src/components/AskView';
import { ExplainPanel, SourceBadge } from '../../src/components/ExplainPanel';
import { bodyOf, json, planFacts, stubFetch } from '../fixtures/ui';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('SourceBadge', () => {
  it('names the source', () => {
    const { rerender } = render(<SourceBadge source="gemini" />);
    expect(screen.getByText('Worded by Gemini · numbers checked')).toBeInTheDocument();
    rerender(<SourceBadge source="rules" />);
    expect(screen.getByText('Built-in explanation')).toBeInTheDocument();
  });
});

describe('ExplainPanel', () => {
  it('explains in the chosen language', async () => {
    const fake = stubFetch({
      'api/ai/explain': () => json({ text: 'Namaste plan', source: 'gemini' }),
    });
    render(<ExplainPanel facts={planFacts()} />);
    await userEvent.selectOptions(screen.getByLabelText('Language'), 'mr');
    await userEvent.click(screen.getByRole('button', { name: 'Explain' }));
    expect(await screen.findByText('Namaste plan')).toBeInTheDocument();
    expect(screen.getByText('Worded by Gemini · numbers checked')).toBeInTheDocument();
    expect(bodyOf(fake, 'api/ai/explain')).toMatchObject({ language: 'mr' });
  });

  it('shows "Writing…" while busy', async () => {
    let finish: () => void = () => undefined;
    stubFetch({
      'api/ai/explain': () =>
        new Promise<Response>((resolve) => {
          finish = () => {
            resolve(json({ text: 'done', source: 'gemini' }));
          };
        }),
    });
    render(<ExplainPanel facts={planFacts()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Explain' }));
    expect(screen.getByRole('button', { name: 'Writing…' })).toBeDisabled();
    finish();
    expect(await screen.findByText('done')).toBeInTheDocument();
  });

  it('falls back to the built-in explanation', async () => {
    stubFetch({});
    render(<ExplainPanel facts={planFacts()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Explain' }));
    expect(await screen.findByText(/Air in Chembur, Mumbai: AQI 162/)).toBeInTheDocument();
    expect(screen.getByText('Built-in explanation')).toBeInTheDocument();
  });
});

describe('AskView', () => {
  const question = () => screen.getByLabelText('Your question (any language)');

  it('offers a member-specific chip only when the plan has one', () => {
    const { unmount } = render(<AskView facts={planFacts()} />);
    expect(screen.getByRole('button', { name: 'What should Aai do today?' })).toBeInTheDocument();
    unmount();
    render(<AskView facts={planFacts({ items: [] })} />);
    expect(screen.queryByRole('button', { name: /What should/ })).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /\?$/ })).toHaveLength(3);
  });

  it('answers a suggestion chip', async () => {
    const fake = stubFetch({ 'api/ai/ask': () => json({ text: 'Go at 2 pm.', source: 'gemini' }) });
    render(<AskView facts={planFacts()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Do masks help?' }));
    expect(await screen.findByText('Go at 2 pm.')).toBeInTheDocument();
    expect(screen.getByText('Do masks help?', { selector: 'p' })).toBeInTheDocument();
    expect(bodyOf(fake, 'api/ai/ask')).toMatchObject({ question: 'Do masks help?' });
  });

  it('sends a typed question, clears the box and shows the busy line', async () => {
    let finish: () => void = () => undefined;
    stubFetch({
      'api/ai/ask': () =>
        new Promise<Response>((resolve) => {
          finish = () => {
            resolve(json({ text: 'Answer', source: 'gemini' }));
          };
        }),
    });
    render(<AskView facts={planFacts()} />);
    await userEvent.type(question(), '  why now?  {Enter}');
    expect(question()).toHaveValue('');
    expect(screen.getByText('Checking the numbers…')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ask' })).toBeDisabled();
    // A second submit while busy is ignored.
    fireEvent.submit(question().closest('form')!);
    finish();
    expect(await screen.findByText('Answer')).toBeInTheDocument();
    expect(screen.getByText('why now?', { selector: 'p' })).toBeInTheDocument();
  });

  it('ignores a blank submit', () => {
    const fake = stubFetch({});
    render(<AskView facts={planFacts()} />);
    expect(screen.getByRole('button', { name: 'Ask' })).toBeDisabled();
    fireEvent.submit(question().closest('form')!);
    expect(fake).not.toHaveBeenCalled();
  });

  it('falls back to the rules answer when the server fails', async () => {
    stubFetch({});
    render(<AskView facts={planFacts()} />);
    await userEvent.type(question(), 'What about Aai?');
    await userEvent.click(screen.getByRole('button', { name: 'Ask' }));
    expect(
      await screen.findByText(/Aai, Evening walk: move it from 6 pm to 2 pm/),
    ).toBeInTheDocument();
    expect(screen.getByText('Built-in explanation')).toBeInTheDocument();
  });
});
