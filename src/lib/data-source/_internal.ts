/**
 * Simulates network latency for mock reads so loading states (skeletons,
 * spinners) built against this data behave the same once Phase 9 swaps in
 * real Payload calls.
 */
export function withDelay<T>(value: T, ms = 200): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}
