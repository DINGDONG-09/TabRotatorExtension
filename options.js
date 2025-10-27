const STORE = {
  enabled: "tr_enabled",
  intervalSeconds: "tr_interval_s",
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
  const interval = Math.max(1, parseInt(document.getElementById('interval').value) || 5);
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
  
  console.log('Saving:', { interval, enabled, urls });
  
  chrome.storage.sync.set({
    interval: interval,
    enabled: enabled,
    urls: urls
  }, () => {
    const status = document.getElementById('status');
    status.textContent = `Settings saved! (${interval} seconds interval)`;
    status.style.color = '#28a745';
    setTimeout(() => {
      status.textContent = '';
    }, 2000);
  });
}

function loadSettings() {
  chrome.storage.sync.get(['interval', 'enabled', 'urls'], (result) => {
    console.log('Loaded:', result);
    
    document.getElementById('interval').value = result.interval || 5;
    document.getElementById('enabled').checked = result.enabled || false;
    
    // Clear existing
    document.getElementById('urlList').innerHTML = '';
    
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
