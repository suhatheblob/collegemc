console.log("debug.js loaded");

document.addEventListener("DOMContentLoaded", () => {
  // Smooth fade-in animation on page load
  document.body.style.opacity = '0';
  setTimeout(() => {
    document.body.style.transition = 'opacity 0.8s ease-in';
    document.body.style.opacity = '1';
  }, 100);

  let lastApiData = null;
  let rateLimitBackoff = 0; // Backoff time in milliseconds
  let pingBackoff = 0; // Backoff time for ping
  let consecutiveErrors = 0;

  // Toggle raw data display
  const toggleButton = document.getElementById('toggle-raw');
  const rawData = document.getElementById('raw-data');
  if (toggleButton && rawData) {
    toggleButton.addEventListener('click', () => {
      if (rawData.classList.contains('hidden')) {
        rawData.classList.remove('hidden');
        toggleButton.textContent = 'Hide Raw Data';
        if (lastApiData) {
          rawData.textContent = JSON.stringify(lastApiData, null, 2);
        }
      } else {
        rawData.classList.add('hidden');
        toggleButton.textContent = 'Show Raw Data';
      }
    });
  }

  // Update last update timestamp
  function updateTimestamp() {
    const lastUpdate = document.getElementById('last-update');
    if (lastUpdate) {
      const now = new Date();
      lastUpdate.textContent = now.toLocaleTimeString();
    }
  }

  // Fetch server status and player count from api.mcsrvstat.us
  async function fetchServerStatus() {
    // Check if we're in backoff period
    if (rateLimitBackoff > Date.now()) {
      const remaining = Math.ceil((rateLimitBackoff - Date.now()) / 1000);
      const apiStatus = document.getElementById('api-status');
      if (apiStatus) {
        apiStatus.textContent = `Rate Limited (${remaining}s)`;
        apiStatus.style.color = '#FFA500';
      }
      return;
    }

    const statusText = document.getElementById('status-text');
    const playerCount = document.getElementById('player-count');
    const serverIp = document.getElementById('server-ip');
    const serverPort = document.getElementById('server-port');
    const serverVersion = document.getElementById('server-version');
    const serverProtocol = document.getElementById('server-protocol');
    const serverSoftware = document.getElementById('server-software');
    const serverMotd = document.getElementById('server-motd');
    const apiResponseTime = document.getElementById('api-response-time');
    const apiStatus = document.getElementById('api-status');
    
    if (!statusText || !playerCount) {
      console.error('Status elements not found');
      return;
    }
    
    try {
      const startTime = performance.now();
      const response = await fetch('https://api.mcsrvstat.us/3/collegemc.com', {
        method: 'GET',
        cache: 'no-cache'
      });
      const endTime = performance.now();
      const responseTime = Math.round(endTime - startTime);
      
      if (apiResponseTime) {
        apiResponseTime.textContent = responseTime;
      }
      
      // Handle rate limiting (429)
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        const backoffTime = retryAfter ? parseInt(retryAfter) * 1000 : 60000; // Default 60 seconds
        rateLimitBackoff = Date.now() + backoffTime;
        consecutiveErrors++;
        
        if (apiStatus) {
          apiStatus.textContent = `Rate Limited (${Math.ceil(backoffTime / 1000)}s)`;
          apiStatus.style.color = '#FFA500';
        }
        
        console.warn('Rate limited. Backing off for', backoffTime / 1000, 'seconds');
        return;
      }
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      // Reset error counters on success
      consecutiveErrors = 0;
      rateLimitBackoff = 0;
      
      const data = await response.json();
      lastApiData = data;
      
      // Update raw data if it's currently visible
      if (rawData && !rawData.classList.contains('hidden')) {
        rawData.textContent = JSON.stringify(data, null, 2);
      }
      
      if (apiStatus) {
        apiStatus.textContent = 'Connected';
        apiStatus.style.color = '#00aa00';
      }
      
      if (data.online) {
        statusText.textContent = 'Online';
        statusText.style.color = '#00aa00';
        
        if (data.players && typeof data.players.online !== 'undefined' && typeof data.players.max !== 'undefined') {
          playerCount.textContent = `${data.players.online} / ${data.players.max}`;
        } else {
          playerCount.textContent = 'N/A';
        }
        
        // Server IP
        if (serverIp && data.ip) {
          serverIp.textContent = data.ip;
        } else if (serverIp) {
          serverIp.textContent = 'N/A';
        }
        
        // Server Port
        if (serverPort && data.port) {
          serverPort.textContent = data.port;
        } else if (serverPort) {
          serverPort.textContent = '25565 (default)';
        }
        
        // Server Version
        if (serverVersion && data.version) {
          serverVersion.textContent = data.version;
        } else if (serverVersion) {
          serverVersion.textContent = 'N/A';
        }
        
        // Protocol Version
        if (serverProtocol && data.protocol) {
          serverProtocol.textContent = data.protocol;
        } else if (serverProtocol) {
          serverProtocol.textContent = 'N/A';
        }
        
        // Server Software
        if (serverSoftware && data.software) {
          serverSoftware.textContent = data.software;
        } else if (serverSoftware) {
          serverSoftware.textContent = 'Unknown';
        }
        
        // MOTD
        if (serverMotd) {
          if (data.motd && data.motd.clean) {
            serverMotd.textContent = Array.isArray(data.motd.clean) 
              ? data.motd.clean.join(' ') 
              : data.motd.clean;
          } else if (data.motd && Array.isArray(data.motd)) {
            serverMotd.textContent = data.motd.map(line => line.clean || line).join(' ');
          } else {
            serverMotd.textContent = 'N/A';
          }
        }
      } else {
        statusText.textContent = 'Offline';
        statusText.style.color = '#ff0000';
        playerCount.textContent = '0 / 0';
        
        // Clear other fields when offline
        if (serverIp) serverIp.textContent = 'N/A';
        if (serverPort) serverPort.textContent = 'N/A';
        if (serverVersion) serverVersion.textContent = 'N/A';
        if (serverProtocol) serverProtocol.textContent = 'N/A';
        if (serverSoftware) serverSoftware.textContent = 'N/A';
        if (serverMotd) serverMotd.textContent = 'Server is offline';
      }
      
      updateTimestamp();
    } catch (error) {
      console.error('Error fetching server status:', error);
      consecutiveErrors++;
      
      // Implement exponential backoff on consecutive errors
      if (consecutiveErrors > 3) {
        const backoffTime = Math.min(60000 * Math.pow(2, consecutiveErrors - 3), 300000); // Max 5 minutes
        rateLimitBackoff = Date.now() + backoffTime;
      }
      
      let errorMessage = 'Error';
      if (error.message && error.message.includes('429')) {
        errorMessage = 'Rate Limited';
      } else if (error.message && error.message.includes('CORS')) {
        errorMessage = 'CORS Error';
      } else if (error.message && error.message.includes('NetworkError')) {
        errorMessage = 'Network Error';
      }
      
      if (apiStatus) {
        apiStatus.textContent = errorMessage;
        apiStatus.style.color = '#ff0000';
      }
      
      if (statusText) {
        statusText.textContent = 'Unknown';
        statusText.style.color = '#666';
      }
      if (playerCount) {
        playerCount.textContent = 'N/A';
      }
      
      // Set error state for other fields
      const errorFields = ['server-ip', 'server-port', 'server-version', 'server-protocol', 'server-software'];
      errorFields.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = 'Error';
      });
      
      if (serverMotd) {
        serverMotd.textContent = 'Unable to fetch server information';
      }
    }
  }

  // Ping testing function
  async function testPing() {
    // Check if we're in backoff period
    if (pingBackoff > Date.now()) {
      return; // Skip this ping attempt
    }

    const pingValue = document.getElementById('ping-value');
    if (!pingValue) return;

    try {
      // Measure ping to Minecraft server by timing the query request
      const startTime = performance.now();
      const response = await fetch('https://api.mcsrvstat.us/3/ping.collegemc.com', {
        method: 'GET',
        cache: 'no-cache'
      });
      const endTime = performance.now();
      
      const ping = Math.round(endTime - startTime);
      
      // Handle rate limiting (429)
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        const backoffTime = retryAfter ? parseInt(retryAfter) * 1000 : 30000; // Default 30 seconds
        pingBackoff = Date.now() + backoffTime;
        pingValue.textContent = 'Rate Limited';
        pingValue.style.color = '#FFA500';
        console.warn('Ping rate limited. Backing off for', backoffTime / 1000, 'seconds');
        return;
      }
      
      if (response.ok) {
        pingValue.textContent = ping;
        pingBackoff = 0; // Reset backoff on success
        
        // Color code based on ping
        if (ping < 50) {
          pingValue.style.color = '#00aa00'; // Green for excellent
        } else if (ping < 100) {
          pingValue.style.color = '#90EE90'; // Light green for good
        } else if (ping < 200) {
          pingValue.style.color = '#FFA500'; // Orange for moderate
        } else {
          pingValue.style.color = '#ff0000'; // Red for high
        }
      } else {
        pingValue.textContent = 'N/A';
        pingValue.style.color = '#666';
      }
    } catch (error) {
      // Only log CORS/network errors occasionally to avoid spam
      if (Math.random() < 0.1) { // Log 10% of errors
        console.error('Error testing ping:', error);
      }
      
      // Set backoff on network errors
      if (error.message && (error.message.includes('CORS') || error.message.includes('NetworkError'))) {
        pingBackoff = Date.now() + 10000; // 10 second backoff for network errors
      }
      
      pingValue.textContent = 'N/A';
      pingValue.style.color = '#666';
    }
  }

  // Fetch server status on load and every 30 seconds
  fetchServerStatus();
  setInterval(fetchServerStatus, 30000);

  // Test ping on load and every 5 seconds (reduced frequency to avoid rate limiting)
  testPing();
  setInterval(testPing, 5000);
});

