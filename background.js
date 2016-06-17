chrome.contextMenus.create({
  title: "Start speaking here", 
  contexts:["all"], 
  onclick: (info, tab) => chrome.tabs.sendMessage(tab.id, {action: "start"})
})
