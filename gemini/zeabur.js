const registerGeminiDeployButton = async () => {
	console.log('[Zeabur Debug] registerGeminiDeployButton called');
	
	// if button already exists, return
	if (document.getElementById('gemini-extract-btn')) {
		console.log('[Zeabur Debug] Button already exists, returning');
		return;
	}
	
	console.log('[Zeabur Debug] Creating new Zeabur button');
	
	// create deploy to Zeabur button
	const btn = document.createElement('button');
	btn.id = 'gemini-extract-btn';
	btn.className = 'mdc-button mat-mdc-button-base share-button primary-share-button mdc-button--raised mat-mdc-raised-button mat-primary ng-star-inserted';
	btn.style.height = '32px';
	btn.style.paddingLeft = '12px';
	btn.style.paddingRight = '12px';
	btn.style.marginRight = '8px';
	btn.style.backgroundColor = '#6300ff';
	btn.style.transition = 'opacity 0.3s ease, transform 0.3s ease';

	const span = document.createElement('span');
	span.className = 'hidden md:flex';
	span.textContent = 'Deploy with Zeabur';
	btn.appendChild(span);

	btn.onclick = async () => {
		const sourceCode = await getSourceCodeFromGemini();
		uploadToZeabur(sourceCode);
	};

	let isButtonVisible = false;

	console.log('[Zeabur Debug] Starting interval to check for button visibility');
	
	setInterval(() => {
		const shareButton = document.querySelector('button[data-test-id="share-button"]');
		const codeElement = findCodeElementInMonaco();
		const deployButton = document.getElementById('gemini-extract-btn');

		// 同步狀態：如果按鈕不存在但 isButtonVisible 是 true，修正狀態
		if (!deployButton && isButtonVisible) {
			console.log('[Zeabur Debug] State sync: button missing but marked visible, fixing state');
			isButtonVisible = false;
		}
		
		// 同步狀態：如果按鈕存在但 isButtonVisible 是 false，修正狀態
		if (deployButton && !isButtonVisible) {
			console.log('[Zeabur Debug] State sync: button exists but marked invisible, fixing state');
			isButtonVisible = true;
		}

		console.log('[Zeabur Debug] Interval check:', {
			shareButtonExists: !!shareButton,
			codeElementExists: !!codeElement,
			deployButtonExists: !!deployButton,
			isButtonVisible: isButtonVisible,
			stateSync: isButtonVisible === !!deployButton
		});

		if (codeElement && !isButtonVisible) {
			console.log('[Zeabur Debug] Conditions met for showing button');
			if (shareButton && !deployButton) {
				console.log('[Zeabur Debug] Inserting button into DOM');
				btn.style.opacity = '0';
				btn.style.transform = 'translateY(5px)';
				shareButton.parentNode.parentNode.insertBefore(btn, shareButton.parentNode);
				isButtonVisible = true;
				setTimeout(() => {
					console.log('[Zeabur Debug] Making button visible with animation');
					btn.style.opacity = '1';
					btn.style.transform = 'translateY(0)';
				}, 10);
			} else {
				console.log('[Zeabur Debug] Cannot insert button:', {
					shareButton: !!shareButton,
					deployButton: !!deployButton
				});
			}
		} else if (!codeElement && isButtonVisible) {
			console.log('[Zeabur Debug] Conditions met for hiding button');
			if (deployButton) {
				console.log('[Zeabur Debug] Hiding button with animation');
				deployButton.style.opacity = '0';
				deployButton.style.transform = 'translateY(5px)';
				isButtonVisible = false;
				setTimeout(() => {
					// 再次檢查狀態，確保一致性
					const currentDeployButton = document.getElementById('gemini-extract-btn');
					if (!isButtonVisible && currentDeployButton) {
						console.log('[Zeabur Debug] Removing button from DOM');
						currentDeployButton.remove();
					}
				}, 300); // Wait for transition to finish
			} else {
				// 按鈕應該隱藏但已經不存在，直接更新狀態
				console.log('[Zeabur Debug] Button should be hidden but already missing, updating state');
				isButtonVisible = false;
			}
		}
	}, 500);
}

const getSourceCodeFromGemini = () => {
	return new Promise((resolve, reject) => {
		const codeElement = findCodeElementInMonaco();

		if (codeElement) {
			const code = codeElement.textContent || codeElement.innerText;
			const filename = detectFileType(code);
			resolve([[filename, code]]);
		} else {
			// Keep trying to find the element
			const startTime = Date.now();
			const timeout = 15000;

			const interval = setInterval(() => {
				const el = findCodeElementInMonaco();

				if (el) {
					clearInterval(interval);
					const code = el.textContent || el.innerText;
					const filename = detectFileType(code);
					resolve([[filename, code]]);
				} else if (Date.now() - startTime > timeout) {
					clearInterval(interval);
					reject(new Error('Timeout: code element not found'));
				}
			}, 500);
		}
	});
}

function findCodeElementInMonaco() {
	console.log('[Zeabur Debug] Looking for monaco element');
	const monacoElement = document.querySelector('.monaco-mouse-cursor-text');
	
	if (!monacoElement) {
		console.log('[Zeabur Debug] Monaco element not found');
		return null;
	}
	
	console.log('[Zeabur Debug] Monaco element found, checking children');
	
	// Get all direct child divs
	const directDivs = Array.from(monacoElement.children).filter(child => child.tagName === 'DIV');
	
	console.log('[Zeabur Debug] Direct div children count:', directDivs.length);
	
	// If only one direct div child, consider code not opened (regardless of content)
	if (directDivs.length <= 1) {
		console.log('[Zeabur Debug] Not enough div children, code not opened');
		return null;
	}
	
	const textContent = monacoElement.textContent || monacoElement.innerText;
	const trimmedContent = textContent.trim();
	
	console.log('[Zeabur Debug] Text content length:', trimmedContent.length);
	console.log('[Zeabur Debug] Text content preview:', trimmedContent.substring(0, 100));
	
	// Even if there are multiple divs, check if it's meaningful content
	if (trimmedContent.length < 5) {
		console.log('[Zeabur Debug] Content too short');
		return null;
	}
	
	// Check if content looks like actual code (has some programming indicators)
	const hasCodeIndicators = /[{}()\[\];=<>]/.test(trimmedContent) || 
							  trimmedContent.includes('function') || 
							  trimmedContent.includes('class') || 
							  trimmedContent.includes('def ') ||
							  trimmedContent.includes('import') ||
							  trimmedContent.includes('const ') ||
							  trimmedContent.includes('let ') ||
							  trimmedContent.includes('var ') ||
							  trimmedContent.includes('<') ||
							  trimmedContent.split('\n').length > 1; // Multi-line content
	
	console.log('[Zeabur Debug] Has code indicators:', hasCodeIndicators);
	
	if (!hasCodeIndicators) {
		console.log('[Zeabur Debug] No code indicators found');
		return null;
	}
	
	console.log('[Zeabur Debug] Code element found and validated');
	return monacoElement;
}

function detectFileType(code) {
	// Simple heuristics to detect file type
	if (code.includes('def ') || code.includes('import ') || code.includes('from ')) {
		return 'main.py';
	} else if (code.includes('function ') || code.includes('const ') || code.includes('let ') || code.includes('var ')) {
		return 'index.js';
	} else if (code.includes('<html>') || code.includes('<!DOCTYPE') || code.includes('<div>')) {
		return 'index.html';
	} else {
		return 'index.html'; // default
	}
}

async function uploadToZeabur(codeArray) {
	try {
		showUploadStatus('Uploading to Zeabur...');

		if (!Array.isArray(codeArray)) {
			console.error('Code is not an array:', codeArray);
			throw new Error('Invalid code format');
		}

		// Send message to content script via postMessage
		const response = await new Promise((resolve) => {
			const requestId = Math.random().toString(36).substr(2, 9);
			
			const messageHandler = (event) => {
				if (event.source !== window) return;
				
				if (event.data.type === 'ZEABUR_UPLOAD_RESPONSE' && event.data.requestId === requestId) {
					window.removeEventListener('message', messageHandler);
					resolve(event.data.response);
				}
			};
			
			window.addEventListener('message', messageHandler);
			
			window.postMessage({
				type: 'ZEABUR_UPLOAD_REQUEST',
				requestId: requestId,
				codeArray: codeArray
			}, '*');
		});

		if (response.error) {
			throw new Error(response.error);
		}

		if (response.success) {
			showUploadSuccess('Upload successful! Redirecting to Zeabur...');
			setTimeout(() => {
				window.open(response.url, '_blank');
			}, 1000);
		}

	} catch (err) {
		console.error('Upload error:', err);
		showUploadError('上傳失敗: ' + err.message);
	}
}

function showUploadStatus(message) {
	let statusEl = document.getElementById('zeabur-upload-status');
	if (!statusEl) {
		statusEl = document.createElement('div');
		statusEl.id = 'zeabur-upload-status';
		statusEl.style = 'position: fixed; bottom: 20px; right: 20px; background: rgba(0,0,0,0.8); color: white; padding: 12px; border-radius: 6px; z-index: 9999; font-size: 14px; max-width: 300px; box-shadow: 0 4px 12px rgba(0,0,0,0.2);';
		
		// Add CSS animation
		if (!document.getElementById('zeabur-spin-style')) {
			const style = document.createElement('style');
			style.id = 'zeabur-spin-style';
			style.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
			document.head.appendChild(style);
		}
		
		document.body.appendChild(statusEl);
	}
	
	// Clear and rebuild content using DOM
	statusEl.textContent = '';
	const container = document.createElement('div');
	container.style = 'display: flex; align-items: center; gap: 8px;';
	
	const spinner = document.createElement('div');
	spinner.style = 'width: 16px; height: 16px; border: 2px solid #ffffff; border-radius: 50%; border-top-color: transparent; animation: spin 1s linear infinite;';
	
	const text = document.createElement('div');
	text.textContent = message;
	
	container.appendChild(spinner);
	container.appendChild(text);
	statusEl.appendChild(container);
}

function showUploadSuccess(message) {
	let statusEl = document.getElementById('zeabur-upload-status');
	if (!statusEl) {
		statusEl = document.createElement('div');
		statusEl.id = 'zeabur-upload-status';
		statusEl.style = 'position: fixed; bottom: 20px; right: 20px; background: rgba(0,100,0,0.9); color: white; padding: 12px; border-radius: 6px; z-index: 9999; font-size: 14px; max-width: 300px; box-shadow: 0 4px 12px rgba(0,0,0,0.2);';
		document.body.appendChild(statusEl);
	}
	
	// Update background color for success
	statusEl.style.background = 'rgba(0,100,0,0.9)';
	
	// Clear and rebuild content using DOM
	statusEl.textContent = '';
	const container = document.createElement('div');
	container.style = 'display: flex; align-items: center; gap: 8px;';
	
	const checkmark = document.createElement('div');
	checkmark.style = 'width: 16px; height: 16px; display: flex; align-items: center; justify-content: center;';
	checkmark.textContent = '✓';
	
	const text = document.createElement('div');
	text.textContent = message;
	
	container.appendChild(checkmark);
	container.appendChild(text);
	statusEl.appendChild(container);

	setTimeout(() => {
		if (statusEl && statusEl.parentNode) {
			statusEl.parentNode.removeChild(statusEl);
		}
	}, 3000);
}

function showUploadError(message) {
	let statusEl = document.getElementById('zeabur-upload-status');
	if (!statusEl) {
		statusEl = document.createElement('div');
		statusEl.id = 'zeabur-upload-status';
		statusEl.style = 'position: fixed; bottom: 20px; right: 20px; background: rgba(180,0,0,0.9); color: white; padding: 12px; border-radius: 6px; z-index: 9999; font-size: 14px; max-width: 300px; box-shadow: 0 4px 12px rgba(0,0,0,0.2);';
		document.body.appendChild(statusEl);
	}
	
	// Update background color for error
	statusEl.style.background = 'rgba(180,0,0,0.9)';
	
	// Clear and rebuild content using DOM
	statusEl.textContent = '';
	const container = document.createElement('div');
	container.style = 'display: flex; align-items: center; gap: 8px;';
	
	const errorIcon = document.createElement('div');
	errorIcon.style = 'width: 16px; height: 16px; display: flex; align-items: center; justify-content: center;';
	errorIcon.textContent = '✕';
	
	const text = document.createElement('div');
	text.textContent = message;
	
	container.appendChild(errorIcon);
	container.appendChild(text);
	statusEl.appendChild(container);

	setTimeout(() => {
		if (statusEl && statusEl.parentNode) {
			statusEl.parentNode.removeChild(statusEl);
		}
	}, 5000);
}

// 取得 Share button 的第三級 parent
function getThirdParent(el) {
	if (!el) return null;
	let parent = el;
	for (let i = 0; i < 3; i++) {
		if (!parent.parentNode) return null;
		parent = parent.parentNode;
	}
	return parent;
}

registerGeminiDeployButton(); 