// Setup Three.js scene
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, window.innerWidth/window.innerHeight, 0.1, 1000);
camera.position.set(0, 2.5, 6);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// 🌍 Earth (half-sphere horizon view)
const loader = new THREE.TextureLoader();
loader.load('assets/globe.png', function (texture) {
  const geometry = new THREE.SphereGeometry(2, 64, 64, 0, Math.PI);  // half sphere
  const material = new THREE.MeshPhongMaterial({ map: texture });
  const earth = new THREE.Mesh(geometry, material);
  earth.rotation.x = Math.PI / 2.5;
  scene.add(earth);
});

// 🌞 Horizon glow
const atmosphere = new THREE.Mesh(
  new THREE.SphereGeometry(2.05, 64, 64, 0, Math.PI),
  new THREE.ShaderMaterial({
    uniforms: {
      "c": { type: "f", value: 0.4 },
      "p": { type: "f", value: 3.5 },
      glowColor: { type: "c", value: new THREE.Color(0x00bfff) },
      viewVector: { type: "v3", value: new THREE.Vector3(0, 0, 6) }
    },
    vertexShader: `
      uniform vec3 viewVector;
      uniform float c;
      uniform float p;
      varying float intensity;
      void main() {
        vec3 vNormal = normalize(normalMatrix * normal);
        vec3 vNormView = normalize(normalMatrix * viewVector);
        intensity = pow(c - dot(vNormal, vNormView), p);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      uniform vec3 glowColor;
      varying float intensity;
      void main() {
        gl_FragColor = vec4(glowColor * intensity, 1.0);
      }`,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
    transparent: true
  })
);
atmosphere.rotation.x = Math.PI / 2.5;
scene.add(atmosphere);

// 🛰️ Satellite billboard image
loader.load('assets/sat1.png', function (satTexture) {
  const material = new THREE.SpriteMaterial({ map: satTexture });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(1.2, 0.6, 1);  // size of the satellite
  sprite.position.set(1.5, 1.6, 1.2);
  scene.add(sprite);
});

// 🌌 Stars background
const starGeometry = new THREE.SphereGeometry(90, 64, 64);
const starMaterial = new THREE.MeshBasicMaterial({
  map: loader.load('https://raw.githubusercontent.com/rajeevratan84/threejs-starter/master/img/stars.jpg'),
  side: THREE.BackSide
});
scene.add(new THREE.Mesh(starGeometry, starMaterial));

// 🌞 Light source like a sunrise
const sunLight = new THREE.DirectionalLight(0xffffff, 2);
sunLight.position.set(5, 5, 2);
scene.add(new THREE.AmbientLight(0x111122));
scene.add(sunLight);

// 🎞️ Animate
function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}
animate();
