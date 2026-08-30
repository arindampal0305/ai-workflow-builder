const results = new Map<string, "YES" | "NO">();

export function setResult(
  eventId: string,
  decision: "YES" | "NO"
) {
  results.set(eventId, decision);
}

export function getResult(eventId: string) {
  return results.get(eventId);
}