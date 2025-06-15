// Initialize the cyber globe
const globe = Globe()(document.getElementById('globeViz'))
  .globeImageUrl('https://unpkg.com/three-globe/example/img/earth-night.jpg')
  .bumpImageUrl('https://unpkg.com/three-globe/example/img/earth-topology.png')
  .backgroundColor('#000000') // pure cyber space
  .showGraticules(true)
  .width(window.innerWidth)
  .height(window.innerHeight * 0.95);

// Configure camera controls
const controls = globe.controls();
controls.autoRotate = true;
controls.autoRotateSpeed = 1.4;
controls.enableZoom = false;
controls.enablePan = false;
globe.pointOfView({ lat: 12, lng: 0, altitude: 2.5 }, 0);

// Access Three.js components
const scene = globe.scene();
const camera = globe.camera();
const renderer = globe.renderer();

// 🌌 Cyber Starfield
const starGeometry = new THREE.BufferGeometry();
const starVertices = [];
for (let i = 0; i < 3000; i++) {
  starVertices.push((Math.random() - 0.5) * 10000);
  starVertices.push((Math.random() - 0.5) * 10000);
  starVertices.push((Math.random() - 0.5) * 10000);
}
starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
const starMaterial = new THREE.PointsMaterial({ color: 0x3399ff, size: 1.2 });
const stars = new THREE.Points(starGeometry, starMaterial);
scene.add(stars);

// 💡 Cyber Neon Lighting
const ambientLight = new THREE.AmbientLight(0x111133, 1.2);
const neonBlue = new THREE.PointLight(0x00ffff, 1.7, 250);
neonBlue.position.set(15, 15, 15);
const neonPurple = new THREE.PointLight(0xaa00ff, 1.2, 250);
neonPurple.position.set(-15, -15, -15);
scene.add(ambientLight, neonBlue, neonPurple);

// ☄️ Glowing Colored Comets
const comets = [];
const cometColors = [0xff0055, 0x33ccff, 0xffcc00, 0x00ff88, 0xaa00ff];

function createComet() {
  const color = cometColors[Math.floor(Math.random() * cometColors.length)];
  const geometry = new THREE.SphereGeometry(0.12, 12, 12);
  const material = new THREE.MeshBasicMaterial({ color });
  const comet = new THREE.Mesh(geometry, material);
  comet.position.set(
    (Math.random() - 0.5) * 50,
    Math.random() * 20 + 10,
    -60
  );
  scene.add(comet);
  comets.push({ mesh: comet, speed: Math.random() * 0.5 + 0.5 });

  // Remove comet after 7 seconds
  setTimeout(() => {
    scene.remove(comet);
    const index = comets.findIndex(c => c.mesh === comet);
    if (index > -1) comets.splice(index, 1);
  }, 7000);
}

// 🔁 Animation Loop
function animate() {
  requestAnimationFrame(animate);

  // Move comets
  comets.forEach(c => {
    c.mesh.position.z += c.speed * 2.5;
    c.mesh.position.x -= c.speed;
    c.mesh.position.y -= c.speed * 0.5;
  });

  renderer.render(scene, camera);
}

animate();
setInterval(createComet, 2500);
