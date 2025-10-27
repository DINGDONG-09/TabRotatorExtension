let currentIndex = 0;
const ALARM_NAME = 'tabRotation';

chrome.runtime.onInstalled.addListener(() => {
  console.log('🚀 Tab Rotator extension installed.');
  chrome.storage.local.set({ currentIndex: 0 }); // Initialize index
  loadAndStartRotation();
});

chrome.runtime.onStartup.addListener(() => {
  console.log('🔄 Browser started, checking rotation status...');
  loadAndStartRotation();
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'sync') {
    console.log('⚙️ Settings changed:', changes);
    loadAndStartRotation();
  }
});

// Listen for alarm events
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) {
    rotateTabs();
  }
});

function loadAndStartRotation() {
  chrome.storage.sync.get(['seconds', 'enabled'], (data) => {
    console.log('📥 Loaded settings:', data);
    
    const seconds = data.seconds || 5;
    const enabled = data.enabled || false;
    
    stopRotation();
    
    if (enabled) {
      startRotation(seconds);
    } else {
      console.log('❌ Rotation is disabled in settings');
    }
  });
}

function startRotation(seconds) {
  stopRotation(); // Clear any existing alarm
  
  // Ensure seconds is a valid number
  seconds = parseInt(seconds, 10);
  
  if (isNaN(seconds) || seconds < 1) {
    console.error('❌ Invalid seconds:', seconds);
    return;
  }
  
  console.log(`🟢 Starting rotation every ${seconds} seconds`);
  
  // Reset index when starting new rotation
  chrome.storage.local.set({ currentIndex: 0 });
  
  // Run immediately first time
  rotateTabs();
  
  // Create alarm that repeats every X seconds
  const periodInMinutes = seconds / 60;
  
  chrome.alarms.create(ALARM_NAME, {
    periodInMinutes: Math.max(periodInMinutes, 1/60) // Minimum ~1 second
  });
  
  console.log(`✅ Alarm created: switching tabs every ${seconds} seconds`);
}

function stopRotation() {
  chrome.alarms.clear(ALARM_NAME, (wasCleared) => {
    if (wasCleared) {
      console.log('🔴 Rotation alarm cleared');
    }
  });
}

async function rotateTabs() {
  const data = await chrome.storage.sync.get(['urls', 'enabled', 'seconds']);
  
  console.log(`\n⏰ === ROTATION (every ${data.seconds || 5} seconds) ===`);
  
  if (!data.enabled) {
    console.log('❌ Rotation disabled, stopping...');
    stopRotation();
    return;
  }
  
  const urls = data.urls || [];
  
  if (urls.length === 0) {
    console.log('⚠️ No URLs configured');
    return;
  }

  console.log(`📋 Configured URLs: ${urls.length}`);

  // Get all tabs
  const tabs = await chrome.tabs.query({ currentWindow: true });
  console.log(`🔍 Open tabs: ${tabs.length}`);
  
  // Build matching tabs list
  let matchingTabs = [];
  
  for (const urlConfig of urls) {
    const pattern = urlConfig.pattern;
    
    const matchedTab = tabs.find(tab => {
      return tab.url && tab.url.includes(pattern);
    });
    
    if (matchedTab) {
      matchingTabs.push({
        tab: matchedTab,
        pattern: pattern,
        shouldRefresh: urlConfig.refresh
      });
      console.log(`✓ Match: "${pattern}" → ${matchedTab.url.substring(0, 50)}...`);
    }
  }

  if (matchingTabs.length === 0) {
    console.log('⚠️ No matching tabs found');
    return;
  }

  // Get current index from storage
  const { currentIndex = 0 } = await chrome.storage.local.get('currentIndex');
  
  // Calculate next index
  const nextIndex = currentIndex % matchingTabs.length;
  const current = matchingTabs[nextIndex];
  
  console.log(`\n➡️  Rotating to tab ${nextIndex + 1}/${matchingTabs.length}`);
  console.log(`   Pattern: "${current.pattern}"`);
  console.log(`   Refresh: ${current.shouldRefresh ? 'YES ♻️' : 'NO'}`);
  
  try {
    await chrome.tabs.update(current.tab.id, { active: true });
    
    if (current.shouldRefresh) {
      await chrome.tabs.reload(current.tab.id);
      console.log('✅ Tab switched and REFRESHED');
    } else {
      console.log('✅ Tab switched (no refresh)');
    }
    
    // Save incremented index for next rotation
    await chrome.storage.local.set({ currentIndex: nextIndex + 1 });
    
  } catch (error) {
    console.error('❌ Error during rotation:', error);
  }
  
  console.log('=== END ===\n');
}