const script = document.createElement('script');
script.src = chrome.runtime.getURL('bolt/zeabur.js');
script.onload = () => script.remove();
(document.head || document.documentElement).appendChild(script);

const JSZip = document.createElement('script');
JSZip.src = chrome.runtime.getURL('jszip.min.js');
JSZip.onload = () => JSZip.remove();
document.head.appendChild(JSZip);
