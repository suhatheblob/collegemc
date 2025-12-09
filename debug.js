console.log("debug.js loaded");

document.addEventListener("DOMContentLoaded", () => {
  // Smooth fade-in animation on page load
  document.body.style.opacity = '0';
  setTimeout(() => {
    document.body.style.transition = 'opacity 0.8s ease-in';
    document.body.style.opacity = '1';
  }, 100);

  // API Configuration
  // ⚠️ IMPORTANT: The API server must be started manually on the Minecraft server
  // using the command: /serverapi start
  // The API server is disabled by default and will NOT auto-start.
  // Using CORS proxy to work around mixed content (HTTPS site can't load HTTP resources)
  // The proxy forwards HTTPS requests to the HTTP API endpoint
  const API_SERVER = 'http://104.204.222.149:8000';
  const API_BASE_URL = `https://corsproxy.io/?${API_SERVER}`;

  let lastApiData = null;
  let consecutiveErrors = 0;

  // Update API endpoint display
  const apiEndpoint = document.getElementById('api-endpoint');
  if (apiEndpoint) {
    apiEndpoint.textContent = `${API_SERVER}/api (via CORS proxy)`;
  }

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

  // Format TPS with color coding
  function formatTPS(tps) {
    const tpsElement = document.getElementById('tps-value');
    if (!tpsElement) return;
    
    tpsElement.textContent = tps.toFixed(2);
    
    // Remove all TPS classes
    tpsElement.classList.remove('tps-excellent', 'tps-good', 'tps-moderate', 'tps-poor');
    
    // Add appropriate class based on TPS
    if (tps >= 20.0) {
      tpsElement.classList.add('tps-excellent');
    } else if (tps >= 15.0) {
      tpsElement.classList.add('tps-good');
    } else if (tps >= 10.0) {
      tpsElement.classList.add('tps-moderate');
    } else {
      tpsElement.classList.add('tps-poor');
    }
  }

  // Update player list
  function updatePlayerList(players) {
    const playerList = document.getElementById('player-list');
    if (!playerList) return;

    if (!players || players.length === 0) {
      playerList.innerHTML = '<li class="player-item">No players online</li>';
      return;
    }

    playerList.innerHTML = players.map(player => {
      const latency = player.latency || 'N/A';
      return `<li class="player-item">${player.name} (${latency}ms)</li>`;
    }).join('');
  }

  // Fetch server status from the Server Status API
  async function fetchServerStatus() {
    const statusText = document.getElementById('status-text');
    const playerCount = document.getElementById('player-count');
    const serverName = document.getElementById('server-name');
    const serverVersion = document.getElementById('server-version');
    const serverMotd = document.getElementById('server-motd');
    const uptimeValue = document.getElementById('uptime-value');
    const worldTime = document.getElementById('world-time');
    const worldWeather = document.getElementById('world-weather');
    const worldDifficulty = document.getElementById('world-difficulty');
    const apiResponseTime = document.getElementById('api-response-time');
    const apiStatus = document.getElementById('api-status');
    
    if (!statusText || !playerCount) {
      console.error('Status elements not found');
      return;
    }
    
    try {
      const startTime = performance.now();
      const response = await fetch(`${API_BASE_URL}/api`, {
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
      
      // Reset error counter on success
      consecutiveErrors = 0;
      
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
      
      // Update server status
      if (data.online) {
        statusText.textContent = 'Online';
        statusText.style.color = '#00aa00';
        
        // Player count
        if (data.playerCountDisplay) {
          playerCount.textContent = data.playerCountDisplay;
        } else if (data.playerCount !== undefined && data.maxPlayers !== undefined) {
          playerCount.textContent = `${data.playerCount} / ${data.maxPlayers}`;
        } else {
          playerCount.textContent = 'N/A';
        }
        
        // TPS
        if (data.tps !== undefined) {
          formatTPS(data.tps);
        } else {
          const tpsElement = document.getElementById('tps-value');
          if (tpsElement) {
            tpsElement.textContent = 'N/A';
            tpsElement.className = 'debug-value tps-indicator';
          }
        }
        
        // Uptime
        if (uptimeValue && data.uptime) {
          if (data.uptime.formatted) {
            uptimeValue.textContent = data.uptime.formatted;
          } else if (data.uptime.milliseconds) {
            const seconds = Math.floor(data.uptime.milliseconds / 1000);
            const minutes = Math.floor(seconds / 60);
            const hours = Math.floor(minutes / 60);
            uptimeValue.textContent = `${hours}h ${minutes % 60}m ${seconds % 60}s`;
          } else {
            uptimeValue.textContent = 'N/A';
          }
        }
        
        // Server Info
        if (serverName && data.serverInfo) {
          serverName.textContent = data.serverInfo.name || 'N/A';
        }
        
        if (serverVersion && data.serverInfo) {
          serverVersion.textContent = data.serverInfo.version || 'N/A';
        }
        
        if (serverMotd && data.serverInfo) {
          serverMotd.textContent = data.serverInfo.motd || 'N/A';
        }
        
        // World Info
        if (worldTime && data.worldInfo) {
          worldTime.textContent = data.worldInfo.timeOfDayFormatted || 'N/A';
        }
        
        if (worldWeather && data.worldInfo) {
          const weather = data.worldInfo.weather || 'N/A';
          worldWeather.textContent = weather.charAt(0).toUpperCase() + weather.slice(1);
        }
        
        if (worldDifficulty && data.worldInfo) {
          const difficulty = data.worldInfo.difficulty || 'N/A';
          worldDifficulty.textContent = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
        }
        
        // Player list
        if (data.players && Array.isArray(data.players)) {
          updatePlayerList(data.players);
        } else {
          updatePlayerList([]);
        }
        
      } else {
        // Server is offline
        statusText.textContent = 'Offline';
        statusText.style.color = '#ff0000';
        playerCount.textContent = '0 / 0';
        
        // Clear other fields
        const clearFields = [
          { id: 'tps-value', text: 'N/A' },
          { id: 'uptime-value', text: 'N/A' },
          { id: 'server-name', text: 'N/A' },
          { id: 'server-version', text: 'N/A' },
          { id: 'server-motd', text: 'Server is offline' },
          { id: 'world-time', text: 'N/A' },
          { id: 'world-weather', text: 'N/A' },
          { id: 'world-difficulty', text: 'N/A' }
        ];
        
        clearFields.forEach(field => {
          const el = document.getElementById(field.id);
          if (el) {
            el.textContent = field.text;
            if (field.id === 'tps-value') {
              el.className = 'debug-value tps-indicator';
            }
          }
        });
        
        updatePlayerList([]);
      }
      
      updateTimestamp();
    } catch (error) {
      console.error('Error fetching server status:', error);
      consecutiveErrors++;
      
      let errorMessage = 'Error';
      if (error.message && error.message.includes('Failed to fetch')) {
        errorMessage = 'Connection Failed';
      } else if (error.message && error.message.includes('NetworkError')) {
        errorMessage = 'Network Error';
      } else if (error.message && error.message.includes('CORS')) {
        errorMessage = 'CORS Error';
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
      const errorFields = [
        'tps-value', 'uptime-value', 'server-name', 'server-version', 
        'server-motd', 'world-time', 'world-weather', 'world-difficulty'
      ];
      errorFields.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
          el.textContent = 'Error';
          if (id === 'tps-value') {
            el.className = 'debug-value tps-indicator';
          }
        }
      });
      
      updatePlayerList([]);
    }
  }

  // Fetch server status on load and every 5 seconds
  fetchServerStatus();
  setInterval(fetchServerStatus, 5000);
});
