import type { Element } from '../types';

export function resolveElementIcon(element: Element | null | undefined, iconOverrides: Record<string, string>): string {
  if (!element) return '•';
  const override = iconOverrides[element.id];
  if (override && override.trim()) return override;
  return element.emoji ?? '•';
}
