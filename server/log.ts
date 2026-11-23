/** Severity names understood by Google Cloud Logging and most log viewers. */
export type Severity = 'info' | 'warn' | 'error';

/** One structured JSON log line on stdout/stderr. Never pass secrets or user text. */
export function log(
  severity: Severity,
  message: string,
  fields: Record<string, unknown> = {},
): void {
  const line = JSON.stringify({ severity: severity.toUpperCase(), message, ...fields });
  if (severity === 'error') console.error(line);
  else process.stdout.write(`${line}\n`);
}
