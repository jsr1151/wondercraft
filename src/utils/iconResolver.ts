import type { Element } from '../types';

export function isImageIcon(value: string | null | undefined): boolean {
  if (!value) return false;
  return value.startsWith('data:image/') || value.startsWith('http://') || value.startsWith('https://');
}

export function resolveElementIconRaw(element: Element | null | undefined, iconOverrides: Record<string, string>): string {
  if (!element) return '•';
  const override = iconOverrides[element.id];
  if (override && override.trim()) return override;
  return element.emoji ?? '•';
}

export function resolveElementIcon(element: Element | null | undefined, iconOverrides: Record<string, string>): string {
  const raw = resolveElementIconRaw(element, iconOverrides);
  return isImageIcon(raw) ? '🖼️' : raw;
}
