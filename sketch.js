/* ================= GLOBAL VARIABLES ================= */
let gameState = 'TITLE';
let player;
let enemies = [];
let enemyBullets = [];
let bullets = [];
let fuelItems = [];
let particles = []; // Smoke and Fireballs
let score = 0;
let fuel = 100;
let highScore = 0;
let gameSpeed = 5;
let terrainOffset = 0;
let currentBiome = 'forest'; 
let bgSong, shootSound;

/* ================= PRELOAD & AUDIO ================= */
function preload() {
  soundFormats('mp3');
  // Ensure these files are in your project folder
  bgSong = loadSound('song.mp3');
  shootSound = loadSound('effect.mp3'); 
}

function startMusic() {
  if (bgSong && !bgSong.isPlaying()) {
    userStartAudio();
    bgSong.loop();
    bgSong.setVolume(0.1);
  }
}

/* ================= SETUP ================= */
function setup() {
  createCanvas(windowWidth, windowHeight);
  player = new Tank();
}

/* ================= MAIN LOOP ================= */
function draw() {
  drawEnvironment();
  
  switch (gameState) {
    case 'TITLE': drawTitleScreen(); break;
    case 'PLAYING': playGame(); break;
    case 'GAMEOVER': drawGameOverScreen(); break;
  }
}

function drawEnvironment() {
  let skyColor = currentBiome === 'forest' ? color(135, 206, 235) : color(255, 225, 150);
  let groundColor = currentBiome === 'forest' ? color(34, 139, 34) : color(210, 180, 140);
  
  background(skyColor);
  
  // Draw Smooth Hills
  fill(groundColor);
  noStroke();
  beginShape();
  vertex(0, height);
  for (let x = 0; x <= width; x += 10) {
    let noiseVal = noise((x + terrainOffset) * 0.002);
    let y = map(noiseVal, 0, 1, height * 0.7, height - 100);
    vertex(x, y);
  }
  vertex(width, height);
  endShape(CLOSE);

  if (gameState === 'PLAYING') {
    terrainOffset += gameSpeed;
  }
}

/* ================= GAMEPLAY ================= */
function playGame() {
  fuel -= 0.04;
  if (fuel <= 0) gameState = 'GAMEOVER';

  player.update();
  player.display();

  // Bullet Interception & Collision
  for (let i = bullets.length - 1; i >= 0; i--) {
    bullets[i].update();
    bullets[i].display();
    
    // Intercept enemy bullets
    for (let k = enemyBullets.length - 1; k >= 0; k--) {
        if (dist(bullets[i].x, bullets[i].y, enemyBullets[k].x, enemyBullets[k].y) < 25) {
            createExplosion(bullets[i].x, bullets[i].y, 'FIRE');
            bullets.splice(i, 1);
            enemyBullets.splice(k, 1);
            score += 5;
            break;
        }
    }

    // Hit enemies
    if (bullets[i]) {
        for (let j = enemies.length - 1; j >= 0; j--) {
            if (bullets[i] && bullets[i].hits(enemies[j])) {
                createExplosion(bullets[i].x, bullets[i].y, 'FIRE');
                enemies[j].takeDamage();
                bullets.splice(i, 1);
                score += 10;
                break;
            }
        }
    }
    if (bullets[i] && bullets[i].offscreen()) bullets.splice(i, 1);
  }

  // Enemy Bullets
  for (let i = enemyBullets.length - 1; i >= 0; i--) {
    enemyBullets[i].update();
    enemyBullets[i].display();
    if (enemyBullets[i].hits(player)) gameState = 'GAMEOVER';
    if (enemyBullets[i].offscreen()) enemyBullets.splice(i, 1);
  }

  // Spawning
  if (frameCount % 120 === 0) enemies.push(new EnemyTank());
  if (frameCount % 180 === 0) enemies.push(new Soldier());
  if (frameCount % 400 === 0) enemies.push(new Dino());
  if (frameCount % 250 === 0) fuelItems.push(new FuelCan());

  // Update Entities
  for (let i = enemies.length - 1; i >= 0; i--) {
    enemies[i].update();
    enemies[i].display();
    if (enemies[i].isDead) {
        createExplosion(enemies[i].x, enemies[i].y, 'LARGE');
        enemies.splice(i, 1);
    } else if (enemies[i].x < -50) gameState = 'GAMEOVER'; 
  }

  for (let i = fuelItems.length - 1; i >= 0; i--) {
    fuelItems[i].update();
    fuelItems[i].display();
    if (fuelItems[i].hits(player)) {
        fuel = min(fuel + 30, 100);
        fuelItems.splice(i, 1);
    }
  }

  // Particles (Smoke & Explosions)
  for (let i = particles.length - 1; i >= 0; i--) {
    particles[i].update();
    particles[i].display();
    if (particles[i].alpha <= 0) particles.splice(i, 1);
  }

  drawHUD();
}

function createExplosion(x, y, type) {
    let count = type === 'FIRE' ? 10 : 25;
    for (let i = 0; i < count; i++) {
        particles.push(new Fireball(x, y));
    }
}

/* ================= CLASSES ================= */

class Tank {
  constructor() {
    this.x = 200;
    this.y = height - 100;
    this.vx = 0;
    this.treadAngle = 0;
  }
  update() {
    let noiseVal = noise((this.x + terrainOffset) * 0.002);
    this.y = map(noiseVal, 0, 1, height * 0.7, height - 100) - 25;
    if (keyIsDown(LEFT_ARROW)) this.vx -= 0.5;
    if (keyIsDown(RIGHT_ARROW)) this.vx += 0.5;
    this.x += this.vx;
    this.vx *= 0.9;
    this.x = constrain(this.x, 50, width/2);
    this.treadAngle += (gameSpeed * 0.1) + (this.vx * 0.2);
  }
  display() {
    push();
    translate(this.x, this.y);
    fill(40, 60, 40);
    rectMode(CENTER);
    rect(0, 0, 90, 35, 5); // Body
    fill(50, 70, 50);
    rect(0, -20, 45, 25, 8); // Turret
    stroke(20); strokeWeight(8);
    line(15, -22, 60, -22); // Barrel
    // Spinning treads
    noStroke(); fill(20);
    rect(0, 15, 95, 15, 10);
    for (let i = -40; i <= 40; i += 20) {
        push(); translate(i, 15); rotate(this.treadAngle);
        fill(60); ellipse(0, 0, 12, 12);
        stroke(0); line(-6, 0, 6, 0); pop();
    }
    pop();
  }
}

class EnemyTank {
  constructor() {
    this.x = width + 100;
    this.y = height - 100;
    this.health = 2;
    this.isDead = false;
    this.treadAngle = 0;
  }
  update() {
    this.x -= (gameSpeed - 2.5);
    let noiseVal = noise((this.x + terrainOffset) * 0.002);
    this.y = map(noiseVal, 0, 1, height * 0.7, height - 100) - 25;
    if (frameCount % 130 === 0) enemyBullets.push(new EnemyBullet(this.x - 40, this.y - 15));
    this.treadAngle -= 0.2;
  }
  takeDamage() { this.health--; if (this.health <= 0) this.isDead = true; }
  display() {
    push(); translate(this.x, this.y);
    fill(this.health === 2 ? color(100, 40, 40) : color(60, 20, 20));
    rectMode(CENTER);
    rect(0, 0, 80, 30, 5); rect(0, -15, 40, 20, 5);
    stroke(30); line(-10, -18, -50, -18);
    // Enemy treads
    noStroke(); fill(20); rect(0, 12, 85, 12, 10);
    for (let i = -30; i <= 30; i += 15) {
        push(); translate(i, 12); rotate(this.treadAngle);
        fill(60); ellipse(0, 0, 10, 10); pop();
    }
    pop();
  }
}

class Soldier {
    constructor() {
        this.x = width + 50;
        this.y = height - 50;
        this.isDead = false;
    }
    update() { 
        this.x -= gameSpeed; 
        let noiseVal = noise((this.x + terrainOffset) * 0.002);
        this.y = map(noiseVal, 0, 1, height * 0.7, height - 100) - 15;
        // Soldiers shoot smaller, faster bullets
        if (frameCount % 180 === 0) enemyBullets.push(new SoldierBullet(this.x, this.y - 20));
    }
    takeDamage() { this.isDead = true; }
    display() {
        push(); translate(this.x, this.y);
        fill(200, 150, 100); ellipse(0, -25, 12, 12); // Head
        fill(50, 50, 150); rect(-5, -20, 10, 20); // Body
        fill(30); rect(-10, -15, 15, 4); // Gun
        pop();
    }
}

class Dino {
    constructor() {
        this.x = width + 100;
        this.y = height - 100;
        this.isDead = false;
    }
    update() {
        this.x -= gameSpeed * 0.7;
        let noiseVal = noise((this.x + terrainOffset) * 0.002);
        this.y = map(noiseVal, 0, 1, height * 0.7, height - 100) - 40;
        if (frameCount % 150 === 0) enemyBullets.push(new Venom(this.x - 20, this.y - 30));
    }
    takeDamage() { this.isDead = true; }
    display() {
        push(); translate(this.x, this.y);
        fill(50, 120, 50);
        ellipse(0, 0, 40, 60); // Body
        ellipse(25, 20, 40, 15); // Tail
        fill(30, 80, 30);
        rect(-10, -45, 30, 15, 5); // Head
        fill(255, 0, 0); ellipse(-15, -42, 4, 4); // Eye
        pop();
    }
}

class Fireball {
    constructor(x, y) {
        this.x = x; this.y = y;
        this.vx = random(-4, 4); this.vy = random(-4, 4);
        this.alpha = 255;
        this.color = random() > 0.5 ? color(255, 150, 0) : color(255, 50, 0);
    }
    update() { this.x += this.vx; this.y += this.vy; this.alpha -= 10; }
    display() {
        noStroke(); fill(this.color.levels[0], this.color.levels[1], this.color.levels[2], this.alpha);
        ellipse(this.x, this.y, random(5, 15));
    }
}

class SoldierBullet {
    constructor(x, y) { this.x = x; this.y = y; }
    update() { this.x -= 10; }
    display() { fill(150); ellipse(this.x, this.y, 6, 4); }
    hits(p) { return dist(this.x, this.y, p.x, p.y) < 35; }
    offscreen() { return this.x < 0; }
}

class EnemyBullet {
  constructor(x, y) { this.x = x; this.y = y; }
  update() { this.x -= 7; }
  display() { fill(255, 100, 0); ellipse(this.x, this.y, 14, 8); }
  hits(p) { return dist(this.x, this.y, p.x, p.y) < 40; }
  offscreen() { return this.x < 0; }
}

class Venom extends EnemyBullet {
    constructor(x, y) { super(x, y); }
    display() { fill(100, 255, 50); ellipse(this.x, this.y, 18, 18); }
}

class Bullet {
  constructor(x, y) { this.x = x; this.y = y; }
  update() { this.x += 18; }
  display() { fill(255, 255, 0); ellipse(this.x, this.y, 15, 5); }
  hits(target) { return dist(this.x, this.y, target.x, target.y) < 45; }
  offscreen() { return this.x > width; }
}

class FuelCan {
    constructor() {
        this.x = width + 50;
        this.y = height - 100;
    }
    update() { 
        this.x -= gameSpeed; 
        let noiseVal = noise((this.x + terrainOffset) * 0.002);
        this.y = map(noiseVal, 0, 1, height * 0.7, height - 100) - 20; // Stick to Ground
    }
    display() {
        fill(255, 50, 50); rect(this.x, this.y, 25, 35, 3);
        fill(255); textSize(12); textAlign(CENTER); text("FUEL", this.x + 12, this.y + 22);
    }
    hits(p) { return dist(this.x, this.y, p.x, p.y) < 50; }
}

function drawHUD() {
  fill(0, 150); rect(20, 20, 200, 80, 10);
  fill(255); textSize(20); textAlign(LEFT);
  text(`SCORE: ${score}`, 40, 50);
  fill(fuel < 30 ? color(255, 0, 0) : color(255));
  text(`FUEL: ${floor(fuel)}%`, 40, 80);
}

function drawTitleScreen() {
  background(0); fill(255, 204, 0); textSize(60); textAlign(CENTER);
  text("KIFARU FRENZY", width/2, height/2);
  textSize(20); fill(255); text("CLICK TO START", width/2, height/2 + 50);
}

function drawGameOverScreen() {
  background(100, 0, 0); fill(255); textSize(60); textAlign(CENTER);
  text("MISSION FAILED", width/2, height/2);
  textSize(30); text(`SCORE: ${score}`, width/2, height/2 + 60);
  text("CLICK TO RETRY", width/2, height/2 + 110);
}

function mousePressed() {
  startMusic();
  if (gameState === 'PLAYING') {
    bullets.push(new Bullet(player.x + 40, player.y - 20));
    if (shootSound) shootSound.play();
  } else {
    gameState = 'PLAYING';
    score = 0; fuel = 100;
    enemies = []; bullets = []; enemyBullets = []; fuelItems = []; particles = [];
  }
}

function windowResized() { resizeCanvas(windowWidth, windowHeight); }