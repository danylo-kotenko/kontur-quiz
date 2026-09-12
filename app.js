import { TOTAL, CHOICE_COUNT, makeRound, optionsFor, isCorrect, letterSlots, hintReveal, hintsLeft, hintSummary } from './game.js';

const app = document.getElementById('app');
const telegram = window.Telegram?.WebApp;
let countries = [], round = [], answers = [], index = 0, currentOptions = [], finished = false;
const svgNS = 'http://www.w3.org/2000/svg';
const letters = ['А', 'Б', 'С', 'Д'];

// Telegram is optional: the same game also works in a regular browser.
try {
  if (telegram?.initData) {
    telegram.ready();
    telegram.expand();
    telegram.setHeaderColor('#101c29');
    telegram.setBackgroundColor('#101c29');
  }
} catch { /* Older Telegram clients can still play. */ }

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function map(country, className = 'map-shape') {
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('viewBox', '0 0 360 300');
  svg.setAttribute('class', className);
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'Контур страны без подписей. Север сверху.');
  const path = document.createElementNS(svgNS, 'path');
  path.setAttribute('d', country.path);
  svg.append(path);
  return svg;
}

function haptic(correct) {
  try { if (telegram?.initData) telegram.HapticFeedback?.notificationOccurred(correct ? 'success' : 'error'); } catch { /* Optional. */ }
}

function begin(replay = false) {
  round = makeRound(countries, replay);
  answers = [];
  index = 0;
  finished = false;
  renderQuestion();
  window.scrollTo({top: 0, behavior: 'instant'});
}

// The hint field for the text questions: first press shows the length, every next one opens a random letter.
function buildHint(country) {
  const area = el('div', 'hint-area');
  const panel = el('div', 'hint-panel');
  panel.hidden = true;
  const mask = el('div', 'hint-mask');
  mask.setAttribute('aria-hidden', 'true');
  const summary = el('p', 'hint-count');
  summary.setAttribute('aria-live', 'polite');
  panel.append(mask, summary);
  const button = el('button', 'hint-button');
  button.type = 'button';
  button.append(el('span', 'hint-icon', '💡'), el('span', 'hint-label', 'Подсказка'));
  const slots = new Set(letterSlots(country.name));
  let revealed = [], used = 0;

  function paint() {
    const chars = [...country.name];
    mask.replaceChildren(...chars.map((char, i) => {
      if (!slots.has(i)) return char === ' ' ? el('span', 'hint-gap') : el('span', 'hint-punct', char);
      const open = revealed.includes(i);
      return el('span', `hint-slot${open ? ' filled' : ''}`, open ? char : '');
    }));
    summary.textContent = hintSummary(country.name, revealed);
    panel.hidden = false;
    const left = hintsLeft(country.name, revealed);
    button.querySelector('.hint-label').textContent = left > 0 ? 'Открыть ещё букву' : 'Больше подсказок нет';
    button.disabled = left === 0;
  }

  button.addEventListener('click', () => {
    used++;
    if (used > 1) revealed = hintReveal(country.name, revealed);
    paint();
  });
  area.append(panel, button);
  return area;
}

function renderQuestion() {
  const country = round[index];
  const isChoice = index < CHOICE_COUNT;
  const game = el('section', 'game');
  game.setAttribute('aria-label', `Вопрос ${index + 1} из ${TOTAL}`);
  const status = el('div', 'status');
  const number = el('div', 'question-number', String(index + 1).padStart(2, '0') + ' ');
  number.append(el('small', '', `/ ${TOTAL}`));
  const score = el('div', 'score');
  score.setAttribute('aria-live', 'polite');
  score.append(el('span', 'score-icon', '✓'), el('span', '', 'Верно'), el('strong', '', String(answers.filter(a => a.correct).length)));
  status.append(number, score);
  const progress = el('div', 'progress');
  progress.setAttribute('aria-label', `Вопрос ${index + 1} из ${TOTAL}`);
  for (let i = 0; i < TOTAL; i++) progress.append(el('span', i === index ? 'current' : answers[i] ? answers[i].correct ? 'right' : 'wrong' : ''));
  const grid = el('div', 'play-grid');
  const mapCard = el('div', 'map-card');
  const north = el('div', 'north', 'С');
  north.setAttribute('aria-hidden', 'true');
  north.append(el('span', '', '↑'));
  mapCard.append(el('span', 'map-meta', `КОНТУР № ${String(index + 1).padStart(2, '0')}`), north, map(country));
  if (country.note) mapCard.append(el('span', 'map-note', country.note));
  const panel = el('div', 'answer-panel');
  panel.append(el('span', `phase${isChoice ? '' : ' text-phase'}`, isChoice ? '01—05 · С ВАРИАНТАМИ' : '06—20 · БЕЗ ВАРИАНТОВ'));
  const heading = el('h1', '', 'Что это за страна?');
  heading.tabIndex = -1;
  panel.append(heading, el('p', 'instruction', isChoice ? 'Посмотри на контур и выбери ответ.' : 'Напиши название страны на русском.'));
  if (index === CHOICE_COUNT) panel.append(el('p', 'transition-notice', 'Разминка позади! В следующих 15 вопросах вариантов ответа не будет — но есть подсказки: первая покажет количество букв, каждая следующая откроет случайную букву.'));
  const controls = el('div', 'answer-controls');
  const feedbackArea = el('div', 'feedback-area');
  feedbackArea.setAttribute('aria-live', 'polite');
  feedbackArea.setAttribute('aria-atomic', 'true');

  function submit(value, skipped = false) {
    if (answers[index] || finished) return;
    const correct = !skipped && isCorrect(country, value);
    answers[index] = { country, value, correct, skipped };
    haptic(correct);
    controls.querySelectorAll('button,input').forEach(control => { control.disabled = true; });
    controls.querySelector('.secondary')?.remove();
    controls.querySelector('.hint-area')?.remove();
    const input = controls.querySelector('input');
    if (input) input.classList.toggle('invalid', !correct);
    controls.querySelectorAll('.choice').forEach((button, i) => {
      const option = currentOptions[i];
      if (correct && option.id === country.id) button.classList.add('selected-correct');
      else if (!correct && option.name === value) button.classList.add('selected-wrong');
    });
    score.querySelector('strong').textContent = String(answers.filter(a => a.correct).length);
    progress.children[index].className = correct ? 'right' : 'wrong';
    const feedback = el('div', `feedback${correct ? '' : ' wrong'}`);
    feedback.append(el('strong', '', correct ? '✓ Верно!' : skipped ? 'Вопрос пропущен' : 'Не угадал'), el('span', '', correct ? `Это ${country.name}.` : 'Правильный ответ ждёт тебя в конце игры.'));
    const next = el('button', 'primary', index === TOTAL - 1 ? 'Посмотреть результат →' : 'Следующая страна →');
    next.type = 'button';
    next.addEventListener('click', () => {
      if (index === TOTAL - 1) renderResults();
      else { index++; renderQuestion(); }
    });
    feedbackArea.replaceChildren(feedback, next);
    if (input) input.blur();
    next.focus({ preventScroll: true });
    next.scrollIntoView({ block: 'nearest', behavior: 'instant' });
  }

  if (isChoice) {
    currentOptions = optionsFor(country, countries);
    const choices = el('div', 'choices');
    currentOptions.forEach((option, i) => {
      const button = el('button', 'choice');
      button.type = 'button';
      button.append(el('span', 'letter', letters[i]), el('span', '', option.name));
      button.addEventListener('click', () => submit(option.name));
      choices.append(button);
    });
    controls.append(choices);
  } else {
    const form = el('form', 'answer-form');
    const label = el('label', 'text-label', 'Твой ответ');
    label.htmlFor = 'country-answer';
    const input = el('input', 'answer-input');
    Object.assign(input, { id: 'country-answer', name: 'country', type: 'text', placeholder: 'Название страны', maxLength: 100, autocomplete: 'off', spellcheck: false });
    input.setAttribute('lang', 'ru');
    input.setAttribute('enterkeyhint', 'done');
    input.setAttribute('autocapitalize', 'words');
    input.setAttribute('aria-describedby', 'input-hint');
    const hint = el('p', 'input-hint', 'Регистр и буква «ё» не имеют значения.');
    hint.id = 'input-hint';
    const check = el('button', 'primary', 'Проверить ответ');
    check.type = 'submit';
    check.disabled = true;
    input.addEventListener('input', () => { check.disabled = input.value.trim().length === 0; });
    form.addEventListener('submit', event => { event.preventDefault(); if (input.value.trim()) submit(input.value.trim()); });
    const skip = el('button', 'secondary', 'Не знаю — пропустить вопрос');
    skip.type = 'button';
    skip.addEventListener('click', () => submit('', true));
    form.append(label, input, hint, buildHint(country), check, skip);
    controls.append(form);
  }
  panel.append(controls, feedbackArea);
  grid.append(mapCard, panel);
  const stages = el('div', 'stages');
  const one = el('span'); one.append(el('i', '', '≡'), el('b', '', '5'), document.createTextNode('с вариантами'));
  const two = el('span'); two.append(el('i', '', '✎'), el('b', '', '15'), document.createTextNode('с вводом ответа'));
  stages.append(one, two);
  game.append(status, progress, grid, stages);
  app.replaceChildren(game);
  app.setAttribute('aria-busy', 'false');
  if (index > 0) { heading.focus({ preventScroll: true }); game.scrollIntoView({block: 'start', behavior: 'instant'}); }
}

function renderResults() {
  finished = true;
  const score = answers.filter(a => a.correct).length;
  const results = el('section', 'results');
  const top = el('div', 'result-top');
  top.append(el('span', 'phase', '20 ИЗ 20 · ИГРА ЗАВЕРШЕНА'));
  const total = el('div', 'result-total', String(score));
  total.append(el('span', '', ' / 20'));
  const title = score === 20 ? 'Мир у тебя в голове!' : score >= 15 ? 'Отличное чувство карты!' : score >= 10 ? 'Хорошее путешествие!' : 'Есть что открыть!';
  const heading = el('h1', '', title); heading.tabIndex = -1;
  top.append(total, heading, el('p', '', score === 20 ? 'Все страны узнаны. Ни один контур не сбил тебя с пути.' : 'Каждый знакомый контур делает мир чуть ближе.'));
  const track = el('div', 'result-track');
  const fill = el('span'); fill.style.width = `${score / TOTAL * 100}%`; track.append(fill);
  const restart = el('button', 'primary', 'Сыграть ещё раз ↻');
  restart.addEventListener('click', () => begin(true));
  top.append(track, restart);
  const review = el('details', 'review');
  review.append(el('summary', '', 'Посмотреть правильные ответы'));
  const list = el('ol', 'review-list');
  answers.forEach((answer, i) => {
    const item = el('li', 'review-item');
    const copy = el('div', 'review-copy', answer.country.name);
    copy.append(el('small', '', answer.skipped ? 'Ответ пропущен' : answer.correct ? 'Верный ответ' : `Твой ответ: ${answer.value}`));
    const icon = el('span', `review-status${answer.correct ? '' : ' wrong'}`, answer.correct ? '✓' : '×');
    icon.setAttribute('aria-label', answer.correct ? 'Верно' : 'Неверно');
    item.append(el('span', 'review-number', String(i+1).padStart(2,'0')), map(answer.country, 'review-map'), copy, icon);
    list.append(item);
  });
  review.append(list);
  results.append(top, review);
  app.replaceChildren(results);
  heading.focus({preventScroll:true});
  window.scrollTo({top:0,behavior:'instant'});
}

try {
  const response = await fetch(new URL('assets/countries.json', import.meta.url));
  if (!response.ok) throw new Error('Failed to load maps');
  countries = await response.json();
  begin();
} catch {
  const panel = el('div', 'error-panel');
  panel.append(el('h1', '', 'Не удалось загрузить контуры'), el('p', 'instruction', 'Проверь подключение к интернету и попробуй ещё раз.'));
  const retry = el('button', 'primary', 'Попробовать снова'); retry.addEventListener('click', () => location.reload());
  panel.append(retry); app.replaceChildren(panel); app.setAttribute('aria-busy', 'false');
}
