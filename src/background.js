chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ userData: NaN });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'process-fields') {
    chrome.tabs.captureVisibleTab({ format: 'png' }, (dataUrl) => {
      sendResponse({ screenshot: dataUrl });
    });
    return true;
  }
});