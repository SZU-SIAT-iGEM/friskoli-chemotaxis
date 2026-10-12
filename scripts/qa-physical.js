async (page)=>{
 const checks=[],errors=[];const check=(v,m)=>{if(!v)throw new Error(m);checks.push(m);};page.on('pageerror',e=>errors.push(e.message));
 await page.goto(baseURL + '?lang=zh-CN');await page.setViewportSize({width:1280,height:850});await page.emulateMedia({reducedMotion:'no-preference'});
 await page.getByRole('button',{name:'从棋盘开始学 · 6 步',exact:true}).click();await page.waitForFunction(()=>document.querySelector('svg.board').getAttribute('aria-busy')==='false');
 const area=await page.locator('.roll-surface').boundingBox(),x=area.x+area.width/2,y=area.y+25;
 await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+35,y-45,{steps:6});
 check((await page.locator('.idle-dice').getAttribute('style')).includes('35px'),'Dice follow the hand before release');
 await page.mouse.up();check(await page.locator('.is-rolling').count()===1,'Releasing starts the dice toss');
 check(await page.locator('.cube-solid').count()===4,'Four physical cubes for nutrient bonus');
 check(await page.locator('.board g[role=button]').count()===0,'Movement locked until dice settle');
 await page.waitForFunction(()=>!document.querySelector('.is-rolling'));
 let tile=page.getByRole('button',{name:'格子 -2, 0：营养，营养区',exact:true});await tile.dblclick();await page.waitForFunction(()=>document.querySelector('.board-score>span:first-child b').textContent==='10');
 check(await page.locator('.combo-banner').isVisible(),'Scoring produces a side banner');
 await page.locator('.roll-surface').press('Space');await page.waitForFunction(()=>!document.querySelector('.is-rolling'));await page.getByRole('button',{name:'格子 0, 0：营养，驱散区',exact:true}).dblclick();await page.waitForFunction(()=>document.querySelector('.board-score>span:first-child b').textContent==='75');
 await page.locator('.roll-surface').click();check(await page.locator('.negating').count()===1,'Cancellation is sequenced after the physical toss');await page.waitForFunction(()=>!document.querySelector('.is-rolling'));check(await page.locator('.negation-cross').isVisible(),'Cancelled die remains crossed out');
 await page.screenshot({path:'output/playwright/table-repellent.png'});
 await page.setViewportSize({width:390,height:844});const cdp=await page.context().newCDPSession(page);await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:2});
 const touch=(id,x,y)=>({id,x,y,radiusX:3,radiusY:3,force:1});const target=page.getByRole('button',{name:'格子 0, 1：空地，驱散区',exact:true}),box=await target.boundingBox(),tx=box.x+box.width/2,ty=box.y+box.height/2;const before=await page.locator('.player').getAttribute('style');
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[touch(1,tx,ty)]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 check(await page.locator('.player').getAttribute('style')===before,'First real emulated tap only previews');
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[touch(1,tx,ty)]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForFunction(prev=>document.querySelector('.player').getAttribute('style')!==prev,before);check(true,'Second emulated tap moves the piece');
 await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:false});await cdp.detach();
 await page.getByText('设置',{exact:true}).click();await page.getByRole('button',{name:'重开',exact:true}).click();await page.getByRole('button',{name:'重新开始',exact:true}).click();
 await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:1024,height:768});await page.getByRole('combobox',{name:'地图',exact:true}).selectOption('challenge');await page.getByRole('button',{name:'直接开局',exact:true}).click();
 await page.getByRole('button',{name:'放大',exact:true}).click();const svg=page.locator('svg.board'),panBefore=await svg.getAttribute('viewBox'),pos=await page.locator('.player').getAttribute('style');const b=await svg.boundingBox();await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2-60,b.y+b.height/2+20,{steps:8});await page.mouse.up();check(await svg.getAttribute('viewBox')!==panBefore,'Dragging a zoomed map pans it');check(await page.locator('.player').getAttribute('style')===pos,'Map drag does not move the cell');
 await page.getByRole('button',{name:'全图',exact:true}).click();const cdp2=await page.context().newCDPSession(page);await cdp2.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:2});const cx=b.x+b.width/2,cy=b.y+b.height/2;
 await cdp2.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[touch(1,cx-35,cy),touch(2,cx+35,cy)]});for(let i=1;i<=5;i++)await cdp2.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[touch(1,cx-35-i*8,cy),touch(2,cx+35+i*8,cy)]});await cdp2.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});check(+((await svg.getAttribute('viewBox')).split(' ')[2])<500,'Pinch zoom works');check(await page.locator('.player').getAttribute('style')===pos,'Pinch never moves cell');await cdp2.send('Emulation.setTouchEmulationEnabled',{enabled:false});await cdp2.detach();
 check(errors.length===0,'No runtime errors with animation and gestures');return {checks,errors,physicalDeviceTested:false,touchMethod:'Chromium CDP'};
}
