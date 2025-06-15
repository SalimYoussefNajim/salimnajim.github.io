
const globe = Globe()(document.getElementById('globeViz'))
  .globeImageUrl('https://unpkg.com/three-globe/example/img/earth-night.jpg')
  .bumpImageUrl('https://unpkg.com/three-globe/example/img/earth-topology.png')
  .backgroundColor('#000000')
  .showGraticules(true)
  .width(window.innerWidth)
  .height(window.innerHeight * 0.85);

const controls = globe.controls();
controls.autoRotate = true;
controls.autoRotateSpeed = 1.2;
controls.enableZoom = false;
controls.enablePan = false;
globe.pointOfView({ lat: 20, lng: 0, altitude: 2.5 }, 0);

const scene = globe.scene();
const camera = globe.camera();
const renderer = globe.renderer();

// 🌌 Cyber Starfield
const starGeometry = new THREE.BufferGeometry();
const starCount = 3000;
const starVertices = [];
for (let i = 0; i < starCount; i++) {
  const x = (Math.random() - 0.5) * 8000;
  const y = (Math.random() - 0.5) * 8000;
  const z = (Math.random() - 0.5) * 8000;
  starVertices.push(x, y, z);
}
starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
const starMaterial = new THREE.PointsMaterial({ color: 0x44ccff, size: 1 });
scene.add(new THREE.Points(starGeometry, starMaterial));

// 💡 Lighting
scene.add(new THREE.AmbientLight(0x222244, 1.2));
const pointLight = new THREE.PointLight(0x00ffff, 1.5);
pointLight.position.set(15, 15, 15);
scene.add(pointLight);

const loader = new THREE.TextureLoader(); // ✅ This must come before loading
const planets = [
  {
    name: 'mars',
    texture: 'assets/mars.jpg',
    size: 0.5,
    radius: 6,
    speed: 1.0
  },
  {
    name: 'jupiter',
    texture: 'assets/jupiter.jpg',
    size: 0.8,
    radius: 10,
    speed: 0.6
  },
  {
    name: 'saturn',
    texture: 'assets/saturn.jpg',
    size: 0.7,
    radius: 14,
    speed: 0.4
  }
];


const planetMeshes = [];

planets.forEach(({ texture, size, radius, speed }) => {
  loader.load(texture, (tex) => {
    const geo = new THREE.SphereGeometry(size, 32, 32);
    const mat = new THREE.MeshStandardMaterial({ map: tex });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.userData = { radius, speed };
    scene.add(mesh);
    planetMeshes.push(mesh);
  });
});

// ☄️ Comets
const comets = [];
function createComet() {
  const geometry = new THREE.SphereGeometry(0.15, 16, 16);
  const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const comet = new THREE.Mesh(geometry, material);
  comet.position.set(
    (Math.random() - 0.5) * 40,
    Math.random() * 10 + 5,
    -30
  );
  scene.add(comet);
  comets.push({ mesh: comet, speed: Math.random() * 0.5 + 0.5 });
  setTimeout(() => {
    scene.remove(comet);
    const index = comets.findIndex(c => c.mesh === comet);
    if (index > -1) comets.splice(index, 1);
  }, 6000);
}

function animate() {
  requestAnimationFrame(animate);
  const t = Date.now() * 0.001;

  planetMeshes.forEach((mesh) => {
    const { radius, speed } = mesh.userData;
    mesh.position.set(
      radius * Math.cos(t * speed),
      0.5 * Math.sin(t * speed),
      radius * Math.sin(t * speed)
    );
  });

// Animate comets
  comets.forEach(c => {
    c.mesh.position.z += c.speed * 2;
    c.mesh.position.x -= c.speed;
    c.mesh.position.y -= c.speed * 0.5;
  });
  renderer.render(scene, camera);
}

animate();
setInterval(createComet, 3000);
