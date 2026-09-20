// Real Chromium geometry checks using the app's existing Electron dependency.
// Start the preview, then: npm run test:layout
// Optional DROPZONE_PREVIEW_URL and DROPZONE_LAYOUT_SHOTS (output directory).
const {app, BrowserWindow} = require('electron');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
app.setPath('userData',path.resolve(__dirname,'../.validation-cache/layout-browser'));
const origin = process.env.DROPZONE_PREVIEW_URL || 'http://127.0.0.1:4177';
const views = {
  finals: ['.game-simple-heading', '.finals-class-tabs', '.finals-layout', '.finals-source'],
  operators: ['.game-simple-heading','.operator-filters','#operator-results','.operator-credit'],
  siege: ['.game-simple-heading', '.r6-toolbar', '.r6-map-detail', '.r6-method'],
  market: ['.market-page>header', '#market-content', '.market-stats', '.market-chart'],
  'server-status': ['.servers-page>header', '#server-summary', '.servers-page>.market-chart'],
  damage: ['.damage-heading', '.damage-workspace', '.gun-comparison', '.damage-extras'],
  wardogs: ['.workspace-heading', '.wd-workspace'],
  patches: ['.library-intro', '.patch-list-heading', '.patch-list'],
  sensitivity: ['.sensitivity-page>header', '.sens-panels', '.sens-output', '.sens-help'],
  bo7: ['.arsenal-heading', '.playlist-bar', '.arsenal-filters', '.arsenal-layout', '.source-disclosure'],
  home: ['.library-intro', '.root-games', '.hub-footer'],
  settings: ['.app-settings>header', '.app-settings>.panel'],
  updates: ['.app-updates-intro', '.app-update-card', '.release-notes']
};
const cases = [
  ...[640,1000,1480,1920,2560].map(width => ({width, theme:'dark', text:100})),
  ...[640,1920].map(width => ({width, theme:'light', text:100})),
  {width:1000,theme:'dark',text:150}, {width:1920,theme:'light',text:200}
];

app.whenReady().then(async () => {
  const win = new BrowserWindow({show:false, width:1480, height:1080, useContentSize:true,
    webPreferences:{sandbox:true, contextIsolation:true, backgroundThrottling:false, partition:'layout-check'}});
  win.webContents.session.webRequest.onBeforeRequest({urls:[origin+'/__preview*']},(_details,done)=>done({cancel:true}));
  const run = (fn, arg) => win.webContents.executeJavaScript(`(${fn.toString()})(${JSON.stringify(arg)})`);
  async function ready(selectors) {
    await run(async selectors => {
      const start = Date.now();
      while (!selectors.every(s => document.querySelector(s))) {
        if (Date.now() - start > 20000) throw Error('Missing layout content: '+selectors.filter(s=>!document.querySelector(s)).join(', '));
        await new Promise(resolve=>setTimeout(resolve,100));
      }
      await document.fonts.ready;
      await new Promise(resolve=>setTimeout(resolve,80));
    }, selectors);
  }
  async function verify(name, selectors) {
    await ready(selectors);
    const result = await run(selectors => {
      const main = document.querySelector('#hub-app>main');
      const boxes = selectors.flatMap(selector => [...document.querySelectorAll(selector)].filter(el=>el.getBoundingClientRect().width>0).map(el=>{
        const r = el.getBoundingClientRect(); return {selector,left:r.left,right:r.right,top:r.top};
      }));
      return {boxes, overflow:main.scrollWidth-main.clientWidth};
    }, selectors);
    assert.ok(result.boxes.length>=2, name+': content did not render');
    const reference=result.boxes[0];
    for (const r of result.boxes) {
      assert.ok(Math.abs(r.left-reference.left)<=1, `${name}: ${r.selector} left ${r.left} vs ${reference.left}`);
      assert.ok(Math.abs(r.right-reference.right)<=1, `${name}: ${r.selector} right ${r.right} vs ${reference.right}`);
    }
    assert.ok(result.overflow<=1,`${name}: page overflows by ${result.overflow}px`);
    return reference;
  }
  try {
    console.log('Opening hidden layout check…');
    await win.loadURL(origin+'/?game=settings');
    await ready(['.app-settings']);
    await run(version => {
      localStorage.setItem('dropzone-whats-new-seen',JSON.stringify(version));
      localStorage.setItem('dropzone-wardogs-tutorial-v1','seen');
    },require('../package.json').version);
    let count=0;
    for (const config of cases) {
      win.setContentSize(config.width,1080);
      await run(c=>{localStorage.setItem('dropzone-appearance',JSON.stringify(c.theme));localStorage.setItem('rf-text-size',JSON.stringify(c.text));},config);
      let wardogsBounds;
      for (const [game,selectors] of Object.entries(views)) {
        const label=`${game} ${config.width}px ${config.theme} ${config.text}%`;
        await win.loadURL(origin+'/?game='+game+'&context='+(game==='operators'?'siege':'wardogs'));
        const bounds=await verify(label,selectors);
        if (['market','server-status','damage','wardogs','patches'].includes(game)) {
          if (wardogsBounds) for (const edge of ['left','right','top']) assert.ok(Math.abs(bounds[edge]-wardogsBounds[edge])<=1,`${label}: WARDOGS ${edge} shifted`);
          wardogsBounds=bounds;
        }
        if (game==='finals') {
          await run(()=>document.querySelector('[data-finals-tab="teams"]').click());
          await verify(label+' teams',['.game-simple-heading','.team-player-grid','.finals-source']);
        }
        if (game==='siege') for (const tab of ['stats']) {
          await run(tab=>document.querySelector(`[data-r6-tab="${tab}"]`).click(),tab);
          await verify(label+' '+tab,['.game-simple-heading','.r6-toolbar','.r6-stats-grid','.r6-method']);
        }
        if (game==='operators') for (const operator of ['brava','striker']) {
          await win.loadURL(origin+'/?game=operators&context=siege&view='+operator);
          await ready(['.operator-equipment']);
          const equipment=await run(()=>({
            overflow:document.querySelector('.operators-page').scrollWidth-document.querySelector('.operators-page').clientWidth,
            groups:[...document.querySelectorAll('.operator-equipment-group')].map(group=>({
              heading:group.querySelector('h3').getBoundingClientRect().bottom,
              cards:[...group.querySelectorAll('.operator-equipment')].map(card=>{const r=card.getBoundingClientRect();return {top:r.top,bottom:r.bottom,image:card.querySelector('img')?.getBoundingClientRect().top};})
            }))
          }));
          assert.ok(equipment.overflow<=1,`${label} ${operator}: profile overflows`);
          for(const group of equipment.groups) for(const other of equipment.groups.filter(g=>Math.abs(g.heading-group.heading)<=1)) {
            group.cards.forEach((card,index)=>{const peer=other.cards[index];if(!peer)return;
              for(const edge of ['top','bottom','image']) if(card[edge]!=null&&peer[edge]!=null) assert.ok(Math.abs(card[edge]-peer[edge])<=1,`${label} ${operator}: equipment row ${index+1} ${edge} is misaligned`);
            });
          }
        }
        if (process.env.DROPZONE_LAYOUT_SHOTS && config.width===1920 && config.text===100) {
          await fs.mkdir(process.env.DROPZONE_LAYOUT_SHOTS,{recursive:true});
          const image=await win.webContents.capturePage();
          await fs.writeFile(path.join(process.env.DROPZONE_LAYOUT_SHOTS,game+'-'+config.theme+'.png'),image.toPNG());
        }
        count++;
      }
      console.log(`Aligned: ${config.width}px / ${config.theme} / ${config.text}% text`);
    }
    console.log(`PASS: ${count} workspace cases, plus FINALS and Siege sub-tabs.`);
    app.exit(0);
  } catch(error) { console.error(error.stack); app.exit(1); }
});
