import type { Element } from '../types';
import { isImageIcon, resolveElementIconRaw } from '../utils/iconResolver';

interface ElementIconProps {
  element: Element | null | undefined;
  iconOverrides: Record<string, string>;
  className?: string;
  imageClassName?: string;
  altSuffix?: string;
}

export function ElementIcon({
  element,
  iconOverrides,
  className,
  imageClassName,
  altSuffix = 'icon',
}: ElementIconProps) {
  const icon = resolveElementIconRaw(element, iconOverrides);

  if (isImageIcon(icon)) {
    const alt = element ? `${element.name} ${altSuffix}` : altSuffix;
    return <img className={imageClassName ?? className} src={icon} alt={alt} />;
  }

  return <span className={className}>{icon}</span>;
}
