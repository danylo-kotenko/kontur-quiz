export const TOTAL = 20;
export const CHOICE_COUNT = 5;

export function normalizeAnswer(value) {
  return String(value).normalize('NFKC').toLocaleLowerCase('ru-RU').replace(/ё/g, 'е').replace(/[‐‑–—-]/g, ' ').replace(/[^а-яa-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
}

export function isCorrect(country, value) {
  const normalized = normalizeAnswer(value);
  return normalized.length > 0 && [country.name, ...country.aliases].some(alias => normalizeAnswer(alias) === normalized);
}

export function shuffle(items, random = Math.random) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function makeRound(countries, replay = false) {
  if (countries.length !== TOTAL || new Set(countries.map(c => c.id)).size !== TOTAL || countries.some(c => c.continent === 'Africa')) throw new Error('Некорректный набор стран');
  const first = countries.slice(0, CHOICE_COUNT);
  return [...(replay ? shuffle(first) : first), ...shuffle(countries.slice(CHOICE_COUNT))];
}

export function optionsFor(country, countries) {
  const others = shuffle(countries.filter(c => c.id !== country.id)).slice(0, 3);
  return shuffle([country, ...others]);
}
