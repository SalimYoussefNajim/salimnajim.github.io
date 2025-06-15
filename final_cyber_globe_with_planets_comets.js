const globe = Globe()(document.getElementById('globeViz'))
  .globeImageUrl('assets/globe.png')  // Your local Earth texture
  .bumpImageUrl('https://unpkg.com/three-globe/example/img/earth-topology.png')
  .backgroundColor('#000000')
  .showGraticules(false)
  .width(window.innerWidth)
  .height(window.innerHeight * 0.95);

const controls = globe.controls();
controls.autoRotate = true;
controls.autoRotateSpeed = 1.0;
controls.enableZoom = false;
controls.enablePan = false;
globe.pointOfView({ lat: 10, lng: 0, altitude: 2.6 }, 0);

// Access scene
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
const starMaterial = new THREE.PointsMaterial({ color: 0x222244, size: 1.2 });
scene.add(new THREE.Points(starGeo, starMaterial));

// 🌞 Sunlight Horizon Lighting
scene.add(new THREE.AmbientLight(0x111122, 1.0));
const sun = new THREE.DirectionalLight(0xffffff, 1.5);
sun.position.set(20, 0, 10);
scene.add(sun);

// 🛰️ Satellite
const loader = new THREE.TextureLoader();
const satelliteGroup = new THREE.Group();

loader.load('assets/sat1.png', (texture) => {
  const satGeo = new THREE.PlaneGeometry(1, 0.5);
  const satMat = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
  const satellite = new THREE.Mesh(satGeo, satMat);
  satelliteGroup.add(satellite);
  satelliteGroup.position.set(3, 1, 0);
  scene.add(satelliteGroup);
});

// ☄️ Optional Comets
const comets = [];
const cometColors = [0xff0055, 0x33ccff, 0xffcc00, 0x00ff88];
function createComet() {
  const color = cometColors[Math.floor(Math.random() * cometColors.length)];
  const geo = new THREE.SphereGeometry(0.12, 12, 12);
  const mat = new THREE.MeshBasicMaterial({ color });
  const comet = new THREE.Mesh(geo, mat);
  comet.position.set((Math.random() - 0.5) * 50, Math.random() * 20 + 10, -60);
  scene.add(comet);
  comets.push({ mesh: comet, speed: Math.random() * 0.5 + 0.5 });
  setTimeout(() => {
    scene.remove(comet);
    const index = comets.findIndex(c => c.mesh === comet);
    if (index > -1) comets.splice(index, 1);
  }, 6000);
}

// 🎞️ Animate
function animate() {
  requestAnimationFrame(animate);

  const t = Date.now() * 0.001;
  satelliteGroup.position.set(
    3 * Math.cos(t * 0.4),
    1.5 * Math.sin(t * 0.4),
    3 * Math.sin(t * 0.4)
  );
  satelliteGroup.rotation.y += 0.005;

  comets.forEach(c => {
    c.mesh.position.z += c.speed * 2;
    c.mesh.position.x -= c.speed;
    c.mesh.position.y -= c.speed * 0.5;
  });

  renderer.render(scene, camera);
}
animate();
setInterval(createComet, 4000);
