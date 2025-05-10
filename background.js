chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'DOWNLOAD_VIDEO') {
    chrome.downloads.download({
      url: request.url,
      filename: request.filename,
      saveAs: true
    });
  }
}); 