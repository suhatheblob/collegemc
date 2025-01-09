console.log("script.js loaded");

document.addEventListener("DOMContentLoaded", () => {
  function createLeaf() {
    const leaf = document.createElement("div");
    leaf.classList.add("leaf");

    const leftPosition = Math.random() * 100;
    const duration = Math.random() * (15 - 5) + 5;

    leaf.style.left = `${leftPosition}vw`;
    leaf.style.animationDuration = `${duration}s`;

    document.getElementById("falling-leaves").appendChild(leaf);

    leaf.addEventListener("click", function () {
      console.log("Leaf clicked, exploding!");
      explode(leaf);
    });
  }

  function explode(leaf) {
    console.log("Explode function triggered!");

    const particleContainer = document.createElement("div");
    particleContainer.className = "particle-container";

    const leafRect = leaf.getBoundingClientRect();
    console.log("Leaf position:", leafRect);

    // Position the particle container at the center of the leaf
    particleContainer.style.left = `${leafRect.left + leafRect.width / 2}px`;
    particleContainer.style.top = `${leafRect.top + leafRect.height / 2}px`;

    const leafContainer = document.getElementById("falling-leaves");
    leafContainer.appendChild(particleContainer);

    // Create and animate particles
    for (let i = 0; i < 20; i++) {
      const particle = document.createElement("div");
      particle.className = "particle";
      particle.style.left = `${Math.random() * 40 - 20}px`;  // Random horizontal movement
      particle.style.top = `${Math.random() * 40 - 20}px`;   // Random vertical movement
      particle.style.backgroundColor = "pink";
      particleContainer.appendChild(particle);

      // Remove particles after 1 second (animation duration)
      setTimeout(() => {
        console.log(`Removing particle ${i + 1}`);
        particle.remove();
      }, 1000);
    }

    // Delay the removal of the leaf to ensure particles are visible
    setTimeout(() => {
      leaf.remove();
      console.log("Leaf removed after explosion");
    }, 1000); // Wait 1 second before removing the leaf

    // Remove the particle container after particles are done
    setTimeout(() => particleContainer.remove(), 1000);
  }

  setInterval(createLeaf, 1500); // Create leaves every 1.5 seconds
});
