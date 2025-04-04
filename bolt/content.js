const script = document.createElement('script');
script.src = chrome.runtime.getURL('bolt/zeabur.js');
script.onload = () => script.remove();
(document.head || document.documentElement).appendChild(script);
