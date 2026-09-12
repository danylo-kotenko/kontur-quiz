import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {isCorrect, normalizeAnswer, makeRound, optionsFor, letterSlots, hintReveal, hintsLeft, hintSummary, plural} from '../dist/game.js';

const shots = process.env.QA_SHOTS || 'work';
fs.mkdirSync(shots,{recursive:true});
const countries = JSON.parse(fs.readFileSync('dist/assets/countries.json','utf8'));
assert.equal(countries.length,20);
assert.equal(new Set(countries.map(c=>c.id)).size,20);
assert(countries.every(c=>c.continent!=='Africa' && c.path.startsWith('M')));
assert.equal(normalizeAnswer('  СоединЁнное   Королевство '),'соединенное королевство');
assert(isCorrect(countries.find(c=>c.name==='Великобритания'),'  Соединенное Королевство  '));
assert(!isCorrect(countries.find(c=>c.name==='Великобритания'),'Англия'));
assert(!isCorrect(countries[0],''));
assert(!isCorrect(countries[0],'Франц'));
assert.equal(letterSlots('Новая Зеландия').length,13);
assert.equal(hintsLeft('Китай',[]),4);
assert.deepEqual(hintReveal('Китай',[],()=>0),[0]);
assert.deepEqual(hintReveal('Новая Зеландия',[],()=>0),[0]);
for(const country of countries) {
  let revealed=[];
  const total=letterSlots(country.name).length;
  for(let i=0;i<60;i++) revealed=hintReveal(country.name,revealed);
  assert.equal(revealed.length,total-1);
  assert.equal(new Set(revealed).size,total-1);
  assert.equal(hintsLeft(country.name,revealed),0);
  assert(revealed.every(index=>letterSlots(country.name).includes(index)));
}
assert.equal(hintSummary('Новая Зеландия',[]),'13 букв · 2 слова · ни одной буквы не открыто');
assert.equal(hintSummary('Китай',[0,4]),'5 букв · открыто: К, й');
assert.equal(plural(1,'буква','буквы','букв'),'буква');
assert.equal(plural(3,'буква','буквы','букв'),'буквы');
assert.equal(plural(13,'буква','буквы','букв'),'букв');

for(let i=0;i<50;i++) {
  const round=makeRound(countries,true);
  assert.equal(round.length,20); assert.equal(new Set(round.map(c=>c.id)).size,20);
  assert(round.slice(0,5).every(c=>countries.slice(0,5).includes(c)));
  for(const country of countries) {
    const options=optionsFor(country,countries);
    assert.equal(new Set(options.map(c=>c.id)).size,4);
    assert.equal(options.filter(c=>c.id===country.id).length,1);
  }
}

const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2});
const errors=[];
page.on('pageerror',error=>errors.push(error.message));
const base=process.env.QA_BASE||'http://127.0.0.1:4173';
await page.goto(base);
await page.locator('.choice').first().waitFor();
await page.screenshot({path:shots+'/mobile-game.png',fullPage:true});
assert.equal(await page.locator('input').count(),0);
assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
for(let i=0;i<20;i++) {
  const path=await page.locator('.map-shape path').getAttribute('d');
  const country=countries.find(c=>c.path===path);
  assert(country);
  assert.equal((await page.locator('.question-number').innerText()).replace(/\s/g,''),String(i+1).padStart(2,'0')+'/20');
  if(i<5) {
    assert.equal(await page.locator('.choice').count(),4);
    await page.getByRole('button',{name:new RegExp(country.name+'$')}).click();
  } else {
    assert.equal(await page.locator('.choice').count(),0);
    assert.equal(await page.locator('input').count(),1);
    assert(await page.getByRole('button',{name:'Проверить ответ'}).isDisabled());
    if(i===5) await page.screenshot({path:shots+'/mobile-text.png',fullPage:true});
    if(i===6) {
      const letters=letterSlots(country.name).length;
      const hint=page.locator('.hint-button');
      assert.equal(await page.locator('.hint-panel').isHidden(),true);
      assert.match(await hint.innerText(),/Подсказка/);
      await hint.click();
      assert.equal(await page.locator('.hint-panel').isHidden(),false);
      assert.equal(await page.locator('.hint-slot').count(),letters);
      assert.equal(await page.locator('.hint-slot.filled').count(),0);
      assert.match(await page.locator('.hint-count').innerText(),new RegExp('^'+letters+' букв'));
      await hint.click();
      assert.equal(await page.locator('.hint-slot.filled').count(),1);
      assert.match(await hint.innerText(),/Открыть ещё букву/);
      await page.screenshot({path:shots+'/mobile-hint.png',fullPage:true});
      for(let guard=0;guard<40&&!(await hint.isDisabled());guard++) await hint.click();
      assert.equal(await hint.isDisabled(),true);
      assert.match(await hint.innerText(),/Больше подсказок нет/);
      assert.equal(await page.locator('.hint-slot.filled').count(),letters-1);
      const opened=(await page.locator('.hint-slot.filled').allInnerTexts()).join('');
      assert.equal(opened.length,letters-1);
      assert(country.name.includes(opened[0]));
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    }
    await page.getByRole('textbox').fill('  '+country.name.toUpperCase()+'  ');
    await page.getByRole('textbox').press('Enter');
    if(i===6) assert.equal(await page.locator('.hint-area').count(),0);
  }
  assert.match(await page.locator('.feedback').innerText(),/Верно!/);
  assert.equal(await page.locator('.score strong').innerText(),String(i+1));
  await page.locator('.feedback-area .primary').click();
}
assert.match(await page.locator('.result-total').innerText(),/20 \/ 20/);
await page.locator('summary').click();
assert.equal(await page.locator('.review-item').count(),20);
await page.screenshot({path:shots+'/mobile-results.png',fullPage:true});
await page.getByRole('button',{name:'Сыграть ещё раз'}).click();
assert.equal(await page.locator('.score strong').innerText(),'0');
for(let i=0;i<20;i++) {
  if(i<5){
    const path=await page.locator('.map-shape path').getAttribute('d');
    const country=countries.find(c=>c.path===path);
    const buttons=await page.locator('.choice').all();
    for(const button of buttons) {if(!(await button.innerText()).includes(country.name)){await button.click();break;}}
    assert.equal(await page.locator('.correct-answer').count(),1);
    assert.equal(await page.locator('.selected-wrong').count(),1);
  } else if(i===5) {
    await page.getByRole('textbox').fill('<img src=x onerror=alert(1)>');
    await page.getByRole('textbox').press('Enter');
  } else {await page.getByRole('button',{name:'Не знаю — показать ответ'}).click();}
  assert.equal(await page.locator('.score strong').innerText(),'0');
  await page.locator('.feedback-area .primary').click();
}
assert.match(await page.locator('.result-total').innerText(),/0 \/ 20/);
await page.locator('summary').click();
assert.equal(await page.locator('.review-list img').count(),0);
assert.match(await page.locator('.review-list').innerText(),/<img src=x onerror=alert\(1\)>/);

await page.setViewportSize({width:1280,height:900});
await page.reload();
await page.locator('.choice').first().waitFor();
await page.screenshot({path:shots+'/desktop-game.png',fullPage:true});
await page.setViewportSize({width:320,height:740});
assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
await page.evaluate(()=>document.documentElement.style.fontSize='200%');
assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
await page.route('**/assets/countries.json',route=>route.abort());
await page.reload();
await page.getByRole('button',{name:'Попробовать снова'}).waitFor();
await page.unroute('**/assets/countries.json');
await page.getByRole('button',{name:'Попробовать снова'}).click();
await page.locator('.choice').first().waitFor();
assert.deepEqual(errors,[]);
await browser.close();
console.log('PASS: 20 questions; 5 choices + 15 text; hints (length then random letters, last one kept secret); 20/20 and 0/20; aliases; replay; escaping; offline retry; phone/desktop layout; no browser errors.');
