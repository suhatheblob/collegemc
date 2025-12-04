console.log("ping-test.js loaded");

document.addEventListener("DOMContentLoaded", () => {
  const pingDisplay = document.getElementById('ping-display');
  const pingStatus = document.getElementById('ping-status');
  
  if (!pingDisplay || !pingStatus) {
    console.error('Ping test elements not found!');
    return;
  }

  // Smooth fade-in animation on page load
  document.body.style.opacity = '0';
  setTimeout(() => {
    document.body.style.transition = 'opacity 0.8s ease-in';
    document.body.style.opacity = '1';
  }, 100);

  // Ping testing function - pings the Minecraft server at ping.collegemc.com
  async function testPing() {
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
        pingDisplay.textContent = ping;
        
        // Color code based on ping
        if (ping < 50) {
          pingDisplay.style.color = '#00aa00'; // Green for excellent
          pingStatus.textContent = 'Excellent connection';
          pingStatus.style.color = '#00aa00';
        } else if (ping < 100) {
          pingDisplay.style.color = '#90EE90'; // Light green for good
          pingStatus.textContent = 'Good connection';
          pingStatus.style.color = '#90EE90';
        } else if (ping < 200) {
          pingDisplay.style.color = '#FFA500'; // Orange for moderate
          pingStatus.textContent = 'Moderate connection';
          pingStatus.style.color = '#FFA500';
        } else {
          pingDisplay.style.color = '#ff0000'; // Red for high
          pingStatus.textContent = 'High latency';
          pingStatus.style.color = '#ff0000';
        }
      } else {
        pingDisplay.textContent = 'N/A';
        pingDisplay.style.color = '#666';
        pingStatus.textContent = 'Unable to connect';
        pingStatus.style.color = '#666';
      }
    } catch (error) {
      console.error('Error testing ping:', error);
      pingDisplay.textContent = 'N/A';
      pingDisplay.style.color = '#666';
      pingStatus.textContent = 'Connection error';
      pingStatus.style.color = '#666';
    }
  }

  // Test ping on load and every 0.5 seconds
  testPing();
  setInterval(testPing, 500);
});

