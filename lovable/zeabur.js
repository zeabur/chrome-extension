const registerLovableDeployButton = async () => {
	// if button already exists, return
	if (document.getElementById('lovable-extract-btn')) return;

	// create deploy to Zeabur button
	const btn = document.createElement('button');
	btn.id = 'lovable-extract-btn';
	btn.className = 'inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none text-primary hover:opacity-80 [&>*]:text-shadow-sm shadow-black/50 h-7 rounded-md px-2 py-2 gap-1.5';
	btn.style.backgroundColor = '#6300ff';

	const span = document.createElement('span');
	span.className = 'hidden md:flex';
	span.textContent = 'Deploy with Zeabur';
	btn.appendChild(span);

	btn.onclick = async () => {
		toggleLovableCodeViewer();
		const sourceCode = await getSourceCodeFromLovable();
		uploadToZeabur(sourceCode);
	};

	const insertButtonAfterPublishButton = () => {
		const spans = Array.from(document.querySelectorAll('span'));
		const publishSpan = spans.find(span => span.textContent.trim() === 'Publish');

		if (publishSpan) {
			const publishButton = publishSpan.closest('button');
			if (publishButton) {
				// Insert our button after the publish button
				publishButton.parentNode.insertBefore(btn, publishButton.nextSibling);
				return true;
			}
		}
		return false;
	};

	const checkInterval = setInterval(() => {
		if (insertButtonAfterPublishButton()) {
			clearInterval(checkInterval);
		}
	}, 1000);
}

const getSourceCodeFromLovable = () => {
	return new Promise((resolve, reject) => {
		const main = document.querySelector('main');
		let fiber = getReactFiberFromDom(main);
		let fibers = walkFiber(fiber);

		// find fiber with props "code" and "currentFile"
		let codeFiber = fibers.find(f => f.props?.code && f.props.currentFile);

		// Loop until codeFiber is found or a timeout occurs
		const startTime = Date.now();
		const timeout = 15000;

		const interval = setInterval(() => {
			if (codeFiber) {
				clearInterval(interval);
				resolve(codeFiber.props.code);
			} else if (Date.now() - startTime > timeout) {
				clearInterval(interval);
				reject(new Error('Timeout: codeFiber not found'));
			} else {
				fiber = getReactFiberFromDom(main);
				fibers = walkFiber(fiber);
				codeFiber = fibers.find(f => f.props?.code && f.props.currentFile);
			}
		}, 500);
	});
}

function getReactFiberFromDom(dom) {
	const key = Object.keys(dom).find(k =>
		k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$')
	);
	return dom[key] || null;
}

function walkFiber(fiber, depth = 0) {
	if (!fiber) return [];

	const results = [];

	try {
		const name = fiber.type?.name || fiber.type?.displayName || 'Anonymous';
		const props = fiber.memoizedProps;

		results.push({
			name,
			props,
			depth,
		});
	} catch (err) {
		console.warn('Error reading fiber', fiber, err);
	}

	// Walk child first (DFS)
	const childResults = walkFiber(fiber.child, depth + 1);
	const siblingResults = walkFiber(fiber.sibling, depth);

	return [...results, ...childResults, ...siblingResults];
}

const toggleLovableCodeViewer = () => {
	const button = document.querySelector('button[aria-label="Code viewer"]');

	if (button && button.getAttribute('data-state') === 'off') {
		button.click();
	}
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

registerLovableDeployButton();