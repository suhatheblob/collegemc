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

  // ----- Announcement banner (dismissible, stored in localStorage) -----
  const BANNER_STORAGE_KEY = 'collegemc-banner-dismissed';
  const announcementBanner = document.getElementById('announcement-banner');
  const announcementDismiss = document.getElementById('announcement-dismiss');

  if (announcementBanner && announcementDismiss) {
    if (localStorage.getItem(BANNER_STORAGE_KEY) === 'true') {
      announcementBanner.setAttribute('data-dismissed', 'true');
      document.body.classList.add('banner-dismissed');
    }
    announcementDismiss.addEventListener('click', () => {
      announcementBanner.setAttribute('data-dismissed', 'true');
      document.body.classList.add('banner-dismissed');
      localStorage.setItem(BANNER_STORAGE_KEY, 'true');
    });
  }

  // ----- Nav: layered menu (Map / Leaderboard → Vanilla / Modded), hamburger or Back in center -----
  const NAV_URLS = {
    map: { vanilla: 'https://map.collegemc.com', modded: 'https://moddedmap.collegemc.com' },
    leaderboard: { vanilla: 'https://playerstats.collegemc.com/hof', modded: 'https://moddedplayerstats.collegemc.com/hof' }
  };

  const menuToggle = document.getElementById('menu-toggle');
  const navBack = document.getElementById('nav-back');
  const navMenu = document.getElementById('nav-menu');
  const navItemLeft = document.getElementById('nav-item-left');
  const navItemRight = document.getElementById('nav-item-right');

  if (menuToggle && navBack && navMenu && navItemLeft && navItemRight) {
    let navLevel = 0; // 0 = main (Web Map, Leaderboard), 1 = submenu (Vanilla, Modded)

    function renderMainMenu() {
      navItemLeft.innerHTML = `<button type="button" class="nav-link" data-nav="map">
        <span class="nav-link-icon" aria-hidden="true">🗺️</span>
        <span class="nav-link-label">Web Map</span>
      </button>`;
      navItemRight.innerHTML = `<button type="button" class="nav-link" data-nav="leaderboard">
        <span class="nav-link-icon" aria-hidden="true">🏆</span>
        <span class="nav-link-label">Leaderboard</span>
      </button>`;
    }

    function renderSubmenu(type) {
      const urls = NAV_URLS[type];
      const isMap = type === 'map';
      navItemLeft.innerHTML = `<a href="${urls.vanilla}" class="nav-link" target="_blank" rel="noopener">
        <span class="nav-link-icon" aria-hidden="true">${isMap ? '🗺️' : '🏆'}</span>
        <span class="nav-link-label">Vanilla ${isMap ? 'Map' : 'Leaderboard'}</span>
      </a>`;
      navItemRight.innerHTML = `<a href="${urls.modded}" class="nav-link" target="_blank" rel="noopener">
        <span class="nav-link-icon" aria-hidden="true">${isMap ? '🗺️' : '🏆'}</span>
        <span class="nav-link-label">Modded ${isMap ? 'Map' : 'Leaderboard'}</span>
      </a>`;
    }

    function setCenterButtons(level) {
      navLevel = level;
      if (level === 0) {
        menuToggle.style.display = '';
        navBack.style.display = 'none';
      } else {
        menuToggle.style.display = 'none';
        navBack.style.display = '';
      }
    }

    function setNavOpen(open) {
      const isOpen = !!open;
      menuToggle.setAttribute('aria-expanded', isOpen);
      menuToggle.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');
      navMenu.setAttribute('aria-expanded', isOpen);
      if (!isOpen) {
        navLevel = 0;
        renderMainMenu();
        setCenterButtons(0);
      }
    }

    menuToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = navMenu.getAttribute('aria-expanded') === 'true';
      if (isOpen) {
        setNavOpen(false);
      } else {
        renderMainMenu();
        setCenterButtons(0);
        setNavOpen(true);
      }
    });

    navBack.addEventListener('click', (e) => {
      e.stopPropagation();
      renderMainMenu();
      setCenterButtons(0);
    });

    navMenu.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-nav]');
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();
      const type = btn.getAttribute('data-nav');
      if (type === 'map' || type === 'leaderboard') {
        renderSubmenu(type);
        setCenterButtons(1);
      }
    });

    document.addEventListener('click', (e) => {
      if (navMenu.getAttribute('aria-expanded') === 'true' && !e.target.closest('.nav-wrap')) {
        setNavOpen(false);
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && navMenu.getAttribute('aria-expanded') === 'true') {
        if (navLevel === 1) {
          renderMainMenu();
          setCenterButtons(0);
        } else {
          setNavOpen(false);
        }
      }
    });

    renderMainMenu();
  }

  // ----- Dynamic servers (from servers.json for GitHub Pages) -----
  const SERVERS_JSON = 'servers.json';
  const COLLEGEMC_API_BASE = 'https://api.collegemc.com';
  const MCSTATUS_API = 'https://api.mcstatus.io/v2/status/java';

  /** Fetch status: CollegeMC custom API (same shape as debug.js) or mcstatus.io. Returns { online, playersDisplay } or null. */
  async function fetchServerStatus(server) {
    const source = server.statusSource || 'mcstatus';
    if (source === 'none') return null;

    if (source === 'collegemc') {
      try {
        const base = server.apiBase || COLLEGEMC_API_BASE;
        const path = server.apiPath || '/api';
        const res = await fetch(`${base}${path}`, { cache: 'no-cache' });
        if (!res.ok) return null;
        const data = await res.json();
        const playersDisplay = data.playerCountDisplay != null
          ? data.playerCountDisplay
          : (data.playerCount != null && data.maxPlayers != null)
            ? `${data.playerCount} / ${data.maxPlayers}`
            : null;
        return { online: !!data.online, playersDisplay: playersDisplay ?? null };
      } catch {
        return null;
      }
    }

    try {
      const res = await fetch(`${MCSTATUS_API}/${encodeURIComponent(server.address)}`, { cache: 'no-cache' });
      if (!res.ok) return null;
      const data = await res.json();
      const cur = data.players?.online;
      const max = data.players?.max;
      const playersDisplay = (cur != null && max != null) ? `${cur} / ${max}` : null;
      return { online: !!data.online, playersDisplay };
    } catch {
      return null;
    }
  }

  async function loadServers() {
    const container = document.getElementById('server-cards');
    const loading = document.getElementById('server-loading');
    if (!container) return;

    // Try multiple URLs so it works locally and on GitHub Pages
    const pathname = window.location.pathname.replace(/\/$/, '') || '/';
    const base = pathname.endsWith('.html') ? pathname.replace(/\/[^/]*$/, '') : pathname;
    const urlsToTry = [
      (base ? base + '/' : './') + SERVERS_JSON,
      '/servers.json',
      './servers.json'
    ].filter((u, i, a) => a.indexOf(u) === i);

    let servers = [];
    for (const url of urlsToTry) {
      try {
        const res = await fetch(url, { cache: 'no-cache' });
        if (!res.ok) continue;
        const data = await res.json();
        if (Array.isArray(data)) {
          servers = data;
          break;
        }
      } catch {
        continue;
      }
    }

    // Only include valid entries (name + address)
    servers = servers.filter(s => s && typeof s.name === 'string' && typeof s.address === 'string');
    if (servers.length === 0) {
      container.innerHTML = '<p class="server-loading">No servers configured or servers.json could not be loaded. Add entries to servers.json.</p>';
      if (loading) loading.remove();
      return;
    }

    if (loading) loading.remove();

    container.innerHTML = servers.map((server, i) => {
        const cardId = `server-card-${i}`;
        const statusId = `server-status-${i}`;
        const playersId = `server-players-${i}`;
        const displayAddr = escapeHtml(server.address);
        const copyAddr = escapeHtml(server.addressCopy != null ? server.addressCopy : server.address);
        const name = escapeHtml(server.name);
        const noStatus = (server.statusSource || '') === 'none';
        const statusInitial = noStatus ? '—' : '...';
        const playersInitial = noStatus ? '—' : '...';
        return `<div class="server-card" id="${cardId}">
  <p class="server-card-name">${name}</p>
  <div class="server-address-container">
    <code class="server-address" data-address="${copyAddr}" title="Click to copy">${displayAddr}</code>
    <button type="button" class="copy-button" data-address="${copyAddr}" aria-label="Copy address">📋 Copy</button>
  </div>
  <p class="server-status">🟢 Status: <span class="server-status-unknown" id="${statusId}" data-checked="${noStatus}" data-no-status="${noStatus}">${statusInitial}</span></p>
  <p class="player-count">👥 Players: <span class="server-players" id="${playersId}">${playersInitial}</span></p>
</div>`;
      }).join('');

      container.querySelectorAll('.copy-button').forEach(btn => {
        btn.addEventListener('click', () => copyAddress(btn.dataset.address, btn));
      });
      container.querySelectorAll('.server-address').forEach(el => {
        el.addEventListener('click', () => copyAddress(el.dataset.address, el.nextElementSibling));
      });

      async function refreshAllStatuses() {
        for (let i = 0; i < servers.length; i++) {
          const server = servers[i];
          const statusEl = document.getElementById(`server-status-${i}`);
          const playersEl = document.getElementById(`server-players-${i}`);
          if (!statusEl || !playersEl) continue;
          if (statusEl.dataset.noStatus === 'true') continue;
          statusEl.textContent = 'Checking...';
          statusEl.className = 'server-status-unknown';
          statusEl.dataset.checked = 'true';
          let data = null;
          try {
            data = await fetchServerStatus(server);
          } catch {
            data = null;
          }
          if (data?.online) {
            statusEl.textContent = 'Online';
            statusEl.className = 'server-status-online';
            playersEl.textContent = data.playersDisplay || 'N/A';
          } else {
            statusEl.textContent = data === null ? 'Unknown' : 'Offline';
            statusEl.className = data === null ? 'server-status-unknown' : 'server-status-offline';
            playersEl.textContent = data === null ? 'N/A' : '0 / 0';
          }
        }
      }

      await refreshAllStatuses();
      setInterval(refreshAllStatuses, 30000);
  }

  function copyAddress(address, buttonEl) {
    if (!address) return;
    navigator.clipboard.writeText(address).then(() => {
      if (buttonEl?.classList?.contains('copy-button')) {
        buttonEl.textContent = '✓ Copied!';
        buttonEl.classList.add('copied');
        setTimeout(() => {
          buttonEl.textContent = '📋 Copy';
          buttonEl.classList.remove('copied');
        }, 2000);
      }
    });
  }

  function escapeHtml(s) {
    const div = document.createElement('div');
    div.textContent = s == null ? '' : String(s);
    return div.innerHTML;
  }

  loadServers();


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
