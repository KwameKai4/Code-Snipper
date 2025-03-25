// Background script for Code Inspector extension
// Handles communication between popup and content scripts

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // If the message is requesting selection info
  if (message.action === 'getSelectionInfo') {
    // Query the active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs[0]) {
        // Send message to the content script in the active tab
        chrome.tabs.sendMessage(
          tabs[0].id,
          { action: 'getSelectionInfo' },
          (response) => {
            // Forward the response back to the popup
            sendResponse(response);
          }
        );
      } else {
        sendResponse({ success: false, message: 'No active tab found' });
      }
    });
    // Return true to indicate that the response will be sent asynchronously
    return true;
  }
  
  // If the message is for changing settings
  if (message.action === 'updateSettings') {
    // Store settings in chrome.storage.sync
    chrome.storage.sync.set(message.settings, () => {
      sendResponse({ success: true });
    });
    return true;
  }
});

// Handle installation and updates
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // Set default settings on install
    chrome.storage.sync.set({
      htmlDepth: 3,
      showComputedStyles: true
    });
  }
});