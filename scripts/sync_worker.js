const SYNC_URL = 'http://localhost:3000/api/sync';

async function runSync() {
  console.log('Starting sync at', new Date().toISOString());
  try {
    const response = await fetch(SYNC_URL);
    const data = await response.json();
    console.log('Sync successful:', data);
  } catch (error) {
    console.error('Sync failed:', error.message);
  }
}

// Run every 2 minutes
setInterval(runSync, 120000);

// Initial run
runSync();
