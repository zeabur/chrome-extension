const registerClaudeDeployButton = async () => {
	// if button already exists, return
	if (document.getElementById('claude-extract-btn')) return;
	
	// create deploy to Zeabur button
	const btn = document.createElement('button');
	btn.id = 'claude-extract-btn';
	btn.className = 'inline-flex items-center justify-center relative shrink-0 can-focus select-none disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none disabled:drop-shadow-none bg-text-000 text-bg-000 relative overflow-hidden font-medium font-styrene transition-transform will-change-transform ease-[cubic-bezier(0.165,0.85,0.45,1)] duration-150 hover:scale-y-[1.015] hover:scale-x-[1.005] backface-hidden after:absolute after:inset-0 after:bg-[radial-gradient(at_bottom,hsla(var(--bg-000)/20%),hsla(var(--bg-000)/0%))] after:opacity-0 after:transition after:duration-200 after:translate-y-2 hover:after:opacity-100 hover:after:translate-y-0 h-8 rounded-md px-3 text-xs min-w-[4rem] active:scale-[0.985] whitespace-nowrap  pl-2 pr-2.5 gap-1 font-medium !text-sm'
	btn.style.backgroundColor = '#6300ff';
	btn.style.transition = 'opacity 0.3s ease, transform 0.3s ease';

	const span = document.createElement('span');
	span.className = 'hidden md:flex';
	span.textContent = 'Deploy with Zeabur';
	btn.appendChild(span);

	btn.onclick = async () => {
		const sourceCode = await getSourceCodeFromClaude();
		uploadToZeabur(sourceCode);
	};

	let isButtonVisible = false;

	setInterval(() => {
		const codeElements = document.querySelectorAll('code.language-html, code.language-javascript, code.language-python');
		const codeElement = codeElements.length > 0 ? codeElements[codeElements.length - 1] : null;
		const deployButton = document.getElementById('claude-extract-btn');

		if (codeElement && !isButtonVisible) {
			isButtonVisible = true;
			const buttons = Array.from(document.querySelectorAll('button'));
			const publishButton = buttons.find(button => button.textContent.trim() === 'Publish');
			if (publishButton && !deployButton) {
				btn.style.opacity = '0';
				btn.style.transform = 'translateY(5px)';
				publishButton.parentNode.insertBefore(btn, publishButton);
				setTimeout(() => {
					btn.style.opacity = '1';
					btn.style.transform = 'translateY(0)';
				}, 10);
			}
		} else if (!codeElement && isButtonVisible) {
			isButtonVisible = false;
			if (deployButton) {
				deployButton.style.opacity = '0';
				deployButton.style.transform = 'translateY(5px)';
				setTimeout(() => {
					// Re-check if button should be visible before removing
					if (!isButtonVisible) {
						deployButton.remove();
					}
				}, 300); // Wait for transition to finish
			}
		}
	}, 500);
}

const getSourceCodeFromClaude = () => {
	return new Promise((resolve, reject) => {
		const codeElements = document.querySelectorAll('code.language-html, code.language-javascript, code.language-python');
		const codeElement = codeElements.length > 0 ? codeElements[codeElements.length - 1] : null;

		if (codeElement) {
			const langClass = Array.from(codeElement.classList).find(c => c.startsWith('language-'));
			const lang = langClass ? langClass.replace('language-', '') : 'html';
			let filename;

			if (lang === 'python') {
				filename = 'main.py';
			} else if (lang === 'javascript') {
				filename = 'index.js';
			} else {
				filename = 'index.html';
			}
			resolve([[filename, codeElement.innerText]]);
		} else {
			// Keep trying to find the element
			const startTime = Date.now();
			const timeout = 15000;

			const interval = setInterval(() => {
				const codeElements = document.querySelectorAll('code.language-html, code.language-javascript, code.language-python');
				const el = codeElements.length > 0 ? codeElements[codeElements.length - 1] : null;

				if (el) {
					clearInterval(interval);
					const langClass = Array.from(el.classList).find(c => c.startsWith('language-'));
					const lang = langClass ? langClass.replace('language-', '') : 'html';
					let filename;

					if (lang === 'python') {
						filename = 'main.py';
					} else if (lang === 'javascript') {
						filename = 'index.js';
					} else {
						filename = 'index.html';
					}
					resolve([[filename, el.innerText]]);
				} else if (Date.now() - startTime > timeout) {
					clearInterval(interval);
					reject(new Error('Timeout: code element not found'));
				}
			}, 500);
		}
	});
}

async function uploadToZeabur(codeArray) {
	try {
		showUploadStatus('Uploading to Zeabur...');

		if (!Array.isArray(codeArray)) {
			console.error('Code is not an array:', codeArray);
			throw new Error('Invalid code format');
		}

		const zip = new JSZip();

		for (const [fileName, fileContent] of codeArray) {
			zip.file(fileName, fileContent);
		}

		const content = await zip.generateAsync({ type: 'blob' });
		const zipFile = new File([content], 'source_code.zip', {
			type: 'application/zip',
		});

		const arrayBuffer = await zipFile.arrayBuffer();
		const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
		const hashArray = Array.from(new Uint8Array(hashBuffer));
		const hashBase64 = window.btoa(String.fromCharCode(...hashArray));

		showUploadStatus('Creating upload session...');

		const createUploadResponse = await fetch('https://api.zeabur.com/v2/upload', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				content_hash: hashBase64,
				content_hash_algorithm: 'sha256',
				content_length: zipFile.size,
			}),
		});

		if (!createUploadResponse.ok) {
			throw new Error('Failed to create upload session');
		}

		const { presign_url, presign_header, upload_id } = await createUploadResponse.json();

		showUploadStatus('Uploading to Zeabur...');

		const uploadResponse = await fetch(presign_url, {
			method: 'PUT',
			headers: presign_header,
			body: zipFile,
		});

		if (!uploadResponse.ok) {
			throw new Error('Failed to upload file');
		}

		showUploadStatus('Preparing deployment...');

		const prepareResponse = await fetch(`https://api.zeabur.com/v2/upload/${upload_id}/prepare`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				upload_type: 'new_project',
			}),
		});

		if (!prepareResponse.ok) {
			const { error } = await prepareResponse.json();
			throw new Error(`Failed to prepare upload: ${error}`);
		}

		const { url } = await prepareResponse.json();
		showUploadSuccess('Upload successful! Redirecting to Zeabur...');

		setTimeout(() => {
			window.open(url, '_blank');
		}, 1000);

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
		document.body.appendChild(statusEl);
	}
	statusEl.innerHTML = `<div style="display: flex; align-items: center; gap: 8px;">
		<div style="width: 16px; height: 16px; border: 2px solid #ffffff; border-radius: 50%; border-top-color: transparent; animation: spin 1s linear infinite;"></div>
		<div>${message}</div>
	</div>
	<style>
		@keyframes spin {
			to { transform: rotate(360deg); }
		}
	</style>`;
}

function showUploadSuccess(message) {
	let statusEl = document.getElementById('zeabur-upload-status');
	if (!statusEl) {
		statusEl = document.createElement('div');
		statusEl.id = 'zeabur-upload-status';
		statusEl.style = 'position: fixed; bottom: 20px; right: 20px; background: rgba(0,100,0,0.9); color: white; padding: 12px; border-radius: 6px; z-index: 9999; font-size: 14px; max-width: 300px; box-shadow: 0 4px 12px rgba(0,0,0,0.2);';
		document.body.appendChild(statusEl);
	}
	statusEl.innerHTML = `<div style="display: flex; align-items: center; gap: 8px;">
		<div style="width: 16px; height: 16px; display: flex; align-items: center; justify-content: center;">✓</div>
		<div>${message}</div>
	</div>`;

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
	statusEl.innerHTML = `<div style="display: flex; align-items: center; gap: 8px;">
		<div style="width: 16px; height: 16px; display: flex; align-items: center; justify-content: center;">✕</div>
		<div>${message}</div>
	</div>`;

	setTimeout(() => {
		if (statusEl && statusEl.parentNode) {
			statusEl.parentNode.removeChild(statusEl);
		}
	}, 5000);
}

registerClaudeDeployButton(); 