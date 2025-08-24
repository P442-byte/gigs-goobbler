import { Scene, GameObjects } from 'phaser';
import { EventBus } from '../EventBus';

export class PacTest2 extends Phaser.Scene {

    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    
    // Add background music property
    private backgroundMusic!: Phaser.Sound.BaseSound;

    // Gesture handling properties
    private swipeStartX: number = 0;
    private swipeStartY: number = 0;
    private swipeEndX: number = 0;
    private swipeEndY: number = 0;
    private isSwipeActive: boolean = false;
    private minSwipeDistance: number = 50; // Minimum distance for a valid swipe
    private maxSwipeTime: number = 300; // Maximum time for a swipe in milliseconds
    private swipeStartTime: number = 0;

    private tileSize: number = 32; // Will be calculated dynamically
    private mapWidth: number = 19; // Number of tiles horizontally
    private mapHeight: number = 17; // Number of tiles vertically
    private mapOffsetX: number = 0; // X offset to center the map
    private mapOffsetY: number = 0; // Y offset to center the map
    
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
    private pacmanRadius: number = 16; // Will be calculated based on tileSize
    private pacmanSpeed: number = 3.2; // Will be calculated based on tileSize
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

        // Set up gesture handling
        this.setupGestureHandling();

        // Calculate optimal tile size based on screen dimensions
        this.calculateTileSize();

        // Create a dark gradient background
        this.createBackground();

        // Start background music
        // this.backgroundMusic = this.sound.add('coffee-break-music', {
        //     loop: true,  // Loop the music
        //     volume: 0.5  // Set volume (0.0 to 1.0)
        // });
        // this.backgroundMusic.play();

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
                const spawnX = this.mapOffsetX + x * this.tileSize + this.tileSize / 2;
                const spawnY = this.mapOffsetY + y * this.tileSize + this.tileSize / 2;

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

    private calculateTileSize() {
        // Get available screen dimensions (accounting for padding)
        const paddingPx = 32; // 2rem = 32px padding on each side
        const availableWidth = this.scale.width - (paddingPx * 2);
        const availableHeight = this.scale.height - (paddingPx * 2);
        
        // Calculate tile size based on width and height constraints
        const maxTileSizeByWidth = Math.floor(availableWidth / this.mapWidth);
        const maxTileSizeByHeight = Math.floor(availableHeight / this.mapHeight);
        
        // Use the smaller of the two to ensure the map fits in both dimensions
        this.tileSize = Math.min(maxTileSizeByWidth, maxTileSizeByHeight);
        
        // Ensure minimum tile size for playability
        this.tileSize = Math.max(this.tileSize, 16);
        
        // Calculate actual map dimensions
        const actualMapWidth = this.mapWidth * this.tileSize;
        const actualMapHeight = this.mapHeight * this.tileSize;
        
        // Calculate offsets to center the map
        this.mapOffsetX = (this.scale.width - actualMapWidth) / 2;
        this.mapOffsetY = (this.scale.height - actualMapHeight) / 2;
        
        // Calculate pacman radius and speed based on tile size
        this.pacmanRadius = this.tileSize / 2;
        
        // Maintain the same speed ratio: pacmanSpeed = tileSize ÷ 10
        // This value needs to be whatever the tilesize(32 in this case) is devided by a whole number, in this case its 32 / 10 = 3.2, but something like 32 / 12 = 2.6666667 would also work for example as long as whatever 32(tilesize) is devided by is a whole number. In other words - pacmanSpeed = tileSize ÷ n (where n is a whole number),
        this.pacmanSpeed = this.tileSize / 10;

        //this.pacmanSpeed = this.tileSize / 10;
        
        console.log(`Screen: ${this.scale.width}x${this.scale.height}`);
        console.log(`Available: ${availableWidth}x${availableHeight}`);
        console.log(`TileSize: ${this.tileSize}, MapSize: ${actualMapWidth}x${actualMapHeight}`);
        console.log(`MapOffset: ${this.mapOffsetX}, ${this.mapOffsetY}`);
        console.log(`PacmanSpeed: ${this.pacmanSpeed}`);
    }

    private setupGestureHandling() {
        // Enable pointer events
        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            this.swipeStartX = pointer.x;
            this.swipeStartY = pointer.y;
            this.swipeStartTime = this.time.now;
            this.isSwipeActive = true;
        });

        this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
            if (!this.isSwipeActive) return;

            this.swipeEndX = pointer.x;
            this.swipeEndY = pointer.y;
            const swipeEndTime = this.time.now;
            
            this.detectSwipe(swipeEndTime);
            this.isSwipeActive = false;
        });

        // Handle pointer move for continuous swipe detection
        this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
            if (!this.isSwipeActive || !pointer.isDown) return;
            
            this.swipeEndX = pointer.x;
            this.swipeEndY = pointer.y;
        });
    }

    private detectSwipe(endTime: number) {
        const deltaX = this.swipeEndX - this.swipeStartX;
        const deltaY = this.swipeEndY - this.swipeStartY;
        const swipeTime = endTime - this.swipeStartTime;
        
        // Check if swipe is within time limit
        if (swipeTime > this.maxSwipeTime) return;
        
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        // Check if swipe distance is sufficient
        if (distance < this.minSwipeDistance) return;
        
        // Determine swipe direction based on the larger delta
        const absX = Math.abs(deltaX);
        const absY = Math.abs(deltaY);
        
        if (absX > absY) {
            // Horizontal swipe
            if (deltaX > 0) {
                // Swipe right
                this.handleSwipeInput(1, 0);
            } else {
                // Swipe left
                this.handleSwipeInput(-1, 0);
            }
        } else {
            // Vertical swipe
            if (deltaY > 0) {
                // Swipe down
                this.handleSwipeInput(0, 1);
            } else {
                // Swipe up
                this.handleSwipeInput(0, -1);
            }
        }
    }

    private handleSwipeInput(x: number, y: number) {
        // Set the pre-input direction based on swipe
        this.preInputDirection.x = x;
        this.preInputDirection.y = y;
        this.preInputSelected = true;
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
            this.mapOffsetX + x * this.tileSize, 
            this.mapOffsetY + y * this.tileSize, 
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
        this.pacman = this.add.arc(spawnX, spawnY, this.pacmanRadius, 0, 360, false, 0xffff00);
        this.pacman.setStrokeStyle(2, 0xffcc00);
        this.pacman.setDepth(20);
        
        // Add a subtle glow effect to pacman
        const glowRadius = this.pacmanRadius + 4;
        const glowCircle = this.add.arc(spawnX, spawnY, glowRadius, 0, 360, false, 0xffff00);
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
        // Scale dot size based on tile size
        const dotRadius = Math.max(2, this.tileSize / 8);
        const dot = this.add.arc(spawnX, spawnY, dotRadius, 0, 360, false, 0x00ff88);
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
            this.tileYPlusInputDir = Math.floor((this.pacman.y - this.mapOffsetY + (0 * this.tileSize))/ this.tileSize);
            this.tileXPlusInputDir = Math.floor((this.pacman.x - this.mapOffsetX + (-1 * this.tileSize))/ this.tileSize);

            this.nextWorldX = this.mapOffsetX + this.tileXPlusInputDir * this.tileSize + this.tileSize / 2;
            this.nextWorldY = this.mapOffsetY + this.tileYPlusInputDir * this.tileSize + this.tileSize / 2;

            const center = this.map[this.tileYPlusInputDir][this.tileXPlusInputDir] === 0 ? true:false;

            this.tileYPlusInputDir = Math.floor((this.pacman.y - this.mapOffsetY + (-1 * this.pacmanRadius * 0.9375))/ this.tileSize);
            this.tileXPlusInputDir = Math.floor((this.pacman.x - this.mapOffsetX + (-1 * this.tileSize))/ this.tileSize);

            this.nextWorldX = this.mapOffsetX + this.tileXPlusInputDir * this.tileSize + this.tileSize / 2;
            this.nextWorldY = this.mapOffsetY + this.tileYPlusInputDir * this.tileSize + this.tileSize / 2;

            const center2 = this.map[this.tileYPlusInputDir][this.tileXPlusInputDir] === 0 ? true:false;

            this.tileYPlusInputDir = Math.floor((this.pacman.y - this.mapOffsetY + (1 * this.pacmanRadius * 0.9375))/ this.tileSize);
            this.tileXPlusInputDir = Math.floor((this.pacman.x - this.mapOffsetX + (-1 * this.tileSize))/ this.tileSize);

            this.nextWorldX = this.mapOffsetX + this.tileXPlusInputDir * this.tileSize + this.tileSize / 2;
            this.nextWorldY = this.mapOffsetY + this.tileYPlusInputDir * this.tileSize + this.tileSize / 2;

            const center3 = this.map[this.tileYPlusInputDir][this.tileXPlusInputDir] === 0 ? true:false;

            if(center === true && center2 === true && center3 === true){
            this.newInputDirection.x = this.preInputDirection.x;
            this.newInputDirection.y = this.preInputDirection.y;
            this.preInputSelected = false;
            }
        }
        else if (this.preInputDirection.x === 1 && this.preInputDirection.y === 0 && this.preInputSelected === true) {
            this.tileYPlusInputDir = Math.floor((this.pacman.y - this.mapOffsetY + (0 * this.tileSize))/ this.tileSize);
            this.tileXPlusInputDir = Math.floor((this.pacman.x - this.mapOffsetX + (1 * this.tileSize))/ this.tileSize);

            this.nextWorldX = this.mapOffsetX + this.tileXPlusInputDir * this.tileSize + this.tileSize / 2;
            this.nextWorldY = this.mapOffsetY + this.tileYPlusInputDir * this.tileSize + this.tileSize / 2;

            const center = this.map[this.tileYPlusInputDir][this.tileXPlusInputDir] === 0 ? true:false;

            this.tileYPlusInputDir = Math.floor((this.pacman.y - this.mapOffsetY + (1 * this.pacmanRadius * 0.9375))/ this.tileSize);
            this.tileXPlusInputDir = Math.floor((this.pacman.x - this.mapOffsetX + (1 * this.tileSize))/ this.tileSize);

            this.nextWorldX = this.mapOffsetX + this.tileXPlusInputDir * this.tileSize + this.tileSize / 2;
            this.nextWorldY = this.mapOffsetY + this.tileYPlusInputDir * this.tileSize + this.tileSize / 2;

            const center2 = this.map[this.tileYPlusInputDir][this.tileXPlusInputDir] === 0 ? true:false;

            this.tileYPlusInputDir = Math.floor((this.pacman.y - this.mapOffsetY + (-1 * this.pacmanRadius * 0.9375))/ this.tileSize);
            this.tileXPlusInputDir = Math.floor((this.pacman.x - this.mapOffsetX + (1 * this.tileSize))/ this.tileSize);

            this.nextWorldX = this.mapOffsetX + this.tileXPlusInputDir * this.tileSize + this.tileSize / 2;
            this.nextWorldY = this.mapOffsetY + this.tileYPlusInputDir * this.tileSize + this.tileSize / 2;

            const center3 = this.map[this.tileYPlusInputDir][this.tileXPlusInputDir] === 0 ? true:false;
            
            if(center === true && center2 === true && center3 === true){
                this.newInputDirection.x = this.preInputDirection.x;
                this.newInputDirection.y = this.preInputDirection.y;
                this.preInputSelected = false;
            }
        }
        else if (this.preInputDirection.x === 0 && this.preInputDirection.y === -1 && this.preInputSelected === true) {
            this.tileYPlusInputDir = Math.floor((this.pacman.y - this.mapOffsetY + (-1 * this.tileSize))/ this.tileSize);
            this.tileXPlusInputDir = Math.floor((this.pacman.x - this.mapOffsetX + (0 * this.tileSize))/ this.tileSize);

            this.nextWorldX = this.mapOffsetX + this.tileXPlusInputDir * this.tileSize + this.tileSize / 2;
            this.nextWorldY = this.mapOffsetY + this.tileYPlusInputDir * this.tileSize + this.tileSize / 2;

            const center = this.map[this.tileYPlusInputDir][this.tileXPlusInputDir] === 0 ? true:false;

            this.tileYPlusInputDir = Math.floor((this.pacman.y - this.mapOffsetY + (-1 * this.tileSize))/ this.tileSize);
            this.tileXPlusInputDir = Math.floor((this.pacman.x - this.mapOffsetX + (-1 * this.pacmanRadius * 0.984375))/ this.tileSize);

            this.nextWorldX = this.mapOffsetX + this.tileXPlusInputDir * this.tileSize + this.tileSize / 2;
            this.nextWorldY = this.mapOffsetY + this.tileYPlusInputDir * this.tileSize + this.tileSize / 2;

            const center2 = this.map[this.tileYPlusInputDir][this.tileXPlusInputDir] === 0 ? true:false;

            this.tileYPlusInputDir = Math.floor((this.pacman.y - this.mapOffsetY + (-1 * this.tileSize))/ this.tileSize);
            this.tileXPlusInputDir = Math.floor((this.pacman.x - this.mapOffsetX + (1 * this.pacmanRadius * 0.984375))/ this.tileSize);

            this.nextWorldX = this.mapOffsetX + this.tileXPlusInputDir * this.tileSize + this.tileSize / 2;
            this.nextWorldY = this.mapOffsetY + this.tileYPlusInputDir * this.tileSize + this.tileSize / 2;

            const center3 = this.map[this.tileYPlusInputDir][this.tileXPlusInputDir] === 0 ? true:false;

            if(center === true && center2 === true && center3 === true){
                this.newInputDirection.x = this.preInputDirection.x;
                this.newInputDirection.y = this.preInputDirection.y;
                this.preInputSelected = false;
            }
        }
        else if (this.preInputDirection.x === 0 && this.preInputDirection.y === 1 && this.preInputSelected === true) {
            this.tileYPlusInputDir = Math.floor((this.pacman.y - this.mapOffsetY + (1 * this.tileSize))/ this.tileSize);
            this.tileXPlusInputDir = Math.floor((this.pacman.x - this.mapOffsetX + (0 * this.tileSize))/ this.tileSize);

            this.nextWorldX = this.mapOffsetX + this.tileXPlusInputDir * this.tileSize + this.tileSize / 2;
            this.nextWorldY = this.mapOffsetY + this.tileYPlusInputDir * this.tileSize + this.tileSize / 2;

            const center = this.map[this.tileYPlusInputDir][this.tileXPlusInputDir] === 0 ? true:false;

            this.tileYPlusInputDir = Math.floor((this.pacman.y - this.mapOffsetY + (1 * this.tileSize))/ this.tileSize);
            this.tileXPlusInputDir = Math.floor((this.pacman.x - this.mapOffsetX + (1 * this.pacmanRadius * 0.984375))/ this.tileSize);

            this.nextWorldX = this.mapOffsetX + this.tileXPlusInputDir * this.tileSize + this.tileSize / 2;
            this.nextWorldY = this.mapOffsetY + this.tileYPlusInputDir * this.tileSize + this.tileSize / 2;

            const center2 = this.map[this.tileYPlusInputDir][this.tileXPlusInputDir] === 0 ? true:false;

            this.tileYPlusInputDir = Math.floor((this.pacman.y - this.mapOffsetY + (1 * this.tileSize))/ this.tileSize);
            this.tileXPlusInputDir = Math.floor((this.pacman.x - this.mapOffsetX + (-1 * this.pacmanRadius * 0.984375))/ this.tileSize);

            this.nextWorldX = this.mapOffsetX + this.tileXPlusInputDir * this.tileSize + this.tileSize / 2;
            this.nextWorldY = this.mapOffsetY + this.tileYPlusInputDir * this.tileSize + this.tileSize / 2;

            const center3 = this.map[this.tileYPlusInputDir][this.tileXPlusInputDir] === 0 ? true:false;

            if(center === true && center2 === true && center3 === true){
                this.newInputDirection.x = this.preInputDirection.x;
                this.newInputDirection.y = this.preInputDirection.y;
                this.preInputSelected = false;
            }
        }

        this.tileYPlusInputDir = Math.floor((this.pacman.y - this.mapOffsetY + (this.newInputDirection.y * this.pacmanRadius * 1.000001))/ this.tileSize);
        this.tileXPlusInputDir = Math.floor((this.pacman.x - this.mapOffsetX + (this.newInputDirection.x * this.pacmanRadius * 1.000001))/ this.tileSize);

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