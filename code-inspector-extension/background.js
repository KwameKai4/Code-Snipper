// Background script for Code Inspector extension
// Handles communication between popup and content scripts

// Create the context menu item when the extension is installed
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install' || details.reason === 'update') {
    // Set default settings on install
    chrome.storage.sync.set({
      htmlDepth: 3,
      showComputedStyles: true
    });
    
    // Create the context menu item
    chrome.contextMenus.create({
      id: "inspectElement",
      title: "Inspect Element Code",
      contexts: ["selection"]
    });
  }
});

// Listen for clicks on the context menu item
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "inspectElement") {
    // Send a message to the content script to show the inspector
    chrome.tabs.sendMessage(tab.id, { action: 'showInspector' });
  }
});

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