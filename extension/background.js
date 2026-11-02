chrome.action.onClicked.addListener(() => chrome.tabs.create({url: chrome.runtime.getURL('helper.html')}));
chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  if (msg.type !== 'get-fill' || !sender.tab) return;
  (async () => {
    const key = 'pending-' + sender.tab.id;
    const data = (await chrome.storage.session.get(key))[key];
    if (!data || Date.now() - data.time > 120000 || new URL(sender.url).href !== data.url) return reply(null);
    await chrome.storage.session.remove(key);
    reply(data.profile);
  })().catch(() => reply(null));
  return true;
});
chrome.tabs.onRemoved.addListener(id => chrome.storage.session.remove('pending-' + id));
