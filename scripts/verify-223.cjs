const {chromium}=require('C:/Users/Jaden/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true}),page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 const go=async game=>{await page.goto('http://localhost:4173/?game='+game);};
 const select=async(id,value)=>{await page.locator('#'+id).selectOption(value,{force:true});};
 await go('sensitivity');await page.waitForSelector('#sens-result');
 await page.locator('#sens-target-game-control').click();await page.locator('#sens-target-game-options .select-filter').fill('Fortnite');
 assert.equal(await page.locator('#sens-target-game-options button:visible').count(),1);
 await page.locator('#sens-target-game-options button:visible').click();assert.match(await page.locator('#sens-result').innerText(),/3.960/);
 await page.locator('#sens-swap').click();assert.match(await page.locator('#sens-result').innerText(),/\n1\n/);
 await select('sens-source-kind','measured');await page.locator('[data-side=source][data-field=cm]').fill('40');
 await page.locator('[data-side=source][data-field=sens]').fill('7');assert.match(await page.locator('#sens-result').innerText(),/40.00 cm/);
 await page.locator('[data-side=source][data-field=dpi]').fill('0');assert.equal(await page.locator('#sens-copy').isDisabled(),true);
 await page.locator('[data-side=source][data-field=dpi]').fill('800');
 for(const width of [1440,1920,2560]){await page.setViewportSize({width,height:1000});const bounds=await page.evaluate(()=>['.sens-panels','.sens-output','.sens-help'].map(s=>{const r=document.querySelector(s).getBoundingClientRect();return [r.left,r.right]}));assert.ok(bounds.every(x=>Math.abs(x[0]-bounds[0][0])<1&&Math.abs(x[1]-bounds[0][1])<1));}
 await page.setViewportSize({width:1440,height:1000});
 await go('damage&context=wardogs');await page.waitForSelector('#damage-readout');
 assert.match(await page.locator('#damage-readout').innerText(),/30.8/);
 assert.equal(await page.locator('.damage-comparison').getAttribute('open'),null);
 await page.locator('path[data-zone=Head]').click();assert.equal(await page.locator('#damage-zone-name').innerText(),'Head');
 await select('damage-type','SMG');await page.locator('#damage-search').fill('MP5');assert.equal(await page.locator('#damage-weapon option').count(),1);
 await page.locator('.damage-comparison summary').click();assert.equal(await page.locator('#damage-rows tr').count(),1);
 await page.locator('#damage-search').fill('not a weapon');assert.match(await page.locator('#damage-readout').innerText(),/No weapons match/);
 await page.locator('#damage-reset').click();await select('damage-weapon','rpg-7');assert.match(await page.locator('#damage-readout').innerText(),/No supported result/);
 await page.locator('#damage-reset').click();await select('damage-armor','2');assert.match(await page.locator('#damage-readout').innerText(),/18.5/);
 await page.locator('#damage-reset').click();
 await page.screenshot({path:'docs/screenshots/damage-lab-223.png'});
 // A scaled desktop layout must remain horizontally contained and all controls scroll into view.
 await page.setViewportSize({width:1100,height:750});await page.locator('.damage-method summary').scrollIntoViewIfNeeded();
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.locator('#workspace-open').click();await page.locator('#workspace-search').fill('Progression');assert.match(await page.locator('#workspace-results').innerText(),/No matching/);await page.locator('#workspace-dialog button').first().click();
 await go('planner&context=wardogs');await page.waitForSelector('.wd-workspace');assert.match(page.url(),/game=wardogs/);
 await page.setViewportSize({width:1440,height:1000});await go('sensitivity');await page.waitForSelector('#sens-result');
 await page.evaluate(()=>localStorage.removeItem('dropzone-sensitivity-v1'));await page.reload();await page.waitForSelector('#sens-result');await page.screenshot({path:'docs/screenshots/sensitivity-223.png'});
 assert.deepEqual(errors,[]);console.log('PASS: search, swap, manual calibration, invalid inputs, alignment at 3 widths, body selection, weapon filters, comparison, missing data, armor, scaled layout, navigation cleanup and legacy redirect. No page errors.');
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
