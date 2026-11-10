import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1440,height:1100}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const base=process.env.BASE_URL||'http://localhost:5173/RoHaC/';
try{
 await page.goto(base);await page.getByRole('heading',{name:'横浜市'}).waitFor();
 const candidates=page.locator('.research-card .candidate-results');
 await candidates.getByText('柴田 豊勝',{exact:true}).waitFor();
 assert.equal(await candidates.locator('.candidate-row').count(),3);
 for(const [name,votes,share] of [['林 文子','694,360','81.9%'],['柴田 豊勝','134,644','15.9%'],['矢野 未来歩','19,259','2.3%']]){
  const row=candidates.locator('.candidate-row').filter({hasText:name});
  assert.equal(await row.locator('.candidate-vote-value').innerText(),votes);
  assert.equal(await row.locator('.candidate-share strong').innerText(),share);
  assert.equal(await row.locator('.candidate-party').innerText(),'無所属');
 }
 assert.equal(await candidates.locator('.elected-badge').count(),1);
 await page.screenshot({path:'/workspace/artifacts/rohac-candidates-desktop.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await page.screenshot({path:'/workspace/artifacts/rohac-candidates-mobile.png',fullPage:true});
 await page.setViewportSize({width:1440,height:1100});
 await page.getByRole('button',{name:'選挙データ一覧',exact:true}).click();
 const event=page.locator('tbody>tr').filter({hasText:'2013.08.25'});await event.locator('summary').click();
 assert.equal(await event.locator('.candidate-row').count(),3);assert.match(await event.innerText(),/柴田 豊勝/);assert.match(await event.innerText(),/15.9%/);
 // Election snapshots must change along with the selected council election.
 await page.getByRole('button',{name:'自治体を調べる',exact:true}).click();await page.locator('.chart-bar').first().click();
 assert.equal(await page.locator('.research-card .candidate-results').count(),1);
 assert.equal(await page.locator('.research-card').getByText('柴田 豊勝',{exact:true}).count(),0);
 // Other-party names and original candidate notes are retained in older elections.
 const other=new URL(base);other.searchParams.set('city','29202');await page.goto(other.href);await page.getByRole('heading',{name:'大和高田市'}).waitFor();
 await page.getByRole('button',{name:'選挙データ一覧',exact:true}).click();
 const old=page.locator('tbody>tr').filter({hasText:'1979.09.30'});await old.locator('summary').click();
 const minor=old.locator('.candidate-row').filter({hasText:'辻山 清'});assert.equal(await minor.locator('.candidate-party').innerText(),'諸派（日本労農党）');assert.equal(await minor.locator('.candidate-share strong').innerText(),'1.0%');
 const missing=new URL(base);missing.searchParams.set('city','17385');await page.goto(missing.href);await page.locator('.city-title h2').waitFor();await page.getByRole('button',{name:'選挙データ一覧',exact:true}).click();
 const uncontested=page.locator('tbody>tr').filter({hasText:'1962.12.02'});await uncontested.locator('summary').click();
 assert.equal(await uncontested.locator('.candidate-share strong').innerText(),'—');assert.match(await uncontested.locator('.candidate-help').innerText(),/無投票/);
 const unknown=page.locator('tbody>tr').filter({hasText:'1970.11.01'});await unknown.locator('summary').click();assert.equal(await unknown.locator('.candidate-share strong').innerText(),'—');assert.equal(await unknown.locator('.candidate-vote-value').innerText(),'—');
 assert.deepEqual(errors,[]);console.log('PASS: all opponents, source vote counts/shares/parties, winner flag, historical detail expansion, snapshot changes, other-party names, uncontested/missing data, mobile layout; no browser errors');
}finally{await browser.close()}
