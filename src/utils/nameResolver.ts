import type { Element } from '../types';

export function resolveElementName(element: Element | null | undefined, nameOverrides: Record<string, string>): string {
  if (!element) return 'Unknown';
  const override = nameOverrides[element.id]?.trim();
  return override || element.name;
}

export function resolveElementDescription(
  element: Element | null | undefined,
  descriptionOverrides: Record<string, string>
): string {
  if (!element) return '';
  const override = descriptionOverrides[element.id]?.trim();
  return override || element.description;
}

export function findElementByNameOrId(
  value: string,
  elements: Element[],
  nameOverrides: Record<string, string>
): Element | undefined {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return undefined;

  return elements.find((element) => {
    const displayName = resolveElementName(element, nameOverrides).toLowerCase();
    return element.id.toLowerCase() === normalized || element.name.toLowerCase() === normalized || displayName === normalized;
  });
}
