console.log("script.js loaded");

document.addEventListener("DOMContentLoaded", () => {
  const MAX_LEAVES = 100;
  let currentLeafCount = 0;
  let totalFlowersClicked = 0;

  document.body.style.opacity = '0';
  setTimeout(() => {
    document.body.style.transition = 'opacity 0.8s ease-in';
    document.body.style.opacity = '1';
  }, 100);

  const menuToggle = document.getElementById('menu-toggle');
  const menuOptions = document.getElementById('menu-options');
  
  console.log('Menu Toggle Element:', menuToggle);
  console.log('Menu Options Element:', menuOptions);
  
  if (menuToggle && menuOptions) {
    let menuOpen = false;
    
    menuToggle.addEventListener('click', (e) => {
      console.log('Menu button clicked!');
      e.stopPropagation();
      menuOpen = !menuOpen;
      
      if (menuOpen) {
        menuOptions.classList.remove('hidden');
        menuToggle.textContent = 'Close';
        console.log('Menu opened');
      } else {
        menuOptions.classList.add('hidden');
        menuToggle.textContent = 'Nav';
        console.log('Menu closed');
      }
    });
    
    document.addEventListener('click', (e) => {
      if (menuOpen && !e.target.closest('.floating-menu-container')) {
        menuOptions.classList.add('hidden');
        menuToggle.textContent = 'Nav';
        menuOpen = false;
        console.log('Menu closed by outside click');
      }
    });
  } else {
    console.error('Menu elements not found!');
  }

  const copyButton = document.getElementById('copy-button');
  const serverAddressBox = document.getElementById('server-address');
  
  function copyServerAddress() {
    const serverAddress = document.getElementById('server-address').textContent;
    navigator.clipboard.writeText(serverAddress).then(() => {
      copyButton.textContent = '✓ Copied!';
      copyButton.style.backgroundColor = '#90EE90';
      setTimeout(() => {
        copyButton.textContent = '📋 Copy';
        copyButton.style.backgroundColor = '';
      }, 2000);
    });
  }
  
  if (copyButton) {
    copyButton.addEventListener('click', copyServerAddress);
  }
  
  if (serverAddressBox) {
    serverAddressBox.addEventListener('click', copyServerAddress);
  }

  // API Configuration
  // ⚠️ IMPORTANT: The API server must be started manually on the Minecraft server
  // using the command: /serverapi start
  // The API server is disabled by default and will NOT auto-start.
  // Using CORS proxy to work around mixed content (HTTPS site can't load HTTP resources)
  // The proxy forwards HTTPS requests to the HTTP API endpoint
  const API_SERVER = 'http://104.204.222.149:8000';
  const API_BASE_URL = `https://corsproxy.io/?${API_SERVER}`;

  // Fetch server status from the Server Status API
  async function fetchServerStatus() {
    const statusText = document.getElementById('status-text');
    const playerCount = document.getElementById('player-count');
    
    if (!statusText || !playerCount) {
      console.error('Status elements not found');
      return;
    }
    
    try {
      statusText.textContent = 'Checking...';
      statusText.style.color = '#ffaa00';
      
      const response = await fetch(`${API_BASE_URL}/api`, {
        method: 'GET',
        cache: 'no-cache'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.online) {
        statusText.textContent = 'Online';
        statusText.style.color = '#00aa00';
        
        if (data.playerCountDisplay) {
          playerCount.textContent = data.playerCountDisplay;
        } else if (data.playerCount !== undefined && data.maxPlayers !== undefined) {
          playerCount.textContent = `${data.playerCount} / ${data.maxPlayers}`;
        } else {
          playerCount.textContent = 'N/A';
        }
      } else {
        statusText.textContent = 'Offline';
        statusText.style.color = '#ff0000';
        playerCount.textContent = '0 / 0';
      }
    } catch (error) {
      console.error('Error fetching server status:', error);
      
      if (statusText) {
        statusText.textContent = 'Unknown';
        statusText.style.color = '#666';
      }
      if (playerCount) {
        playerCount.textContent = 'N/A';
      }
    }
  }

  // Fetch server status on load and every 30 seconds
  fetchServerStatus();
  setInterval(fetchServerStatus, 30000);


  function updateFlowerCounter() {
    const counter = document.getElementById("flower-counter");
    if (counter) {
      counter.textContent = `🌸 ${currentLeafCount}`;
    }
  }

  function updateClickCounter() {
    const clickCounter = document.getElementById("click-counter");
    if (clickCounter) {
      clickCounter.textContent = `Flowers Popped: ${totalFlowersClicked} 🎉`;
      
      if (totalFlowersClicked === 10) {
        showMilestone("Nice! 10 flowers! 🌸");
      } else if (totalFlowersClicked === 50) {
        showMilestone("Wow! 50 flowers! 🌺");
      } else if (totalFlowersClicked === 100) {
        showMilestone("AMAZING! 100 flowers!!! 🎊");
      }
    }
  }

  function showMilestone(message) {
    const milestone = document.createElement("div");
    milestone.className = "milestone-popup";
    milestone.textContent = message;
    milestone.style.position = "fixed";
    milestone.style.top = "50%";
    milestone.style.left = "50%";
    milestone.style.transform = "translate(-50%, -50%)";
    milestone.style.backgroundColor = "rgba(255, 196, 209, 0.85)";
    milestone.style.padding = "30px 50px";
    milestone.style.borderRadius = "20px";
    milestone.style.fontSize = "24px";
    milestone.style.fontWeight = "bold";
    milestone.style.zIndex = "10000";
    milestone.style.boxShadow = "0 8px 20px rgba(0,0,0,0.2)";
    milestone.style.animation = "milestone-bounce 0.6s ease";
    milestone.style.border = "2px dashed rgba(255, 255, 255, 0.6)";
    milestone.style.color = "#544c4a";
    
    document.body.appendChild(milestone);
    
    setTimeout(() => {
      milestone.style.transition = "opacity 0.5s";
      milestone.style.opacity = "0";
      setTimeout(() => milestone.remove(), 500);
    }, 2000);
  }

  function createLeaf() {
    if (currentLeafCount >= MAX_LEAVES) {
      console.log("Max leaves reached, skipping creation");
      return;
    }

    const leaf = document.createElement("div");
    leaf.classList.add("leaf");

    const leftPosition = Math.random() * 100;
    const duration = Math.random() * (15 - 5) + 5;

    leaf.style.left = `${leftPosition}vw`;
    leaf.style.animationDuration = `${duration}s`;

    document.getElementById("falling-leaves").appendChild(leaf);
    currentLeafCount++;
    updateFlowerCounter();

    leaf.addEventListener("click", function () {
      console.log("Leaf clicked, exploding!");
      totalFlowersClicked++;
      updateClickCounter();
      explodeWithNumber(leaf, totalFlowersClicked);
    });

    leaf.addEventListener("animationend", function () {
      leaf.remove();
      currentLeafCount--;
      updateFlowerCounter();
      console.log(`Leaf animation ended, removed. Current count: ${currentLeafCount}`);
    });
  }

  function explodeWithNumber(leaf, clickNumber) {
    console.log("Flower clicked!");

    const leafRect = leaf.getBoundingClientRect();

    const popNumber = document.createElement("div");
    popNumber.className = "pop-number";
    popNumber.textContent = `+${clickNumber}`;
    popNumber.style.position = "fixed";
    popNumber.style.left = `${leafRect.left + leafRect.width / 2}px`;
    popNumber.style.top = `${leafRect.top}px`;
    popNumber.style.fontSize = "24px";
    popNumber.style.fontWeight = "bold";
    popNumber.style.color = "#FFD700";
    popNumber.style.textShadow = "2px 2px 4px rgba(0,0,0,0.8)";
    popNumber.style.animation = "simple-pop-up 1s ease-out";
    popNumber.style.pointerEvents = "none";
    popNumber.style.zIndex = "10000";
    popNumber.style.transform = "translateX(-50%)";
    
    document.body.appendChild(popNumber);

    setTimeout(() => {
      popNumber.remove();
    }, 1000);

    leaf.remove();
    currentLeafCount--;
    updateFlowerCounter();
    console.log(`Leaf removed. Current count: ${currentLeafCount}`);
  }

  function explode(leaf) {
    console.log("Explode function triggered!");

    const particleContainer = document.createElement("div");
    particleContainer.className = "particle-container";

    const leafRect = leaf.getBoundingClientRect();
    console.log("Leaf position:", leafRect);

    particleContainer.style.left = `${leafRect.left + leafRect.width / 2}px`;
    particleContainer.style.top = `${leafRect.top + leafRect.height / 2}px`;

    const leafContainer = document.getElementById("falling-leaves");
    leafContainer.appendChild(particleContainer);

    for (let i = 0; i < 20; i++) {
      const particle = document.createElement("div");
      particle.className = "particle";
      particle.style.left = `${Math.random() * 40 - 20}px`;
      particle.style.top = `${Math.random() * 40 - 20}px`;
      particle.style.backgroundColor = "pink";
      particleContainer.appendChild(particle);

      setTimeout(() => {
        console.log(`Removing particle ${i + 1}`);
        particle.remove();
      }, 1000);
    }

    setTimeout(() => {
      leaf.remove();
      currentLeafCount--;
      updateFlowerCounter();
      console.log(`Leaf removed after explosion. Current count: ${currentLeafCount}`);
    }, 1000);

    setTimeout(() => particleContainer.remove(), 1000);
  }

  for (let i = 0; i < 10; i++) {
    createLeaf();
  }

  setInterval(createLeaf, 1500);
});
