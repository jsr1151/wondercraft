export function resolveActsAsElementId(
  elementId: string,
  actsAsOverrides: Record<string, string>
): string {
  const seen = new Set<string>();
  let current = elementId;

  while (actsAsOverrides[current] && !seen.has(current)) {
    seen.add(current);
    current = actsAsOverrides[current];
  }

  return current;
}

export function equivalentRecipeInputIds(
  elementId: string,
  actsAsOverrides: Record<string, string>
): string[] {
  const resolved = resolveActsAsElementId(elementId, actsAsOverrides);
  return resolved === elementId ? [elementId] : [elementId, resolved];
}
