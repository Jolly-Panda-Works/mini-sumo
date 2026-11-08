import { jsxDEV as reactJsxDEV, Fragment } from 'react/jsx-dev-runtime';
import { localizeProps } from './jsx-runtime';
export { Fragment };
export const jsxDEV: typeof reactJsxDEV = (type, props, key, staticChildren, source, self) => reactJsxDEV(type, localizeProps(type, props), key, staticChildren, source, self);
