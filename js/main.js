window.onload = () => {
  const stars = document.getElementById("stars");
  const shootingContainer = document.getElementById("shooting-stars");

  // Static stars
  for (let i = 0; i < 100; i++) {
    const star = document.createElement("div");
    star.className = "star";
    star.style.top = `${Math.random() * 100}vh`;
    star.style.left = `${Math.random() * 100}vw`;
    stars.appendChild(star);
  }

  // Function to launch realistic shooting stars at random
  function launchShootingStar() {
    const shootingStar = document.createElement("div");
    shootingStar.className = "shooting-star";
    shootingStar.style.top = `${Math.random() * 40}vh`;  // top half of screen
    shootingStar.style.left = `${60 + Math.random() * 30}vw`; // right half
    shootingContainer.appendChild(shootingStar);

    setTimeout(() => {
      shootingStar.remove();
    }, 1500);
  }

  // Loop for random shooting stars
  setInterval(() => {
    if (Math.random() < 0.5) { // not too frequent
      launchShootingStar();
    }
  }, 1000);
};
