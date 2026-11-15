import { createElement, isValidElement, type ReactNode } from 'react';
import type { LucideIcon, LucideProps } from 'lucide-react';

// Serializes a lucide icon to an SVG string for non-React consumers (e.g. Leaflet divIcons)
// without pulling react-dom/server (~70 KB) into the client bundle. Lucide icons are
// forwardRef wrappers around plain <svg>/<path> elements, so a tiny walker is enough.

const KEEP_CAMEL = new Set(['viewBox']);
const SKIP_PROPS = new Set(['children', 'key', 'ref']);

const escapeAttr = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

const attrName = (prop: string) => {
  if (prop === 'className') return 'class';
  if (KEEP_CAMEL.has(prop)) return prop;
  return prop.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
};

function serialize(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === 'boolean') return '';
  if (Array.isArray(node)) return node.map(serialize).join('');
  if (typeof node === 'string' || typeof node === 'number') return escapeAttr(String(node));
  if (!isValidElement(node)) return '';

  const { type } = node;
  const props = node.props as Record<string, unknown>;

  if (typeof type === 'string') {
    const attrs = Object.entries(props)
      .filter(([k, v]) => !SKIP_PROPS.has(k) && v !== undefined && v !== null && v !== false && v !== '')
      .map(([k, v]) => ` ${attrName(k)}="${escapeAttr(String(v))}"`)
      .join('');
    return `<${type}${attrs}>${serialize(props.children as ReactNode)}</${type}>`;
  }

  // forwardRef components (lucide icons) expose their render function as `.render`
  const render =
    typeof type === 'function'
      ? (type as (p: unknown) => ReactNode)
      : (type as { render?: (p: unknown, ref: null) => ReactNode }).render;
  return render ? serialize(render(props, null)) : '';
}

const cache = new Map<string, string>();

export function iconToSvgMarkup(Icon: LucideIcon, props: LucideProps = {}): string {
  const key = `${Icon.displayName}|${JSON.stringify(props)}`;
  let markup = cache.get(key);
  if (markup === undefined) {
    markup = serialize(createElement(Icon, props));
    cache.set(key, markup);
  }
  return markup;
}
