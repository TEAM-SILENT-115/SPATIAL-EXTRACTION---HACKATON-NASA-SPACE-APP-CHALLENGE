// Dependency-free CDP helper for a dedicated local headless Edge process.
import fs from 'node:fs';
export async function connect() {
  const pages=await (await fetch('http://localhost:9223/json')).json();
  const ws=new WebSocket(pages.find(p=>p.type==='page').webSocketDebuggerUrl);
  await new Promise(resolve=>ws.addEventListener('open',resolve,{once:true}));
  let id=0;const pending=new Map();
  ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(pending.has(m.id)){const [ok,bad]=pending.get(m.id);pending.delete(m.id);m.error?bad(m.error):ok(m.result);}});
  const send=(method,params={})=>new Promise((ok,bad)=>{pending.set(++id,[ok,bad]);ws.send(JSON.stringify({id,method,params}));});
  const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
  const screenshot=async path=>{const r=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path,Buffer.from(r.data,'base64'));};
  return {send,evaluate,screenshot,close:()=>ws.close()};
}
if(process.argv[2]) {
  fs.mkdirSync('artifacts',{recursive:true});const c=await connect();
  await c.send('Emulation.setDeviceMetricsOverride',{width:1280,height:800,deviceScaleFactor:1,mobile:false});
  await c.send('Page.navigate',{url:process.argv[2]});
  await new Promise(r=>setTimeout(r,800));
  console.log(await c.evaluate('document.body.innerText'));
  await c.screenshot('artifacts/baseline.png');c.close();
}
