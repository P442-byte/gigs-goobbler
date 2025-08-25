import { Scene, GameObjects } from 'phaser';
import { EventBus } from '../EventBus';

export class PacTest2 extends Phaser.Scene {

    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    
    // Add audio properties
    private startMusic!: Phaser.Sound.BaseSound;
    private gameMusic!: Phaser.Sound.BaseSound;
    private gameStarted: boolean = false;

    // Score tracking properties
    private score: number = 0;
    private totalDots: number = 0;
    
    // Progression tracking properties
    private progression: number = 0;
    private maxProgression: number = 0;
    private reward: number = 0;

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
        [1,1,1,1,0,1,0,1,1,1,1,1,0,1,0,1,1,1,1],
        [1,0,0,0,0,1,1,1,0,1,0,1,1,1,0,0,0,0,1],
        [1,0,0,1,0,1,0,0,0,5,0,0,0,1,0,1,0,0,1],
        [1,1,1,1,0,1,0,1,1,6,1,1,0,1,0,1,1,1,1],
        [0,0,0,0,0,0,0,1,5,5,5,1,0,0,0,0,0,0,0],
        [1,1,1,1,0,1,0,1,1,1,1,1,0,1,0,1,1,1,1],
        [1,0,0,1,0,1,0,0,0,0,0,0,0,1,0,1,0,0,1],
        [1,0,0,0,0,1,1,1,0,1,0,1,1,1,0,0,0,0,1],
        [1,1,1,1,0,1,0,1,1,1,1,1,0,1,0,1,1,1,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,1,1,0,1,1,1,0,1,0,1,1,1,0,1,1,0,1],
        [1,0,0,0,0,4,0,0,0,1,0,0,0,0,0,0,0,0,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    ];

    private dots: Phaser.GameObjects.Arc[] = [];
    private walls: Phaser.GameObjects.Rectangle[] = [];

    private pacman!: Phaser.GameObjects.Graphics;
    private pacmanGlow!: Phaser.GameObjects.Arc;
    private pacmanRadius: number = 16; // Will be calculated based on tileSize
    private pacmanSpeed: number = 2.66666667; // Will be calculated based on tileSize
    private pacmanMouthAngle: number = 0; // Current mouth opening angle
    private pacmanDirection: number = 0; // Current facing direction in degrees
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

        // Initialize score and progression
        this.score = 0;
        this.progression = 0;
        this.reward = 0;
        this.totalDots = 0; // Reset dot counter
        
        // Clear existing dots and walls arrays
        this.dots = [];
        this.walls = [];
        
        // Reset movement state
        this.preInputDirection = { x: 0, y: 0 };
        this.preInputSelected = false;
        this.newInputDirection = { x: 0, y: 0 };
        this.blockedByWall = false;
        this.gameStarted = false; // Reset game started flag
        
        // Reset map state - convert all collected tiles (3) back to empty tiles (0)
        for (let y = 0; y < this.map.length; y++) {
            for (let x = 0; x < this.map[y].length; x++) {
                if (this.map[y][x] === 3) { // 3 = collected tile
                    this.map[y][x] = 0; // 0 = empty tile (available for dots)
                }
            }
        }
        
        EventBus.emit('score-update', this.score);

        console.log('PacTest2 scene created');
        
        // Play start music and wait for it to finish before starting game
        this.startMusic = this.sound.add('start-music', {
            loop: false,
            volume: 0.4
        });
        
        console.log('Playing start music');
        this.startMusic.play();
        
        // Wait for start music to finish, then enable game and start background music
        this.startMusic.once('complete', () => {
            this.gameStarted = true;
            console.log('Game started! You can now move.');
            
            // Start continuous background music
            this.gameMusic = this.sound.add('coffee-break-music', {
                loop: true,
                volume: 0.25
            });
            this.gameMusic.play();
        });

        // Create the maze
        for (let y = 0; y < this.map.length; y++) {
            for (let x = 0; x < this.map[y].length; x++) {
                const tile = this.map[y][x];
                if (tile === 1) {
                    this.createWall(x, y);
                }
            }
        }

        // First pass: Create pacman and find all available empty tiles
        const availableEmptyTiles: { x: number, y: number }[] = [];
        
        for (let y = 0; y < this.map.length; y++) {
            for (let x = 0; x < this.map[y].length; x++) {
                const tile = this.map[y][x];
                const spawnX = this.mapOffsetX + x * this.tileSize + this.tileSize / 2;
                const spawnY = this.mapOffsetY + y * this.tileSize + this.tileSize / 2;

                if (tile === 0) {
                    // Add to available empty tiles list
                    availableEmptyTiles.push({ x, y });
                }
                else if (tile === 4) {
                    this.createPacman(spawnX, spawnY);
                }
            }
        }

        // Second pass: Randomly select 100 tiles from available empty tiles and place dots
        this.placeRandomDots(availableEmptyTiles, 100);

        // Add glow effects
        this.createGlowEffects();

        // Initialize progression system
        this.initializeProgression();

        EventBus.emit('current-scene-ready', this);
    }

    private calculateTileSize() {
        // Get available screen dimensions (accounting for padding and UI elements)
        const paddingPx = 32; // 2rem = 32px padding on each side
        
        // Responsive UI space calculation
        const isMobile = this.scale.width <= 768;
        const isSmallMobile = this.scale.width <= 480;
        
        const topUISpace = isSmallMobile ? 120 : isMobile ? 140 : 120;
        const bottomUISpace = isSmallMobile ? 80 : isMobile ? 90 : 80;
        
        const availableWidth = this.scale.width - (paddingPx * 2);
        const availableHeight = this.scale.height - (paddingPx * 2) - topUISpace - bottomUISpace;
        
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
        
        // Calculate offsets to center the map (accounting for top UI space)
        this.mapOffsetX = (this.scale.width - actualMapWidth) / 2;
        this.mapOffsetY = (this.scale.height - actualMapHeight) / 2 + (topUISpace / 2);
        
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
        // Create graphics object for Pacman
        this.pacman = this.add.graphics();
        this.pacman.setPosition(spawnX, spawnY);
        this.pacman.setDepth(20);
        
        // Add a subtle glow effect to pacman
        const glowRadius = this.pacmanRadius + 4;
        this.pacmanGlow = this.add.arc(spawnX, spawnY, glowRadius, 0, 360, false, 0xffff00);
        this.pacmanGlow.setAlpha(0.3);
        this.pacmanGlow.setDepth(19);
        
        // Make the glow follow pacman
        this.tweens.add({
            targets: this.pacmanGlow,
            alpha: { from: 0.3, to: 0.1 },
            duration: 1000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // Start mouth animation
        this.startMouthAnimation();
        
        // Draw initial Pacman
        this.drawPacman();
    }

    private drawPacman() {
        // Clear previous drawing
        this.pacman.clear();
        
        // Set fill style
        this.pacman.fillStyle(0xffff00);
        this.pacman.lineStyle(2, 0xffcc00);
        
        // Calculate mouth angles based on direction and animation
        const halfMouth = this.pacmanMouthAngle / 2;
        let startAngle = this.pacmanDirection - halfMouth;
        let endAngle = this.pacmanDirection + halfMouth;
        
        // Convert to radians
        startAngle = Phaser.Math.DegToRad(startAngle);
        endAngle = Phaser.Math.DegToRad(endAngle);
        
        // Draw Pacman as a circle with a mouth
        this.pacman.beginPath();
        this.pacman.arc(0, 0, this.pacmanRadius, endAngle, startAngle, false);
        this.pacman.lineTo(0, 0);
        this.pacman.closePath();
        this.pacman.fillPath();
        this.pacman.strokePath();
        
        // Draw the eye
        this.drawPacmanEye();
    }

    private drawPacmanEye() {
        // Calculate eye position based on facing direction
        const eyeDistance = this.pacmanRadius * 0.4; // Distance from center
        const eyeRadius = this.pacmanRadius * 0.40; // Eye size
        
        // Calculate eye position based on direction
        let eyeX = 0;
        let eyeY = 0;
        
        switch (this.pacmanDirection) {
            case 0: // Right
                eyeX = -eyeDistance * 0.6;
                eyeY = -eyeDistance * 0.8;
                break;
            case 90: // Down
                eyeX = eyeDistance * 0.8;
                eyeY = -eyeDistance * 0.6;
                break;
            case 180: // Left
                eyeX = eyeDistance * 0.6;
                eyeY = -eyeDistance * 0.8;
                break;
            case 270: // Up
                eyeX = eyeDistance * 0.8;
                eyeY = eyeDistance * 0.6;
                break;
        }
        
        // Draw the eye (white background with black pupil)
        this.pacman.fillStyle(0xffffff);
        this.pacman.fillCircle(eyeX, eyeY, eyeRadius);
        
        // Draw the pupil
        this.pacman.fillStyle(0x000000);
        this.pacman.fillCircle(eyeX, eyeY, eyeRadius * 0.6);
    }

    private startMouthAnimation() {
        // Animate mouth opening and closing with smoother timing
        this.tweens.add({
            targets: this,
            pacmanMouthAngle: { from: 10, to: 90 }, // Start slightly open to reduce flicker
            duration: 200, // Slightly faster for smoother animation
            yoyo: true,
            repeat: -1,
            ease: 'Power2',
            onUpdate: () => {
                this.drawPacman();
            }
        });
    }

    private updatePacmanDirection() {
        // Update facing direction based on movement direction
        if (this.newInputDirection.x === 1) {
            this.pacmanDirection = 0; // Right
        } else if (this.newInputDirection.x === -1) {
            this.pacmanDirection = 180; // Left
        } else if (this.newInputDirection.y === -1) {
            this.pacmanDirection = 270; // Up
        } else if (this.newInputDirection.y === 1) {
            this.pacmanDirection = 90; // Down
        }
    }

    private createDataDot(spawnX: number, spawnY: number) {
        // Create a data packet visual instead of a simple dot
        const dotSize = Math.max(8, this.tileSize / 4);
        
        // Create a container for the data dot
        const dotContainer = this.add.container(spawnX, spawnY);
        dotContainer.setDepth(15);
        
        // Create database/data stack icon (universally recognized as data)
        this.createDatabaseStack(dotContainer, dotSize);
        
        // Add a subtle pulsing effect with data-like glow
        this.tweens.add({
            targets: dotContainer,
            scaleX: { from: 1, to: 1.2 },
            scaleY: { from: 1, to: 1.2 },
            alpha: { from: 0.9, to: 1 },
            duration: 1500 + Math.random() * 1000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
        
        // Add to dots array (cast to Arc for compatibility)
        this.dots.push(dotContainer as any);
    }

    private createDatabaseStack(container: Phaser.GameObjects.Container, size: number) {
        // Create the classic stacked database/data cylinder icon
        const cylinderWidth = size * 0.8;
        const cylinderHeight = size * 0.15;
        const stackSpacing = size * 0.18;
        
        // Create 3 stacked cylinders (classic database icon)
        for (let i = 0; i < 3; i++) {
            const yOffset = (i - 1) * stackSpacing;
            
            // Main cylinder body
            const cylinder = this.add.ellipse(0, yOffset, cylinderWidth, cylinderHeight, 0x001122);
            cylinder.setStrokeStyle(2, 0x00ff88);
            container.add(cylinder);
            
            // Add subtle gradient effect with a slightly brighter fill for the top
            if (i === 0) { // Bottom cylinder - darker
                cylinder.setFillStyle(0x000811);
            } else if (i === 1) { // Middle cylinder
                cylinder.setFillStyle(0x001122);
            } else { // Top cylinder - slightly brighter
                cylinder.setFillStyle(0x001633);
            }
        }
        
        // Add small data indicator dots on the top cylinder
        const dot1 = this.add.arc(-size * 0.15, -stackSpacing, 2, 0, 360, false, 0x00ff88);
        container.add(dot1);
        
        const dot2 = this.add.arc(0, -stackSpacing, 2, 0, 360, false, 0x00ff88);
        container.add(dot2);
        
        const dot3 = this.add.arc(size * 0.15, -stackSpacing, 2, 0, 360, false, 0x00ff88);
        container.add(dot3);
    }

    private createGlowEffects() {
        // Add some ambient lighting effects
        const ambientGlow = this.add.graphics();
        ambientGlow.fillGradientStyle(0x0ec3c9, 0x0ec3c9, 0x000000, 0x000000, 0.1);
        ambientGlow.fillCircle(this.scale.width / 2, this.scale.height / 2, 300);
        ambientGlow.setDepth(-5);
        ambientGlow.setBlendMode(Phaser.BlendModes.ADD);
    }

    private placeRandomDots(availableEmptyTiles: { x: number, y: number }[], targetDotCount: number) {
        // Shuffle the available tiles array to randomize selection
        const shuffledTiles = [...availableEmptyTiles];
        for (let i = shuffledTiles.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffledTiles[i], shuffledTiles[j]] = [shuffledTiles[j], shuffledTiles[i]];
        }
        
        // Take the first 'targetDotCount' tiles (or all available if less than target)
        const selectedTiles = shuffledTiles.slice(0, Math.min(targetDotCount, shuffledTiles.length));
        
        // Place dots on selected tiles
        selectedTiles.forEach(tile => {
            const spawnX = this.mapOffsetX + tile.x * this.tileSize + this.tileSize / 2;
            const spawnY = this.mapOffsetY + tile.y * this.tileSize + this.tileSize / 2;
            this.createDataDot(spawnX, spawnY);
            this.totalDots++;
        });
        
        console.log(`Placed ${this.totalDots} dots randomly out of ${availableEmptyTiles.length} available tiles`);
    }

    private initializeProgression() {
        // Max progression represents 1000MB total
        this.maxProgression = 1000;
        
        // Emit initial values
        EventBus.emit('progression-update', this.progression);
        EventBus.emit('max-progression-update', this.maxProgression);
        EventBus.emit('reward-update', this.reward);
        
        console.log(`Total dots: ${this.totalDots}, Max progression: ${this.maxProgression}MB`);
        console.log(`Each dot adds: ${(this.maxProgression / this.totalDots).toFixed(2)}MB`);
    }



    update(){
        if (!this.cursors || !this.gameStarted) return;

        this.playerMovement();
        this.checkDotCollision();
    }

    private updatePacmanGlow() {
        // Update any glow effects that follow pacman
        // This could be expanded for more visual effects
    }



    private checkDotCollision() {
        // Get Pacman's current tile position
        const pacmanTileX = Math.floor((this.pacman.x - this.mapOffsetX) / this.tileSize);
        const pacmanTileY = Math.floor((this.pacman.y - this.mapOffsetY) / this.tileSize);
        
        // Check if Pacman is close enough to the center of a tile to collect a dot
        const centerX = this.mapOffsetX + pacmanTileX * this.tileSize + this.tileSize / 2;
        const centerY = this.mapOffsetY + pacmanTileY * this.tileSize + this.tileSize / 2;
        
        const distanceToCenter = Phaser.Math.Distance.Between(this.pacman.x, this.pacman.y, centerX, centerY);
        

        
        // If Pacman is close enough to the center (within half the pacman radius)
        if (distanceToCenter < this.pacmanRadius / 2) {
            // Check if there's a dot at this position
            for (let i = this.dots.length - 1; i >= 0; i--) {
                const dot = this.dots[i];
                const dotDistance = Phaser.Math.Distance.Between(this.pacman.x, this.pacman.y, dot.x, dot.y);
                
                if (dotDistance < this.pacmanRadius) {
                    this.collectDot(dot, i, pacmanTileX, pacmanTileY);
                    break; // Only collect one dot per frame
                }
            }
        }
    }

    private collectDot(dot: Phaser.GameObjects.Arc, index: number, tileX: number, tileY: number) {
        // Create collection effect before removing the dot
        this.createCollectionEffect(dot.x, dot.y);
        
        // Remove the dot visually
        dot.destroy();
        
        // Remove from dots array
        this.dots.splice(index, 1);
        
        // Update the map to mark this tile as empty (no longer has a dot)
        if (this.map[tileY] && this.map[tileY][tileX] === 0) {
            this.map[tileY][tileX] = 3; // Mark as collected (3 = empty space, no dot)
        }
        
        // Add to score
        this.score += 10;
        this.updateScore();
        
        // Update progression (each dot increases progression by 10% of max progression)
        this.updateProgression();
        
        // Collection sound is handled by movement eating sound
        
        // Check win condition
        this.checkWinCondition();
    }

    private createCollectionEffect(x: number, y: number) {
        // Calculate base position behind Pacman based on his direction
        let baseX = x;
        let baseY = y;
        const baseOffset = this.pacmanRadius * 0.5;
        
        switch (this.pacmanDirection) {
            case 0: // Right - effects appear to the left (behind)
                baseX = x - baseOffset;
                break;
            case 90: // Down - effects appear above (behind)
                baseY = y - baseOffset;
                break;
            case 180: // Left - effects appear to the right (behind)
                baseX = x + baseOffset;
                break;
            case 270: // Up - effects appear below (behind)
                baseY = y + baseOffset;
                break;
        }
        
        // Calculate position behind Pacman based on his direction (closer to Pacman)
        let popupX = x;
        let popupY = y;
        const offset = this.pacmanRadius + 8; // Closer to Pacman (was 15)
        
        switch (this.pacmanDirection) {
            case 0: // Right - popup appears to the left (behind)
                popupX = x - offset;
                break;
            case 90: // Down - popup appears above (behind)
                popupY = y - offset;
                break;
            case 180: // Left - popup appears to the right (behind)
                popupX = x + offset;
                break;
            case 270: // Up - popup appears below (behind)
                popupY = y + offset;
                break;
        }
        
        // Create a slightly bigger score popup
        const mbPerDot = (this.maxProgression / this.totalDots).toFixed(1).replace('.0', '');
        const scoreText = this.add.text(popupX, popupY, `+${mbPerDot}MB`, {
            fontSize: '16px', // Slightly bigger (was 14px)
            color: '#00ff88',
            fontFamily: 'Arial',
            fontStyle: 'bold'
        }).setOrigin(0.5, 0.5);
        scoreText.setDepth(18); // Behind Pacman (Pacman is at depth 20)
        
        // Set initial state (small and transparent)
        scoreText.setScale(0.2);
        scoreText.setAlpha(0);
        
        // Animate score popup (grows and floats upward gradually)
        this.tweens.add({
            targets: scoreText,
            y: popupY, // Small initial float upward
            scaleX: { from: 0.2, to: 0.9 }, // Grow in size
            scaleY: { from: 0.2, to: 0.9 },
            alpha: { from: 0, to: 1 },
            duration: 600, // Slower initial animation
            ease: 'Back.easeOut',
            onComplete: () => {
                // Continue floating upward slowly while growing slightly and fading out
                this.tweens.add({
                    targets: scoreText,
                    y: scoreText.y - 12, // Continue floating up slowly (20 pixels total)
                    scaleX: 1.0, // Grow just a tiny bit more
                    scaleY: 1.0,
                    alpha: 0,
                    duration: 800, // Much slower fade with movement
                    ease: 'Sine.easeOut', // Gentler easing
                    onComplete: () => {
                        scoreText.destroy();
                    }
                });
            }
        });
        
        // Create a visible flash effect at the dot's original location
        const flash = this.add.arc(x, y, this.tileSize / 2, 0, 360, false, 0xffffff);
        flash.setDepth(16);
        flash.setAlpha(0.8); // More visible
        flash.setBlendMode(Phaser.BlendModes.ADD);
        
        this.tweens.add({
            targets: flash,
            scaleX: { from: 0.5, to: 2.0 }, // Bigger expansion
            scaleY: { from: 0.5, to: 2.0 },
            alpha: { from: 0.8, to: 0 },
            duration: 300, // Longer duration
            ease: 'Power2',
            onComplete: () => {
                flash.destroy();
            }
        });
    }

    private updateScore() {
        EventBus.emit('score-update', this.score);
    }

    private updateProgression() {
        // Each dot adds: 1000MB ÷ total_dots
        const progressionIncrease = this.maxProgression / this.totalDots;
        this.progression += progressionIncrease;
        
        console.log(`Progression: ${this.progression.toFixed(2)}MB/${this.maxProgression}MB (${(this.progression/this.maxProgression*100).toFixed(1)}%)`);
        
        // Check for 100MB milestones (every 10% of the 1000MB total)
        const currentPercentage = (this.progression / this.maxProgression) * 100;
        const previousPercentage = ((this.progression - progressionIncrease) / this.maxProgression) * 100;
        const currentMilestone = Math.floor(currentPercentage / 10);
        const previousMilestone = Math.floor(previousPercentage / 10);
        
        if (currentMilestone > previousMilestone) {
            // Add 100MB to reward for each milestone reached
            this.reward += 100;
            console.log(`Milestone reached: ${currentMilestone * 10}% - Reward: ${this.reward}MB`);
            EventBus.emit('show-reward-popup');
            EventBus.emit('reward-update', this.reward);
        }
        
        // Emit progression update
        EventBus.emit('progression-update', this.progression);
    }

    private checkWinCondition() {
        if (this.dots.length === 0) {
            // All dots collected - player wins!
            EventBus.emit('game-won');
        }
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

            const center = this.map[this.tileYPlusInputDir][this.tileXPlusInputDir] !== 1 ? true:false;

            this.tileYPlusInputDir = Math.floor((this.pacman.y - this.mapOffsetY + (-1 * this.pacmanRadius * 0.9375))/ this.tileSize);
            this.tileXPlusInputDir = Math.floor((this.pacman.x - this.mapOffsetX + (-1 * this.tileSize))/ this.tileSize);

            this.nextWorldX = this.mapOffsetX + this.tileXPlusInputDir * this.tileSize + this.tileSize / 2;
            this.nextWorldY = this.mapOffsetY + this.tileYPlusInputDir * this.tileSize + this.tileSize / 2;

            const center2 = this.map[this.tileYPlusInputDir][this.tileXPlusInputDir] !== 1 ? true:false;

            this.tileYPlusInputDir = Math.floor((this.pacman.y - this.mapOffsetY + (1 * this.pacmanRadius * 0.9375))/ this.tileSize);
            this.tileXPlusInputDir = Math.floor((this.pacman.x - this.mapOffsetX + (-1 * this.tileSize))/ this.tileSize);

            this.nextWorldX = this.mapOffsetX + this.tileXPlusInputDir * this.tileSize + this.tileSize / 2;
            this.nextWorldY = this.mapOffsetY + this.tileYPlusInputDir * this.tileSize + this.tileSize / 2;

            const center3 = this.map[this.tileYPlusInputDir][this.tileXPlusInputDir] !== 1 ? true:false;

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

            const center = this.map[this.tileYPlusInputDir][this.tileXPlusInputDir] !== 1 ? true:false;

            this.tileYPlusInputDir = Math.floor((this.pacman.y - this.mapOffsetY + (1 * this.pacmanRadius * 0.9375))/ this.tileSize);
            this.tileXPlusInputDir = Math.floor((this.pacman.x - this.mapOffsetX + (1 * this.tileSize))/ this.tileSize);

            this.nextWorldX = this.mapOffsetX + this.tileXPlusInputDir * this.tileSize + this.tileSize / 2;
            this.nextWorldY = this.mapOffsetY + this.tileYPlusInputDir * this.tileSize + this.tileSize / 2;

            const center2 = this.map[this.tileYPlusInputDir][this.tileXPlusInputDir] !== 1 ? true:false;

            this.tileYPlusInputDir = Math.floor((this.pacman.y - this.mapOffsetY + (-1 * this.pacmanRadius * 0.9375))/ this.tileSize);
            this.tileXPlusInputDir = Math.floor((this.pacman.x - this.mapOffsetX + (1 * this.tileSize))/ this.tileSize);

            this.nextWorldX = this.mapOffsetX + this.tileXPlusInputDir * this.tileSize + this.tileSize / 2;
            this.nextWorldY = this.mapOffsetY + this.tileYPlusInputDir * this.tileSize + this.tileSize / 2;

            const center3 = this.map[this.tileYPlusInputDir][this.tileXPlusInputDir] !== 1 ? true:false;
            
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

            const center = this.map[this.tileYPlusInputDir][this.tileXPlusInputDir] !== 1 ? true:false;

            this.tileYPlusInputDir = Math.floor((this.pacman.y - this.mapOffsetY + (-1 * this.tileSize))/ this.tileSize);
            this.tileXPlusInputDir = Math.floor((this.pacman.x - this.mapOffsetX + (-1 * this.pacmanRadius * 0.984375))/ this.tileSize);

            this.nextWorldX = this.mapOffsetX + this.tileXPlusInputDir * this.tileSize + this.tileSize / 2;
            this.nextWorldY = this.mapOffsetY + this.tileYPlusInputDir * this.tileSize + this.tileSize / 2;

            const center2 = this.map[this.tileYPlusInputDir][this.tileXPlusInputDir] !== 1 ? true:false;

            this.tileYPlusInputDir = Math.floor((this.pacman.y - this.mapOffsetY + (-1 * this.tileSize))/ this.tileSize);
            this.tileXPlusInputDir = Math.floor((this.pacman.x - this.mapOffsetX + (1 * this.pacmanRadius * 0.984375))/ this.tileSize);

            this.nextWorldX = this.mapOffsetX + this.tileXPlusInputDir * this.tileSize + this.tileSize / 2;
            this.nextWorldY = this.mapOffsetY + this.tileYPlusInputDir * this.tileSize + this.tileSize / 2;

            const center3 = this.map[this.tileYPlusInputDir][this.tileXPlusInputDir] !== 1 ? true:false;

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

            const center = this.map[this.tileYPlusInputDir][this.tileXPlusInputDir] !== 1 ? true:false;

            this.tileYPlusInputDir = Math.floor((this.pacman.y - this.mapOffsetY + (1 * this.tileSize))/ this.tileSize);
            this.tileXPlusInputDir = Math.floor((this.pacman.x - this.mapOffsetX + (1 * this.pacmanRadius * 0.984375))/ this.tileSize);

            this.nextWorldX = this.mapOffsetX + this.tileXPlusInputDir * this.tileSize + this.tileSize / 2;
            this.nextWorldY = this.mapOffsetY + this.tileYPlusInputDir * this.tileSize + this.tileSize / 2;

            const center2 = this.map[this.tileYPlusInputDir][this.tileXPlusInputDir] !== 1 ? true:false;

            this.tileYPlusInputDir = Math.floor((this.pacman.y - this.mapOffsetY + (1 * this.tileSize))/ this.tileSize);
            this.tileXPlusInputDir = Math.floor((this.pacman.x - this.mapOffsetX + (-1 * this.pacmanRadius * 0.984375))/ this.tileSize);

            this.nextWorldX = this.mapOffsetX + this.tileXPlusInputDir * this.tileSize + this.tileSize / 2;
            this.nextWorldY = this.mapOffsetY + this.tileYPlusInputDir * this.tileSize + this.tileSize / 2;

            const center3 = this.map[this.tileYPlusInputDir][this.tileXPlusInputDir] !== 1 ? true:false;

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
            
            // Update glow position to follow Pacman
            this.pacmanGlow.setX(this.pacman.x);
            this.pacmanGlow.setY(this.pacman.y);
            
            // Update Pacman's facing direction
            this.updatePacmanDirection();
            
            // Handle teleportation on row 8 (the tunnel row)
            this.handleTeleportation();
        }
    }

    private handleTeleportation() {
        // Get current tile position
        const currentTileY = Math.floor((this.pacman.y - this.mapOffsetY) / this.tileSize);
        
        // Check if Pacman is on the teleportation row (row 8)
        if (currentTileY === 8) {
            // Calculate trigger boundaries - trigger earlier when Pacman's center approaches the edge
            const leftTriggerBoundary = this.mapOffsetX + (this.pacmanRadius * 0.5);
            const rightTriggerBoundary = this.mapOffsetX + (this.mapWidth * this.tileSize) - (this.pacmanRadius * 0.5);
            
            // Calculate safe spawn positions - spawn well inside the playable area
            const leftSpawnX = this.mapOffsetX + (this.mapWidth * this.tileSize) - (this.tileSize * 0.5);
            const rightSpawnX = this.mapOffsetX + (this.tileSize * 0.5);
            
            // Check if Pacman is approaching the right edge
            if (this.pacman.x >= rightTriggerBoundary && this.newInputDirection.x > 0) {
                // Teleport to the left side, well inside the map
                this.pacman.setX(rightSpawnX);
                this.pacmanGlow.setX(this.pacman.x);
                console.log('Teleported to left side');
            }
            // Check if Pacman is approaching the left edge
            else if (this.pacman.x <= leftTriggerBoundary && this.newInputDirection.x < 0) {
                // Teleport to the right side, well inside the map
                this.pacman.setX(leftSpawnX);
                this.pacmanGlow.setX(this.pacman.x);
                console.log('Teleported to right side');
            }
        }
    }

    // Clean up audio when scene ends
    shutdown() {
        console.log('PacTest2 scene shutting down');
        if (this.startMusic) {
            this.startMusic.stop();
        }
        if (this.gameMusic) {
            this.gameMusic.stop();
        }
    }
}