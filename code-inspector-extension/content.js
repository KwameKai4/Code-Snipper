// Content script for Code Inspector extension
// Handles text highlighting and extracts HTML/CSS information

let inspectorPanel = null;
let settings = {
  htmlDepth: 3, // Default HTML inspection depth (up to 3 parent levels)
  showComputedStyles: true
};

// Initialize the extension
function initialize() {
  // Create inspector panel for displaying code information
  createInspectorPanel();
  
  // Load user settings
  chrome.storage.sync.get(['htmlDepth', 'showComputedStyles'], (result) => {
    if (result.htmlDepth) settings.htmlDepth = result.htmlDepth;
    if (result.showComputedStyles !== undefined) settings.showComputedStyles = result.showComputedStyles;
  });
  
  // Add event listeners for text selection
  document.addEventListener('mouseup', handleTextSelection);
  document.addEventListener('keyup', handleTextSelection);
}

// Create the inspector panel as a fixed position element
function createInspectorPanel() {
  inspectorPanel = document.createElement('div');
  inspectorPanel.id = 'code-inspector-panel';
  inspectorPanel.className = 'code-inspector-panel';
  inspectorPanel.innerHTML = `
    <div class="code-inspector-header">
      <h3>Code Inspector</h3>
      <div class="code-inspector-controls">
        <button id="code-inspector-close">×</button>
      </div>
    </div>
    <div class="code-inspector-tabs">
      <button class="code-inspector-tab active" data-tab="html">HTML</button>
      <button class="code-inspector-tab" data-tab="css">CSS</button>
      <button class="code-inspector-tab" data-tab="path">DOM Path</button>
    </div>
    <div class="code-inspector-content">
      <div class="code-inspector-tab-content active" id="html-content">
        <div class="code-inspector-code-container">
          <pre><code id="html-code"></code></pre>
        </div>
        <button class="copy-button" data-content="html">Copy HTML</button>
      </div>
      <div class="code-inspector-tab-content" id="css-content">
        <div class="code-inspector-code-container">
          <pre><code id="css-code"></code></pre>
        </div>
        <button class="copy-button" data-content="css">Copy CSS</button>
      </div>
      <div class="code-inspector-tab-content" id="path-content">
        <div class="code-inspector-code-container">
          <pre><code id="dom-path"></code></pre>
        </div>
        <button class="copy-button" data-content="path">Copy Path</button>
      </div>
    </div>
    <div class="code-inspector-footer">
      <label>
        HTML Depth:
        <select id="html-depth">
          <option value="1">1 Level</option>
          <option value="2">2 Levels</option>
          <option value="3" selected>3 Levels</option>
          <option value="5">5 Levels</option>
        </select>
      </label>
      <label>
        <input type="checkbox" id="show-computed" checked>
        Show computed styles
      </label>
    </div>
  `;
  
  document.body.appendChild(inspectorPanel);
  
  // Setup event listeners for panel interactions
  setupPanelEventListeners();
}

// Setup event listeners for panel interactions
function setupPanelEventListeners() {
  // Close button
  document.getElementById('code-inspector-close').addEventListener('click', () => {
    inspectorPanel.classList.remove('visible');
  });
  
  // Tab switching
  document.querySelectorAll('.code-inspector-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.code-inspector-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.code-inspector-tab-content').forEach(c => c.classList.remove('active'));
      
      tab.classList.add('active');
      document.getElementById(`${tab.dataset.tab}-content`).classList.add('active');
    });
  });
  
  // Copy buttons
  document.querySelectorAll('.copy-button').forEach(button => {
    button.addEventListener('click', () => {
      let contentType = button.dataset.content;
      let contentElement;
      
      switch(contentType) {
        case 'html':
          contentElement = document.getElementById('html-code');
          break;
        case 'css':
          contentElement = document.getElementById('css-code');
          break;
        case 'path':
          contentElement = document.getElementById('dom-path');
          break;
      }
      
      if (contentElement) {
        navigator.clipboard.writeText(contentElement.textContent)
          .then(() => {
            button.textContent = 'Copied!';
            setTimeout(() => {
              button.textContent = `Copy ${contentType.toUpperCase()}`;
            }, 1500);
          })
          .catch(err => {
            console.error('Failed to copy: ', err);
          });
      }
    });
  });
  
  // Settings change handlers
  document.getElementById('html-depth').addEventListener('change', (e) => {
    settings.htmlDepth = parseInt(e.target.value, 10);
    chrome.storage.sync.set({ htmlDepth: settings.htmlDepth });
    
    // Update the display if panel is currently visible
    if (inspectorPanel.classList.contains('visible')) {
      const selection = window.getSelection();
      if (selection.toString().trim().length > 0) {
        updateInspectorPanel(selection);
      }
    }
  });
  
  document.getElementById('show-computed').addEventListener('change', (e) => {
    settings.showComputedStyles = e.target.checked;
    chrome.storage.sync.set({ showComputedStyles: settings.showComputedStyles });
    
    // Update the display if panel is currently visible
    if (inspectorPanel.classList.contains('visible')) {
      const selection = window.getSelection();
      if (selection.toString().trim().length > 0) {
        updateInspectorPanel(selection);
      }
    }
  });
}

// Handle text selection events (mouse or keyboard)
function handleTextSelection(event) {
  const selection = window.getSelection();
  
  // Check if the selection is valid and not empty
  if (selection.toString().trim().length > 0) {
    // Don't show the panel if the selection is within the inspector panel itself
    if (event.target.closest('#code-inspector-panel')) {
      return;
    }
    
    updateInspectorPanel(selection);
    positionPanel(event);
  } else {
    // Hide panel when selection is cleared (unless clicked within the panel)
    if (!event.target.closest('#code-inspector-panel')) {
      inspectorPanel.classList.remove('visible');
    }
  }
}

// Update the inspector panel with information about the selected element
function updateInspectorPanel(selection) {
  // Get the selected node
  const range = selection.getRangeAt(0);
  const selectedNode = range.commonAncestorContainer;
  
  // Get the actual element (might be a text node)
  const selectedElement = selectedNode.nodeType === Node.TEXT_NODE 
    ? selectedNode.parentElement 
    : selectedNode;
  
  if (!selectedElement) return;
  
  // Get HTML snippet with parent elements up to the specified depth
  const htmlSnippet = getHtmlSnippet(selectedElement, settings.htmlDepth);
  
  // Get CSS rules affecting the element
  const cssRules = getCssRules(selectedElement);
  
  // Get DOM path
  const domPath = getDomPath(selectedElement);
  
  // Update panel content
  document.getElementById('html-code').textContent = htmlSnippet;
  document.getElementById('css-code').textContent = cssRules;
  document.getElementById('dom-path').textContent = domPath;
  
  // Make panel visible
  inspectorPanel.classList.add('visible');
}

// Position the panel near the selected text
function positionPanel(event) {
  const panelWidth = 400; // Set panel width
  const panelHeight = 500; // Approximate panel height
  
  // Calculate position based on mouse coordinates or selection bounds
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;
  
  // Default position near cursor
  let x = event.clientX + 20;
  let y = event.clientY + 20;
  
  // Ensure panel stays within viewport
  if (x + panelWidth > windowWidth) {
    x = windowWidth - panelWidth - 20;
  }
  
  if (y + panelHeight > windowHeight) {
    y = windowHeight - panelHeight - 20;
  }
  
  // Apply position
  inspectorPanel.style.left = `${x}px`;
  inspectorPanel.style.top = `${y}px`;
}

// Get HTML snippet with parent elements up to specified depth
function getHtmlSnippet(element, depth) {
  // Handle shadow DOM
  if (element.getRootNode() instanceof ShadowRoot) {
    // Add note about shadow DOM
    return `<!-- Element is within Shadow DOM -->\n${getElementHtml(element, depth)}`;
  }
  
  return getElementHtml(element, depth);
}

// Helper function to get element HTML with formatting
function getElementHtml(element, depth) {
  // Base case: if depth is 0 or element is null
  if (depth <= 0 || !element || element === document.documentElement) {
    return '';
  }
  
  // Create a clone to work with
  const clone = element.cloneNode(true);
  
  // Format the HTML with indentation
  const serializer = new XMLSerializer();
  let html = serializer.serializeToString(element);
  
  // Use regex to add indentation and line breaks
  html = html.replace(/></g, '>\n<');
  html = html.replace(/(<[^/][^>]*>)([^<]*)/g, '$1\n  $2');
  
  // For depth > 1, get parent HTML recursively
  if (depth > 1 && element.parentElement && element.parentElement !== document.documentElement) {
    return getElementHtml(element.parentElement, depth - 1);
  }
  
  return html;
}

// Get CSS rules affecting the element
function getCssRules(element) {
  let cssText = '';
  
  // Get applied CSS rules
  try {
    // Get all stylesheets
    const styleSheets = Array.from(document.styleSheets);
    
    for (const sheet of styleSheets) {
      try {
        // Some stylesheets may not be accessible due to CORS
        const rules = Array.from(sheet.cssRules || sheet.rules || []);
        
        for (const rule of rules) {
          // Check if this rule applies to our element
          if (rule.selectorText && element.matches(rule.selectorText)) {
            cssText += `/* From ${sheet.href || 'inline stylesheet'} */\n`;
            cssText += `${rule.selectorText} {\n`;
            cssText += `  ${rule.style.cssText.split(';').join(';\n  ')}\n`;
            cssText += `}\n\n`;
          }
        }
      } catch (e) {
        // CORS error, skip this stylesheet
        cssText += `/* Could not access rules from ${sheet.href || 'a stylesheet'} (possibly due to CORS) */\n\n`;
      }
    }
  } catch (e) {
    cssText += `/* Error retrieving CSS: ${e.message} */\n`;
  }
  
  // Get computed styles if requested and no explicit rules were found
  if (settings.showComputedStyles && (!cssText || cssText.trim() === '')) {
    cssText += '/* Computed styles */\n';
    const computedStyle = window.getComputedStyle(element);
    
    cssText += '{\n';
    for (const prop of computedStyle) {
      const value = computedStyle.getPropertyValue(prop);
      if (value) {
        cssText += `  ${prop}: ${value};\n`;
      }
    }
    cssText += '}\n';
  }
  
  return cssText || '/* No CSS rules found for this element */';
}

// Get DOM path to the element
function getDomPath(element) {
  let path = '';
  let current = element;
  
  while (current && current !== document.documentElement) {
    let selector = current.tagName.toLowerCase();
    
    // Add id if present
    if (current.id) {
      selector += `#${current.id}`;
    } else {
      // Add classes if present
      if (current.className && typeof current.className === 'string') {
        selector += `.${current.className.trim().replace(/\s+/g, '.')}`;
      }
      
      // Add position if needed
      const siblings = current.parentNode ? Array.from(current.parentNode.children) : [];
      if (siblings.length > 1) {
        const index = siblings.indexOf(current) + 1;
        if (index > 0) {
          selector += `:nth-child(${index})`;
        }
      }
    }
    
    // Add to path
    path = path ? `${selector} > ${path}` : selector;
    current = current.parentNode instanceof Element ? current.parentNode : null;
  }
  
  return path;
}

// Handle error cases like restricted pages
function handleRestrictedPage() {
  try {
    // Check if we're on a restricted page
    if (window.location.protocol === 'chrome:' || 
        window.location.protocol === 'chrome-extension:' ||
        window.location.protocol === 'about:') {
      console.warn('Code Inspector: Cannot run on restricted page.');
      return false;
    }
    return true;
  } catch (e) {
    console.error('Code Inspector error:', e);
    return false;
  }
}

// Initialize if not on a restricted page
if (handleRestrictedPage()) {
  // Initialize when DOM is fully loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }
}

// Listen for messages from the background script or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getSelectionInfo') {
    const selection = window.getSelection();
    if (selection.toString().trim().length > 0) {
      const range = selection.getRangeAt(0);
      const selectedNode = range.commonAncestorContainer;
      const selectedElement = selectedNode.nodeType === Node.TEXT_NODE 
        ? selectedNode.parentElement 
        : selectedNode;
      
      if (selectedElement) {
        const htmlSnippet = getHtmlSnippet(selectedElement, settings.htmlDepth);
        const cssRules = getCssRules(selectedElement);
        const domPath = getDomPath(selectedElement);
        
        sendResponse({
          success: true,
          html: htmlSnippet,
          css: cssRules,
          path: domPath
        });
        return true;
      }
    }
    
    sendResponse({ success: false, message: 'No text currently selected' });
    return true;
  }
});