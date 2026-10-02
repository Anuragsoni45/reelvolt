// Cinematic 3D Landing Scene
(function () {
  const canvas = document.getElementById('landing-canvas');
  if (!canvas) return;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x050508, 0.0025);

  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 0, 18);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x050508, 1);

  // Ambient + point lights
  const ambient = new THREE.AmbientLight(0x222233, 0.6);
  scene.add(ambient);

  const light1 = new THREE.PointLight(0xff2d55, 2.5, 80);
  light1.position.set(8, 6, 10);
  scene.add(light1);

  const light2 = new THREE.PointLight(0x00f0ff, 2, 80);
  light2.position.set(-8, -4, 8);
  scene.add(light2);

  // Central rotating torus / portal
  const geometry = new THREE.TorusKnotGeometry(3.2, 0.9, 180, 24);
  const material = new THREE.MeshStandardMaterial({
    color: 0x111122,
    metalness: 0.85,
    roughness: 0.25,
    emissive: 0x110011,
  });
  const knot = new THREE.Mesh(geometry, material);
  scene.add(knot);

  // Wireframe overlay
  const wireGeo = new THREE.TorusKnotGeometry(3.25, 0.92, 100, 16);
  const wireMat = new THREE.MeshBasicMaterial({
    color: 0xff2d55,
    wireframe: true,
    transparent: true,
    opacity: 0.15,
  });
  const wire = new THREE.Mesh(wireGeo, wireMat);
  scene.add(wire);

  // Particle field
  const particleCount = 1800;
  const positions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);

  for (let i = 0; i < particleCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 60;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 40;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 50 - 10;

    const c = Math.random() > 0.5 ? new THREE.Color(0xff2d55) : new THREE.Color(0x00f0ff);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }

  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  pGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const pMat = new THREE.PointsMaterial({
    size: 0.08,
    vertexColors: true,
    transparent: true,
    opacity: 0.7,
    blending: THREE.AdditiveBlending,
  });
  const particles = new THREE.Points(pGeo, pMat);
  scene.add(particles);

  // Mouse parallax
  let mouseX = 0, mouseY = 0;
  document.addEventListener('mousemove', (e) => {
    mouseX = (e.clientX / window.innerWidth) * 2 - 1;
    mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
  });

  function animate() {
    requestAnimationFrame(animate);

    const t = Date.now() * 0.0004;
    knot.rotation.x = t * 0.6;
    knot.rotation.y = t * 0.9;
    wire.rotation.x = t * 0.55;
    wire.rotation.y = t * 0.85;

    particles.rotation.y = t * 0.15;

    camera.position.x += (mouseX * 2 - camera.position.x) * 0.04;
    camera.position.y += (mouseY * 1.5 - camera.position.y) * 0.04;
    camera.lookAt(0, 0, 0);

    light1.position.x = Math.sin(t * 1.2) * 10;
    light2.position.x = Math.cos(t * 0.9) * 10;

    renderer.render(scene, camera);
  }
  animate();

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // Export for cleanup if needed
  window.landingScene = { renderer, scene, camera };
})();
