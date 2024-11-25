document.addEventListener('DOMContentLoaded', function () {
    setInterval(createLeaf, 500);  // Create a leaf every 500ms (adjust as needed)
  });
  
  function createLeaf() {
    const leaf = document.createElement('div');
    leaf.classList.add('leaf');
    
    // Set a random starting position and animation timing for each leaf
    const startPositionX = Math.random() * window.innerWidth;  // Random X position across the page
    leaf.style.left = `${startPositionX}px`;
  
    // Append the leaf to the container
    document.getElementById('falling-leaves').appendChild(leaf);
  
    // Remove the leaf once the animation is done
    setTimeout(() => {
      leaf.remove();
    }, 15000);  // Matches the animation duration (15s in this case)
  }
  