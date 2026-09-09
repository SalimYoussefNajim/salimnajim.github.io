import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

type Triple = [number, number, number];
type Pose = { position: THREE.Vector3; quaternion: THREE.Quaternion; scale: THREE.Vector3 };

/** One original instrument, three scroll compositions, and no idle animation loop. */
export function mountExperienceScene(host: HTMLElement): () => void {
  const mount = host.querySelector<HTMLElement>('[data-experience-canvas]');
  const experience = host.closest<HTMLElement>('[data-experience]');
  const stage = experience?.querySelector<HTMLElement>('[data-experience-stage]');
  if (!mount || !experience || !stage) return () => {};

  const mobile = window.matchMedia('(max-width: 700px), (pointer: coarse)').matches;
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let reduced = motion.matches;
  let renderer: THREE.WebGLRenderer;
  function unavailable(): void {
    host.dataset.experienceRender = 'fallback';
    host.dispatchEvent(new CustomEvent('experience:unavailable'));
  }
  // Older browsers keep the complete SVG composition without allocating GPU resources.
  if (typeof ResizeObserver === 'undefined' || typeof IntersectionObserver === 'undefined') {
    unavailable();
    return () => {};
  }
  try {
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
  } catch {
    unavailable();
    return () => {};
  }
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.92;
  renderer.domElement.setAttribute('aria-hidden', 'true');
  mount.appendChild(renderer.domElement);

  function makeEnvironment(): THREE.WebGLRenderTarget {
    const room = new RoomEnvironment();
    const generator = new THREE.PMREMGenerator(renderer);
    try {
      return generator.fromScene(room, 0.05, 0.1, 30, { size: mobile ? 128 : 256 });
    } finally {
      room.dispose();
      generator.dispose();
    }
  }
  let environment: THREE.WebGLRenderTarget;
  try {
    environment = makeEnvironment();
  } catch {
    renderer.dispose();
    renderer.domElement.remove();
    unavailable();
    return () => {};
  }

  const scene = new THREE.Scene();
  scene.environment = environment.texture;
  scene.environmentIntensity = 0.75;
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 40);
  const instrument = new THREE.Group();
  scene.add(instrument);
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const instances = new Set<THREE.InstancedMesh>();
  const tracks: { object: THREE.Object3D; poses: [Pose, Pose, Pose] }[] = [];
  const segments = mobile ? 64 : 96;

  function surface(color: number, metalness = 0.8, roughness = 0.42): THREE.MeshStandardMaterial {
    const material = new THREE.MeshStandardMaterial({ color, metalness, roughness });
    materials.add(material);
    return material;
  }
  const titanium = surface(0x7c8993, 0.93, 0.34);
  const satin = surface(0xb0bbc3, 0.94, 0.29);
  const sidewall = surface(0x4a5864, 0.9, 0.38);
  const dark = surface(0x26313c, 0.65, 0.46);
  const blue = surface(0x36546a, 0.55, 0.47);
  const panelSurface = surface(0x172e43, 0.38, 0.5);
  const fineMetal = surface(0x829ba9, 0.74, 0.4);
  const lens = surface(0x172632, 0.64, 0.25);

  function mesh(geometry: THREE.BufferGeometry, material: THREE.Material, parent: THREE.Object3D): THREE.Mesh {
    geometries.add(geometry);
    const object = new THREE.Mesh(geometry, material);
    parent.add(object);
    return object;
  }
  function pose(position: Triple, rotation: Triple, scale: Triple = [1, 1, 1]): Pose {
    return { position: new THREE.Vector3(...position), quaternion: new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)), scale: new THREE.Vector3(...scale) };
  }
  function track(object: THREE.Object3D, first: Pose, second: Pose, third: Pose): void {
    tracks.push({ object, poses: [first, second, third] });
  }
  function annulus(outer: number, width: number, depth: number): THREE.BufferGeometry {
    const inner = outer - width;
    const bevel = Math.min(0.022, width / 4, depth / 4);
    const profile = [
      [inner, -depth / 2 + bevel], [inner + bevel, -depth / 2],
      [outer - bevel, -depth / 2], [outer, -depth / 2 + bevel],
      [outer, depth / 2 - bevel], [outer - bevel, depth / 2],
      [inner + bevel, depth / 2], [inner, depth / 2 - bevel],
      [inner, -depth / 2 + bevel],
    ].map(([radius, z]) => new THREE.Vector2(radius, z));
    return new THREE.LatheGeometry(profile, segments).rotateX(Math.PI / 2);
  }
  function cylinder(radius: number, depth: number, material: THREE.Material, parent: THREE.Object3D, z = 0, sides = 48): THREE.Mesh {
    const object = mesh(new THREE.CylinderGeometry(radius, radius, depth, sides).rotateX(Math.PI / 2), material, parent);
    object.position.z = z;
    return object;
  }
  function ring(radius: number, width: number, depth: number): THREE.Group {
    const group = new THREE.Group();
    instrument.add(group);
    mesh(annulus(radius, width, depth), titanium, group);
    // A darker cylindrical band separates the machined sidewall from the silver face.
    mesh(new THREE.CylinderGeometry(radius + 0.0005, radius + 0.0005, depth - 0.045, segments, 1, true).rotateX(Math.PI / 2), sidewall, group);
    const edge = mesh(annulus(radius - 0.013, 0.012, 0.008), satin, group);
    edge.position.z = depth / 2 - 0.002;
    const inner = mesh(annulus(radius - width + 0.021, 0.016, 0.007), blue, group);
    inner.position.z = depth / 2;

    // Repeated index engravings share one draw call per bearing ring.
    const count = mobile ? 32 : 48;
    const tickGeometry = new THREE.BoxGeometry(width * 0.28, 0.008, 0.004);
    geometries.add(tickGeometry);
    const ticks = new THREE.InstancedMesh(tickGeometry, fineMetal, count);
    const matrix = new THREE.Matrix4();
    const quaternion = new THREE.Quaternion();
    const position = new THREE.Vector3();
    for (let i = 0; i < count; i++) {
      const angle = i / count * Math.PI * 2;
      quaternion.setFromAxisAngle(new THREE.Vector3(0, 0, 1), angle);
      position.set(Math.cos(angle) * (radius - width * 0.48), Math.sin(angle) * (radius - width * 0.48), depth / 2 + 0.003);
      matrix.compose(position, quaternion, new THREE.Vector3(1, 1, 1));
      ticks.setMatrixAt(i, matrix);
    }
    ticks.instanceMatrix.needsUpdate = true;
    ticks.computeBoundingBox();
    instances.add(ticks);
    group.add(ticks);
    return group;
  }

  const outer = ring(1.67, 0.135, 0.15);
  const middle = ring(1.34, 0.14, 0.16);
  const inner = ring(1.01, 0.13, 0.145);
  track(outer,
    pose([0, 0, 0], [0.18, -0.3, -0.22]),
    pose([-0.18, 0, -1.02], [0.05, 0.04, -0.12]),
    pose([0, 0.02, -0.03], [1.09, 0.13, -0.22]));
  track(middle,
    pose([0, 0, 0], [1.05, 0.18, 0.35]),
    pose([0.03, 0, -0.16], [0.08, 0.15, 0.2]),
    pose([0, 0, -0.06], [-0.5, 0.84, 0.34]));
  track(inner,
    pose([0, 0, 0], [-0.5, 0.48, -0.35]),
    pose([0.12, 0, 0.63], [0.09, 0.16, -0.3]),
    pose([0, 0, -0.5], [0.08, 0.1, 0], [0.77, 0.77, 0.77]));

  const core = new THREE.Group();
  instrument.add(core);
  cylinder(0.585, 0.5, sidewall, core, 0, 12);
  cylinder(0.52, 0.07, sidewall, core, 0.285);
  cylinder(0.52, 0.006, satin, core, 0.321);
  cylinder(0.52, 0.055, dark, core, -0.28);
  for (const radius of [0.477, 0.502]) {
    const groove = mesh(new THREE.TorusGeometry(radius, 0.0028, 4, segments), sidewall, core);
    groove.position.z = 0.324;
  }
  const frontRim = mesh(annulus(0.445, 0.095, 0.035), titanium, core);
  frontRim.position.z = 0.332;
  cylinder(0.345, 0.035, dark, core, 0.343);
  const glass = mesh(new THREE.SphereGeometry(0.265, 32, 16), lens, core);
  glass.scale.z = 0.28;
  glass.position.z = 0.363;
  const lensRim = mesh(annulus(0.287, 0.017, 0.024), fineMetal, core);
  lensRim.position.z = 0.365;
  const ribs: THREE.Mesh[] = [];
  const ribGeometry = new THREE.BoxGeometry(0.23, 0.066, 0.12);
  for (let i = 0; i < 8; i++) {
    const angle = i / 8 * Math.PI * 2;
    const rib = mesh(ribGeometry, i % 2 ? satin : titanium, core);
    rib.position.set(Math.cos(angle) * 0.675, Math.sin(angle) * 0.675, -0.02);
    rib.rotation.z = angle;
    ribs.push(rib);
  }
  track(core,
    pose([0, 0, 0], [0.03, -0.08, 0]),
    pose([0.12, 0.01, 1.1], [0.1, 0.1, 0]),
    pose([0, 0, 0.22], [0.04, -0.15, 0.1]));

  const bearings: THREE.Group[] = [];
  for (const sign of [-1, 1]) {
    const bearing = new THREE.Group();
    instrument.add(bearing);
    cylinder(0.18, 0.29, satin, bearing, 0, 24);
    cylinder(0.12, 0.31, dark, bearing, 0.008, 24);
    cylinder(0.078, 0.32, titanium, bearing, 0.01, 12);
    track(bearing,
      pose([sign * 1.46, 0, 0], [0, Math.PI / 2, 0]),
      pose([sign * 1.88, 0, -0.18], [0, Math.PI / 2, 0]),
      pose([sign * 0.79, 0, 0.2], [0, Math.PI / 2, 0], [0.85, 0.85, 0.85]));
    bearings.push(bearing);
  }

  const wings: THREE.Group[] = [];
  for (const sign of [-1, 1]) {
    const wing = new THREE.Group();
    instrument.add(wing);
    const arm = mesh(new THREE.BoxGeometry(1.32, 0.085, 0.085), titanium, wing);
    arm.position.x = sign * 0.74;
    for (let panelIndex = 0; panelIndex < 2; panelIndex++) {
      const panel = new THREE.Group();
      panel.position.x = sign * (0.75 + panelIndex * 0.63);
      wing.add(panel);
      mesh(new THREE.BoxGeometry(0.60, 0.92, 0.055), dark, panel);
      const face = mesh(new THREE.BoxGeometry(0.555, 0.87, 0.012), panelSurface, panel);
      face.position.z = 0.033;
      for (let cell = 0; cell < 5; cell++) {
        const seam = mesh(new THREE.BoxGeometry(0.53, 0.005, 0.004), fineMetal, panel);
        seam.position.set(0, -0.3 + cell * 0.15, 0.041);
      }
      const seam = mesh(new THREE.BoxGeometry(0.005, 0.835, 0.004), fineMetal, panel);
      seam.position.z = 0.041;
    }
    track(wing,
      pose([0, 0, 0], [0, sign * Math.PI / 2, 0], [0.001, 0.001, 0.001]),
      pose([0, 0, 0.85], [0, sign * Math.PI / 2, 0], [0.001, 0.001, 0.001]),
      pose([sign * 0.49, 0, 0.16], [0.12, sign * -0.12, 0], [1, 1, 1]));
    wings.push(wing);
  }

  // The final composition reveals a compact antenna as the folded arrays open.
  const antenna = new THREE.Group();
  instrument.add(antenna);
  const mast = mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.55, 12), titanium, antenna);
  mast.position.y = 0.19;
  const dishPoints = [[0, 0], [0.08, 0.005], [0.19, 0.035], [0.3, 0.10], [0.34, 0.145]]
    .map(([radius, y]) => new THREE.Vector2(radius, y));
  const dishMaterial = surface(0x8e9ba5, 0.73, 0.48);
  dishMaterial.side = THREE.DoubleSide;
  const dish = mesh(new THREE.LatheGeometry(dishPoints, mobile ? 32 : 48), dishMaterial, antenna);
  dish.position.y = 0.46;
  const feed = mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.27, 10), dark, antenna);
  feed.position.y = 0.6;
  track(antenna,
    pose([0, 0, 0], [0, 0, 0], [0.001, 0.001, 0.001]),
    pose([0, 0, 0.7], [0, 0, 0], [0.001, 0.001, 0.001]),
    pose([0.05, 0.38, 0.16], [0.12, 0, -0.22]));

  scene.add(new THREE.HemisphereLight(0xcbd7e2, 0x2c3640, 0.7));
  const key = new THREE.DirectionalLight(0xeaf0f5, 1.8);
  key.position.set(-3, 4, 6);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x9dbad3, 1.6);
  rim.position.set(4, 2, -3);
  scene.add(rim);
  const fill = new THREE.DirectionalLight(0xd2d6d8, 0.55);
  fill.position.set(1, -3, 3);
  scene.add(fill);

  // Fit visible component bounds in camera space; no viewport-specific crop guesses.
  const view = new THREE.Vector3(0.42, 0.23, 1).normalize();
  const right = new THREE.Vector3(view.z, 0, -view.x).normalize();
  const up = new THREE.Vector3().crossVectors(view, right).normalize();
  const point = new THREE.Vector3();
  geometries.forEach((geometry) => geometry.computeBoundingBox());
  function fitCamera(): void {
    instrument.updateMatrixWorld(true);
    const tangentY = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const tangentX = tangentY * camera.aspect;
    let distance = 1;
    instrument.traverseVisible((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      const bounds = object instanceof THREE.InstancedMesh ? object.boundingBox : object.geometry.boundingBox;
      if (!bounds) return;
      for (let corner = 0; corner < 8; corner++) {
        point.set(corner & 1 ? bounds.max.x : bounds.min.x,
          corner & 2 ? bounds.max.y : bounds.min.y,
          corner & 4 ? bounds.max.z : bounds.min.z).applyMatrix4(object.matrixWorld);
        distance = Math.max(distance, point.dot(view) + Math.max(Math.abs(point.dot(right)) / tangentX, Math.abs(point.dot(up)) / tangentY) * 1.12);
      }
    });
    camera.position.copy(view).multiplyScalar(distance);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();
  }

  const aborter = new AbortController();
  const { signal } = aborter;
  let visible = false;
  let disposed = false;
  let contextLost = false;
  let frame = 0;
  let width = 0;
  let height = 0;
  let dirty = true;
  let lastProgress = -1;

  function getProgress(): number {
    if (!experience!.classList.contains('is-enhanced')) return 0;
    const bounds = experience!.getBoundingClientRect();
    const stageHeight = stage!.getBoundingClientRect().height;
    const stickyTop = Number.parseFloat(getComputedStyle(stage!).top) || 0;
    return THREE.MathUtils.clamp((stickyTop - bounds.top) / Math.max(1, bounds.height - stageHeight), 0, 1);
  }
  function compose(progress: number): void {
    const separate = THREE.MathUtils.smoothstep(progress, 0.12, 0.43);
    const reconfigure = THREE.MathUtils.smoothstep(progress, 0.55, 0.91);
    for (const { object, poses } of tracks) {
      object.position.lerpVectors(poses[0].position, poses[1].position, separate).lerp(poses[2].position, reconfigure);
      object.quaternion.slerpQuaternions(poses[0].quaternion, poses[1].quaternion, separate).slerp(poses[2].quaternion, reconfigure);
      object.scale.lerpVectors(poses[0].scale, poses[1].scale, separate).lerp(poses[2].scale, reconfigure);
    }
    wings.forEach((wing) => { wing.visible = reconfigure > 0.001; });
    antenna.visible = reconfigure > 0.001;
    ribs.forEach((rib, i) => {
      const angle = i / 8 * Math.PI * 2;
      const radius = 0.675 + separate * (1 - reconfigure) * 0.1;
      rib.position.x = Math.cos(angle) * radius;
      rib.position.y = Math.sin(angle) * radius;
    });
    instrument.rotation.set(0.02 + separate * 0.07, -0.16 + progress * 0.27, -0.08 - separate * 0.04 + reconfigure * 0.07);
  }
  function paint(): void {
    frame = 0;
    if (disposed || contextLost || !visible || document.hidden || width <= 0 || height <= 0) return;
    const progress = getProgress();
    const modelProgress = reduced ? 0 : progress;
    if (!dirty && Math.abs(modelProgress - lastProgress) < 0.0002) return;
    dirty = false;
    lastProgress = modelProgress;
    compose(modelProgress);
    fitCamera();
    renderer.render(scene, camera);
    host.dataset.experienceRender = 'ready';
    const chapter = Math.min(2, Math.floor(progress * 3));
    host.dataset.chapter = String(chapter);
    host.dispatchEvent(new CustomEvent('experience:progress', { bubbles: true, detail: { progress, chapter } }));
  }
  function schedule(force = false): void {
    dirty ||= force;
    if (!frame && !disposed && !contextLost && visible && !document.hidden) frame = requestAnimationFrame(paint);
  }
  function stop(): void {
    cancelAnimationFrame(frame);
    frame = 0;
  }
  function resize(): void {
    if (disposed || contextLost) return;
    const bounds = mount!.getBoundingClientRect();
    const nextWidth = Math.round(bounds.width);
    const nextHeight = Math.round(bounds.height);
    if (nextWidth <= 0 || nextHeight <= 0 || (nextWidth === width && nextHeight === height)) return;
    width = nextWidth;
    height = nextHeight;
    const coarse = window.matchMedia('(max-width: 700px), (pointer: coarse)').matches;
    renderer.setPixelRatio(coarse ? 1 : Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    schedule(true);
  }
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(mount);
  const visibilityObserver = new IntersectionObserver(([entry]) => {
    visible = Boolean(entry?.isIntersecting);
    if (visible) schedule(true);
    else stop();
  }, { threshold: 0 });
  visibilityObserver.observe(host);
  window.addEventListener('scroll', () => { if (!reduced && experience!.classList.contains('is-enhanced')) schedule(); }, { passive: true, signal });
  window.addEventListener('resize', () => { resize(); schedule(true); }, { passive: true, signal });
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else schedule(true); }, { signal });
  motion.addEventListener('change', () => {
    reduced = motion.matches;
    stop();
    schedule(true);
  }, { signal });
  renderer.domElement.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    contextLost = true;
    host.dataset.experienceRender = 'fallback';
    stop();
  }, { signal });
  renderer.domElement.addEventListener('webglcontextrestored', () => {
    try {
      const restored = makeEnvironment();
      environment.dispose();
      environment = restored;
      scene.environment = environment.texture;
      contextLost = false;
      // Reapply buffer dimensions after the browser recreates its drawing surface.
      width = height = 0;
      resize();
      schedule(true);
    } catch {
      unavailable();
    }
  }, { signal });
  resize();

  return () => {
    if (disposed) return;
    disposed = true;
    stop();
    aborter.abort();
    resizeObserver.disconnect();
    visibilityObserver.disconnect();
    scene.environment = null;
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((material) => material.dispose());
    instances.forEach((instance) => instance.dispose());
    environment.dispose();
    renderer.dispose();
    renderer.domElement.remove();
    host.dataset.experienceRender = 'fallback';
  };
}
