async (page)=>{
 const checks=[],errors=[];const check=(value,label)=>{if(!value)throw new Error(label);checks.push(label);};
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(baseURL + '?lang=zh-CN');
 await page.evaluate(()=>localStorage.setItem('friskoli.chemotaxis.theme','light'));await page.reload();
 await page.setViewportSize({width:1280,height:800});await page.emulateMedia({reducedMotion:'no-preference'});
 await page.getByRole('button',{name:'从棋盘开始学 · 6 步',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('svg.board').getAttribute('aria-busy')==='false');
 check((await page.locator('.action-cue').innerText()).includes('先抛骰子'),'Opening explicitly asks for a dice toss');
 check((await page.locator('.direction-key b').allTextContents()).join(',')==='1,2,3,4,5,6','All six numbered direction keys are visible');
 check(await page.locator('.cell-directions text').count()===6,'Six numbers surround the player');
 check(await page.locator('.idle-dice .physical-die').first().evaluate(el=>el.getBoundingClientRect().width)>=48,'Desktop dice are enlarged');
 const desktop=await page.evaluate(()=>{const b=document.querySelector('svg.board').getBoundingClientRect(),d=document.querySelector('.table-dock').getBoundingClientRect(),l=document.querySelector('.lesson-ribbon').getBoundingClientRect();return {boardRight:b.right,diceLeft:d.left,lessonBottom:l.bottom,diceTop:d.top};});
 check(desktop.boardRight<desktop.diceLeft,'Dice sit to the right of the board');
 check(desktop.lessonBottom<desktop.diceTop,'Teaching does not collide with dice');
 await page.screenshot({path:'output/playwright/readable-opening.png'});
 const wall=page.getByRole('group',{name:'格子 -1, -1：器壁，营养区',exact:true});
 await wall.click();
 await page.waitForFunction(()=>getComputedStyle(document.querySelector('.tile-inspector')).opacity==='1');
 check(await page.locator('.tile-inspector .wall-example').isVisible(),'Wall explanation includes stop-before-wall diagram');
 const inspector=await page.locator('.tile-inspector').evaluate(el=>{const p=el.querySelector('.tile-rule-copy p'),b=el.getBoundingClientRect(),r=p.getBoundingClientRect();return {font:parseFloat(getComputedStyle(p).fontSize),copyWidth:r.width,inside:r.right<=b.right&&r.bottom<=b.bottom,overflow:el.scrollWidth>el.clientWidth};});
 check(inspector.font>=15&&inspector.copyWidth>200&&inspector.inside&&!inspector.overflow,'Wall copy is readable in a separate column');
 await page.screenshot({path:'output/playwright/readable-wall.png'});
 await page.locator('.tile-inspector').getByRole('button',{name:'关闭',exact:true}).click();
 for(const [label,width,height] of [['small-desktop',1024,768],['phone',390,844],['tablet',820,1180],['landscape',844,390]]){
  await page.setViewportSize({width,height});
  const metrics=await page.evaluate(()=>{const get=s=>document.querySelector(s).getBoundingClientRect().toJSON();return {board:get('svg.board'),dice:get('.table-dock'),lesson:get('.lesson-ribbon'),field:get('.field-readout'),prob:get('.probability-line'),scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight};});
  check(metrics.board.width>250&&metrics.board.height>200,label+' board remains usable');
  check(metrics.scrollWidth<=width&&metrics.scrollHeight<=height,label+' viewport has no overflow');
  check(metrics.lesson.bottom<=metrics.dice.y||metrics.lesson.right<=metrics.dice.x,label+' teaching and dice do not overlap');
  check(metrics.field.bottom<=metrics.prob.y||metrics.field.right<=metrics.prob.x,label+' environment and probabilities do not overlap');
  await page.screenshot({path:'output/playwright/readable-'+label+'.png'});
 }
 await page.setViewportSize({width:390,height:844});await wall.click();
 await page.waitForFunction(()=>getComputedStyle(document.querySelector('.tile-inspector')).opacity==='1');
 check(await page.locator('.tile-inspector').evaluate(el=>el.scrollWidth<=el.clientWidth),'Phone wall inspector has no horizontal overflow');
 await page.screenshot({path:'output/playwright/readable-wall-phone.png'});
 await page.locator('.tile-inspector').getByRole('button',{name:'关闭',exact:true}).click();
 await page.setViewportSize({width:1280,height:800});
 const area=await page.locator('.roll-surface').boundingBox();await page.mouse.move(area.x+area.width/2,area.y+25);await page.mouse.down();
 check(await page.locator('.roll-surface.held').count()===1,'Pressing immediately picks up dice');
 await page.mouse.move(area.x+area.width/2+25,area.y-15,{steps:5});await page.mouse.up();
 await page.waitForFunction(()=>!document.querySelector('.is-rolling'));
 check((await page.locator('.action-cue').innerText()).includes('现在走棋'),'After the toss cue switches to walking');
 check(await page.locator('.endpoint-ring').evaluateAll(els=>els.some(el=>getComputedStyle(el).animationName==='walk-invite')),'Walkable endpoints pulse');
 await page.emulateMedia({reducedMotion:'reduce'});
 check(await page.locator('.endpoint-ring').evaluateAll(els=>els.every(el=>getComputedStyle(el).animationName==='none')),'Reduced motion disables the walking pulse');
 check(errors.length===0,'No runtime errors');return {checks,errors};
}
