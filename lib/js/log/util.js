export function toLog(err, hint) {
  return [
    `${hint || `Exception`}: ${err?.message || '(no error message)'}`,
    err?.stack || '  No stack trace',
  ].join('\n');
}
