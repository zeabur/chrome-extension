// Import JSZip using importScripts for service worker
importScripts('jszip.min.js');

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
	if (request.action === 'uploadToZeabur') {
		handleZeaburUpload(request.codeArray)
			.then(result => sendResponse(result))
			.catch(error => sendResponse({ error: error.message }));
		return true; // Keep the message channel open for async response
	}
});

async function handleZeaburUpload(codeArray) {
	try {
		if (!Array.isArray(codeArray)) {
			throw new Error('Invalid code format');
		}

		// Create ZIP file using JSZip
		const zip = new JSZip();

		for (const [fileName, fileContent] of codeArray) {
			zip.file(fileName, fileContent);
		}

		const content = await zip.generateAsync({ type: 'uint8array' });
		const zipBlob = new Blob([content], { type: 'application/zip' });

		// Generate hash
		const arrayBuffer = await zipBlob.arrayBuffer();
		const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
		const hashArray = Array.from(new Uint8Array(hashBuffer));
		const hashBase64 = btoa(String.fromCharCode(...hashArray));

		// Create upload session
		const createUploadResponse = await fetch('https://api.zeabur.com/v2/upload', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				content_hash: hashBase64,
				content_hash_algorithm: 'sha256',
				content_length: zipBlob.size,
			}),
		});

		if (!createUploadResponse.ok) {
			throw new Error('Failed to create upload session');
		}

		const { presign_url, presign_header, upload_id } = await createUploadResponse.json();

		// Upload file
		const uploadResponse = await fetch(presign_url, {
			method: 'PUT',
			headers: presign_header,
			body: zipBlob,
		});

		if (!uploadResponse.ok) {
			throw new Error('Failed to upload file');
		}

		// Prepare deployment
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
		return { success: true, url };

	} catch (error) {
		throw error;
	}
} 