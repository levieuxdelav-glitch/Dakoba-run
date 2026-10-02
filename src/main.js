import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.165.0/build/three.module.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9cc0ff);

const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 1000);
camera.position.set(0, 4, 8);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
document.body.appendChild(renderer.domElement);

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// Lumières
scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.2));
const dir = new THREE.DirectionalLight(0xffffff, 0.6);
dir.position.set(5, 10, 5);
scene.add(dir);

// Joueur
const player = new THREE.Mesh(
  new THREE.BoxGeometry(1, 1.8, 1),
  new THREE.MeshStandardMaterial({ color: 0x22c55e })
);
player.position.set(0, 1.2, 0);
scene.add(player);

// World / segments
const world = new THREE.Group();
scene.add(world);

const segments = [];
let segZ = 0;

function createSegment(z) {
  const g = new THREE.Group();

  const road = new THREE.Mesh(
    new THREE.BoxGeometry(12, 0.4, 25),
    new THREE.MeshStandardMaterial({ color: 0x2f3a4d })
  );
  road.position.set(0, 0, z);
  g.add(road);

  g.userData.obstacles = [];

  for (let i = 0; i < 4; i++) {
    if (Math.random() < 0.7) {
      const obs = new THREE.Mesh(
        new THREE.BoxGeometry(1.5, 1.5, 1.5),
        new THREE.MeshStandardMaterial({ color: 0xef4444 })
      );
      const lane = [-3.2, 0, 3.2][Math.floor(Math.random() * 3)];
      obs.position.set(lane, 0.8, z + (Math.random() * 16 - 8));
      g.add(obs);
      g.userData.obstacles.push(obs);
    }
  }

  world.add(g);
  segments.push(g);
}

for (let i = 0; i < 7; i++) {
  createSegment(segZ);
  segZ -= 25;
}

// Input tactile + clavier
const input = { left: false, right: false, jump: false };

document.querySelectorAll('.touchBtn').forEach((btn) => {
  const d = btn.dataset.dir;
  btn.addEventListener(
    'touchstart',
    (e) => {
      e.preventDefault();
      input[d] = true;
    },
    { passive: false }
  );
  btn.addEventListener('touchend', () => {
    input[d] = false;
  });
  btn.addEventListener('touchcancel', () => {
    input[d] = false;
  });
});

window.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft') input.left = true;
  if (e.key === 'ArrowRight') input.right = true;
  if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w') input.jump = true;
});

window.addEventListener('keyup', (e) => {
  if (e.key === 'ArrowLeft') input.left = false;
  if (e.key === 'ArrowRight') input.right = false;
  if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w') input.jump = false;
});

// HUD & menu
let score = 0;
let best = Number(localStorage.getItem('dakoba-best') || 0);
let level = 1;
let speed = 0.28;

const scoreEl = document.getElementById('score');
const levelEl = document.getElementById('level');
const bestEl = document.getElementById('best');
const menu = document.getElementById('menu');
const startBtn = document.getElementById('startBtn');
const gameOverEl = document.getElementById('gameOver');
const retryBtn = document.getElementById('retryBtn');
const finalScore = document.getElementById('finalScore');

let running = false;
let ended = false;

startBtn.onclick = () => {
  running = true;
  ended = false;
  menu.classList.add('hidden');
  score = 0;
  speed = 0.28;
  player.position.set(0, 1.2, 0);
};

retryBtn.onclick = () => {
  running = true;
  ended = false;
  gameOverEl.classList.add('hidden');
  score = 0;
  speed = 0.28;
  player.position.set(0, 1.2, 0);
};

let targetX = 0;
let vy = 0;
let grounded = true;

function updatePlayer() {
  if (input.left) targetX = -3.2;
  else if (input.right) targetX = 3.2;
  else targetX = 0;

  player.position.x += (targetX - player.position.x) * 0.12;

  if (input.jump && grounded) {
    vy = 7.5;
    grounded = false;
  }

  player.position.y += vy * 0.05;
  vy -= 0.35;

  if (player.position.y <= 1.2) {
    player.position.y = 1.2;
    vy = 0;
    grounded = true;
  }
}

function checkCollisions() {
  const pbox = new THREE.Box3().setFromObject(player);

  for (const s of segments) {
    for (const obs of s.userData.obstacles) {
      const obox = new THREE.Box3().setFromObject(obs);
      if (pbox.intersectsBox(obox)) {
        running = false;
        ended = true;
        best = Math.max(best, Math.floor(score));
        localStorage.setItem('dakoba-best', String(best));
        finalScore.textContent = `Score: ${Math.floor(score)}`;
        gameOverEl.classList.remove('hidden');
        return;
      }
    }
  }
}

function updateSegments() {
  segments.forEach((s) => {
    s.position.z += speed;

    if (s.position.z > 35) {
      s.position.z = segments[0].position.z - 25;
      segments.push(segments.shift());
    }
  });
}

function animate() {
  requestAnimationFrame(animate);

  if (running && !ended) {
    updatePlayer();
    updateSegments();

    score += speed * 2;
    level = Math.floor(score / 250) + 1;
    speed = 0.28 + level * 0.02;

    scoreEl.textContent = `Score: ${Math.floor(score)}`;
    levelEl.textContent = `Niveau: ${level}`;
    bestEl.textContent = `Meilleur: ${best}`;

    checkCollisions();
  }

  camera.position.x += (player.position.x * 0.8 - camera.position.x) * 0.06;
  camera.position.y = 4.5;
  camera.position.z = 8;

  camera.lookAt(player.position.x, 1.5, player.position.z - 12);

  renderer.render(scene, camera);
}

animate();
