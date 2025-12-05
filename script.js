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

  function writeVarInt(value) {
    const bytes = [];
    while (true) {
      if ((value & 0xFFFFFF80) === 0) {
        bytes.push(value);
        return new Uint8Array(bytes);
      }
      bytes.push((value & 0x7F) | 0x80);
      value = value >>> 7;
    }
  }
  
  function readVarInt(dataView, offset) {
    let value = 0;
    let pos = offset;
    let shift = 0;
    while (true) {
      const byte = dataView.getUint8(pos);
      value |= (byte & 0x7F) << shift;
      pos++;
      if ((byte & 0x80) === 0) break;
      shift += 7;
      if (shift >= 32) throw new Error('VarInt too large');
    }
    return { value, length: pos - offset };
  }
  
  function writeString(str) {
    const encoder = new TextEncoder();
    const encoded = encoder.encode(str);
    const lengthBytes = writeVarInt(encoded.length);
    const result = new Uint8Array(lengthBytes.length + encoded.length);
    result.set(lengthBytes, 0);
    result.set(encoded, lengthBytes.length);
    return result;
  }
  
  function readString(dataView, offset) {
    const lengthResult = readVarInt(dataView, offset);
    const length = lengthResult.value;
    const stringOffset = offset + lengthResult.length;
    const bytes = new Uint8Array(dataView.buffer, stringOffset, length);
    const decoder = new TextDecoder();
    return { value: decoder.decode(bytes), length: lengthResult.length + length };
  }
  
  function createHandshakePacket(host, port, protocolVersion = 47) {
    const packetId = writeVarInt(0x00);
    const protocol = writeVarInt(protocolVersion);
    const address = writeString(host);
    const portBytes = new Uint8Array(2);
    new DataView(portBytes.buffer).setUint16(0, port, false);
    const nextState = writeVarInt(1);
    
    const totalLength = packetId.length + protocol.length + address.length + portBytes.length + nextState.length;
    const lengthBytes = writeVarInt(totalLength);
    
    const result = new Uint8Array(lengthBytes.length + totalLength);
    let offset = 0;
    result.set(lengthBytes, offset); offset += lengthBytes.length;
    result.set(packetId, offset); offset += packetId.length;
    result.set(protocol, offset); offset += protocol.length;
    result.set(address, offset); offset += address.length;
    result.set(portBytes, offset); offset += portBytes.length;
    result.set(nextState, offset);
    
    return result;
  }
  
  function createStatusRequestPacket() {
    const packetId = writeVarInt(0x00);
    const lengthBytes = writeVarInt(packetId.length);
    const result = new Uint8Array(lengthBytes.length + packetId.length);
    result.set(lengthBytes, 0);
    result.set(packetId, lengthBytes.length);
    return result;
  }
  
  function parseStatusResponse(buffer) {
    const view = new DataView(buffer);
    let offset = 0;
    
    const lengthResult = readVarInt(view, offset);
    offset += lengthResult.length;
    
    const packetIdResult = readVarInt(view, offset);
    offset += packetIdResult.length;
    
    const jsonLengthResult = readVarInt(view, offset);
    offset += jsonLengthResult.length;
    
    const jsonString = readString(view, offset);
    const statusData = JSON.parse(jsonString.value);
    
    return {
      online: true,
      players: {
        online: statusData.players?.online || 0,
        max: statusData.players?.max || 0
      }
    };
  }
  
  async function pingMinecraftServer(host, port = 25565) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const serverHost = host.split(':')[0];
      const serverPort = host.includes(':') ? parseInt(host.split(':')[1]) : port;
      
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const proxyUrl = `${protocol}//${window.location.hostname}:${window.location.port || (protocol === 'https:' ? 443 : 80)}/api/mc-ping?host=${encodeURIComponent(serverHost)}&port=${serverPort}`;
      
      const ws = new WebSocket(proxyUrl);
      let timeout;
      ws.binaryType = 'arraybuffer';
      
      ws.onopen = () => {
        const handshake = createHandshakePacket(serverHost, serverPort);
        ws.send(handshake);
        
        const statusRequest = createStatusRequestPacket();
        ws.send(statusRequest);
      };
      
      ws.onmessage = (event) => {
        try {
          if (event.data instanceof ArrayBuffer) {
            const response = parseStatusResponse(event.data);
            const latency = Date.now() - startTime;
            
            clearTimeout(timeout);
            ws.close();
            
            resolve({
              online: true,
              latency: latency,
              players: response.players
            });
          } else {
            const data = JSON.parse(event.data);
            const latency = Date.now() - startTime;
            
            clearTimeout(timeout);
            ws.close();
            
            resolve({
              online: true,
              latency: latency,
              players: {
                online: data.players?.online || 0,
                max: data.players?.max || 0
              }
            });
          }
        } catch (e) {
          clearTimeout(timeout);
          ws.close();
          reject(new Error('Failed to parse server response: ' + e.message));
        }
      };
      
      ws.onerror = (error) => {
        clearTimeout(timeout);
        ws.close();
        reject(new Error('WebSocket proxy not available. A WebSocket-to-TCP proxy is required for browser-based Server List Ping.'));
      };
      
      timeout = setTimeout(() => {
        if (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN) {
          ws.close();
        }
        reject(new Error('Connection timeout'));
      }, 5000);
    });
  }

  async function fetchServerStatus() {
    try {
      const serverAddress = document.getElementById('server-address').textContent;
      const statusText = document.getElementById('status-text');
      const playerCount = document.getElementById('player-count');
      
      statusText.textContent = 'Checking...';
      statusText.style.color = '#ffaa00';
      
      const data = await pingMinecraftServer(serverAddress);
      
      if (data.online) {
        statusText.textContent = 'Online';
        statusText.style.color = '#00aa00';
        playerCount.textContent = `${data.players.online} / ${data.players.max}`;
      } else {
        statusText.textContent = 'Offline';
        statusText.style.color = '#ff0000';
        playerCount.textContent = '0 / 0';
      }
    } catch (error) {
      console.error('Error pinging server:', error);
      const statusText = document.getElementById('status-text');
      const playerCount = document.getElementById('player-count');
      
      statusText.textContent = 'Error';
      statusText.style.color = '#ff0000';
      playerCount.textContent = 'N/A';
      
      console.warn('Direct client ping requires a WebSocket-to-TCP proxy. Browsers cannot make raw TCP connections.');
    }
  }

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
