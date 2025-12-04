console.log("debug.js loaded");

document.addEventListener("DOMContentLoaded", () => {
  // Smooth fade-in animation on page load
  document.body.style.opacity = '0';
  setTimeout(() => {
    document.body.style.transition = 'opacity 0.8s ease-in';
    document.body.style.opacity = '1';
  }, 100);

  let lastApiData = null;

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
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
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
      
      if (apiStatus) {
        apiStatus.textContent = 'Error';
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
      
      if (response.ok) {
        pingValue.textContent = ping;
        
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
      console.error('Error testing ping:', error);
      pingValue.textContent = 'N/A';
      pingValue.style.color = '#666';
    }
  }

  // Fetch server status on load and every 30 seconds
  fetchServerStatus();
  setInterval(fetchServerStatus, 30000);

  // Test ping on load and every 2 seconds
  testPing();
  setInterval(testPing, 2000);
});

