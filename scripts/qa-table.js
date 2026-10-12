async (page) => {
 const checks=[],layouts=[],errors=[];const check=(ok,label)=>{if(!ok)throw new Error(label);checks.push(label);};
 page.on('pageerror',e=>errors.push(e.message));
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto(baseURL + '?lang=zh-CN');
 await page.evaluate(()=>localStorage.setItem('friskoli.chemotaxis.theme','light'));await page.reload();
 await page.setViewportSize({width:1440,height:900});
 await page.getByRole('button',{name:'从棋盘开始学 · 6 步',exact:true}).click();
 const targets=['-2, 0','0, 0','0, 1','2, -1','2, 0','3, 0'];
 const scores=[10,75,75,85,110,250];
 for(let step=0;step<6;step++){
  await page.getByRole('button',{name:'投掷演示骰',exact:true}).click();
  await page.waitForFunction(()=>!document.querySelector('.is-rolling'));
  const before=await page.locator('.player').getAttribute('style');
  const tile=page.getByRole('button',{name:new RegExp('^格子 '+targets[step]+'：')});
  await tile.click();
  check(await page.locator('.player').getAttribute('style')===before,'Single click previews without moving '+step);
  check(await page.locator('.booth-prediction').isVisible(),'Full-run forecast visible '+step);
  if(step===2||step===3)check(await page.locator('.negated-die').count()===1,'Repellent shows one cancelled die '+step);
  if(step===5)check(await page.locator('.locked-die').count()===1,'Depleted shows one locked die');
  if(step===1){
   for(const [label,width,height] of [['desktop',1440,900],['phone-portrait',390,844],['phone-landscape',844,390],['tablet',820,1180]]){
    await page.setViewportSize({width,height});
    const rects=await page.evaluate(()=>{const box=s=>document.querySelector(s).getBoundingClientRect().toJSON();return {width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight,board:box('svg.board'),dock:box('.table-dock'),confirm:box('.booth-confirm'),lesson:box('.lesson-ribbon'),dice:[...document.querySelectorAll('.rolled-token')].map(x=>x.getBoundingClientRect().toJSON())};});
    check(rects.scrollHeight<=height+1&&rects.scrollWidth<=width+1,label+' fits viewport');
    check(rects.dock.bottom<=height&&rects.confirm.bottom<=height,label+' action visible');
    check(rects.dice.every(r=>r.x>=0&&r.right<=width+1&&r.y>=0&&r.bottom<=height),label+' physical dice stay in view');
    check(rects.board.width>250&&rects.board.height>200&&(rects.board.bottom<=rects.dock.y+4||rects.board.right<=rects.dock.x+4),label+' board is usable and not hidden by dice tray');
    await page.screenshot({path:'output/playwright/table-'+label+'.png'});layouts.push({label,...rects});
   }
   await page.setViewportSize({width:1440,height:900});
  }
  // A fresh double-click also works after an earlier preview has expired.
  await tile.dblclick();
  await page.waitForFunction(expected=>document.querySelector('.board-score>span:first-child b').textContent===String(expected),scores[step]);
  check((await page.locator('.board-score>span:first-child b').innerText())===String(scores[step]),'Correct score after direct move '+step);
 }
 check(await page.getByRole('heading',{name:'你已经会玩了。',exact:true}).isVisible(),'Tutorial finishes after six real-rule moves');
 check(await page.locator('.save-panel').count()===0,'Tutorial excluded from rankings');
 check((await page.locator('.final-score').innerText()).includes('250'),'Animated result shows final multiplied score');
 await page.screenshot({path:'output/playwright/table-result.png'});
 await page.getByRole('button',{name:'开始正式对局',exact:true}).click();
 check(await page.locator('.direction-probability').count()===6,'Six direction probabilities always visible');
 check((await page.locator('.direction-probability').allTextContents()).every(t=>t.includes('%')),'Live dice probabilities are numerical');
 await page.getByRole('button',{name:'教学 / 图鉴',exact:true}).click();
 check(await page.locator('.object-grid article').count()===8,'Guide covers all eight objects and terrain types');
 await page.keyboard.press('Escape');
 check(await page.locator('dialog[open]').count()===0,'Guide can close without resetting game');
 await page.getByText('设置',{exact:true}).click();
 await page.getByRole('button',{name:'English',exact:true}).click();
 check((await page.locator('.field-readout').innerText()).includes('base'),'English includes environmental explanation');
 await page.getByText('Settings',{exact:true}).click();
 await page.getByRole('button',{name:'Switch to night',exact:true}).click();
 check(await page.locator('html').getAttribute('data-theme')==='dark','Night theme works in tabletop');
 await page.screenshot({path:'output/playwright/table-night-en.png'});
 check(errors.length===0,'No runtime errors');
 return {checks,layouts,errors,physicalDeviceTested:false};
}
