async function autoFillForm(screenshot, html, userData) {
  try {
    const response = await fetch('http://localhost:3000/proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        screenshot: screenshot.split(',')[1],
        html: html.substring(0, 5000),
        userData
      })
    });

    if (!response.ok) throw new Error('Server error: ' + response.status);

    // Modified to handle array response directly
    const fields = await response.json();
    const formElements = document.querySelectorAll('input, textarea, select');

    if (!Array.isArray(fields)) {
      throw new Error('Invalid fields format from server');
    }

    // Improved matching using label text
    fields.forEach(field => {
      const matchedElement = Array.from(formElements).find(el => {
        const labelText = el.labels?.[0]?.textContent?.toLowerCase() || '';
        return labelText.includes(field.label.toLowerCase());
      });
      
      if (matchedElement && field.value) {
        matchedElement.value = field.value;
        matchedElement.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });

  } catch (error) {
    console.error('Autofill failed:', error);
    chrome.runtime.sendMessage({ 
      type: 'error',
      message: error.message
    });
  }
}

// Initiate when injected
if (typeof autoFillForm === 'function' && window.__AUTOFILL_CONTEXT__) {
  autoFillForm(...window.__AUTOFILL_CONTEXT__);
}