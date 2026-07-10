// Shared scanner for "forbidden term" boundary tests. Plain substring matching
// produces false positives in two cases: (1) a forbidden token is itself a
// substring of an unrelated common word (e.g. "eval" inside "evaluate"), and
// (2) a forbidden token only appears as a literal inside a denylist array
// that a defensive guard uses to reject that very term (the guard is the
// control, not a violation). Strip quoted string literals before matching,
// and require the term to stand alone (not glued to other letters).
export const containsForbiddenTerm = (body: string, term: string): boolean => {
  const withoutStringLiterals = body.replace(/'[^']*'|"[^"]*"|`[^`]*`/g, ' ');
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?<![a-z])${escaped}(?![a-z])`).test(withoutStringLiterals);
};
