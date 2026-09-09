import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

/** A wholly procedural turbine study: no model or texture downloads. */
export function mountScene(host: HTMLElement): () => void {
  const mount = host.querySelector<HTMLElement>('[data-scene-canvas]');
  if (!mount) return () => {};

  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: window.innerWidth > 700, powerPreference: 'low-power' });
  } catch {
    host.dataset.sceneState = 'fallback';
    return () => {};
  }

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 60);
  camera.position.set(5.8, 3.1, 7.1);
  camera.lookAt(0, 0, -0.1);
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.03;
  renderer.domElement.setAttribute('aria-hidden', 'true');
  mount.appendChild(renderer.domElement);

  function createEnvironment(): THREE.WebGLRenderTarget {
    const room = new RoomEnvironment();
    const pmrem = new THREE.PMREMGenerator(renderer);
    try {
      return pmrem.fromScene(room, 0.04);
    } finally {
      room.dispose();
      pmrem.dispose();
    }
  }
  let environment: THREE.WebGLRenderTarget;
  try {
    environment = createEnvironment();
  } catch {
    renderer.dispose();
    renderer.domElement.remove();
    host.dataset.sceneState = 'fallback';
    return () => {};
  }
  scene.environment = environment.texture;

  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const instances = new Set<THREE.InstancedMesh>();
  function material(color: number, metalness: number, roughness: number): THREE.MeshStandardMaterial {
    const result = new THREE.MeshStandardMaterial({ color, metalness, roughness });
    materials.add(result);
    return result;
  }
  const titanium = material(0xa6a9b0, 0.96, 0.26);
  const bladeMetal = material(0xd8dde3, 0.9, 0.3);
  const darkMetal = material(0x30353d, 0.88, 0.34);
  const edgeMetal = material(0xe7e5dc, 0.94, 0.2);
  const copper = material(0xa7865d, 0.9, 0.28);
  const boltMetal = material(0x75808e, 0.92, 0.32);
  const assembly = new THREE.Group();
  scene.add(assembly);
  const baseRotation = new THREE.Euler(-0.04, -0.22, -0.28);
  assembly.rotation.copy(baseRotation);

  function mesh(geometry: THREE.BufferGeometry, surface: THREE.Material, parent: THREE.Group = assembly): THREE.Mesh {
    geometries.add(geometry);
    const object = new THREE.Mesh(geometry, surface);
    parent.add(object);
    return object;
  }
  function ring(radius: number, thickness: number, z: number, surface: THREE.Material, parent = assembly): THREE.Mesh {
    const object = mesh(new THREE.TorusGeometry(radius, thickness, 12, 112), surface, parent);
    object.position.z = z;
    return object;
  }
  function cylinder(top: number, bottom: number, length: number, z: number, surface: THREE.Material, parent = assembly): THREE.Mesh {
    const object = mesh(new THREE.CylinderGeometry(top, bottom, length, 64), surface, parent);
    object.rotation.x = Math.PI / 2;
    object.position.z = z;
    return object;
  }
  function bladeArray(geometry: THREE.BufferGeometry, surface: THREE.Material, count: number, offset: number, parent: THREE.Group): void {
    const array = new THREE.InstancedMesh(geometry, surface, count);
    const matrix = new THREE.Matrix4();
    for (let i = 0; i < count; i++) {
      matrix.makeRotationZ(i / count * Math.PI * 2 + offset);
      array.setMatrixAt(i, matrix);
    }
    array.instanceMatrix.needsUpdate = true;
    instances.add(array);
    parent.add(array);
  }

  // A curved, twisted aerofoil, closed at the edges to catch a thin rim of light.
  function bladeGeometry(inner: number, outer: number, angularWidth: number, sweep: number): THREE.BufferGeometry {
    const positions: number[] = [];
    const indices: number[] = [];
    const rows = 16;
    const columns = 5;
    for (let side = 0; side < 2; side++) {
      for (let row = 0; row <= rows; row++) {
        const t = row / rows;
        const radius = inner + (outer - inner) * t;
        for (let column = 0; column <= columns; column++) {
          const v = column / columns;
          const across = v - 0.5;
          const angle = sweep * (t * t - 0.4 * t) + across * angularWidth * (0.58 + 0.42 * Math.sin(t * Math.PI * 0.7));
          const camber = Math.sin(v * Math.PI) * Math.sin(t * Math.PI) * 0.085;
          const z = across * (0.38 - t * 0.5) + camber + (side === 0 ? 0.014 : -0.014);
          positions.push(Math.cos(angle) * radius, Math.sin(angle) * radius, z);
        }
      }
    }
    const surfaceCount = (rows + 1) * (columns + 1);
    for (let side = 0; side < 2; side++) {
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < columns; col++) {
          const a = side * surfaceCount + row * (columns + 1) + col;
          const b = a + columns + 1;
          if (side === 0) indices.push(a, b, a + 1, a + 1, b, b + 1);
          else indices.push(a, a + 1, b, a + 1, b + 1, b);
        }
      }
    }
    const close = (a: number, b: number) => indices.push(a, a + surfaceCount, b, b, a + surfaceCount, b + surfaceCount);
    for (let row = 0; row < rows; row++) {
      close(row * (columns + 1), (row + 1) * (columns + 1));
      close(row * (columns + 1) + columns, (row + 1) * (columns + 1) + columns);
    }
    for (let col = 0; col < columns; col++) {
      close(col, col + 1);
      close(rows * (columns + 1) + col, rows * (columns + 1) + col + 1);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    geometries.add(geometry);
    return geometry;
  }

  const stages: { group: THREE.Group; z: number; distance: number }[] = [];
  const fan = new THREE.Group();
  fan.position.z = 1.28;
  assembly.add(fan);
  stages.push({ group: fan, z: 1.28, distance: 0.6 });
  const fanRotor = new THREE.Group();
  fan.add(fanRotor);
  const fanBlade = bladeGeometry(0.43, 1.63, 0.255, 0.44);
  bladeArray(fanBlade, bladeMetal, 26, 0, fanRotor);
  ring(1.7, 0.064, 0, titanium, fan);
  ring(1.695, 0.02, 0.11, edgeMetal, fan);
  ring(1.7, 0.04, -0.18, darkMetal, fan);
  ring(1.68, 0.014, -0.23, copper, fan);
  cylinder(0.43, 0.43, 0.22, -0.03, darkMetal, fanRotor);
  // Base-to-tip winding keeps the closed spinner's polished outer face visible.
  const spinnerPoints = [new THREE.Vector2(0, -0.13)];
  for (let step = 0; step <= 32; step++) {
    const angle = step / 32 * Math.PI / 2;
    spinnerPoints.push(new THREE.Vector2(
      step === 32 ? 0 : 0.405 * Math.cos(angle),
      -0.13 + 0.72 * Math.sin(angle),
    ));
  }
  const spinner = mesh(new THREE.LatheGeometry(spinnerPoints, 64), titanium, fanRotor);
  spinner.rotation.x = Math.PI / 2;
  ring(0.395, 0.018, -0.07, edgeMetal, fanRotor);

  // Rear core: visible compressor stages held between machined bearing rings.
  cylinder(0.25, 0.22, 3.65, -0.43, darkMetal);
  const rotors: THREE.Group[] = [fanRotor];
  for (let stage = 0; stage < 6; stage++) {
    const group = new THREE.Group();
    const z = 0.64 - stage * 0.49;
    const radius = 1.1 - stage * 0.078;
    group.position.z = z;
    assembly.add(group);
    stages.push({ group, z, distance: 0.2 - stage * 0.2 });
    const rotor = new THREE.Group();
    group.add(rotor);
    rotors.push(rotor);
    const foil = bladeGeometry(0.31, radius - 0.07, 0.23, stage % 2 ? -0.32 : 0.32);
    bladeArray(foil, stage % 2 ? titanium : bladeMetal, 30, stage * 0.11, rotor);
    cylinder(0.36, 0.36, 0.19, 0, titanium, rotor);
    ring(radius, 0.056, -0.07, titanium, group);
    ring(radius + 0.002, 0.013, 0.006, stage % 2 ? copper : edgeMetal, group);
    ring(radius, 0.029, -0.16, darkMetal, group);
  }

  // Three structural longerons preserve an open, inspectable assembly.
  for (let i = 0; i < 3; i++) {
    const angle = i * Math.PI * 2 / 3 + 0.2;
    const rail = mesh(new THREE.BoxGeometry(0.075, 0.09, 2.9), darkMetal);
    rail.position.set(Math.cos(angle) * 0.91, Math.sin(angle) * 0.91, -0.72);
    rail.rotation.z = angle;
  }
  cylinder(0.51, 0.32, 0.56, -2.4, titanium);
  ring(0.52, 0.038, -2.16, copper);
  ring(0.33, 0.035, -2.68, edgeMetal);
  cylinder(0.255, 0.255, 0.025, -2.7, darkMetal);

  const boltGeometry = new THREE.CylinderGeometry(0.027, 0.027, 0.04, 6);
  for (let i = 0; i < 32; i++) {
    const a = i / 32 * Math.PI * 2;
    const bolt = mesh(boltGeometry, boltMetal, fan);
    bolt.rotation.x = Math.PI / 2;
    bolt.position.set(Math.cos(a) * 1.7, Math.sin(a) * 1.7, 0.055);
  }

  scene.add(new THREE.HemisphereLight(0xc9ddff, 0x4a3a2b, 2));
  const key = new THREE.DirectionalLight(0xfff4df, 4.5);
  key.position.set(2, 6, 6);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xa6c9ff, 3);
  rim.position.set(-5, 2, -3);
  scene.add(rim);
  const fill = new THREE.DirectionalLight(0xe6e8ef, 1.3);
  fill.position.set(-1, -4, 4);
  scene.add(fill);

  const media = window.matchMedia('(prefers-reduced-motion: reduce)');
  let reduced = media.matches;
  let userPaused = host.dataset.sceneUserPaused === 'true';
  let paused = reduced || userPaused;
  let visible = false;
  let disposed = false;
  let contextLost = false;
  let frame = 0;
  let lastTime = 0;
  let elapsed = 0;
  let drag = false;
  let activePointer: number | null = null;
  let touchPending = false;
  let lastX = 0;
  let lastY = 0;
  let yaw = 0;
  let pitch = 0;
  let pointerX = 0;
  let pointerY = 0;
  let exploded = false;
  let separation = 0;
  const aborter = new AbortController();
  const { signal } = aborter;
  const motionButton = host.querySelector<HTMLButtonElement>('[data-scene-motion]');
  const explodeButton = host.querySelector<HTMLButtonElement>('[data-scene-explode]');
  const status = host.querySelector<HTMLElement>('[data-scene-status]');

  function updateMotionControl(): void {
    if (!motionButton) return;
    motionButton.setAttribute('aria-label', paused ? 'Play turbine motion' : 'Pause turbine motion');
    const label = motionButton.querySelector('[data-scene-motion-label]');
    if (label) label.textContent = paused ? 'Play motion' : 'Pause motion';
    host.dataset.motion = paused ? 'paused' : 'playing';
  }

  function paint(): void {
    if (disposed || contextLost || !visible || document.hidden) return;
    assembly.rotation.set(baseRotation.x + pitch + pointerY * 0.06,
      baseRotation.y + yaw + pointerX * 0.09,
      baseRotation.z + Math.sin(elapsed * 0.22) * 0.025);
    assembly.position.y = Math.sin(elapsed * 0.35) * 0.025;
    for (const stage of stages) stage.group.position.z = stage.z + stage.distance * separation;
    renderer.render(scene, camera);
    if (host.dataset.sceneState !== 'ready') {
      host.dataset.sceneState = 'ready';
      mount!.tabIndex = 0;
    }
  }

  function animate(time: number): void {
    frame = 0;
    if (disposed || contextLost || !visible || document.hidden) return;
    const dt = Math.min((time - (lastTime || time)) / 1000, 0.05);
    lastTime = time;
    if (!paused && !reduced) {
      elapsed += dt;
      rotors.forEach((rotor, i) => { rotor.rotation.z += dt * (i === 0 ? 0.065 : (i % 2 ? -0.08 : 0.08)); });
    }
    const target = exploded ? 1 : 0;
    separation = reduced || paused ? target : THREE.MathUtils.damp(separation, target, 6, dt);
    paint();
    if ((!paused && !reduced) || Math.abs(separation - target) > 0.001) frame = requestAnimationFrame(animate);
  }

  function schedule(): void {
    if (!frame && !disposed && !contextLost && visible && !document.hidden) frame = requestAnimationFrame(animate);
  }

  function stop(): void {
    cancelAnimationFrame(frame);
    frame = 0;
    lastTime = 0;
  }

  function resize(): void {
    if (disposed) return;
    const { width, height } = mount!.getBoundingClientRect();
    if (width <= 0 || height <= 0) return;
    renderer.setPixelRatio(window.innerWidth <= 700 ? 1 : Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.zoom = width < 500 ? 0.87 : 1;
    camera.updateProjectionMatrix();
    schedule();
  }

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(mount);
  const visibilityObserver = new IntersectionObserver(([entry]) => {
    visible = Boolean(entry?.isIntersecting);
    if (visible) schedule();
    else stop();
  }, { threshold: 0.01 });
  visibilityObserver.observe(host);
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else schedule(); }, { signal });
  media.addEventListener('change', () => {
    reduced = media.matches;
    paused = reduced || userPaused;
    pointerX = 0;
    pointerY = 0;
    updateMotionControl();
    stop();
    schedule();
  }, { signal });

  motionButton?.addEventListener('click', () => {
    paused = !paused;
    userPaused = paused;
    host.dataset.sceneUserPaused = String(userPaused);
    // A deliberate request to play is allowed even when reduced motion is preferred.
    if (!paused) reduced = false;
    updateMotionControl();
    if (status) status.textContent = paused ? 'Turbine motion paused.' : 'Turbine motion playing.';
    stop();
    schedule();
  }, { signal });

  explodeButton?.addEventListener('click', () => {
    exploded = !exploded;
    explodeButton.setAttribute('aria-pressed', String(exploded));
    const label = explodeButton.querySelector('[data-scene-explode-label]');
    if (label) label.textContent = exploded ? 'Assemble' : 'Separate stages';
    if (status) status.textContent = exploded ? 'Turbine stages separated.' : 'Turbine assembled.';
    schedule();
  }, { signal });

  host.querySelectorAll<HTMLButtonElement>('[data-scene-rotate]').forEach((button) => {
    button.addEventListener('click', () => {
      yaw += Number(button.dataset.sceneRotate) * 0.3;
      schedule();
    }, { signal });
  });
  host.querySelector('[data-scene-reset]')?.addEventListener('click', () => {
    yaw = pitch = pointerX = pointerY = 0;
    exploded = false;
    if (explodeButton) {
      explodeButton.setAttribute('aria-pressed', 'false');
      const label = explodeButton.querySelector('[data-scene-explode-label]');
      if (label) label.textContent = 'Separate stages';
    }
    if (status) status.textContent = 'Turbine view reset.';
    schedule();
  }, { signal });

  mount.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || !event.isPrimary || activePointer !== null) return;
    activePointer = event.pointerId;
    touchPending = event.pointerType === 'touch';
    drag = !touchPending;
    lastX = event.clientX;
    lastY = event.clientY;
    if (drag) mount.setPointerCapture(event.pointerId);
    host.dataset.dragging = String(drag);
  }, { signal });
  mount.addEventListener('pointermove', (event) => {
    if (activePointer !== null && event.pointerId !== activePointer) return;
    if (touchPending) {
      const dx = Math.abs(event.clientX - lastX);
      const dy = Math.abs(event.clientY - lastY);
      if (Math.max(dx, dy) < 7) return;
      // Vertical gestures belong to the page; only horizontal intent starts a drag.
      if (dy >= dx) {
        endDrag();
        return;
      }
      touchPending = false;
      drag = true;
      mount.setPointerCapture(event.pointerId);
      host.dataset.dragging = 'true';
    }
    if (drag) {
      yaw += (event.clientX - lastX) * 0.006;
      pitch = THREE.MathUtils.clamp(pitch + (event.clientY - lastY) * 0.004, -0.65, 0.65);
      lastX = event.clientX;
      lastY = event.clientY;
      schedule();
    } else if (!reduced && !paused && event.pointerType === 'mouse') {
      const bounds = mount.getBoundingClientRect();
      pointerX = (event.clientX - bounds.left) / bounds.width - 0.5;
      pointerY = (event.clientY - bounds.top) / bounds.height - 0.5;
    }
  }, { signal });
  function endDrag(event?: PointerEvent): void {
    if (event && event.pointerId !== activePointer) return;
    const pointer = activePointer;
    activePointer = null;
    touchPending = false;
    drag = false;
    host.dataset.dragging = 'false';
    if (pointer !== null && mount!.hasPointerCapture(pointer)) mount!.releasePointerCapture(pointer);
  }
  mount.addEventListener('pointerup', endDrag, { signal });
  mount.addEventListener('pointercancel', endDrag, { signal });
  mount.addEventListener('lostpointercapture', endDrag, { signal });
  mount.addEventListener('pointerleave', () => { if (!paused && !reduced) pointerX = pointerY = 0; }, { signal });
  mount.addEventListener('keydown', (event) => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home'].includes(event.key)) return;
    event.preventDefault();
    if (event.key === 'ArrowLeft') yaw -= 0.15;
    if (event.key === 'ArrowRight') yaw += 0.15;
    if (event.key === 'ArrowUp') pitch = Math.max(-0.65, pitch - 0.1);
    if (event.key === 'ArrowDown') pitch = Math.min(0.65, pitch + 0.1);
    if (event.key === 'Home') yaw = pitch = 0;
    schedule();
  }, { signal });

  renderer.domElement.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    contextLost = true;
    host.dataset.sceneState = 'fallback';
    mount.tabIndex = -1;
    endDrag();
    stop();
  }, { signal });
  renderer.domElement.addEventListener('webglcontextrestored', () => {
    // Render-target reflections have no source pixels to re-upload after context loss.
    try {
      const restoredEnvironment = createEnvironment();
      environment.dispose();
      environment = restoredEnvironment;
      scene.environment = environment.texture;
      contextLost = false;
      schedule();
    } catch {
      host.dataset.sceneState = 'fallback';
    }
  }, { signal });

  updateMotionControl();
  resize();

  return () => {
    if (disposed) return;
    disposed = true;
    stop();
    endDrag();
    aborter.abort();
    visibilityObserver.disconnect();
    resizeObserver.disconnect();
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((surface) => surface.dispose());
    instances.forEach((array) => array.dispose());
    scene.environment = null;
    environment.dispose();
    renderer.dispose();
    renderer.domElement.remove();
    host.dataset.sceneState = 'fallback';
    mount.tabIndex = -1;
  };
}
