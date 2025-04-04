const script = document.createElement('script');
script.src = chrome.runtime.getURL('lovable/zeabur.js');
script.onload = () => script.remove();
(document.head || document.documentElement).appendChild(script);
