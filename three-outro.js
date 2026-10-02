// Cinematic 3D Outro – success burst + floating reels metaphor
(function () {
  const canvas = document.getElementById('outro-canvas');
  if (!canvas) return;

  const outroSection = document.getElementById('outro');

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x050508, 0.015);

  const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 200);
  camera.position.set(0, 2, 16);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x050508, 1);

  // Soft lights
  scene.add(new THREE.AmbientLight(0x334455, 0.5));
  const p1 = new THREE.PointLight(0xff2d55, 3, 50);
  p1.position.set(5, 8, 5);
  scene.add(p1);
  const p2 = new THREE.PointLight(0x00f0ff, 2.5, 50);
  p2.position.set(-6, 4, 8);
  scene.add(p2);

  // Central crystal / success gem
  const geo = new THREE.IcosahedronGeometry(2.2, 1);
  const mat = new THREE.MeshStandardMaterial({
    color: 0x111122,
    metalness: 0.9,
    roughness: 0.15,
    emissive: 0x220011,
  });
  const crystal = new THREE.Mesh(geo, mat);
  scene.add(crystal);

  // Wireframe shell
  const wire = new THREE.Mesh(
    new THREE.IcosahedronGeometry(2.35, 1),
    new THREE.MeshBasicMaterial({ color: 0x00f0ff, wireframe: true, transparent: true, opacity: 0.25 })
  );
  scene.add(wire);

  // Floating "reel cards" (simple planes)
  const reels = [];
  const planeGeo = new THREE.PlaneGeometry(1.4, 2.5);
  for (let i = 0; i < 12; i++) {
    const plane = new THREE.Mesh(
      planeGeo,
      new THREE.MeshBasicMaterial({
        color: i % 2 === 0 ? 0xff2d55 : 0x00f0ff,
        transparent: true,
        opacity: 0.35,
        side: THREE.DoubleSide,
      })
    );
    const angle = (i / 12) * Math.PI * 2;
    const radius = 7 + Math.random() * 3;
    plane.position.set(Math.cos(angle) * radius, (Math.random() - 0.5) * 6, Math.sin(angle) * radius - 4);
    plane.rotation.y = -angle;
    scene.add(plane);
    reels.push({ mesh: plane, baseY: plane.position.y, speed: 0.4 + Math.random() * 0.6 });
  }

  // Particle explosion remnant
  const count = 600;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 30;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 20;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 25;
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const pts = new THREE.Points(
    pGeo,
    new THREE.PointsMaterial({
      size: 0.07,
      color: 0xffffff,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
    })
  );
  scene.add(pts);

  let animId = null;
  let isRunning = false;

  function animate() {
    animId = requestAnimationFrame(animate);

    const t = Date.now() * 0.001;
    crystal.rotation.x = t * 0.3;
    crystal.rotation.y = t * 0.45;
    wire.rotation.x = -t * 0.25;
    wire.rotation.y = -t * 0.4;

    reels.forEach((r, i) => {
      r.mesh.position.y = r.baseY + Math.sin(t * r.speed + i) * 1.2;
      r.mesh.rotation.z = Math.sin(t * 0.5 + i) * 0.15;
    });

    pts.rotation.y = t * 0.08;

    camera.position.x = Math.sin(t * 0.15) * 1.5;
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);
  }

  function start() {
    if (!isRunning) {
      isRunning = true;
      animate();
    }
  }

  function stop() {
    if (isRunning) {
      isRunning = false;
      if (animId) cancelAnimationFrame(animId);
    }
  }

  // Watch for outro section activation
  const observer = new MutationObserver(() => {
    if (outroSection && outroSection.classList.contains('active')) {
      start();
    } else {
      stop();
    }
  });

  if (outroSection) {
    observer.observe(outroSection, { attributes: true, attributeFilter: ['class'] });
    if (outroSection.classList.contains('active')) start();
  }

  function onResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }
  window.addEventListener('resize', onResize);

  window.outroScene = { renderer, scene, camera, start, stop };
})();
