import type { Element, ElementCategory } from '../types';

export function resolveElementCategory(
  element: Element,
  categoryOverrides: Record<string, ElementCategory>
): ElementCategory {
  return categoryOverrides[element.id] ?? element.category;
}

export function parseElementCategories(rawCategory: string): string[] {
  return rawCategory
    .split(',')
    .map((value) => value.trim())
    .filter((value, index, arr) => value.length > 0 && arr.indexOf(value) === index);
}

export function resolveElementCategories(
  element: Element,
  categoryOverrides: Record<string, ElementCategory>
): string[] {
  const resolved = resolveElementCategory(element, categoryOverrides);
  const parsed = parseElementCategories(resolved);
  return parsed.length > 0 ? parsed : [element.category];
}

export function hasElementCategory(
  element: Element,
  category: string,
  categoryOverrides: Record<string, ElementCategory>
): boolean {
  return resolveElementCategories(element, categoryOverrides).includes(category);
}
