# Публикация

Игра лежит в `dist/` и обслуживается как статика.

## GitHub Pages (боевой адрес)

- Живой адрес: <https://danylo-kotenko.github.io/kontur-quiz/>
- Репозиторий: <https://github.com/danylo-kotenko/kontur-quiz> (ветка `main` — исходники, ветка `gh-pages` — то, что раздаётся)

Выкатить изменения:

```bash
git add -A && git commit -m "..." && git push
git subtree push --prefix=dist origin gh-pages
```

Pages пересобирается за 1–2 минуты. Проверить состояние:

```bash
gh api repos/danylo-kotenko/kontur-quiz/pages
```

Пути к ассетам относительные, поэтому сборка одинаково работает и в корне домена, и на подпути `/kontur-quiz/`.

## Telegram

Бот [@geogamebot_bot](https://t.me/geogamebot_bot) (id 8911777859). Кнопка меню «Играть» ведёт на адрес Pages.

Перепривязать кнопку и описания:

```bash
printf '{"token":"<TOKEN>","url":"https://danylo-kotenko.github.io/kontur-quiz/","metadata":true}' | python3 work/configure_telegram.py
```

Токен бота не хранится в репозитории — брать его у @BotFather.

## Проверка

Локальный прогон всего сценария (20 вопросов, подсказки, повтор игры, офлайн, вёрстка телефона и десктопа):

```bash
python3 -m http.server 4173 --bind 127.0.0.1 --directory dist & node work/qa/check.mjs
```
