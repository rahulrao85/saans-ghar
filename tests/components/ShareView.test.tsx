// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ShareView } from '../../src/components/ShareView';
import { bodyOf, json, stubFetch } from '../fixtures/ui';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function stubClipboard(writeText: (text: string) => Promise<void>) {
  const fake = vi.fn(writeText);
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: fake },
    configurable: true,
  });
  return fake;
}

const write = () => screen.getByRole('button', { name: 'Write the notice' });

describe('ShareView', () => {
  it('shows the rule-based call, with GRAP only for NCR', () => {
    const { rerender } = render(
      <ShareView place="Mumbai" aqi={162} delhiNcr={false} cleanestHour={14} />,
    );
    expect(screen.getByText('keep it short and gentle')).toBeInTheDocument();
    expect(screen.getByText(/AQI 162, Moderate\)/)).toBeInTheDocument();
    expect(screen.queryByText(/GRAP stages are the Delhi-NCR/)).not.toBeInTheDocument();
    rerender(<ShareView place="Delhi" aqi={480} delhiNcr cleanestHour={null} />);
    expect(screen.getByText('cancel outdoor activity')).toBeInTheDocument();
    expect(screen.getByText(/GRAP Stage \d level/)).toBeInTheDocument();
    expect(screen.getByText(/GRAP stages are the Delhi-NCR/)).toBeInTheDocument();
  });

  it('writes the notice in the chosen language, copies it and links WhatsApp', async () => {
    const fake = stubFetch({
      'api/ai/notice': () => json({ text: 'Notice & more', source: 'gemini' }),
    });
    const writeText = stubClipboard(() => Promise.resolve());
    render(<ShareView place="Mumbai" aqi={162} delhiNcr={false} cleanestHour={14} />);
    await userEvent.selectOptions(screen.getByLabelText('Language'), 'hi');
    await userEvent.click(write());
    expect(await screen.findByDisplayValue('Notice & more')).toBeInTheDocument();
    expect(bodyOf(fake, 'api/ai/notice')).toEqual({
      place: 'Mumbai',
      aqi: 162,
      delhiNcr: false,
      cleanestHour: 14,
      language: 'hi',
    });
    expect(screen.getByText('Worded by Gemini · numbers checked')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Share on WhatsApp' })).toHaveAttribute(
      'href',
      `https://wa.me/?text=${encodeURIComponent('Notice & more')}`,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Copy' }));
    expect(writeText).toHaveBeenCalledWith('Notice & more');
    expect(await screen.findByRole('button', { name: 'Copied' })).toBeInTheDocument();
    await userEvent.click(write());
    expect(await screen.findByRole('button', { name: 'Copy' })).toBeInTheDocument();
  });

  it('falls back to the rules notice when the server fails', async () => {
    stubFetch({ 'api/ai/notice': () => json({ error: 'down' }, 500) });
    render(<ShareView place="Mumbai" aqi={162} delhiNcr={false} cleanestHour={14} />);
    await userEvent.click(write());
    const box = await screen.findByRole('textbox', { name: 'Notice text' });
    expect((box as HTMLTextAreaElement).value).toContain(
      'Air quality in Mumbai: AQI 162, Moderate.',
    );
    expect(screen.getByText('Built-in explanation')).toBeInTheDocument();
  });

  it('stays on "Copy" when the clipboard rejects', async () => {
    stubFetch({});
    const writeText = stubClipboard(() => Promise.reject(new Error('denied')));
    render(<ShareView place="Mumbai" aqi={162} delhiNcr={false} cleanestHour={null} />);
    await userEvent.click(write());
    await userEvent.click(await screen.findByRole('button', { name: 'Copy' }));
    expect(writeText).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: 'Copy' })).toBeInTheDocument();
  });
});
