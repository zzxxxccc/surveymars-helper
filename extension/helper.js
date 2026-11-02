const $ = id => document.getElementById(id);
const status = text => $('status').textContent = text;
let people=[], progress={}, busy=false;
const ready=chrome.storage.local.get(['people','profile','progress','lastUrl']).then(data=>{
 people=data.people|| (data.profile?[data.profile]:[]);progress=data.progress||{};
 $('roster').value=people.map(p=>p.name+','+p.studentId).join('\n');
 $('url').value=data.lastUrl||'';render();
});
function currentKey(){try{return validUrl($('url').value);}catch{return null;}}
function state(id){return progress[currentKey()]?.[id]||'pending';}
async function mark(id,value){const key=currentKey();if(!key)return;progress[key]||={};progress[key][id]=value;await chrome.storage.local.set({progress});render();}
function render(){
 const root=$('progress');root.replaceChildren();
 if(!currentKey()){root.textContent='请先识别二维码或粘贴有效的问卷链接。';return;}
 if(!people.length){root.textContent='请先保存人员名单。';return;}
 for(const p of people){const row=document.createElement('div');row.className='person';const text=document.createElement('span');const s=state(p.studentId);text.textContent=p.name+' · '+p.studentId+' — '+({pending:'待填写',opened:'已打开，等待核对提交',done:'已确认提交'}[s]);row.append(text);
 if(s==='pending'){const b=document.createElement('button');b.textContent='填写此人';b.disabled=busy;b.onclick=()=>openPerson(p);row.append(b);}
 else {const b=document.createElement('button');b.textContent=s==='opened'?'确认已提交':'撤销确认';b.disabled=busy;b.onclick=()=>mark(p.studentId,s==='opened'?'done':'opened');row.append(b);
 if(s==='opened'){const retry=document.createElement('button');retry.textContent='重新填写';retry.disabled=busy;retry.onclick=()=>{if(confirm('重新打开可能造成重复提交。请确认上一份尚未提交。'))openPerson(p,true);};row.append(retry);}}
 root.append(row);}
}
$('save').onclick=async()=>{await ready;try{if(busy)return;const list=parseRoster($('roster').value);await chrome.storage.local.set({people:list});people=list;$('roster').value=people.map(p=>p.name+','+p.studentId).join('\n');await chrome.storage.local.remove('profile');render();status('已保存 '+people.length+' 人。');}catch(e){status(e.message);}};
$('clear').onclick=async()=>{await ready;if(busy||!confirm('清除保存的名单和全部表单进度？'))return;await chrome.storage.local.remove(['profile','people','progress','lastUrl']);people=[];progress={};$('roster').value='';render();status('已清除名单和进度。');};
$('url').addEventListener('input',render);
$('reset').onclick=async()=>{await ready;const key=currentKey();if(busy||!key||!confirm('重置当前链接的所有人员进度？已提交的答卷不会被撤回。'))return;delete progress[key];await chrome.storage.local.set({progress});render();};
function validUrl(value){const u=new URL(value.trim());if(u.protocol!=='https:'||!(u.hostname==='surveymars.com'||u.hostname.endsWith('.surveymars.com'))||!/^\/q\/[A-Za-z0-9]+\/?$/.test(u.pathname)||u.username||u.password)throw new Error('请使用 HTTPS SurveyMars 问卷链接（/q/…）。');return u.href;}
async function decode(file){
  if(!file||!file.type.startsWith('image/'))return status('请选择图片文件。');
  $('url').value=''; $('open').disabled=true; status('正在本机识别二维码…');
  let bitmap;
  try{bitmap=await createImageBitmap(file);let result;
    for(const max of [1800,1000,2600]){const scale=Math.min(1,max/Math.max(bitmap.width,bitmap.height));const canvas=document.createElement('canvas');canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);const pixels=ctx.getImageData(0,0,canvas.width,canvas.height);result=jsQR(pixels.data,canvas.width,canvas.height,{inversionAttempts:'attemptBoth'});if(result)break;}
    if(!result)throw new Error('没有识别到二维码。请裁剪到二维码附近、使用清晰图片，或直接粘贴链接。');
    $('url').value=validUrl(result.data);render();status('识别成功，请点击“打开下一位并填写”。');
  }catch(e){status(e.message);}finally{bitmap?.close();$('open').disabled=false;}
}
$('file').onchange=e=>decode(e.target.files[0]);
document.addEventListener('paste',e=>{const item=Array.from(e.clipboardData.items).find(x=>x.type.startsWith('image/'));if(item){e.preventDefault();decode(item.getAsFile());}});
$('drop').ondragover=e=>e.preventDefault();$('drop').ondrop=e=>{e.preventDefault();decode(e.dataTransfer.files[0]);};
async function openPerson(p,retry=false){
 await ready;if(busy)return;let t;
 try{
  const url=validUrl($('url').value);
  if($('roster').value.trim()!==people.map(x=>x.name+','+x.studentId).join('\n'))throw new Error('名单有修改，请先点击保存名单。');
  if(!retry&&state(p.studentId)!=='pending')throw new Error('此人已打开或已确认提交，请检查进度。');
  if(people.some(x=>x.studentId!==p.studentId&&state(x.studentId)==='opened'))throw new Error('请先完成上一位，并点击“确认已提交”。');
  busy=true;$('open').disabled=true;render();
  t=await chrome.tabs.create({url:'about:blank',active:false});
  await chrome.storage.session.set({['pending-'+t.id]:{url,profile:p,time:Date.now()}});
  await chrome.tabs.update(t.id,{url,active:true});
  await mark(p.studentId,'opened');await chrome.storage.local.set({lastUrl:url});
  status('已为 '+p.name+' 打开表单。核对并提交成功后，回到助手确认进度。');
 }catch(e){if(t)await chrome.tabs.remove(t.id);status(e.message);}finally{busy=false;$('open').disabled=false;render();}
}
$('open').onclick=async()=>{await ready;const p=people.find(x=>state(x.studentId)==='pending');if(!p)return status(people.length?'没有待填写人员，请检查进度。':'请先保存名单。');await openPerson(p);};
