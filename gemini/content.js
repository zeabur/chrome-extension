// Create message bridge between page and content script
window.addEventListener('message', async (event) => {
	if (event.source !== window) return;
	
	if (event.data.type === 'ZEABUR_UPLOAD_REQUEST') {
		try {
			const response = await chrome.runtime.sendMessage({
				action: 'uploadToZeabur',
				codeArray: event.data.codeArray
			});
			
			window.postMessage({
				type: 'ZEABUR_UPLOAD_RESPONSE',
				requestId: event.data.requestId,
				response: response
			}, '*');
		} catch (error) {
			window.postMessage({
				type: 'ZEABUR_UPLOAD_RESPONSE',
				requestId: event.data.requestId,
				response: { error: error.message }
			}, '*');
		}
	}
});

const script = document.createElement('script');
script.src = chrome.runtime.getURL('gemini/zeabur.js');
script.onload = () => script.remove();
(document.head || document.documentElement).appendChild(script); 