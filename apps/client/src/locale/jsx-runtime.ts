/** Localize at React's display boundary, keeping gameplay and network identifiers intact. */
import { jsx as reactJsx, jsxs as reactJsxs, Fragment } from 'react/jsx-runtime';
import { text } from './index';
export { Fragment };

type Props = Record<string, unknown>;
function display(value: unknown): unknown {
  if (typeof value === 'string') return text(value);
  if (Array.isArray(value)) return value.map(display);
  return value;
}

export function localizeProps(type: unknown, input: unknown): Props {
  const props = { ...(input as Props) };
  if (type === Fragment) { props.children = display(props.children); return props; }
  if (typeof type !== 'string') return props;
  // User-controlled text must remain verbatim, even when it happens to be an English label.
  const raw = props.translate === 'no' || /(?:__code|code-value|friend-code)/.test(String(props.className ?? ''));
  if (!raw && type !== 'input' && type !== 'textarea') props.children = display(props.children);
  for (const attr of ['aria-label', 'title', 'placeholder', 'alt']) {
    if (typeof props[attr] === 'string') props[attr] = text(props[attr] as string);
  }
  if (type === 'img' && typeof props.src === 'string') {
    const path = props.src.split('?')[0]!;
    const asset = path.match(/(?:^|\/)((?:ui|hud|tutorial|arenas)\/[^/]+)\.webp$/)?.[1];
    if (asset && localizedArt.has(asset)) props.src = `${import.meta.env.BASE_URL}locale/fa/${asset}.svg`;
  }
  return props;
}

import { localizedArt } from './art';
export const jsx: typeof reactJsx = (type, props, key) => reactJsx(type, localizeProps(type, props), key);
export const jsxs: typeof reactJsxs = (type, props, key) => reactJsxs(type, localizeProps(type, props), key);
