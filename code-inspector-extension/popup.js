// Popup script for Code Inspector extension

document.addEventListener('DOMContentLoaded', function() {
  // Load saved settings
  loadSettings();
  
  // Check if there's a current selection on the active tab
  checkCurrentSelection();
  
  // Set up event listeners for settings changes
  setupSettingsListeners();
});

// Load saved settings from chrome.storage.sync
function loadSettings() {
  chrome.storage.sync.get(['htmlDepth', 'showComputedStyles'], function(result) {
    // Set HTML depth dropdown
    if (result.htmlDepth) {
      document.getElementById('html-depth').value = result.htmlDepth;
    }
    
    // Set computed styles checkbox
    if (result.showComputedStyles !== undefined) {
      document.getElementById('show-computed').checked = result.showComputedStyles;
    }
  });
}

// Check if there's currently text selected on the page
function checkCurrentSelection() {
  chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    if (tabs[0]) {
      // Check if we're on a valid page (not chrome:// or similar)
      const url = tabs[0].url;
      if (url.startsWith('chrome://') || url.startsWith('chrome-extension://') || url.startsWith('about:')) {
        document.getElementById('selection-status').textContent = 
          'Cannot inspect code on restricted pages (chrome://, about:, etc.)';
        document.querySelector('.selection-info').style.display = 'block';
        return;
      }
      
      // Send message to the content script to get selection info
      chrome.tabs.sendMessage(
        tabs[0].id,
        { action: 'getSelectionInfo' },
        function(response) {
          // Handle response (or lack thereof)
          if (chrome.runtime.lastError) {
            // Content script might not be loaded yet
            document.getElementById('selection-status').textContent = 
              'Please refresh the page to enable Code Inspector.';
            document.querySelector('.selection-info').style.display = 'block';
            return;
          }
          
          if (response && response.success) {
            document.getElementById('selection-status').textContent = 
              'Text is currently selected. HTML, CSS, and DOM path information is available in the overlay.';
            document.querySelector('.selection-info').style.display = 'block';
          } else {
            document.getElementById('selection-status').textContent = 
              response && response.message || 'No text currently selected.';
            document.querySelector('.selection-info').style.display = 'block';
          }
        }
      );
    }
  });
}

// Set up event listeners for settings changes
function setupSettingsListeners() {
  // HTML depth dropdown change
  document.getElementById('html-depth').addEventListener('change', function(e) {
    const depth = parseInt(e.target.value, 10);
    // Save setting
    chrome.storage.sync.set({ htmlDepth: depth });
    
    // Notify content script of setting change
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      if (tabs[0]) {
        chrome.tabs.sendMessage(
          tabs[0].id,
          { 
            action: 'updateSettings',
            settings: { htmlDepth: depth }
          }
        );
      }
    });
  });
  
  // Show computed styles checkbox change
  document.getElementById('show-computed').addEventListener('change', function(e) {
    const showComputed = e.target.checked;
    // Save setting
    chrome.storage.sync.set({ showComputedStyles: showComputed });
    
    // Notify content script of setting change
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      if (tabs[0]) {
        chrome.tabs.sendMessage(
          tabs[0].id,
          { 
            action: 'updateSettings',
            settings: { showComputedStyles: showComputed }
          }
        );
      }
    });
  });
}