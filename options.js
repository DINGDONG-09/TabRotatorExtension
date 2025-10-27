const STORE = {
  enabled: "tr_enabled",
  seconds: "tr_seconds",
  refreshPatterns: "tr_refresh_patterns"
};

document.addEventListener('DOMContentLoaded', loadSettings);
document.getElementById('save').addEventListener('click', saveSettings);
document.getElementById('addUrl').addEventListener('click', () => addUrlField());

let urlCounter = 0;

function addUrlField(url = '', shouldRefresh = true) {
  const urlList = document.getElementById('urlList');
  const urlId = `url-${urlCounter++}`;
  
  const urlItem = document.createElement('div');
  urlItem.className = 'url-item';
  urlItem.dataset.id = urlId;
  
  urlItem.innerHTML = `
    <input type="checkbox" class="refresh-checkbox" ${shouldRefresh ? 'checked' : ''} title="Enable refresh for this URL">
    <input type="text" class="url-input" placeholder="Enter URL or pattern (e.g., google.com)" value="${url}">
    <button class="remove-btn" title="Remove this URL">Remove</button>
  `;
  
  urlItem.querySelector('.remove-btn').addEventListener('click', () => {
    urlItem.remove();
  });
  
  urlList.appendChild(urlItem);
}

function saveSettings() {
  const secondsInput = document.getElementById('seconds');
  let secondsValue = secondsInput.value.trim();
  
  // Parse seconds directly
  let seconds = parseInt(secondsValue, 10);
  
  // Validate and clamp
  if (isNaN(seconds) || seconds < 1) {
    alert('Please enter a valid number of seconds (minimum 1 second)');
    secondsInput.value = 5;
    return;
  }
  
  if (seconds > 3600) {
    alert('Maximum is 3600 seconds (1 hour)');
    seconds = 3600;
    secondsInput.value = 3600;
  }
  
  const enabled = document.getElementById('enabled').checked;
  
  // Collect all URLs and their refresh states
  const urls = [];
  document.querySelectorAll('.url-item').forEach(item => {
    const urlInput = item.querySelector('.url-input');
    const checkbox = item.querySelector('.refresh-checkbox');
    const url = urlInput.value.trim();
    
    if (url) {
      urls.push({
        pattern: url,
        refresh: checkbox.checked
      });
    }
  });
  
  const settings = {
    seconds: seconds,  // Direct seconds, no conversion
    enabled: enabled,
    urls: urls
  };
  
  console.log('💾 Saving settings:', settings);
  
  chrome.storage.sync.set(settings, () => {
    if (chrome.runtime.lastError) {
      console.error('Error saving:', chrome.runtime.lastError);
      const status = document.getElementById('status');
      status.textContent = '❌ Error saving settings!';
      status.style.color = '#dc3545';
    } else {
      console.log('✅ Settings saved successfully!');
      const status = document.getElementById('status');
      status.textContent = `✅ Saved! Switching every ${seconds} seconds`;
      status.style.color = '#28a745';
      setTimeout(() => {
        status.textContent = '';
      }, 3000);
    }
  });
}

function loadSettings() {
  console.log('📖 Loading settings...');
  
  chrome.storage.sync.get(['seconds', 'enabled', 'urls'], (result) => {
    console.log('📥 Loaded settings:', result);
    
    const seconds = result.seconds || 5;
    document.getElementById('seconds').value = seconds;
    document.getElementById('enabled').checked = result.enabled || false;
    
    // Clear existing
    document.getElementById('urlList').innerHTML = '';
    urlCounter = 0;
    
    // Load existing URLs or add one empty field
    if (result.urls && result.urls.length > 0) {
      result.urls.forEach(item => {
        addUrlField(item.pattern, item.refresh);
      });
    } else {
      addUrlField(); // Add one empty field by default
    }
  });
}
