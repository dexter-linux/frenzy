/**
 * KIFARU FRENZY: PWA COMBAT EDITION
 * Controls: 
 * - Desktop: Arrows to move, Spacebar or Mouse Click to shoot.
 * - Mobile: On-screen "FIRE" button, Touch/Drag to move.
 */

/* ================= GLOBAL VARIABLES ================= */
let gameState = 'TITLE';
let player;
let enemies = [];
let enemyBullets = [];
let bullets = [];
let fuelItems = [];
let particles = []; 
let score = 0;
let fuel = 100;
let gameSpeed = 5;
let terrainOffset = 0;
let shootBtn;
let bgSong, shootSound;

/* ================= PRELOAD & AUDIO ================= */
function preload() {
  soundFormats('mp3');
  // Files must be in your root folder alongside sketch.js
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

  // Mobile Shoot Button
  shootBtn = createButton('FIRE');
  shootBtn.position(width - 120, height - 120);
  shootBtn.size(100, 100);
  shootBtn.style('background-color', 'rgba(255, 0, 0, 0.6)');
  shootBtn.style('color', 'white');
  shootBtn.style('border-radius', '50%');
  shootBtn.style('border', '3px solid #fff');
  shootBtn.style('font-size', '18px');
  shootBtn.style('font-weight', 'bold');
  shootBtn.mousePressed(handleShoot);
}

/* ================= MAIN LOOP ================= */
function draw() {
  drawEnvironment();
  
  switch (gameState) {
    case 'TITLE': 
      drawTitleScreen(); 
      shootBtn.hide();
      break;
    case 'PLAYING': 
      playGame(); 
      shootBtn.show();
      break;
    case 'GAMEOVER': 
      drawGameOverScreen(); 
      shootBtn.hide();
      break;
  }
}

function drawEnvironment() {
  background(135, 206, 235); // Sky
  
  // Smooth Terrain
  fill(34, 139, 34); // Forest Green
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

/* ================= GAMEPLAY LOGIC ================= */
function playGame() {
  fuel -= 0.04;
  if (fuel <= 0) gameState = 'GAMEOVER';

  player.update();
  player.display();

  // Player Bullets
  for (let i = bullets.length - 1; i >= 0; i--) {
    bullets[i].update();
    bullets[i].display();
    
    // Intercept enemy fire
    for (let k = enemyBullets.length - 1; k >= 0; k--) {
        if (dist(bullets[i].x, bullets[i].y, enemyBullets[k].x, enemyBullets[k].y) < 25) {
            createExplosion(bullets[i].x, bullets[i].y, 'SMALL');
            bullets.splice(i, 1);
            enemyBullets.splice(k, 1);
            score += 5;
            break;
        }
    }

    if (bullets[i]) {
        for (let j = enemies.length - 1; j >= 0; j--) {
            if (bullets[i] && bullets[i].hits(enemies[j])) {
                createExplosion(bullets[i].x, bullets[i].y, 'SMALL');
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

  // Spawning Enemies & Fuel
  if (frameCount % 120 === 0) enemies.push(new EnemyTank());
  if (frameCount % 200 === 0) enemies.push(new Soldier());
  if (frameCount % 450 === 0) enemies.push(new Dino());
  if (frameCount % 300 === 0) fuelItems.push(new FuelCan());

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

  // FX Particles
  for (let i = particles.length - 1; i >= 0; i--) {
    particles[i].update();
    particles[i].display();
    if (particles[i].alpha <= 0) particles.splice(i, 1);
  }

  drawHUD();
}

function handleShoot() {
  if (gameState === 'PLAYING') {
    bullets.push(new Bullet(player.x + 40, player.y - 22));
    if (shootSound) shootSound.play();
  } else {
    resetGame();
  }
}

function keyPressed() {
  if (key === ' ') handleShoot();
}

function createExplosion(x, y, type) {
    let count = type === 'SMALL' ? 8 : 20;
    for (let i = 0; i < count; i++) {
        particles.push(new Fireball(x, y));
    }
}

function resetGame() {
    startMusic();
    gameState = 'PLAYING';
    score = 0; fuel = 100;
    enemies = []; bullets = []; enemyBullets = []; fuelItems = []; particles = [];
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
    
    if (keyIsDown(LEFT_ARROW)) this.vx -= 0.6;
    if (keyIsDown(RIGHT_ARROW)) this.vx += 0.6;
    
    this.x += this.vx;
    this.vx *= 0.9;
    this.x = constrain(this.x, 50, width/2);
    this.treadAngle += (gameSpeed * 0.1) + (this.vx * 0.2);
    
    if (frameCount % 6 === 0) particles.push(new Smoke(this.x - 40, this.y));
  }
  display() {
    push();
    translate(this.x, this.y);
    fill(45, 65, 45); rectMode(CENTER);
    rect(0, 0, 90, 35, 5); // Main Body
    fill(55, 75, 55);
    rect(0, -20, 45, 25, 8); // Turret
    stroke(20); strokeWeight(8);
    line(15, -22, 65, -22); // Barrel
    // Animated Treads
    noStroke(); fill(20);
    rect(0, 15, 95, 15, 10);
    for (let i = -40; i <= 40; i += 20) {
        push(); translate(i, 15); rotate(this.treadAngle);
        fill(70); ellipse(0, 0, 12, 12);
        stroke(0); strokeWeight(1); line(-6, 0, 6, 0); pop();
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
    fill(this.health === 2 ? color(120, 50, 50) : color(70, 20, 20));
    rectMode(CENTER);
    rect(0, 0, 85, 30, 5); rect(0, -15, 42, 22, 5);
    stroke(30); line(-15, -18, -55, -18);
    // Enemy treads
    noStroke(); fill(20); rect(0, 12, 90, 12, 10);
    for (let i = -30; i <= 30; i += 15) {
        push(); translate(i, 12); rotate(this.treadAngle);
        fill(70); ellipse(0, 0, 10, 10); pop();
    }
    pop();
  }
}

class Soldier {
    constructor() {
        this.x = width + 50;
        this.isDead = false;
    }
    update() { 
        this.x -= gameSpeed; 
        let noiseVal = noise((this.x + terrainOffset) * 0.002);
        this.y = map(noiseVal, 0, 1, height * 0.7, height - 100) - 15;
        if (frameCount % 180 === 0) enemyBullets.push(new SoldierBullet(this.x, this.y - 25));
    }
    takeDamage() { this.isDead = true; }
    display() {
        push(); translate(this.x, this.y);
        fill(220, 170, 130); ellipse(0, -30, 14, 14); // Head
        fill(60, 60, 180); rect(-6, -25, 12, 22); // Body
        fill(40); rect(-12, -20, 18, 5); // Gun
        pop();
    }
}

class Dino {
    constructor() {
        this.x = width + 100;
        this.isDead = false;
    }
    update() {
        this.x -= gameSpeed * 0.7;
        let noiseVal = noise((this.x + terrainOffset) * 0.002);
        this.y = map(noiseVal, 0, 1, height * 0.7, height - 100) - 40;
        if (frameCount % 140 === 0) enemyBullets.push(new Venom(this.x - 30, this.y - 40));
    }
    takeDamage() { this.isDead = true; }
    display() {
        push(); translate(this.x, this.y);
        fill(60, 140, 60);
        ellipse(0, 0, 50, 70); // Body
        fill(40, 100, 40);
        beginShape(); // Tail
        vertex(20, 10); vertex(60, 30); vertex(20, 30);
        endShape(CLOSE);
        rect(-15, -55, 35, 18, 5); // Head
        fill(255, 0, 0); ellipse(-20, -50, 5, 5); // Glowing Eye
        pop();
    }
}

class Fireball {
    constructor(x, y) {
        this.x = x; this.y = y;
        this.vx = random(-5, 5); this.vy = random(-5, 5);
        this.alpha = 255;
        this.color = random() > 0.4 ? color(255, 100, 0) : color(255, 200, 0);
    }
    update() { this.x += this.vx; this.y += this.vy; this.alpha -= 15; }
    display() {
        noStroke(); fill(red(this.color), green(this.color), blue(this.color), this.alpha);
        ellipse(this.x, this.y, random(8, 20));
    }
}

class Smoke {
    constructor(x, y) {
        this.x = x; this.y = y;
        this.alpha = 150;
        this.size = random(10, 25);
    }
    update() { this.x -= 2; this.y -= 1; this.alpha -= 4; }
    display() {
        noStroke(); fill(100, this.alpha);
        ellipse(this.x, this.y, this.size);
    }
}

class SoldierBullet {
    constructor(x, y) { this.x = x; this.y = y; }
    update() { this.x -= 10; }
    display() { fill(180); noStroke(); ellipse(this.x, this.y, 8, 5); }
    hits(p) { return dist(this.x, this.y, p.x, p.y) < 35; }
    offscreen() { return this.x < 0; }
}

class EnemyBullet {
  constructor(x, y) { this.x = x; this.y = y; }
  update() { this.x -= 7; }
  display() { fill(255, 60, 0); noStroke(); ellipse(this.x, this.y, 16, 10); }
  hits(p) { return dist(this.x, this.y, p.x, p.y) < 40; }
  offscreen() { return this.x < 0; }
}

class Venom extends EnemyBullet {
    constructor(x, y) { super(x, y); }
    display() { fill(0, 255, 100); noStroke(); ellipse(this.x, this.y, 20, 20); }
}

class Bullet {
  constructor(x, y) { this.x = x; this.y = y; }
  update() { this.x += 18; }
  display() { fill(255, 255, 0); noStroke(); ellipse(this.x, this.y, 18, 6); }
  hits(target) { return dist(this.x, this.y, target.x, target.y) < 45; }
  offscreen() { return this.x > width; }
}

class FuelCan {
    constructor() { this.x = width + 50; }
    update() { 
        this.x -= gameSpeed; 
        let noiseVal = noise((this.x + terrainOffset) * 0.002);
        this.y = map(noiseVal, 0, 1, height * 0.7, height - 100) - 20; 
    }
    display() {
        fill(255, 0, 0); rect(this.x, this.y, 30, 40, 4);
        fill(255); textSize(12); textAlign(CENTER); text("FUEL", this.x + 15, this.y + 25);
    }
    hits(p) { return dist(this.x, this.y, p.x, p.y) < 50; }
}

/* ================= UI SCREENS ================= */
function drawHUD() {
  fill(0, 150); rect(20, 20, 220, 85, 10);
  fill(255); textSize(22); textAlign(LEFT);
  text(`SCORE: ${score}`, 45, 52);
  fill(fuel < 30 ? color(255, 50, 50) : color(255));
  text(`FUEL: ${floor(fuel)}%`, 45, 82);
}

function drawTitleScreen() {
  background(20); fill(255, 204, 0); textSize(70); textAlign(CENTER);
  text("KIFARU FRENZY", width/2, height/2 - 20);
  textSize(24); fill(255);
  text("ARROWS: Move | SPACE: Fire\nIntercept bullets to survive!\n\nTAP TO START MISSION", width/2, height/2 + 60);
}

function drawGameOverScreen() {
  background(80, 0, 0); fill(255); textSize(60); textAlign(CENTER);
  text("TANK DESTROYED", width/2, height/2 - 20);
  textSize(30); text(`FINAL SCORE: ${score}`, width/2, height/2 + 40);
  textSize(20); text("TAP TO RETRY", width/2, height/2 + 90);
}

function windowResized() { resizeCanvas(windowWidth, windowHeight); }
