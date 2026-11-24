import { useState } from 'react';

type Theme = 'light' | 'dark';

function currentTheme(): Theme {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

/** Brand and the light/dark switch (Aurora / Voltage). */
export function Header() {
  const [theme, setTheme] = useState<Theme>(currentTheme);
  const toggle = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem('theme', next);
    } catch {
      // Storage blocked: the choice lasts for this visit.
    }
    setTheme(next);
  };
  return (
    <header className="app-header">
      <div className="brand">
        <img className="brand-mark" src="./favicon.svg" alt="" width="40" height="40" />
        <div>
          <h1>Saans Ghar</h1>
          <p>A breathing plan for the whole family</p>
        </div>
      </div>
      <button
        type="button"
        className="theme-toggle"
        role="switch"
        aria-checked={theme === 'dark'}
        aria-label="Dark mode"
        onClick={toggle}
      />
    </header>
  );
}
