export type View = {zoom:number;center:number[]};
export type Frame = {left:number;top:number;width:number;height:number};
export type Point = {x:number;y:number};
export const clampView=(view:View):View=>{
 const zoom=Math.max(1,Math.min(2.8,view.zoom));
 return {zoom,center:[Math.max(320/zoom,Math.min(640-320/zoom,view.center[0])),Math.max(260/zoom,Math.min(520-260/zoom,view.center[1]))]};
};
export const units=(view:View,frame:Frame)=>Math.max(640/view.zoom/frame.width,520/view.zoom/frame.height);
export const panView=(view:View,dx:number,dy:number,frame:Frame)=>clampView({zoom:view.zoom,center:[view.center[0]-dx*units(view,frame),view.center[1]-dy*units(view,frame)]});
export function zoomView(view:View,zoom:number,anchor:Point,frame:Frame):View{
 const next=clampView({...view,zoom});
 const x=anchor.x-frame.left-frame.width/2,y=anchor.y-frame.top-frame.height/2;
 return clampView({...next,center:[view.center[0]+x*(units(view,frame)-units(next,frame)),view.center[1]+y*(units(view,frame)-units(next,frame))]});
}
export function pinchView(view:View,start:Point[],current:Point[],frame:Frame):View{
 const span=(p:Point[])=>Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);
 const mid=(p:Point[])=>({x:(p[0].x+p[1].x)/2,y:(p[0].y+p[1].y)/2});
 const a=mid(start),b=mid(current),next=zoomView(view,view.zoom*span(current)/Math.max(1,span(start)),a,frame);
 return panView(next,b.x-a.x,b.y-a.y,frame);
}
