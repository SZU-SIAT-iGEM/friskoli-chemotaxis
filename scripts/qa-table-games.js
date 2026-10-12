async (page) => {
 const checks=[],runs=[],errors=[];const check=(ok,msg)=>{if(!ok)throw new Error(msg);checks.push(msg);};
 page.on('pageerror',e=>errors.push(e.message));await page.emulateMedia({reducedMotion:'reduce'});
 await page.addInitScript(()=>{Date.now=()=>8;});
 await page.goto(baseURL + '?lang=zh-CN');await page.setViewportSize({width:1280,height:900});
 await page.getByRole('button',{name:'直接开局',exact:true}).click();
 const dirs=[[1,0],[0,1],[-1,1],[-1,0],[0,-1],[1,-1]];
 for(const policy of ['goal','away']){
  const visits=new Map();let steps=0;
  while(await page.locator('.tabletop-objects').count()){
   if(++steps>90)throw new Error('Game failed to terminate');
   const rescue=page.locator('.table-rescue');if(await rescue.count()){await rescue.click();await page.waitForFunction(()=>!document.querySelector('.is-rolling'));continue;}
   if(await page.locator('.roll-surface').count()){await page.locator('.roll-surface').click();await page.waitForFunction(()=>!document.querySelector('.is-rolling'));}
   if(await page.locator('.table-rescue').count())continue;
   const cells=await page.locator('svg.board').evaluate(svg=>[...svg.querySelectorAll('g[aria-label]')].map(g=>{const label=g.getAttribute('aria-label'),m=label.match(/^格子 (-?\d+), (-?\d+)：/);if(!m)return null;return {id:m[1]+','+m[2],q:+m[1],r:+m[2],label,wall:!!g.querySelector('.hex.wall'),goal:label.includes('终点'),end:!!g.querySelector('.reachable-end')};}).filter(Boolean));
   const map=new Map(cells.map(c=>[c.id,c])),goal=cells.find(c=>c.goal),dist=new Map([[goal.id,0]]),queue=[goal];
   for(let i=0;i<queue.length;i++)for(const [dq,dr]of dirs){const n=map.get((queue[i].q+dq)+','+(queue[i].r+dr));if(n&&!n.wall&&!dist.has(n.id)){dist.set(n.id,dist.get(queue[i].id)+1);queue.push(n);}}
   const offered=cells.filter(c=>c.end);check(offered.length>0,'A live roll has a reachable endpoint');
   offered.sort((a,b)=>policy==='goal'?(dist.get(a.id)+(visits.get(a.id)||0)*.3)-(dist.get(b.id)+(visits.get(b.id)||0)*.3):dist.get(b.id)-dist.get(a.id));const pick=offered[0];
   const before=+(await page.locator('.board-score>span:first-child b').innerText());const tile=page.getByRole('button',{name:pick.label,exact:true});await tile.click();const gain=+(await page.locator('.booth-prediction strong').innerText()).match(/得分 \+(\d+)/)[1];await page.locator('.booth-confirm').click();
   await page.waitForFunction(expected=>document.querySelector('.board-score>span:first-child b').textContent===String(expected),before+gain);check(+(await page.locator('.board-score>span:first-child b').innerText())===before+gain,'Forecast matches actual score');visits.set(pick.id,(visits.get(pick.id)||0)+1);
  }
  check(await page.locator('.result-celebration').count()===1,'Game renders result card');const win=await page.locator('.victory').count()>0;const breakdown=await page.locator('.score-breakdown b').allTextContents();const feeding=+breakdown[0],bonus=+breakdown[1],spare=+breakdown[2];const total=+(await page.locator('.final-score').getAttribute('aria-label')).match(/\d+/)[0];
  check(win===(policy==='goal'),'Deterministic policy reaches expected win/loss result');
  check(total===feeding+bonus+spare,'Result breakdown sums to total');check(bonus===(win?feeding:0),'Only completed games double feeding score');
  await page.locator('.save-panel summary').click();await page.getByRole('textbox',{name:'昵称（选填）',exact:true}).fill('桌面测试 '+policy);await page.getByRole('button',{name:'保存到本机榜',exact:true}).click();check(!await page.getByRole('button',{name:'已保存在这台设备上',exact:true}).isEnabled(),'Record saved once');
  await page.screenshot({path:'output/playwright/table-game-'+policy+'.png',fullPage:true});runs.push({policy,win,total,feeding,bonus,spare,steps});if(policy==='goal')await page.getByRole('button',{name:'再来一局',exact:true}).click();
 }
 check(errors.length===0,'No runtime errors in full games');return {checks:checks.length,runs,errors};
}
