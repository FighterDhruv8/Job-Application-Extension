document.getElementById('autoFillBtn').addEventListener('click', async () => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const { userData } = await chrome.storage.local.get('userData');

    if (!userData?.email) {
      alert('Configure user data first');
      return;
    }

    // Capture screenshot and HTML
    const screenshot = await new Promise(resolve => {
      chrome.runtime.sendMessage({ type: 'process-fields' }, resolve);
    });
    
    const [html] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => document.documentElement.outerHTML
    });

    // Prepare execution context
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      args: [screenshot.screenshot, html.result, userData],
      func: (s, h, d) => {
        if (!s || !h || !d)
        {
          throw new Error('Missing autofill context');
        }
        window.__AUTOFILL_CONTEXT__ = [s, h, d];
      }
    });

    // Inject content script
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js']
    });

  } catch (error) {
    alert(`Error: ${error.message}`);
  }
});

document.getElementById('settingsBtn').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});