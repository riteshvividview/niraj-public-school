/**
 * Phase 1 seeds a handful of keys to prove the mechanism end to end.
 * Later phases add their own keys here as they build real screens —
 * every dictionary in src/i18n/dictionaries must implement this shape.
 */
export interface Dictionary {
  appName: string;
  language: string;
  continueLabel: string;
  welcome: string;
}
