(async () => {
  const profile = await chrome.runtime.sendMessage({type: 'get-fill'});
  if (!profile) return;
  const visible = e => e.getClientRects().length && !e.disabled && !e.readOnly;
  function kind(text) {
    text = text.replace(/\s+/g, ' ').trim();
    if (/学号|學生編號|学生编号|student\s*(id|number|no\b)|matric(ulation)?\s*(no|number)/i.test(text)) return 'studentId';
    if (/姓名|学生姓名|\b(full\s*name|student\s*name|name)\b/i.test(text)) return 'name';
    return null;
  }
  const results = {name: [], studentId: []};
  for (const input of document.querySelectorAll('input[type="text"],input:not([type]),textarea')) {
    if (!visible(input)) continue;
    const q = /^q(\d+)$/.exec(input.id);
    const box = q ? document.getElementById('div' + q[1]) : null;
    const label = box?.innerText || Array.from(input.labels || []).map(x => x.innerText).join(' ') || input.getAttribute('aria-label') || input.placeholder;
    const k = kind(label || '');
    if (k) results[k].push(input);
  }
  let count = 0;
  for (const k of ['name', 'studentId']) {
    if (results[k].length !== 1 || results[k][0].value) continue;
    const e = results[k][0];
    const proto = e.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(e, profile[k]);
    e.dispatchEvent(new Event('input', {bubbles: true}));
    e.dispatchEvent(new Event('change', {bubbles: true}));
    count++;
  }
  const banner = document.createElement('div');
  banner.style.cssText = 'position:fixed;top:12px;right:12px;z-index:2147483647;max-width:340px;padding:16px;background:#173e37;color:white;border-radius:12px;font:15px/1.6 system-ui;box-shadow:0 4px 20px #0003';
  banner.textContent = count === 2 ? '已填写姓名和学号。请核对课程、个人信息，再点击表单的 Submit 提交。' : `已填写 ${count} 项；其余字段未能唯一识别或已有内容，请手动检查。尚未提交。`;
  const close = document.createElement('button');
  close.textContent = '关闭提示'; close.style.cssText = 'display:block;margin-top:10px;cursor:pointer';
  close.onclick = () => banner.remove(); banner.append(close); document.body.append(banner);
})();
