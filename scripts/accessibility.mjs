import {chromium} from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const context=await browser.newContext({viewport:{width:1440,height:1000}});
const page=await context.newPage();
const base=process.env.BASE_URL||'http://localhost:5173/RoHaC/';
const errors=[];page.on('pageerror',e=>errors.push(e.message));
async function audit(name){
 const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']).analyze();
 const violations=result.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}));
 assert.deepEqual(violations,[],`${name}: ${JSON.stringify(violations,null,2)}`);
 console.log(`PASS: ${name} automated accessibility checks (including text contrast)`);
}
try{
 await page.goto(base);await page.getByRole('heading',{name:'横浜市'}).waitFor();await page.locator('.candidate-row').first().waitFor();
 await audit('Desktop overview');
 const elected=page.locator('.elected-badge');assert.equal(await elected.innerText(),'当選');
 assert.equal(await page.locator('.seat-breakdown dl>div').count(),12);
 const row=await page.locator('#chart-election').inputValue();
 await page.locator('.chart-bar').first().focus();await page.keyboard.press('Enter');
 assert.notEqual(await page.locator('#chart-election').inputValue(),row);assert.equal(await page.locator('.chart-bar[aria-pressed="true"]').count(),1);
 await page.locator('#chart-election').selectOption(row);await page.keyboard.press('Tab');
 // The selected year has a textual marker and borders as well as its fill.
 assert.match(await page.locator('.chart-bar[aria-pressed="true"]').textContent(),/選択中/);
 assert.equal(await page.locator('.chart-legend .party-swatch pattern').count()>1,true);
 await page.getByRole('button',{name:'選挙データ一覧',exact:true}).click();
 const record=page.locator('tbody>tr').filter({hasText:'2013.08.25'});await record.locator('summary').focus();await page.keyboard.press('Enter');
 assert.equal(await record.locator('details').getAttribute('open'),'');await audit('Election list with opponents expanded');
 await page.getByRole('button',{name:'自治体を調べる',exact:true}).click();
 await page.locator('#city-search').fill('札幌');await audit('Open municipality search');await page.locator('#city-search').press('Escape');
 await page.setViewportSize({width:390,height:844});await page.locator('#city-search').fill('');await page.locator('#city-search').press('Escape');
 await audit('Mobile overview');
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 assert.ok(await page.locator('#city-search').evaluate(e=>parseFloat(getComputedStyle(e).fontSize))>=16);
 await page.getByRole('button',{name:'メニューを開く'}).click();await page.getByRole('button',{name:'選挙データ一覧',exact:true}).click();
 const mobileRecord=page.locator('tbody>tr').filter({hasText:'2013.08.25'});await mobileRecord.locator('summary').click();await audit('Mobile election cards');
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 // A 320 CSS-pixel viewport checks reflow, equivalent to 400% zoom at 1280px.
 await page.setViewportSize({width:320,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await page.getByRole('button',{name:'メニューを開く'}).click();await page.getByRole('button',{name:'自治体を調べる',exact:true}).click();
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 // Enlarge text independently of viewport size to expose clipped controls.
 await page.evaluate(()=>document.documentElement.style.fontSize='24px');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await page.evaluate(()=>document.documentElement.style.fontSize='');
 await page.setViewportSize({width:1440,height:1000});await page.emulateMedia({reducedMotion:'reduce',contrast:'more'});await audit('Increased contrast and reduced motion');
 await page.emulateMedia({contrast:'no-preference'});
 const cdp=await context.newCDPSession(page);
 for(const type of ['protanopia','deuteranopia','tritanopia','achromatopsia']){
  await cdp.send('Emulation.setEmulatedVisionDeficiency',{type});
  await page.screenshot({path:`/workspace/artifacts/rohac-${type}.png`,fullPage:true});
 }
 await cdp.send('Emulation.setEmulatedVisionDeficiency',{type:'none'});
 await page.getByRole('button',{name:'データの読み方',exact:true}).click();await audit('Data and accessibility guidance');
 assert.deepEqual(errors,[]);console.log('PASS: keyboard election/detail selection, named party counts, patterns, non-color selected state, mobile and 320px reflow, 150% text enlargement, visual simulation screenshots; no browser errors');
}finally{await browser.close()}
