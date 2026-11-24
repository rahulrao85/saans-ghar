// Apply the saved or system theme before first paint (a file, not inline, so the CSP stays strict).
(function () {
  var theme = null;
  try {
    theme = localStorage.getItem('theme');
  } catch {
    theme = null;
  }
  if (theme !== 'light' && theme !== 'dark') {
    theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  document.documentElement.dataset.theme = theme;
})();
