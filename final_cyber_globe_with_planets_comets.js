const globe = Globe()(document.getElementById('globeViz'))
  .globeImageUrl('https://unpkg.com/three-globe/example/img/earth-night.jpg')
  .bumpImageUrl('https://unpkg.com/three-globe/example/img/earth-topology.png')
  .backgroundColor('#000000')
  .showGraticules(true)
  .width(window.innerWidth)
  .height(window.innerHeight * 0.9);

const controls = globe.controls();
controls.autoRotate = true;
controls.autoRotateSpeed = 1.3;
controls.enableZoom = false;
controls.enablePan = false;
globe.pointOfView({ lat: 10, lng: 0, altitude: 2.3 }, 0);

// Access underlying three.js components
const scene = globe.scene();
const camera = globe.camera();
const renderer = globe.renderer();

// 🌌 Neon Cyber Starfield
const starGeo = new THREE.BufferGeometry();
const starVertices = [];
for (let i = 0; i < 2500; i++) {
  starVertices.push((Math.random() - 0.5) * 8000);
  starVertices.push((Math.random() - 0.5) * 8000);
  starVertices.push((Math.random() - 0.5) * 8000);
}
starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
const starMaterial = new THREE.PointsMaterial({ color: 0x44ccff, size: 1 });
scene.add(new THREE.Points(starGeo, starMaterial));

// 💡 Cyber Lighting
scene.add(new THREE.AmbientLight(0x111155, 1));
const neonLight = new THREE.PointLight(0x00ffff, 2, 150);
neonLight.position.set(20, 20, 20);
scene.add(neonLight);

// ☄️ Shooting Comets
const comets = [];
function createComet() {
  const geometry = new THREE.SphereGeometry(0.1, 12, 12);
  const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const comet = new THREE.Mesh(geometry, material);
  comet.position.set(
    (Math.random() - 0.5) * 30,
    Math.random() * 15 + 5,
    -30
  );
  scene.add(comet);
  comets.push({ mesh: comet, speed: Math.random() * 0.4 + 0.4 });

  setTimeout(() => {
    scene.remove(comet);
    const index = comets.findIndex(c => c.mesh === comet);
    if (index > -1) comets.splice(index, 1);
  }, 6000);
}

// 🔁 Animation Loop
function animate() {
  requestAnimationFrame(animate);

  comets.forEach(c => {
    c.mesh.position.z += c.speed * 2;
    c.mesh.position.x -= c.speed;
    c.mesh.position.y -= c.speed * 0.5;
  });

  renderer.render(scene, camera);
}
animate();
setInterval(createComet, 3000);
