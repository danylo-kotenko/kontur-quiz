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

const LETTER = /[\p{L}\p{N}]/u;

export function letterSlots(name) {
  const slots = [];
  [...name].forEach((char, index) => { if (LETTER.test(char)) slots.push(index); });
  return slots;
}

// The first hint only reveals the length, every next one opens one more random letter.
export function hintReveal(name, revealed, random = Math.random) {
  const hidden = letterSlots(name).filter(index => !revealed.includes(index));
  return hidden.length <= 1 ? revealed : [...revealed, hidden[Math.floor(random() * hidden.length)]];
}

// The last letter always stays hidden, otherwise hints would spell out the answer.
export function hintsLeft(name, revealed) {
  return Math.max(0, letterSlots(name).length - revealed.length - 1);
}

export function plural(count, one, few, many) {
  const tail = count % 10, rest = count % 100;
  return tail === 1 && rest !== 11 ? one : tail >= 2 && tail <= 4 && (rest < 12 || rest > 14) ? few : many;
}

export function hintSummary(name, revealed) {
  const chars = [...name], slots = letterSlots(name), words = name.trim().split(/\s+/).length;
  const opened = slots.filter(index => revealed.includes(index)).map(index => chars[index]);
  const parts = [`${slots.length} ${plural(slots.length, 'буква', 'буквы', 'букв')}`];
  if (words > 1) parts.push(`${words} ${plural(words, 'слово', 'слова', 'слов')}`);
  parts.push(opened.length ? `открыто: ${opened.join(', ')}` : 'ни одной буквы не открыто');
  return parts.join(' · ');
}
