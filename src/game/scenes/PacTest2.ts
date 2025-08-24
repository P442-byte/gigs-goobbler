import { Scene, GameObjects } from 'phaser';
import { EventBus } from '../EventBus';

export class PacTest2 extends Phaser.Scene {

    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    
    // Add background music property
    private backgroundMusic!: Phaser.Sound.BaseSound;

    private tileSize: number = 32;
    
    private map: number[][] = [
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,1],
        [1,0,1,1,0,1,1,1,0,1,0,1,1,1,0,1,1,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,1,1,0,1,0,1,1,1,1,1,0,1,0,1,1,0,1],
        [1,1,1,1,0,1,1,1,0,1,0,1,1,1,0,1,1,1,1],
        [0,0,0,1,0,1,0,0,0,0,0,0,0,1,0,1,0,0,0],
        [1,1,1,1,0,1,0,1,1,0,1,1,0,1,0,1,1,1,1],
        [0,0,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0,0,0],
        [1,1,1,1,0,1,0,1,1,1,1,1,0,1,0,1,1,1,1],
        [0,0,0,1,0,1,0,0,0,0,0,0,0,1,0,1,0,0,0],
        [1,1,1,1,0,1,1,1,0,1,0,1,1,1,0,1,1,1,1],
        [1,0,1,1,0,1,0,1,1,1,1,1,0,1,0,1,1,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,1,1,0,1,1,1,0,1,0,1,1,1,0,1,1,0,1],
        [1,0,0,0,0,4,0,0,0,1,0,0,0,0,0,0,0,0,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    ];

    private dots: Phaser.GameObjects.Arc[] = [];
    private walls: Phaser.GameObjects.Rectangle[] = [];

    private pacman!: Phaser.GameObjects.Arc;
    // This value needs to be whatever the tilesize(32 in this case) is devided by a whole number, in this case its 32 / 10 = 3.2, but something like 32 / 12 = 2.6666667 would also work for example as long as whatever 32(tilesize) is devided by is a whole number. In other words - pacmanSpeed = tileSize ÷ n (where n is a whole number),
    private pacmanSpeed: number = 3.2;
    // private currentInputDirection: { x: number, y: number } = { x: 0, y: 0 };
    private preInputDirection: { x: number, y: number } = { x: 0, y: 0 };
    private preInputSelected: boolean = false;
    private newInputDirection: { x: number, y: number } = { x: 0, y: 0 };
    private tileXPlusInputDir: number = 0;
    private tileYPlusInputDir: number = 0;
    private nextWorldX: number = 0;
    private nextWorldY: number = 0;

    private blockedByWall: boolean = false;

    // Visual enhancement properties
    private glowEffect!: Phaser.GameObjects.Graphics;

    constructor() {
        super('PacTest2');
    }
    
    create(){
        this.cursors = this.input.keyboard!.createCursorKeys();

        // Create a dark gradient background
        this.createBackground();

        // Start background music
        this.backgroundMusic = this.sound.add('coffee-break-music', {
            loop: true,  // Loop the music
            volume: 0.5  // Set volume (0.0 to 1.0)
        });
        this.backgroundMusic.play();

        // Create the maze
        for (let y = 0; y < this.map.length; y++) {
            for (let x = 0; x < this.map[y].length; x++) {
                const tile = this.map[y][x];
                if (tile === 1) {
                    this.createWall(x, y);
                }
            }
        }

        // Create dots and pacman
        for (let y = 0; y < this.map.length; y++) {
            for (let x = 0; x < this.map[y].length; x++) {
                const tile = this.map[y][x];
                const spawnX = x * this.tileSize + this.tileSize / 2;
                const spawnY = y * this.tileSize + this.tileSize / 2;

                if (tile === 0) {
                    this.createDot(spawnX, spawnY);
                }
                else if (tile === 4) {
                    this.createPacman(spawnX, spawnY);
                }
            }
        }

        // Add glow effects
        this.createGlowEffects();

        EventBus.emit('current-scene-ready', this);
    }

    private createBackground() {
        // Create a gradient background
        const graphics = this.add.graphics();
        graphics.fillGradientStyle(0x0a0a0a, 0x0a0a0a, 0x1a1a2e, 0x16213e, 1);
        graphics.fillRect(0, 0, this.scale.width, this.scale.height);
        graphics.setDepth(-10);
    }

    private createWall(x: number, y: number) {
        const wall = this.add.rectangle(
            x * this.tileSize, 
            y * this.tileSize, 
            this.tileSize, 
            this.tileSize, 
            0x0066ff
        ).setOrigin(0, 0);
        
        // Add a subtle border effect
        wall.setStrokeStyle(2, 0x0099ff);
        wall.setDepth(10);
        this.walls.push(wall);
    }

    private createPacman(spawnX: number, spawnY: number) {
        this.pacman = this.add.arc(spawnX, spawnY, 16, 0, 360, false, 0xffff00);
        this.pacman.setStrokeStyle(2, 0xffcc00);
        this.pacman.setDepth(20);
        
        // Add a subtle glow effect to pacman
        const glowCircle = this.add.arc(spawnX, spawnY, 20, 0, 360, false, 0xffff00);
        glowCircle.setAlpha(0.3);
        glowCircle.setDepth(19);
        
        // Make the glow follow pacman
        this.tweens.add({
            targets: glowCircle,
            alpha: { from: 0.3, to: 0.1 },
            duration: 1000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    private createDot(spawnX: number, spawnY: number) {
        const dot = this.add.arc(spawnX, spawnY, 4, 0, 360, false, 0x00ff88);
        dot.setDepth(15);
        
        // Add a subtle pulsing effect to dots
        this.tweens.add({
            targets: dot,
            scaleX: { from: 1, to: 1.3 },
            scaleY: { from: 1, to: 1.3 },
            alpha: { from: 1, to: 0.7 },
            duration: 2000 + Math.random() * 1000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
        
        this.dots.push(dot);
    }

    private createGlowEffects() {
        // Add some ambient lighting effects
        const ambientGlow = this.add.graphics();
        ambientGlow.fillGradientStyle(0x0ec3c9, 0x0ec3c9, 0x000000, 0x000000, 0.1);
        ambientGlow.fillCircle(this.scale.width / 2, this.scale.height / 2, 300);
        ambientGlow.setDepth(-5);
        ambientGlow.setBlendMode(Phaser.BlendModes.ADD);
    }

    update(){
        if (!this.cursors) return;

        this.playerMovement();
        this.updatePacmanGlow();
    }

    private updatePacmanGlow() {
        // Update any glow effects that follow pacman
        // This could be expanded for more visual effects
    }

    private playerMovement(){

        if (this.cursors.left.isDown) {
            this.preInputDirection.x = -1;
            this.preInputDirection.y = 0;
            this.preInputSelected = true;
        }
        else if (this.cursors.right.isDown) {
            this.preInputDirection.x = 1;
            this.preInputDirection.y = 0;
            this.preInputSelected = true;
        }
        else if (this.cursors.up.isDown) {
            this.preInputDirection.x = 0;
            this.preInputDirection.y = -1;
            this.preInputSelected = true;
        }
        else if (this.cursors.down.isDown) {
            this.preInputDirection.x = 0;
            this.preInputDirection.y = 1;
            this.preInputSelected = true;
        }

        if (this.preInputDirection.x === -1 && this.preInputDirection.y === 0 && this.preInputSelected === true) {
            this.tileYPlusInputDir = Math.floor((this.pacman.y + (0 * 32))/ this.tileSize);
            this.tileXPlusInputDir = Math.floor((this.pacman.x + (-1 * 32))/ this.tileSize);

            this.nextWorldX = this.tileXPlusInputDir * this.tileSize + this.tileSize / 2;
            this.nextWorldY = this.tileYPlusInputDir * this.tileSize + this.tileSize / 2;

            const center = this.map[this.tileYPlusInputDir][this.tileXPlusInputDir] === 0 ? true:false;

            this.tileYPlusInputDir = Math.floor((this.pacman.y + (-1 * 15))/ this.tileSize);
            this.tileXPlusInputDir = Math.floor((this.pacman.x + (-1 * 32))/ this.tileSize);

            this.nextWorldX = this.tileXPlusInputDir * this.tileSize + this.tileSize / 2;
            this.nextWorldY = this.tileYPlusInputDir * this.tileSize + this.tileSize / 2;

            const center2 = this.map[this.tileYPlusInputDir][this.tileXPlusInputDir] === 0 ? true:false;

            this.tileYPlusInputDir = Math.floor((this.pacman.y + (1 * 15))/ this.tileSize);
            this.tileXPlusInputDir = Math.floor((this.pacman.x + (-1 * 32))/ this.tileSize);

            this.nextWorldX = this.tileXPlusInputDir * this.tileSize + this.tileSize / 2;
            this.nextWorldY = this.tileYPlusInputDir * this.tileSize + this.tileSize / 2;

            const center3 = this.map[this.tileYPlusInputDir][this.tileXPlusInputDir] === 0 ? true:false;

            if(center === true && center2 === true && center3 === true){
            this.newInputDirection.x = this.preInputDirection.x;
            this.newInputDirection.y = this.preInputDirection.y;
            this.preInputSelected = false;
            }
        }
        else if (this.preInputDirection.x === 1 && this.preInputDirection.y === 0 && this.preInputSelected === true) {
            this.tileYPlusInputDir = Math.floor((this.pacman.y + (0 * 32))/ this.tileSize);
            this.tileXPlusInputDir = Math.floor((this.pacman.x + (1 * 32))/ this.tileSize);

            this.nextWorldX = this.tileXPlusInputDir * this.tileSize + this.tileSize / 2;
            this.nextWorldY = this.tileYPlusInputDir * this.tileSize + this.tileSize / 2;

            const center = this.map[this.tileYPlusInputDir][this.tileXPlusInputDir] === 0 ? true:false;

            this.tileYPlusInputDir = Math.floor((this.pacman.y + (1 * 15))/ this.tileSize);
            this.tileXPlusInputDir = Math.floor((this.pacman.x + (1 * 32))/ this.tileSize);

            this.nextWorldX = this.tileXPlusInputDir * this.tileSize + this.tileSize / 2;
            this.nextWorldY = this.tileYPlusInputDir * this.tileSize + this.tileSize / 2;

            const center2 = this.map[this.tileYPlusInputDir][this.tileXPlusInputDir] === 0 ? true:false;

            this.tileYPlusInputDir = Math.floor((this.pacman.y + (-1 * 15))/ this.tileSize);
            this.tileXPlusInputDir = Math.floor((this.pacman.x + (1 * 32))/ this.tileSize);

            this.nextWorldX = this.tileXPlusInputDir * this.tileSize + this.tileSize / 2;
            this.nextWorldY = this.tileYPlusInputDir * this.tileSize + this.tileSize / 2;

            const center3 = this.map[this.tileYPlusInputDir][this.tileXPlusInputDir] === 0 ? true:false;
            
            if(center === true && center2 === true && center3 === true){
                this.newInputDirection.x = this.preInputDirection.x;
                this.newInputDirection.y = this.preInputDirection.y;
                this.preInputSelected = false;
            }
        }
        else if (this.preInputDirection.x === 0 && this.preInputDirection.y === -1 && this.preInputSelected === true) {
            this.tileYPlusInputDir = Math.floor((this.pacman.y + (-1 * 32))/ this.tileSize);
            this.tileXPlusInputDir = Math.floor((this.pacman.x + (0 * 32))/ this.tileSize);

            this.nextWorldX = this.tileXPlusInputDir * this.tileSize + this.tileSize / 2;
            this.nextWorldY = this.tileYPlusInputDir * this.tileSize + this.tileSize / 2;

            const center = this.map[this.tileYPlusInputDir][this.tileXPlusInputDir] === 0 ? true:false;

            this.tileYPlusInputDir = Math.floor((this.pacman.y + (-1 * 32))/ this.tileSize);
            this.tileXPlusInputDir = Math.floor((this.pacman.x + (-1 * 15.5))/ this.tileSize);

            this.nextWorldX = this.tileXPlusInputDir * this.tileSize + this.tileSize / 2;
            this.nextWorldY = this.tileYPlusInputDir * this.tileSize + this.tileSize / 2;

            const center2 = this.map[this.tileYPlusInputDir][this.tileXPlusInputDir] === 0 ? true:false;

            this.tileYPlusInputDir = Math.floor((this.pacman.y + (-1 * 32))/ this.tileSize);
            this.tileXPlusInputDir = Math.floor((this.pacman.x + (1 * 15.5))/ this.tileSize);

            this.nextWorldX = this.tileXPlusInputDir * this.tileSize + this.tileSize / 2;
            this.nextWorldY = this.tileYPlusInputDir * this.tileSize + this.tileSize / 2;

            const center3 = this.map[this.tileYPlusInputDir][this.tileXPlusInputDir] === 0 ? true:false;

            if(center === true && center2 === true && center3 === true){
                this.newInputDirection.x = this.preInputDirection.x;
                this.newInputDirection.y = this.preInputDirection.y;
                this.preInputSelected = false;
            }
        }
        else if (this.preInputDirection.x === 0 && this.preInputDirection.y === 1 && this.preInputSelected === true) {
            this.tileYPlusInputDir = Math.floor((this.pacman.y + (1 * 32))/ this.tileSize);
            this.tileXPlusInputDir = Math.floor((this.pacman.x + (0 * 32))/ this.tileSize);

            this.nextWorldX = this.tileXPlusInputDir * this.tileSize + this.tileSize / 2;
            this.nextWorldY = this.tileYPlusInputDir * this.tileSize + this.tileSize / 2;

            const center = this.map[this.tileYPlusInputDir][this.tileXPlusInputDir] === 0 ? true:false;

            this.tileYPlusInputDir = Math.floor((this.pacman.y + (1 * 32))/ this.tileSize);
            this.tileXPlusInputDir = Math.floor((this.pacman.x + (1 * 15.5))/ this.tileSize);

            this.nextWorldX = this.tileXPlusInputDir * this.tileSize + this.tileSize / 2;
            this.nextWorldY = this.tileYPlusInputDir * this.tileSize + this.tileSize / 2;

            const center2 = this.map[this.tileYPlusInputDir][this.tileXPlusInputDir] === 0 ? true:false;

            this.tileYPlusInputDir = Math.floor((this.pacman.y + (1 * 32))/ this.tileSize);
            this.tileXPlusInputDir = Math.floor((this.pacman.x + (-1 * 15.5))/ this.tileSize);

            this.nextWorldX = this.tileXPlusInputDir * this.tileSize + this.tileSize / 2;
            this.nextWorldY = this.tileYPlusInputDir * this.tileSize + this.tileSize / 2;

            const center3 = this.map[this.tileYPlusInputDir][this.tileXPlusInputDir] === 0 ? true:false;

            if(center === true && center2 === true && center3 === true){
                this.newInputDirection.x = this.preInputDirection.x;
                this.newInputDirection.y = this.preInputDirection.y;
                this.preInputSelected = false;
            }
        }

        this.tileYPlusInputDir = Math.floor((this.pacman.y + (this.newInputDirection.y * 16.000001))/ this.tileSize);
        this.tileXPlusInputDir = Math.floor((this.pacman.x + (this.newInputDirection.x * 16.000001))/ this.tileSize);

        if(this.map[this.tileYPlusInputDir][this.tileXPlusInputDir] === 1){
            this.blockedByWall = true;
        }
        else{
            this.blockedByWall = false;
        }

        if(this.blockedByWall === false){
            this.pacman.setX(this.pacman.x + this.newInputDirection.x * this.pacmanSpeed);
            this.pacman.setY(this.pacman.y + this.newInputDirection.y * this.pacmanSpeed);
        }
    }

    // Clean up background music when scene ends
    shutdown() {
        if (this.backgroundMusic) {
            this.backgroundMusic.stop();
        }
    }
}