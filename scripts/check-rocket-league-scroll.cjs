// Real Chromium wheel regression check. Run: electron scripts/check-rocket-league-scroll.cjs
// Uses the shipped stylesheet order, including the lazy Rocket League base stylesheet.
// No real account, saved history, running game, or installer is accessed.
// Optional --css-ref=<git ref> verifies an earlier refresh stylesheet without changing files.
const { app, BrowserWindow } = require('electron');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const http = require('node:http');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const cache = path.join(root, '.validation-cache', 'rocket-league-scroll');
app.setPath('userData', path.join(cache, 'browser'));
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const sizes = [[760, 820], [1440, 900], [2560, 1440]];

app.whenReady().then(async () => {
  let win, server;
  try {
    await fs.mkdir(cache, { recursive: true });
    assert.doesNotMatch(await fs.readFile(path.join(root, 'app', 'rocket-league-ui.js'), 'utf8'), /<aside id="rl-profile"|id="rl-profile-toggle"/);
    const source = await fs.readFile(path.join(root, 'app', 'index.html'), 'utf8');
    const html = source
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace('data-feature-style="rocket-league.css"', 'href="rocket-league.css" data-feature-style="rocket-league.css"');
    const cssRef = process.argv.find(arg => arg.startsWith('--css-ref='))?.slice('--css-ref='.length);
    const earlierCss = cssRef ? execFileSync('git', ['show', `${cssRef}:app/rocket-league-refresh.css`], { cwd: root, encoding: 'utf8' }) : null;
    server = http.createServer(async (request, response) => {
      const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
      if (pathname === '/') { response.setHeader('Content-Type', 'text/html'); response.end(html); return; }
      if (pathname === '/rocket-league-refresh.css' && earlierCss) { response.setHeader('Content-Type', 'text/css'); response.end(earlierCss); return; }
      const file = path.resolve(root, 'app', '.' + pathname);
      if (!file.startsWith(path.join(root, 'app') + path.sep)) { response.writeHead(403).end(); return; }
      try {
        response.setHeader('Content-Type', ({ '.css': 'text/css', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' })[path.extname(file)] || 'application/octet-stream');
        response.end(await fs.readFile(file));
      } catch { response.writeHead(404).end(); }
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    win = new BrowserWindow({ show: false, width: 1440, height: 900, useContentSize: true,
      webPreferences: { offscreen: true, backgroundThrottling: false, sandbox: true, contextIsolation: true, nodeIntegration: false } });
    await win.loadURL(`http://127.0.0.1:${server.address().port}/`);
    win.webContents.debugger.attach('1.3');
    const run = (fn, arg) => win.webContents.executeJavaScript(`(${fn.toString()})(${JSON.stringify(arg)})`);
    await run(async () => {
      document.documentElement.classList.add('rl-workspace-active');
      document.documentElement.dataset.game = 'rocket-league';
      document.querySelector('#league-app').hidden = true;
      // Match the production shell's container hierarchy; natural content drives its height.
      document.querySelector('#hub-app').innerHTML = `<main class="hub-main rl-page">
        <div class="rl-commandbar"><header class="rl-heading"><div class="rl-brand"><div><h1>Rocket League</h1><span>DROPZONE TRACKER</span></div></div><span id="rl-status">Connected</span></header>
          <nav class="rl-tabs"><button aria-pressed="true">Live tracker</button><button>Match history</button><button>My profile</button></nav></div>
        <div class="rl-workspace" data-page="history">
          <div class="rl-main-panel"><p id="rl-error"></p><div id="rl-content">${Array.from({ length: 60 }, (_, i) => `<section class="rl-section"><h2>Recorded match ${i + 1}</h2><p>Ranked doubles · Goals 3 · Saves 2 · Score 529</p></section>`).join('')}<p data-content-end>End of match history</p></div></div>
        </div></main>`;
      await document.fonts.ready;
      await Promise.race([Promise.all([...document.querySelectorAll('link[rel=stylesheet][href]')].map(link => link.sheet ? null : new Promise((resolve, reject) => {
        link.onload = resolve; link.onerror = () => reject(Error('Stylesheet failed: ' + link.href));
      }))), new Promise((_, reject) => setTimeout(() => reject(Error('Stylesheet loading exceeded 10 seconds')), 10000))]);
    });
    async function measure(selector) {
      return run(selector => {
        const element = document.querySelector(selector), rect = element.getBoundingClientRect();
        const end = element.querySelector('[data-content-end],[data-sidebar-end]')?.getBoundingClientRect();
        const header = document.querySelector('.rl-commandbar').getBoundingClientRect();
        return { top: rect.top, bottom: rect.bottom, left: rect.left, width: rect.width,
          height: element.clientHeight, scrollHeight: element.scrollHeight, scrollTop: element.scrollTop,
          endBottom: end?.bottom, headerTop: header.top, rootScroll: document.scrollingElement.scrollTop,
          viewportHeight: innerHeight, viewportWidth: innerWidth };
      }, selector);
    }
    async function wheelAt(box, deltaY) {
      const x = Math.round(box.left + box.width / 2), y = Math.round(box.top + Math.min(150, box.height / 2));
      await win.webContents.debugger.sendCommand('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
      await win.webContents.debugger.sendCommand('Input.dispatchMouseEvent', { type: 'mouseWheel', x, y, deltaX: 0, deltaY });
      await pause(220);
    }
    const results = [];
    for (const [width, height] of sizes) {
      win.setContentSize(width, height);
      await win.webContents.debugger.sendCommand('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
      for (const collapsed of [false]) {
        const label = [width,height].join("x") + ", full main workspace";
        await run(collapsed => {

          document.querySelector('.rl-main-panel').scrollTop = 0;

        }, collapsed);
        await pause(80);
        const before = await measure('.rl-main-panel');
        assert.equal(before.viewportWidth, width, `${label}: viewport width mismatch`);
        assert.equal(before.viewportHeight, height, `${label}: viewport height mismatch`);
        assert.ok(before.bottom <= before.viewportHeight + 1, `${label}: content panel extends below the viewport`);
        assert.ok(before.height > 200, `${label}: content viewport is collapsed`);
        assert.ok(before.scrollHeight > before.height + 500, `${label}: fixture must overflow naturally`);
        await wheelAt(before, 520);
        const after = await measure('.rl-main-panel');
        assert.ok(after.scrollTop > 100, `${label}: native wheel did not scroll the content`);
        assert.ok(after.endBottom < before.endBottom - 100, `${label}: content did not move visually`);
        assert.equal(after.headerTop, before.headerTop, `${label}: command bar moved with content`);
        assert.equal(after.rootScroll, 0, `${label}: outer document scrolled`);
        await wheelAt(after, 100000);
        const bottom = await measure('.rl-main-panel');
        assert.ok(bottom.scrollHeight - bottom.height - bottom.scrollTop <= 2, `${label}: cannot reach the end`);
        assert.ok(bottom.endBottom <= bottom.bottom + 1, `${label}: final history entry remains clipped`);
        results.push({ label, contentHeight: before.height, scrollHeight: before.scrollHeight, wheelScroll: after.scrollTop });
        console.log(`PASS ${label}`);
      }
    }
    await fs.writeFile(path.join(cache, 'report.json'), JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2));
    console.log('PASS: 3 Rocket League native-wheel layouts; bottom content reachable and header remains fixed.');
    server.close();
    app.exit(0);
  } catch (error) {
    console.error(error.stack);
    server?.close();
    app.exit(1);
  }
});
