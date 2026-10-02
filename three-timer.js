// Cool 3D floating timer rings for processing screen
(function () {
  const canvas = document.getElementById('timer-canvas');
  if (!canvas) return;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.z = 12;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);

  // Multiple rotating rings
  const rings = [];
  const colors = [0xff2d55, 0x00f0ff, 0xff9a9e, 0x7b2cbf];

  for (let i = 0; i < 5; i++) {
    const geo = new THREE.TorusGeometry(2.5 + i * 0.7, 0.04, 16, 100);
    const mat = new THREE.MeshBasicMaterial({
      color: colors[i % colors.length],
      transparent: true,
      opacity: 0.55 - i * 0.08,
    });
    const ring = new THREE.Mesh(geo, mat);
    ring.rotation.x = Math.PI / 2 + (i * 0.15);
    scene.add(ring);
    rings.push(ring);
  }

  // Central glowing sphere
  const sphereGeo = new THREE.SphereGeometry(0.6, 32, 32);
  const sphereMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.9,
  });
  const sphere = new THREE.Mesh(sphereGeo, sphereMat);
  scene.add(sphere);

  // Soft particles around
  const count = 400;
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const r = 4 + Math.random() * 6;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    pos[i * 3 + 2] = r * Math.cos(phi);
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pMat = new THREE.PointsMaterial({
    size: 0.06,
    color: 0x00f0ff,
    transparent: true,
    opacity: 0.6,
    blending: THREE.AdditiveBlending,
  });
  const pts = new THREE.Points(pGeo, pMat);
  scene.add(pts);

  let running = false;

  function animate() {
    if (!document.getElementById('processing').classList.contains('active')) {
      requestAnimationFrame(animate);
      return;
    }
    requestAnimationFrame(animate);

    const t = Date.now() * 0.001;
    rings.forEach((r, i) => {
      r.rotation.z = t * (0.3 + i * 0.12) * (i % 2 === 0 ? 1 : -1);
      r.rotation.x = Math.PI / 2 + Math.sin(t * 0.4 + i) * 0.2;
    });
    sphere.scale.setScalar(1 + Math.sin(t * 3) * 0.08);
    pts.rotation.y = t * 0.1;

    renderer.render(scene, camera);
  }
  animate();

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  window.timerScene = { renderer, scene };
})();
