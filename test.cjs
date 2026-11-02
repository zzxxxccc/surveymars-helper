const fs=require('fs'),vm=require('vm'),assert=require('assert');
const base='extension/';
const code=fs.readFileSync(base+'fill.js','utf8');
class Input {constructor(id,value=''){this.id=id;this._value=value;this.tagName='INPUT';this.events=[];}get value(){return this._value;}set value(v){this._value=v;}getClientRects(){return [1];}dispatchEvent(e){this.events.push(e.type);}}
async function run(labels,initial={},p={name:'TEST NAME',studentId:'001234'}){
 const fields=Object.keys(labels).map(id=>new Input(id,initial[id]||'')),banners=[];
 const doc={querySelectorAll:()=>fields,getElementById:id=>({innerText:labels['q'+id.slice(3)]}),createElement:()=>({style:{},append(){}}),body:{append:e=>banners.push(e)}};
 await vm.runInNewContext(code,{chrome:{runtime:{sendMessage:async()=>p}},document:doc,HTMLInputElement:Input,HTMLTextAreaElement:Input,Event:class{constructor(t){this.type=t;}}});return {fields,banners};
}
(async()=>{
 let r=await run({q1:'* 1. Name:',q2:'* 2. Student ID:'});assert.equal(r.fields[0].value,'TEST NAME');assert.equal(r.fields[1].value,'001234');assert.deepEqual(r.fields[1].events,['input','change']);
 r=await run({q1:'学号',q2:'姓名'});assert.equal(r.fields[0].value,'001234');assert.equal(r.fields[1].value,'TEST NAME');
 r=await run({q1:'Name',q2:'Student ID'},{q1:'Existing'});assert.equal(r.fields[0].value,'Existing');assert.ok(r.banners[0].textContent.includes('1'));
 r=await run({q1:'Name',q2:'Student name',q3:'Student ID'});assert.equal(r.fields[0].value,'');assert.equal(r.fields[1].value,'');assert.equal(r.fields[2].value,'001234');
 r=await run({q1:'Name',q2:'Student ID'},{},null);assert.equal(r.fields[0].value,'');assert.equal(r.banners.length,0);
 const html=fs.readFileSync(base+'helper.html','utf8');for(const match of html.matchAll(/(?:src|href)="([^"]+)"/g))assert.ok(fs.existsSync(base+match[1]));
 JSON.parse(fs.readFileSync(base+'manifest.json'));
 console.log('PASS: actual field labels, reversed order, leading zero, existing content, ambiguous labels, unrequested pages, bundled assets and manifest.');
})().catch(e=>{console.error(e);process.exit(1)});


const {parseRoster}=require('./extension/roster.js');
assert.deepEqual(parseRoster('张三,00123\n李四\t00045'),[{name:'张三',studentId:'00123'},{name:'李四',studentId:'00045'}]);
assert.throws(()=>parseRoster('张三,00123\n李四,00123'));
assert.throws(()=>parseRoster('张三'));
assert.throws(()=>parseRoster(''));
console.log('PASS: multiple people, tab separated rows, leading zeros, duplicate and malformed roster rejection.');
