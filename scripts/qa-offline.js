async (page) => {
 const errors = [], remote = [];
 page.on('pageerror', error => errors.push(error.message));
 page.on('request', request => { if (/^https?:/.test(request.url())) remote.push(request.url()); });
 await page.context().setOffline(true);
 await page.goto(offlineURL + '?lang=en');
 await page.emulateMedia({reducedMotion: 'reduce'});
 await page.setViewportSize({width: 1440, height: 900});
 await page.getByRole('button', {name: 'Learn on the board · 6 steps', exact: true}).click();
 await page.locator('.roll-surface').click();
 await page.waitForFunction(() => !document.querySelector('.is-rolling'));
 await page.locator('svg.board g[role="button"]').first().press('Enter');
 await page.waitForFunction(() => document.querySelector('.board-score>span:first-child b').textContent === '10');
 if (errors.length || remote.length) throw new Error(JSON.stringify({errors, remote}));
 await page.screenshot({path: 'output/playwright/offline.png'});
 return {offlineFileOpened: true, teachingMoveScore: 10, remoteRequests: remote, errors};
}
