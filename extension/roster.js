(function(root){
  function parseRoster(text){
    const rows=text.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
    if(!rows.length)throw new Error('请先输入名单。');
    const ids=new Set();
    return rows.map((line,i)=>{
      const parts=line.split(/\t|,|，/).map(x=>x.trim());
      if(parts.length!==2||!parts[0]||!parts[1])throw new Error(`第 ${i+1} 行格式错误，请使用：姓名,学号`);
      if(ids.has(parts[1]))throw new Error(`学号 ${parts[1]} 重复，请检查名单。`);
      ids.add(parts[1]);return {name:parts[0],studentId:parts[1]};
    });
  }
  root.parseRoster=parseRoster;
  if(typeof module!=='undefined')module.exports={parseRoster};
})(typeof globalThis!=='undefined'?globalThis:this);
