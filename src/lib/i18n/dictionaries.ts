import { cache } from 'react';

import { defaultLocale, type Locale } from './config';

/**
 * The Uzbek file is the reference shape. `typeof import(...)` is a type-only construct,
 * so declaring these costs nothing at runtime — no JSON is bundled by this block.
 *
 * Under `resolveJsonModule` the module type *is* the JSON object, so there is no
 * `['default']` to index into here — unlike the value position in `loaders` below,
 * where the dynamic import does hand back a namespace with a `default`.
 */
export type Dictionary = typeof import('@/content/dictionaries/uz.json');
type RuDictionary = typeof import('@/content/dictionaries/ru.json');
type EnDictionary = typeof import('@/content/dictionaries/en.json');

/**
 * Compile-time parity guard. If a translator adds a key to `uz.json` and forgets
 * `ru.json`, `npm run typecheck` fails here instead of the site rendering `undefined`
 * to a visitor. Purely type-level — erased from the output entirely.
 */
type Expect<T extends true> = T;
type Matches<A, B> = A extends B ? true : false;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type _RuIsComplete = Expect<Matches<RuDictionary, Dictionary>>;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type _EnIsComplete = Expect<Matches<EnDictionary, Dictionary>>;

/**
 * Dynamic imports keep each locale in its own chunk, so a visitor reading the site in
 * Uzbek never downloads the Russian or English copy.
 */
const loaders: Record<Locale, () => Promise<Dictionary>> = {
  uz: () => import('@/content/dictionaries/uz.json').then((m) => m.default),
  ru: () => import('@/content/dictionaries/ru.json').then((m) => m.default),
  en: () => import('@/content/dictionaries/en.json').then((m) => m.default),
};

/**
 * Load the dictionary for a locale. Memoised per request by `React.cache`, so a page
 * whose layout, header and five sections all need copy still performs one load.
 */
export const getDictionary = cache(async (locale: Locale): Promise<Dictionary> => {
  const load = loaders[locale] ?? loaders[defaultLocale];
  return load();
});
