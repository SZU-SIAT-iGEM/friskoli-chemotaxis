async (page) => {
 const checks=[], errors=[];
 const check=(value,label)=>{if(!value)throw new Error(label);checks.push(label);};
 page.on('pageerror',error=>errors.push(error.message));
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.setViewportSize({width:390,height:844});
 await page.goto(baseURL);
 check(await page.locator('html').getAttribute('lang')==='en','Fresh session defaults to English');
 await page.getByText('Settings',{exact:true}).click();
 await page.getByRole('button',{name:'中文',exact:true}).click();
 await page.goto(baseURL);
 check(await page.locator('html').getAttribute('lang')==='zh-CN','Saved Chinese preference is respected');
 await page.goto(baseURL+'?lang=en');
 check(await page.locator('html').getAttribute('lang')==='en','URL language overrides saved preference');
 await page.getByRole('button',{name:'Learn on the board · 6 steps',exact:true}).click();
 await page.locator('.roll-surface').focus();
 await page.keyboard.press('Space');
 await page.waitForFunction(()=>!document.querySelector('.is-rolling'));
 const tile=page.locator('svg.board g[role="button"]').first();
 await tile.focus();await page.keyboard.press('Enter');
 await page.waitForFunction(()=>document.querySelector('.board-score>span:first-child b').textContent==='10');
 check(true,'English tutorial works with keyboard-only roll and movement');
 await page.keyboard.press('Space');
 await page.waitForFunction(()=>!!document.querySelector('.rolled-token'));
 const before=await page.locator('.player').getAttribute('style');
 for(const [label,width,height] of [['phone-portrait',390,844],['phone-landscape',844,390],['tablet',820,1180],['desktop',1440,900]]){
  await page.setViewportSize({width,height});
  const metrics=await page.evaluate(()=>({width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight,dice:[...document.querySelectorAll('.rolled-token')].map(el=>{const r=el.getBoundingClientRect();return {width:r.width,height:r.height,left:r.left,right:r.right,top:r.top,bottom:r.bottom};})}));
  check(metrics.width<=width&&metrics.height<=height,label+' English layout fits');
  check(metrics.dice.every(r=>r.width>=44&&r.height>=44&&r.left>=0&&r.right<=width&&r.top>=0&&r.bottom<=height),label+' dice targets are visible and at least 44px');
  check(await page.locator('.player').getAttribute('style')===before,label+' resizing preserves position');
 }
 await page.screenshot({path:'output/playwright/stable-english.png'});
 await page.getByRole('button',{name:'Learn / field guide',exact:true}).click();
 check(await page.locator('.object-grid article').count()===8,'English object guide is complete');
 await page.keyboard.press('Escape');
 check(await page.locator('dialog[open]').count()===0,'English guide closes with Escape');
 await page.getByText('Settings',{exact:true}).click();
 await page.getByRole('button',{name:'Restart',exact:true}).click();
 check(await page.locator('dialog[open]').count()===1,'Restart asks before replacing the active game');
 await page.keyboard.press('Escape');
 check(await page.locator('.player').getAttribute('style')===before,'Cancelling restart preserves the session');
 check(errors.length===0,'Stable checks have no runtime errors');
 return {checks,errors,physicalDeviceTested:false};
}
