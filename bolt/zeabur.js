const registerBoltDeployButton = async () => {
	// if button already exists, return
	if (document.getElementById('bolt-extract-btn')) return;

	// create deploy to Zeabur button
	const btn = document.createElement('button');
	btn.id = 'bolt-extract-btn';
	btn.className = 'rounded-md items-center justify-center [&:is(:disabled,.disabled)]:cursor-not-allowed [&:is(:disabled,.disabled)]:opacity-60 px-3 py-1.5 text-xs text-bolt-elements-button-primary-text outline-accent-500 flex gap-1.7';
	btn.style.backgroundColor = '#6300ff';

	const span = document.createElement('span');
	span.textContent = 'Deploy with Zeabur';
	btn.appendChild(span);

	btn.onclick = async () => {
		const sourceCode = await getSourceCodeFromBolt();
		const codeArray = [];
		for (const [key, value] of Object.entries(sourceCode)) {
			if (value.type === 'folder') continue;
			codeArray.push([key.replace('/home/project/', ''), value.content]);
		}
		uploadToZeabur(codeArray);
	};

	const insertButtonAfterPublishButton = () => {
		const buttons = Array.from(document.querySelectorAll('button'));
		const deployButton = buttons.find(button => button.textContent.trim() === 'Deploy');

		if (deployButton) {
			deployButton.parentNode.insertBefore(btn, deployButton.nextSibling);
			return true;
		}
		return false;
	};

	const checkInterval = setInterval(() => {
		if (insertButtonAfterPublishButton()) {
			clearInterval(checkInterval);
		}
	}, 1000);
}

const getSourceCodeFromBolt = () => {
	return new Promise((resolve, reject) => {
		const root = document.querySelector('#root');
		const divInRootAndNotEmpty = root.querySelector('div:not(:empty)');
		let fiber = getReactFiberFromDom(divInRootAndNotEmpty);
		let fibers = walkFiber(fiber);
		let codeFiber = fibers.find(f => f.props?.files);
		resolve(codeFiber.props.files);
	});
}

function getReactFiberFromDom(dom) {
	const key = Object.keys(dom).find(k =>
		k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$')
	);
	return dom[key] || null;
}

function walkFiber(fiber, depth = 0, results = []) {
	if (!fiber) return results;

	const { type, memoizedProps } = fiber;

	let name = 'Unknown';
	if (typeof type === 'function') {
		name = type.displayName || type.name || 'Anonymous';
	} else if (typeof type === 'string') {
		name = type;
	} else if (type?.render) {
		name = type.render.displayName || type.render.name || 'Anonymous';
	}

	results.push({
		name,
		props: memoizedProps,
		depth,
		fiber,
	});

	if (fiber.child) walkFiber(fiber.child, depth + 1, results);
	if (fiber.sibling) walkFiber(fiber.sibling, depth, results);

	return results;
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

registerBoltDeployButton();