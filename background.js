let currentIndex = 0;
let rotationTimer = null;

chrome.runtime.onInstalled.addListener(() => {
  console.log('Tab Rotator extension installed.');
  chrome.storage.sync.get(['interval', 'enabled'], (data) => {
    if (data.enabled) {
      startRotation(data.interval || 30);
    }
  });
});

chrome.storage.onChanged.addListener((changes) => {
  if (changes.interval || changes.enabled || changes.urls) {
    chrome.storage.sync.get(['interval', 'enabled'], (data) => {
      console.log('Settings changed, restarting rotation');
      stopRotation();
      if (data.enabled) {
        startRotation(data.interval || 30);
      }
    });
  }
});

function startRotation(intervalSeconds) {
  stopRotation(); // Clear any existing timer
  
  console.log(`Starting rotation with ${intervalSeconds} second interval`);
  
  // Run immediately first time
  rotateTabs();
  
  // Then repeat at interval
  rotationTimer = setInterval(() => {
    rotateTabs();
  }, intervalSeconds * 1000);
}

function stopRotation() {
  if (rotationTimer) {
    clearInterval(rotationTimer);
    rotationTimer = null;
    console.log('Rotation stopped');
  }
}

async function rotateTabs() {
  console.log('\n=== ROTATION START ===');
  
  const data = await chrome.storage.sync.get(['urls', 'enabled']);
  console.log('Settings:', data);
  
  if (!data.enabled) {
    console.log('❌ Rotation is DISABLED');
    stopRotation();
    return;
  }
  
  const urls = data.urls || [];
  
  if (urls.length === 0) {
    console.log('❌ No URLs configured in settings');
    return;
  }

  console.log(`✓ Found ${urls.length} configured URLs`);

  // Get all tabs
  const tabs = await chrome.tabs.query({ currentWindow: true });
  console.log(`✓ Found ${tabs.length} open tabs`);
  
  // Build matching tabs list
  let matchingTabs = [];
  
  for (const urlConfig of urls) {
    const pattern = urlConfig.pattern;
    console.log(`\nChecking pattern: "${pattern}" (refresh: ${urlConfig.refresh})`);
    
    const matchedTab = tabs.find(tab => {
      const matches = tab.url.includes(pattern);
      if (matches) {
        console.log(`  ✓ MATCH: ${tab.url}`);
      }
      return matches;
    });
    
    if (matchedTab) {
      matchingTabs.push({
        tab: matchedTab,
        pattern: pattern,
        shouldRefresh: urlConfig.refresh
      });
    } else {
      console.log(`  ✗ No match found`);
    }
  }

  console.log(`\n📊 Total matching tabs: ${matchingTabs.length}`);

  if (matchingTabs.length === 0) {
    console.log('❌ No matching tabs found!');
    return;
  }

  // Rotate
  currentIndex = currentIndex % matchingTabs.length;
  const current = matchingTabs[currentIndex];
  
  console.log(`\n🔄 Switching to: ${current.pattern}`);
  console.log(`   Tab ID: ${current.tab.id}`);
  console.log(`   URL: ${current.tab.url}`);
  console.log(`   Refresh: ${current.shouldRefresh ? 'YES' : 'NO'}`);
  
  await chrome.tabs.update(current.tab.id, { active: true });
  
  if (current.shouldRefresh) {
    await chrome.tabs.reload(current.tab.id);
    console.log('✅ TAB REFRESHED');
  } else {
    console.log('✅ TAB ACTIVATED (no refresh)');
  }
  
  currentIndex++;
  console.log('=== ROTATION END ===\n');
}