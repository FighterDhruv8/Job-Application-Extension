// Copyright (c) 2012,2013 Peter Coles - http://mrcoles.com/ - All rights reserved.
// Use of this source code is governed by the MIT License found in LICENSE

//
// State fields
//

let currentTab, // result of chrome.tabs.query of current active tab
    resultWindowId; // window id for putting resulting images

//
// Utility methods
//

// function $(id) { return document.getElementById(id); }
// function show(id) { $(id).style.display = 'block'; }
// function hide(id) { $(id).style.display = 'none'; }

function getFilename(contentURL) {
    let name = contentURL.split('?')[0].split('#')[0];

    if (name) {
        name = name
            .replace(/^https?:\/\//, '')
            .replace(/[^A-z0-9]+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^[_\-]+/, '')
            .replace(/[_\-]+$/, '');

        name = '-' + name;
    } else {
        name = '';
    }

    return 'screencapture' + name + '-' + Date.now() + '.png';
}

function convertFileUrlToDataURL(fileUrl, callback, errorCallback) {
  // Remove 'filesystem:' from the URL to get the actual path
  const filePath = fileUrl.replace('filesystem:chrome-extension://', '');

  // Get the extension ID
  const extensionId = chrome.i18n.getMessage('@@extension_id');
  const fileSystemPath = filePath.replace(extensionId + '/temporary/', '');

  // Request the filesystem
  const reqFileSystem = window.requestFileSystem || window.webkitRequestFileSystem;

  reqFileSystem(window.TEMPORARY, 0, function (fs) {
      // Get the file entry using the path
      fs.root.getFile(fileSystemPath, {}, function (fileEntry) {
          // Create a FileReader to read the file
          fileEntry.file(function (file) {
              const reader = new FileReader();

              reader.onloadend = function () {
                  // This is the Data URL of the image
                  const dataUrl = reader.result;
                  callback(dataUrl); // Pass the Data URL to the callback
              };

              // If there's an error reading the file
              reader.onerror = function (err) {
                  if (errorCallback) {
                      errorCallback(err);
                  }
              };

              // Read the file as a Data URL (this will convert it to base64)
              reader.readAsDataURL(file);
          }, function (error) {
              if (errorCallback) {
                  errorCallback(error);
              }
          });
      }, function (error) {
          if (errorCallback) {
              errorCallback(error);
          }
      });
  }, function (error) {
      if (errorCallback) {
          errorCallback(error);
      }
  });
}
function convertFileUrlToDataURLPromise(filename) {
  return new Promise((resolve, reject) => {
      convertFileUrlToDataURL(filename, (dataUrl) => {
          resolve(dataUrl);  // Resolve with the data URL
      }, (error) => {
          reject(error);  // Reject if there was an error
      });
  });
}
//
// Capture Handlers
//
let screenshot = {};
async function displayCaptures(filenames, resolveCallBack) {
  if (!filenames || !filenames.length) {
      return;
  }

  try {
      // Await the data URL from the promise
      const dataUrl = await convertFileUrlToDataURLPromise(filenames[0]);

      // Update the global screenshot object
      screenshot = { data: dataUrl };

  } catch (error) {
      // Handle any errors from the Promise
      console.error('Error:', error);
  }
  resolveCallBack();
}

function _displayCapture(filenames, index) {
    index = index || 0;

    const filename = filenames[index];
    const last = index === filenames.length - 1;

    if (currentTab.incognito && index === 0) {
        // cannot access file system in incognito, so open in non-incognito
        // window and add any additional tabs to that window.
        //
        // we have to be careful with focused too, because that will close
        // the popup.
        chrome.windows.create({
            url: filename,
            incognito: false,
            focused: last
        }, function (win) {
            resultWindowId = win.id;
        });
    } else {
        chrome.tabs.create({
            url: filename,
            active: last,
            windowId: resultWindowId,
            openerTabId: currentTab.id,
            index: (currentTab.incognito ? 0 : currentTab.index) + 1 + index
        });
    }

    if (!last) {
        _displayCapture(filenames, index + 1);
    }
}

function errorHandler(reason) {
    //show('uh-oh'); // TODO - extra uh-oh info?
}

function progress(complete) {
    // if (complete === 0) {
    //     // Page capture has just been initiated.
    //     show('loading');
    // }
    // else {
    //     $('bar').style.width = parseInt(complete * 100, 10) + '%';
    // }
}

function splitnotifier() {
    //show('split-image');
}

async function captureSS() {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      const tab = tabs[0];
      currentTab = tab; // used in later calls to get tab info
      const filename = getFilename(tab.url);

      // Using CaptureAPI, assume it calls a callback when it's done
      CaptureAPI.captureToFiles(tab, filename, 
        (captures) => {
          displayCaptures(captures, resolve);
        },
        (error) => {
          errorHandler(error);
          reject(error); // Rejecting the promise if there's an error
        },
        progress, 
        splitnotifier);
    });
  });
}


document.getElementById('autoFillBtn').addEventListener('click', async () => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const { userData } = await chrome.storage.local.get('userData');

    if (!userData?.email) {
      alert('Configure user data first');
      return;
    }

    console.log("Starting capture process...");
    // Ensure captureSS() completes
    await captureSS();  // This should now wait for the capture process to finish

    console.log("Capture completed, screenshot data:", screenshot);  // Debugging screenshot data

    const [html] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => document.documentElement.outerHTML
    });

    // Prepare execution context
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      args: [screenshot.data, html.result, userData],
      func: (s, h, d) => {
        if (!s || !h || !d) {
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