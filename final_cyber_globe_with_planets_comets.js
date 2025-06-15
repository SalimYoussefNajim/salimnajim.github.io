const globe = Globe()(document.getElementById('globeViz'))
  .globeImageUrl('assets/globe.png')  // 🔁 Local 4K texture
  .bumpImageUrl('https://unpkg.com/three-globe/example/img/earth-topology.png')
  .backgroundColor('#000000')
  .showGraticules(true)
  .width(window.innerWidth)
  .height(window.innerHeight * 0.95);

const controls = globe.controls();
controls.autoRotate = true;
controls.autoRotateSpeed = 1.4;
controls.enableZoom = false;
controls.enablePan = false;
globe.pointOfView({ lat: 10, lng: 0, altitude: 2.4 }, 0);

const scene = globe.scene();
const camera = globe.camera();
const renderer = globe.renderer();

// 🌌 Starfield
const starGeo = new THREE.BufferGeometry();
const stars = [];
for (let i = 0; i < 3000; i++) {
  stars.push((Math.random() - 0.5) * 10000);
  stars.push((Math.random() - 0.5) * 10000);
  stars.push((Math.random() - 0.5) * 10000);
}
starGeo.setAttribute('position', new THREE.Float32BufferAttribute(stars, 3));
const starMaterial = new THREE.PointsMaterial({ color: 0x3399ff, size: 1.1 });
scene.add(new THREE.Points(starGeo, starMaterial));

// 💡 Lighting
scene.add(new THREE.AmbientLight(0x111133, 1.2));
const light1 = new THREE.PointLight(0x00ffff, 1.5, 250);
light1.position.set(15, 15, 15);
const light2 = new THREE.PointLight(0xaa00ff, 1.2, 250);
light2.position.set(-15, -15, -15);
scene.add(light1, light2);

// ☄️ Colored Comets
const comets = [];
const cometColors = [0xff0055, 0x33ccff, 0xffcc00, 0x00ff88, 0xaa00ff];
function createComet() {
  const color = cometColors[Math.floor(Math.random() * cometColors.length)];
  const geometry = new THREE.SphereGeometry(0.12, 12, 12);
  const material = new THREE.MeshBasicMaterial({ color });
  const comet = new THREE.Mesh(geometry, material);
  comet.position.set((Math.random() - 0.5) * 50, Math.random() * 20 + 10, -60);
  scene.add(comet);
  comets.push({ mesh: comet, speed: Math.random() * 0.5 + 0.5 });
  setTimeout(() => {
    scene.remove(comet);
    const index = comets.findIndex(c => c.mesh === comet);
    if (index > -1) comets.splice(index, 1);
  }, 7000);
}

// 🛰️ Satellite
const satelliteGroup = new THREE.Group();
const loader = new THREE.TextureLoader();

loader.load('assets/sat1.png', (texture) => {
  const satBody = new THREE.SphereGeometry(0.3, 32, 32);
  const satMaterial = new THREE.MeshStandardMaterial({ map: texture });
  const satellite = new THREE.Mesh(satBody, satMaterial);
  satelliteGroup.add(satellite);

  // Simple panels
  const panelGeo = new THREE.BoxGeometry(0.05, 0.4, 0.8);
  const panelMat = new THREE.MeshStandardMaterial({ color: 0x0077ff });
  const panelL = new THREE.Mesh(panelGeo, panelMat);
  const panelR = new THREE.Mesh(panelGeo, panelMat);
  panelL.position.set(-0.35, 0, 0);
  panelR.position.set(0.35, 0, 0);
  satelliteGroup.add(panelL, panelR);

  satelliteGroup.position.set(3, 0.5, 0);
  scene.add(satelliteGroup);
});

// 🔁 Animate
function animate() {
  requestAnimationFrame(animate);

  comets.forEach(c => {
    c.mesh.position.z += c.speed * 2.5;
    c.mesh.position.x -= c.speed;
    c.mesh.position.y -= c.speed * 0.5;
  });

  // Satellite orbit
  const t = Date.now() * 0.001;
  satelliteGroup.position.set(
    3 * Math.cos(t * 0.4),
    1.2 * Math.sin(t * 0.4),
    3 * Math.sin(t * 0.4)
  );
  satelliteGroup.rotation.y += 0.01;

  renderer.render(scene, camera);
}
animate();
setInterval(createComet, 2500);
