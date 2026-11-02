const $ = id => document.getElementById(id);
const status = text => $('status').textContent = text;
const profile = () => ({name: $('name').value.trim(), studentId: $('studentId').value.trim()});
chrome.storage.local.get('profile').then(data => {if(data.profile){$('name').value=data.profile.name; $('studentId').value=data.profile.studentId;}});
$('save').onclick = async () => {const p=profile();if(!p.name||!p.studentId)return status('请填写姓名和学号。');await chrome.storage.local.set({profile:p});status('个人信息已保存在本机。');};
$('clear').onclick = async () => {await chrome.storage.local.remove('profile');$('name').value='';$('studentId').value='';status('已清除保存的信息。');};
function validUrl(value){const u=new URL(value.trim());if(u.protocol!=='https:'||!(u.hostname==='surveymars.com'||u.hostname.endsWith('.surveymars.com'))||!/^\/q\/[A-Za-z0-9]+\/?$/.test(u.pathname)||u.username||u.password)throw new Error('请使用 HTTPS SurveyMars 问卷链接（/q/…）。');return u.href;}
async function decode(file){
  if(!file||!file.type.startsWith('image/'))return status('请选择图片文件。');
  $('url').value=''; $('open').disabled=true; status('正在本机识别二维码…');
  let bitmap;
  try{bitmap=await createImageBitmap(file);let result;
    for(const max of [1800,1000,2600]){const scale=Math.min(1,max/Math.max(bitmap.width,bitmap.height));const canvas=document.createElement('canvas');canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);const pixels=ctx.getImageData(0,0,canvas.width,canvas.height);result=jsQR(pixels.data,canvas.width,canvas.height,{inversionAttempts:'attemptBoth'});if(result)break;}
    if(!result)throw new Error('没有识别到二维码。请裁剪到二维码附近、使用清晰图片，或直接粘贴链接。');
    $('url').value=validUrl(result.data);status('识别成功，请点击“打开表单并自动填写”。');
  }catch(e){status(e.message);}finally{bitmap?.close();$('open').disabled=false;}
}
$('file').onchange=e=>decode(e.target.files[0]);
document.addEventListener('paste',e=>{const item=Array.from(e.clipboardData.items).find(x=>x.type.startsWith('image/'));if(item){e.preventDefault();decode(item.getAsFile());}});
$('drop').ondragover=e=>e.preventDefault();$('drop').ondrop=e=>{e.preventDefault();decode(e.dataTransfer.files[0]);};
$('open').onclick=async()=>{let t;try{const p=profile();if(!p.name||!p.studentId)throw new Error('请先填写姓名和学号。');const url=validUrl($('url').value);$('open').disabled=true;t=await chrome.tabs.create({url:'about:blank',active:false});await chrome.storage.session.set({['pending-'+t.id]:{url,profile:p,time:Date.now()}});await chrome.tabs.update(t.id,{url,active:true});status('表单已打开。请查看页面上的填写结果提示，并核对后提交。');}catch(e){if(t)await chrome.tabs.remove(t.id);status(e.message);}finally{$('open').disabled=false;}};
