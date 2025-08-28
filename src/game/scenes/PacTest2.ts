import { Scene, GameObjects } from 'phaser';
import { EventBus } from '../EventBus';

// Ghost types matching classic Pac-Man
enum GhostType {
    BLINKY = 'blinky',  // Red - Direct chase
    PINKY = 'pinky',    // Pink - Ambush (4 tiles ahead)
    INKY = 'inky',      // Blue - Complex (uses Blinky + Pacman)
    CLYDE = 'clyde'     // Orange - Shy (runs away when close)
}

// Ghost modes
enum GhostMode {
    CHASE = 'chase',
    SCATTER = 'scatter',
    FRIGHTENED = 'frightened'
}

// Ghost class with classic AI
class Ghost {
    public sprite: Phaser.GameObjects.Graphics;
    public type: GhostType;
    public mode: GhostMode = GhostMode.SCATTER;
    public tile: { x: number, y: number } = { x: 0, y: 0 };
    public tilePixel: { x: number, y: number } = { x: 0, y: 0 };
    public distToMid: { x: number, y: number } = { x: 0, y: 0 };
    public currentDirection: { x: number, y: number } = { x: 0, y: 0 };
    public targetTile: { x: number, y: number } = { x: 0, y: 0 };
    public speed: number = 1;
    public canReverseDirection: boolean = false;
    public spawnPosition: { x: number, y: number } = { x: 0, y: 0 };
    public tileSize: number = 32;
    
    // Ghost house management
    public inGhostHouse: boolean = true;
    public releaseTimer: number = 0;
    public dotsToRelease: number = 0;
    public isReleased: boolean = false;
    
    // Frightened mode properties
    public frightenedTimer: number = 0;
    public frightenedDuration: number = 6000; // 6 seconds in milliseconds
    public originalColor: number = 0;
    public needsVisualUpdate: boolean = false; // Flag to force visual update
    
    // Scatter mode target corners
    private scatterTargets = {
        [GhostType.BLINKY]: { x: 18, y: 0 },   // Top-right
        [GhostType.PINKY]: { x: 0, y: 0 },     // Top-left  
        [GhostType.INKY]: { x: 18, y: 16 },    // Bottom-right
        [GhostType.CLYDE]: { x: 0, y: 16 }     // Bottom-left
    };

    constructor(scene: Phaser.Scene, x: number, y: number, type: GhostType, tileSize: number) {
        this.type = type;
        
        // Create ghost sprite with type-specific color
        const colors = {
            [GhostType.BLINKY]: 0xff0000,  // Red
            [GhostType.PINKY]: 0xff69b4,   // Pink
            [GhostType.INKY]: 0x00ffff,    // Cyan
            [GhostType.CLYDE]: 0xffa500    // Orange
        };
        
        // Store spawn position and original color
        this.spawnPosition = { x, y };
        this.originalColor = colors[type];

        this.tileSize = tileSize;
        
        // Set proper speeds according to memory: speed = tileSize / whole_number
        // Scatter mode = tileSize/12 (base), Chase mode = tileSize/10 (same as Pac-Man), Frightened mode = tileSize/16 (slower)
        this.speed = tileSize / 16; // Default to scatter speed
        
        // Set up authentic ghost house release timing
        switch (type) {
            case GhostType.BLINKY:
                this.inGhostHouse = false; // Blinky starts outside
                this.isReleased = true;
                this.dotsToRelease = 0;
                break;
            case GhostType.PINKY:
                this.dotsToRelease = 0; // Pinky leaves first (immediately)
                break;
            case GhostType.INKY:
                this.dotsToRelease = 30; // Inky leaves after 30 dots
                break;
            case GhostType.CLYDE:
                this.dotsToRelease = 60; // Clyde leaves after 60 dots
                break;
        }
        
        // Create a graphics object for custom ghost shape
        this.sprite = scene.add.graphics({ x, y });
        this.drawGhost(colors[type]);
        this.sprite.setDepth(100); // Make sure ghosts appear above other elements
        
        console.log(`Created ${type} ghost at (${x}, ${y}) with color ${colors[type].toString(16)}`);
    }

    public drawGhost(color?: number) {
        const graphics = this.sprite;
        graphics.clear();
        
        // Calculate size based on a standard tile size (we'll make it 90% of tile size)
        const size = this.tileSize * 0.75; // This will be about 90% of a 20-21px tile
        
        // Use provided color or determine based on mode and timer
        let ghostColor = color || this.originalColor;
        
        // Only show blue if actually frightened AND timer is still active
        // Add extra safety check to prevent visual desync
        const isActuallyFrightened = (this.mode === GhostMode.FRIGHTENED && this.frightenedTimer > 0);
        if (isActuallyFrightened) {
            ghostColor = 0x0000ff; // Blue when frightened
        } else if (this.mode === GhostMode.FRIGHTENED && this.frightenedTimer <= 0) {
            // Safety: If mode is frightened but timer expired, force normal color
            ghostColor = this.originalColor;
            console.log(`🔧 ${this.type} visual fix: mode was FRIGHTENED but timer=${this.frightenedTimer}, using normal color`);
        }
        
        // Ghost body (rounded rectangle with wavy bottom)
        graphics.fillStyle(ghostColor, 0.9);
        graphics.lineStyle(1, 0xffffff, 1);
        
        // Main body - rounded top
        graphics.fillRoundedRect(-size/2, -size/2, size, size * 0.8, size/4);
        graphics.strokeRoundedRect(-size/2, -size/2, size, size * 0.8, size/4);
        
        // Wavy bottom for classic ghost look
        const waveHeight = size * 0.2;
        const waveWidth = size / 4;
        
        graphics.beginPath();
        graphics.moveTo(-size/2, size/2 - waveHeight);
        
        // Create wavy bottom with 4 waves
        for (let i = 0; i < 4; i++) {
            const waveX = -size/2 + (i + 0.5) * waveWidth;
            const waveY = i % 2 === 0 ? size/2 : size/2 - waveHeight;
            graphics.lineTo(waveX, waveY);
        }
        
        graphics.lineTo(size/2, size/2 - waveHeight);
        graphics.lineTo(size/2, -size/2 + size/4);
        graphics.closePath();
        graphics.fillPath();
        graphics.strokePath();
        
        // Eyes (white circles with black pupils)
        const eyeSize = size * 0.15;
        const eyeOffset = size * 0.2;
        
        // Left eye
        graphics.fillStyle(0xffffff, 1);
        graphics.fillCircle(-eyeOffset, -size * 0.2, eyeSize);
        graphics.fillStyle(0x000000, 1);
        graphics.fillCircle(-eyeOffset, -size * 0.15, eyeSize * 0.6);
        
        // Right eye
        graphics.fillStyle(0xffffff, 1);
        graphics.fillCircle(eyeOffset, -size * 0.2, eyeSize);
        graphics.fillStyle(0x000000, 1);
        graphics.fillCircle(eyeOffset, -size * 0.15, eyeSize * 0.6);
        
        // Add data distortion effect (optional glitch lines)
        if (Math.random() > 0.7) { // 30% chance for glitch effect
            graphics.lineStyle(1, 0xffffff, 0.6);
            
            // Random glitch lines
            for (let i = 0; i < 3; i++) {
                const lineY = -size/2 + (i + 1) * (size / 4);
                const lineLength = size * (0.3 + Math.random() * 0.4);
                graphics.lineBetween(-lineLength/2, lineY, lineLength/2, lineY);
            }
        }
    }

    updateCoordinates(tileSize: number, midTile: { x: number, y: number }, mapOffsetX: number, mapOffsetY: number) {
        // Calculate which tile ghost is currently in (accounting for map offset)
        this.tile.x = Math.floor((this.sprite.x - mapOffsetX) / tileSize);
        this.tile.y = Math.floor((this.sprite.y - mapOffsetY) / tileSize);
        
        // Calculate position within the current tile
        this.tilePixel.x = (this.sprite.x - mapOffsetX) % tileSize;
        this.tilePixel.y = (this.sprite.y - mapOffsetY) % tileSize;
        
        // Handle negative coordinates
        if (this.tilePixel.x < 0) this.tilePixel.x += tileSize;
        if (this.tilePixel.y < 0) this.tilePixel.y += tileSize;
        
        // Calculate distance to tile center
        this.distToMid.x = midTile.x - this.tilePixel.x;
        this.distToMid.y = midTile.y - this.tilePixel.y;
    }

    calculateTargetTile(pacmanTile: { x: number, y: number }, pacmanDirection: { x: number, y: number }, blinkyTile: { x: number, y: number }): { x: number, y: number } {
        if (this.mode === GhostMode.SCATTER) {
            return this.scatterTargets[this.type];
        }

        switch (this.type) {
            case GhostType.BLINKY:
                // Direct chase - target Pac-Man's current tile
                return { x: pacmanTile.x, y: pacmanTile.y };

            case GhostType.PINKY:
                // Ambush - target 4 tiles ahead of Pac-Man
                let targetX = pacmanTile.x + (pacmanDirection.x * 4);
                let targetY = pacmanTile.y + (pacmanDirection.y * 4);
                
                // Classic bug: when Pac-Man faces up, also offset left by 4
                if (pacmanDirection.y === -1) {
                    targetX -= 4;
                }
                
                return { x: targetX, y: targetY };

            case GhostType.INKY:
                // Complex - uses both Pac-Man and Blinky positions
                const twoAheadX = pacmanTile.x + (pacmanDirection.x * 2);
                const twoAheadY = pacmanTile.y + (pacmanDirection.y * 2);
                
                // Classic bug: when Pac-Man faces up, also offset left by 2
                let inkyTargetX = twoAheadX;
                let inkyTargetY = twoAheadY;
                if (pacmanDirection.y === -1) {
                    inkyTargetX -= 2;
                }
                
                // Double the distance from Blinky to the point 2 tiles ahead of Pac-Man
                const vectorX = inkyTargetX - blinkyTile.x;
                const vectorY = inkyTargetY - blinkyTile.y;
                
                return {
                    x: blinkyTile.x + (vectorX * 2),
                    y: blinkyTile.y + (vectorY * 2)
                };

            case GhostType.CLYDE:
                // Shy - chase if far away, scatter if close
                const distanceToPlayer = Math.sqrt(
                    Math.pow(pacmanTile.x - this.tile.x, 2) + 
                    Math.pow(pacmanTile.y - this.tile.y, 2)
                );
                
                if (distanceToPlayer > 8) {
                    // Far away - chase like Blinky
                    return { x: pacmanTile.x, y: pacmanTile.y };
                } else {
                    // Close - run to corner
                    return this.scatterTargets[this.type];
                }

            default:
                return { x: 0, y: 0 };
        }
    }

    getNextDirection(map: number[][], targetTile: { x: number, y: number }): { x: number, y: number } {
        // Only change direction when perfectly centered
        if (this.distToMid.x !== 0 || this.distToMid.y !== 0) {
            return this.currentDirection;
        }

        const possibleDirections = [
            { x: 0, y: -1 }, // Up
            { x: -1, y: 0 }, // Left  
            { x: 0, y: 1 },  // Down
            { x: 1, y: 0 }   // Right
        ];

        let bestDirection = this.currentDirection;
        let bestDistance = Infinity;
        let foundValidDirection = false;

        for (const direction of possibleDirections) {
            // Skip reverse direction unless explicitly allowed
            if (!this.canReverseDirection && 
                direction.x === -this.currentDirection.x && 
                direction.y === -this.currentDirection.y) {
                continue;
            }

            const nextTileX = this.tile.x + direction.x;
            const nextTileY = this.tile.y + direction.y;

            // Check if tile is walkable for ghosts (including tile 6)
            if (this.isWalkableForGhost(map, nextTileX, nextTileY)) {
                foundValidDirection = true;
                
                // Calculate distance to target
                const distance = Math.sqrt(
                    Math.pow(targetTile.x - nextTileX, 2) + 
                    Math.pow(targetTile.y - nextTileY, 2)
                );

                if (distance < bestDistance) {
                    bestDistance = distance;
                    bestDirection = direction;
                }
            }
        }

        // If no valid direction found and current direction is blocked, stop
        if (!foundValidDirection && !this.isWalkableForGhost(map, this.tile.x + this.currentDirection.x, this.tile.y + this.currentDirection.y)) {
            return { x: 0, y: 0 }; // Stop moving
        }

        return bestDirection;
    }

    private isWalkableForGhost(map: number[][], tileX: number, tileY: number): boolean {
        // Check bounds
        if (tileY < 0 || tileY >= map.length || tileX < 0 || tileX >= map[0].length) {
            return false;
        }
        
        const tile = map[tileY][tileX];
        // Ghosts can walk on: 0=empty, 2=dot, 3=collected, 4=pacman spawn, 5=ghost spawn, 6=ghost barrier, 8=power pellet
        return tile === 0 || tile === 2 || tile === 3 || tile === 4 || tile === 5 || tile === 6 || tile === 8;
    }

    update(map: number[][], pacmanTile: { x: number, y: number }, pacmanDirection: { x: number, y: number }, blinkyTile: { x: number, y: number }, tileSize: number, midTile: { x: number, y: number }, mapOffsetX: number, mapOffsetY: number, deltaTime: number, dotsEaten: number) {
        // Update coordinates
        this.updateCoordinates(tileSize, midTile, mapOffsetX, mapOffsetY);

        // Handle ghost house release timing
        if (this.inGhostHouse && !this.isReleased) {
            this.releaseTimer += deltaTime;
            
            // Check if ghost should be released
            const shouldRelease = dotsEaten >= this.dotsToRelease || this.releaseTimer >= 4000; // 4 second backup timer
            
            if (shouldRelease) {
                this.isReleased = true;
                this.inGhostHouse = false;
                console.log(`${this.type} released from ghost house after ${dotsEaten} dots eaten`);
            }
        }

        // Handle frightened mode timer
        if (this.mode === GhostMode.FRIGHTENED) {
            this.frightenedTimer -= deltaTime;
            if (this.frightenedTimer <= 0) {
                // Ensure timer is exactly 0 to prevent negative values
                this.frightenedTimer = 0;
                this.mode = GhostMode.CHASE; // Return to chase mode
                this.canReverseDirection = true;
                
                // Force immediate visual update to prevent blue lingering
                this.drawGhost(); // First redraw
                // Force a second redraw on next frame to ensure visual sync
                setTimeout(() => {
                    if (this.sprite && !this.sprite.scene) return; // Check if still valid
                    this.drawGhost();
                }, 16); // Next frame (~60fps)
                
                console.log(`⏰ ${this.type} is no longer frightened (timer expired) - back to normal!`);
            }
        }

        // Only move if released from ghost house
        if (this.isReleased) {
            // Calculate target tile based on current mode and ghost type
            this.targetTile = this.calculateTargetTile(pacmanTile, pacmanDirection, blinkyTile);

            // Get next direction (with special handling for frightened mode)
            const newDirection = this.mode === GhostMode.FRIGHTENED ? 
                this.getFrightenedDirection(map) : 
                this.getNextDirection(map, this.targetTile);
            
            // Update current direction if it changed
            if (newDirection.x !== this.currentDirection.x || newDirection.y !== this.currentDirection.y) {
                this.currentDirection = newDirection;
                this.canReverseDirection = false; // Reset reverse flag after direction change
            }

            // Check if ghost should stop moving (hit a wall)
            if (!this.shouldStopMoving(map, this.currentDirection, tileSize, midTile, mapOffsetX, mapOffsetY)) {
                // Calculate next position
                const nextX = this.sprite.x + this.currentDirection.x * this.speed;
                const nextY = this.sprite.y + this.currentDirection.y * this.speed;
                
                // Additional safety check: ensure we're not moving into a wall
                if (this.canMoveToPosition(map, nextX, nextY, tileSize, mapOffsetX, mapOffsetY)) {
                    this.sprite.x = nextX;
                    this.sprite.y = nextY;
                }
            }
        }

        // Occasionally refresh ghost appearance for data distortion effect
        // But skip if we just changed modes to prevent visual desync
        if (Math.random() > 0.98) { // 2% chance per frame
            this.drawGhost();
            // Double-check: if mode and timer are out of sync, log it
            if (this.mode === GhostMode.FRIGHTENED && this.frightenedTimer <= 0) {
                console.log(`⚠️ ${this.type} visual desync detected during random redraw - fixing...`);
                this.mode = GhostMode.CHASE; // Force mode sync
                this.drawGhost(); // Redraw with correct color
            }
        }

        // Handle tunnel wrapping (accounting for map offset)
        const mapPixelWidth = map[0].length * tileSize;
        const mapPixelHeight = map.length * tileSize;
        
        if (this.sprite.x < mapOffsetX) {
            this.sprite.x = mapOffsetX + mapPixelWidth;
        } else if (this.sprite.x > mapOffsetX + mapPixelWidth) {
            this.sprite.x = mapOffsetX;
        }

        if (this.sprite.y < mapOffsetY) {
            this.sprite.y = mapOffsetY + mapPixelHeight;
        } else if (this.sprite.y > mapOffsetY + mapPixelHeight) {
            this.sprite.y = mapOffsetY;
        }
    }

    // Check if ghost should stop moving (hit a wall)
    private shouldStopMoving(map: number[][], direction: { x: number, y: number }, tileSize: number, midTile: { x: number, y: number }, mapOffsetX: number, mapOffsetY: number): boolean {
        // Only check for walls when we're at the center of a tile
        // This prevents stopping in the middle of tiles
        const axis = direction.x !== 0 ? 'x' : 'y'; // axis of movement
        
        if (this.distToMid[axis] === 0) {
            // We're at the center, check if next tile is walkable
            const nextTileX = this.tile.x + direction.x;
            const nextTileY = this.tile.y + direction.y;
            return !this.isWalkableForGhost(map, nextTileX, nextTileY);
        }
        
        return false; // Don't stop if we're not at center
    }

    // Check if ghost can move to a specific pixel position
    private canMoveToPosition(map: number[][], x: number, y: number, tileSize: number, mapOffsetX: number, mapOffsetY: number): boolean {
        // Calculate which tile this position would be in
        const tileX = Math.floor((x - mapOffsetX) / tileSize);
        const tileY = Math.floor((y - mapOffsetY) / tileSize);
        
        return this.isWalkableForGhost(map, tileX, tileY);
    }

    // Get random direction for frightened mode
    private getFrightenedDirection(map: number[][]): { x: number, y: number } {
        // Only change direction when perfectly centered
        if (this.distToMid.x !== 0 || this.distToMid.y !== 0) {
            return this.currentDirection;
        }

        const possibleDirections = [
            { x: 0, y: -1 }, // Up
            { x: -1, y: 0 }, // Left  
            { x: 0, y: 1 },  // Down
            { x: 1, y: 0 }   // Right
        ];

        // Filter out reverse direction and walls
        const validDirections = possibleDirections.filter(direction => {
            // Skip reverse direction
            if (direction.x === -this.currentDirection.x && direction.y === -this.currentDirection.y) {
                return false;
            }

            const nextTileX = this.tile.x + direction.x;
            const nextTileY = this.tile.y + direction.y;
            return this.isWalkableForGhost(map, nextTileX, nextTileY);
        });

        if (validDirections.length === 0) {
            return this.currentDirection; // Keep current direction if no valid options
        }

        // Choose random direction from valid options
        const randomIndex = Math.floor(Math.random() * validDirections.length);
        return validDirections[randomIndex];
    }

    setMode(mode: GhostMode) {
        if (this.mode !== mode) {
            this.mode = mode;
            this.canReverseDirection = true; // Allow direction reversal when mode changes
        }
    }

    // Reset ghost to spawn position
    resetToSpawn() {
        this.sprite.x = this.spawnPosition.x;
        this.sprite.y = this.spawnPosition.y;
        this.currentDirection = { x: 0, y: 0 };
        this.canReverseDirection = false;
        this.mode = GhostMode.SCATTER;
        this.frightenedTimer = 0; // Reset frightened timer
    }
}

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

    private ghosts: Ghost[] = [];

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

    // Ghost mode timing
    private modeTimer: number = 0;
    private currentModeIndex: number = 0;
    private modeDurations: number[] = [7000, 20000, 7000, 20000, 5000, 20000, 5000]; // milliseconds
    private currentGhostMode: GhostMode = GhostMode.SCATTER;
    
    // Lives and game state
    private lives: number = 3;
    private dotsEaten: number = 0;
    private powerPellets: Phaser.GameObjects.Arc[] = [];
    private ghostEatenCount: number = 0; // For scoring consecutive ghost eating
    private gameOverActive: boolean = false; // Track game over state
    private deathSequenceActive: boolean = false; // Track death animation state
    private gamePaused: boolean = false; // Track pause state
    private victorySequenceActive: boolean = false; // Track victory sequence state
    
    // Managed audio instances (for looping/continuous sounds)
    private ghostMovementSound: Phaser.Sound.BaseSound | null = null;
    private powerPelletSound: Phaser.Sound.BaseSound | null = null;

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
        
        // Clear existing dots, walls, and ghosts arrays
        this.dots = [];
        this.walls = [];
        
        // Clean up existing ghosts
        for (const ghost of this.ghosts) {
            if (ghost.sprite) {
                ghost.sprite.destroy();
            }
        }
        this.ghosts = [];
        
        // Reset movement state
        this.preInputDirection = { x: 0, y: 0 };
        this.preInputSelected = false;
        this.newInputDirection = { x: 0, y: 0 };
        this.blockedByWall = false;
        this.gameStarted = false; // Reset game started flag
        
        // Reset ghost mode timing
        this.modeTimer = 0;
        this.currentModeIndex = 0;
        this.currentGhostMode = GhostMode.SCATTER;
        
        // Reset lives and game state
        this.lives = 3;
        this.dotsEaten = 0;
        this.ghostEatenCount = 0;
        this.gameOverActive = false;
        this.deathSequenceActive = false;
        this.gamePaused = false;
        this.victorySequenceActive = false;
        
        // Clean up managed audio instances
        this.cleanupManagedAudio();
        
        // Clean up power pellets
        for (const pellet of this.powerPellets) {
            if (pellet) {
                pellet.destroy();
            }
        }
        this.powerPellets = [];
        
        // Reset map state - convert collected tiles, dots, and power pellets back to empty tiles for random placement
        for (let y = 0; y < this.map.length; y++) {
            for (let x = 0; x < this.map[y].length; x++) {
                if (this.map[y][x] === 2 || this.map[y][x] === 3 || this.map[y][x] === 8) { // 2 = dot, 3 = collected tile, 8 = power pellet tile
                    this.map[y][x] = 0; // Reset to empty tile (will be randomly assigned dots/power pellets)
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
            
            // No background music during gameplay for authentic Pac-Man experience
        });

        // Create the maze
        for (let y = 0; y < this.map.length; y++) {
            for (let x = 0; x < this.map[y].length; x++) {
                const tile = this.map[y][x];
                if (tile === 1) {
                    this.createWall(x, y);
                } else if (tile === 6) {
                    this.createGhostBarrier(x, y);
                }
            }
        }

        // First pass: Create pacman, ghosts, and find all available empty tiles
        const availableEmptyTiles: { x: number, y: number }[] = [];
        const ghostTypes = [GhostType.BLINKY, GhostType.PINKY, GhostType.INKY, GhostType.CLYDE];
        let ghostIndex = 0;
        
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
                else if (tile === 5 && ghostIndex < ghostTypes.length) {
                    // Spawn ghosts at tiles with value 5
                    console.log(`Spawning ${ghostTypes[ghostIndex]} at position (${spawnX}, ${spawnY}) - tile (${x}, ${y})`);
                    const ghost = new Ghost(this, spawnX, spawnY, ghostTypes[ghostIndex], this.tileSize);
                    this.ghosts.push(ghost);
                    ghostIndex++;
                    console.log(`Total ghosts spawned: ${this.ghosts.length}`);
                }
            }
        }

        console.log(`Final ghost count: ${this.ghosts.length}`);

        // Second pass: Randomly select 100 tiles from available empty tiles and place dots
        this.placeRandomDots(availableEmptyTiles, 100);

        // Place 2 random power pellets on remaining empty tiles
        this.placeRandomPowerPellets();



        // Add glow effects
        this.createGlowEffects();

        // Initialize progression system
        this.initializeProgression();

        // Initialize ghost mode timing
        this.modeTimer = 0;

        // Set up pause/resume event listeners
        this.events.on('pause', this.onScenePause, this);
        this.events.on('resume', this.onSceneResume, this);

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

    private createGhostBarrier(x: number, y: number) {
        const barrier = this.add.rectangle(
            this.mapOffsetX + x * this.tileSize, 
            this.mapOffsetY + y * this.tileSize, 
            this.tileSize, 
            this.tileSize, 
            0xff0000
        ).setOrigin(0, 0);
        
        // Make it semi-transparent so it looks different from regular walls
        barrier.setAlpha(0.5);
        barrier.setStrokeStyle(2, 0x0099ff);
        barrier.setDepth(10);
        this.walls.push(barrier);
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
        
        // Place dots on selected tiles and mark them in the map
        selectedTiles.forEach(tile => {
            const spawnX = this.mapOffsetX + tile.x * this.tileSize + this.tileSize / 2;
            const spawnY = this.mapOffsetY + tile.y * this.tileSize + this.tileSize / 2;
            this.createDataDot(spawnX, spawnY);
            this.totalDots++;
            // Mark tile as having a dot (use value 2 to distinguish from empty)
            this.map[tile.y][tile.x] = 2;
        });
        
        console.log(`Placed ${this.totalDots} dots randomly out of ${availableEmptyTiles.length} available tiles`);
    }

    private placeRandomPowerPellets() {
        // Find all empty tiles (value 0) that don't have dots
        const availableEmptyTiles: { x: number, y: number }[] = [];
        
        for (let y = 0; y < this.map.length; y++) {
            for (let x = 0; x < this.map[y].length; x++) {
                if (this.map[y][x] === 0) {
                    availableEmptyTiles.push({ x, y });
                }
            }
        }
        
        // Randomly select 2 tiles for power pellets
        const shuffledTiles = [...availableEmptyTiles];
        for (let i = shuffledTiles.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffledTiles[i], shuffledTiles[j]] = [shuffledTiles[j], shuffledTiles[i]];
        }
        
        // Place 2 power pellets
        const powerPelletCount = Math.min(2, shuffledTiles.length);
        for (let i = 0; i < powerPelletCount; i++) {
            const tile = shuffledTiles[i];
            const spawnX = this.mapOffsetX + tile.x * this.tileSize + this.tileSize / 2;
            const spawnY = this.mapOffsetY + tile.y * this.tileSize + this.tileSize / 2;
            
            // Create power pellet
            const powerPellet = this.add.arc(spawnX, spawnY, 8, 0, 360, false, 0xffff00);
            powerPellet.setDepth(25);
            powerPellet.setStrokeStyle(2, 0xffffff);
            
            // Add blinking effect
            this.tweens.add({
                targets: powerPellet,
                alpha: 0.3,
                duration: 500,
                yoyo: true,
                repeat: -1
            });
            
            this.powerPellets.push(powerPellet);
            
            // Mark tile as having power pellet (use value 8)
            this.map[tile.y][tile.x] = 8;
            
            console.log(`Created random power pellet at (${tile.x}, ${tile.y})`);
        }
        
        console.log(`Placed ${powerPelletCount} power pellets randomly`);
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



    update(time: number, deltaTime: number){
        if (!this.cursors || !this.gameStarted || this.gameOverActive || this.deathSequenceActive || this.gamePaused || this.victorySequenceActive) return;

        this.playerMovement();
        this.checkDotCollision();
        this.checkPowerPelletCollision();
        
        // Update ghost mode timing
        this.updateGhostModes(deltaTime);
        
        // Update all ghosts
        this.updateGhosts(deltaTime);
        
        // Manage ghost movement audio
        this.manageGhostMovementAudio();
        
        // Manage power pellet audio
        this.managePowerPelletAudio();
        
        // Check for ghost collisions
        this.checkGhostCollisions();
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
                this.dotsEaten++;
                    break; // Only collect one dot per frame
                }
            }
        }
    }

    private collectDot(dot: Phaser.GameObjects.Arc, index: number, tileX: number, tileY: number) {
        // Play dot collection sound
        this.playOneTimeSound('credit', 0.2);
        
        // Create collection effect before removing the dot
        this.createCollectionEffect(dot.x, dot.y);
        
        // Remove the dot visually
        dot.destroy();
        
        // Remove from dots array
        this.dots.splice(index, 1);
        
        // Update the map to mark this tile as empty (no longer has a dot)
        if (this.map[tileY] && this.map[tileY][tileX] === 2) {
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
        if (this.dots.length === 0 && !this.victorySequenceActive) {
            // All dots collected - immediately set victory flag and stop audio
            this.victorySequenceActive = true;
            this.cleanupManagedAudio(); // Immediate audio cleanup
            // Start victory sequence!
            this.startVictorySequence();
        }
    }

    // Start the victory sequence with sound and pause
    private startVictorySequence() {
        // Clean up any managed audio
        this.cleanupManagedAudio();
        
        // Play victory sound
        try {
            const victorySound = this.sound.add('extend', { volume: 0.5 });
            victorySound.play();
            
            // Wait for victory sound to finish, then show win overlay
            victorySound.once('complete', () => {
                victorySound.destroy();
                EventBus.emit('game-won');
                console.log('Victory sequence complete - showing win overlay');
            });
            
            console.log('Victory sequence started - playing extend.mp3');
        } catch (error) {
            console.log('Victory sound not available, showing win overlay immediately');
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

            const center = this.map[this.tileYPlusInputDir][this.tileXPlusInputDir] !== 1 && this.map[this.tileYPlusInputDir][this.tileXPlusInputDir] !== 6 ? true:false;

            this.tileYPlusInputDir = Math.floor((this.pacman.y - this.mapOffsetY + (-1 * this.pacmanRadius * 0.9375))/ this.tileSize);
            this.tileXPlusInputDir = Math.floor((this.pacman.x - this.mapOffsetX + (-1 * this.tileSize))/ this.tileSize);

            this.nextWorldX = this.mapOffsetX + this.tileXPlusInputDir * this.tileSize + this.tileSize / 2;
            this.nextWorldY = this.mapOffsetY + this.tileYPlusInputDir * this.tileSize + this.tileSize / 2;

            const center2 = this.map[this.tileYPlusInputDir][this.tileXPlusInputDir] !== 1 && this.map[this.tileYPlusInputDir][this.tileXPlusInputDir] !== 6 ? true:false;

            this.tileYPlusInputDir = Math.floor((this.pacman.y - this.mapOffsetY + (1 * this.pacmanRadius * 0.9375))/ this.tileSize);
            this.tileXPlusInputDir = Math.floor((this.pacman.x - this.mapOffsetX + (-1 * this.tileSize))/ this.tileSize);

            this.nextWorldX = this.mapOffsetX + this.tileXPlusInputDir * this.tileSize + this.tileSize / 2;
            this.nextWorldY = this.mapOffsetY + this.tileYPlusInputDir * this.tileSize + this.tileSize / 2;

            const center3 = this.map[this.tileYPlusInputDir][this.tileXPlusInputDir] !== 1 && this.map[this.tileYPlusInputDir][this.tileXPlusInputDir] !== 6 ? true:false;

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

            const center = this.map[this.tileYPlusInputDir][this.tileXPlusInputDir] !== 1 && this.map[this.tileYPlusInputDir][this.tileXPlusInputDir] !== 6 ? true:false;

            this.tileYPlusInputDir = Math.floor((this.pacman.y - this.mapOffsetY + (1 * this.pacmanRadius * 0.9375))/ this.tileSize);
            this.tileXPlusInputDir = Math.floor((this.pacman.x - this.mapOffsetX + (1 * this.tileSize))/ this.tileSize);

            this.nextWorldX = this.mapOffsetX + this.tileXPlusInputDir * this.tileSize + this.tileSize / 2;
            this.nextWorldY = this.mapOffsetY + this.tileYPlusInputDir * this.tileSize + this.tileSize / 2;

            const center2 = this.map[this.tileYPlusInputDir][this.tileXPlusInputDir] !== 1 && this.map[this.tileYPlusInputDir][this.tileXPlusInputDir] !== 6 ? true:false;

            this.tileYPlusInputDir = Math.floor((this.pacman.y - this.mapOffsetY + (-1 * this.pacmanRadius * 0.9375))/ this.tileSize);
            this.tileXPlusInputDir = Math.floor((this.pacman.x - this.mapOffsetX + (1 * this.tileSize))/ this.tileSize);

            this.nextWorldX = this.mapOffsetX + this.tileXPlusInputDir * this.tileSize + this.tileSize / 2;
            this.nextWorldY = this.mapOffsetY + this.tileYPlusInputDir * this.tileSize + this.tileSize / 2;

            const center3 = this.map[this.tileYPlusInputDir][this.tileXPlusInputDir] !== 1 && this.map[this.tileYPlusInputDir][this.tileXPlusInputDir] !== 6 ? true:false;
            
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

            const center = this.map[this.tileYPlusInputDir][this.tileXPlusInputDir] !== 1 && this.map[this.tileYPlusInputDir][this.tileXPlusInputDir] !== 6 ? true:false;

            this.tileYPlusInputDir = Math.floor((this.pacman.y - this.mapOffsetY + (-1 * this.tileSize))/ this.tileSize);
            this.tileXPlusInputDir = Math.floor((this.pacman.x - this.mapOffsetX + (-1 * this.pacmanRadius * 0.984375))/ this.tileSize);

            this.nextWorldX = this.mapOffsetX + this.tileXPlusInputDir * this.tileSize + this.tileSize / 2;
            this.nextWorldY = this.mapOffsetY + this.tileYPlusInputDir * this.tileSize + this.tileSize / 2;

            const center2 = this.map[this.tileYPlusInputDir][this.tileXPlusInputDir] !== 1 && this.map[this.tileYPlusInputDir][this.tileXPlusInputDir] !== 6 ? true:false;

            this.tileYPlusInputDir = Math.floor((this.pacman.y - this.mapOffsetY + (-1 * this.tileSize))/ this.tileSize);
            this.tileXPlusInputDir = Math.floor((this.pacman.x - this.mapOffsetX + (1 * this.pacmanRadius * 0.984375))/ this.tileSize);

            this.nextWorldX = this.mapOffsetX + this.tileXPlusInputDir * this.tileSize + this.tileSize / 2;
            this.nextWorldY = this.mapOffsetY + this.tileYPlusInputDir * this.tileSize + this.tileSize / 2;

            const center3 = this.map[this.tileYPlusInputDir][this.tileXPlusInputDir] !== 1 && this.map[this.tileYPlusInputDir][this.tileXPlusInputDir] !== 6 ? true:false;

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

            const center = this.map[this.tileYPlusInputDir][this.tileXPlusInputDir] !== 1 && this.map[this.tileYPlusInputDir][this.tileXPlusInputDir] !== 6 ? true:false;

            this.tileYPlusInputDir = Math.floor((this.pacman.y - this.mapOffsetY + (1 * this.tileSize))/ this.tileSize);
            this.tileXPlusInputDir = Math.floor((this.pacman.x - this.mapOffsetX + (1 * this.pacmanRadius * 0.984375))/ this.tileSize);

            this.nextWorldX = this.mapOffsetX + this.tileXPlusInputDir * this.tileSize + this.tileSize / 2;
            this.nextWorldY = this.mapOffsetY + this.tileYPlusInputDir * this.tileSize + this.tileSize / 2;

            const center2 = this.map[this.tileYPlusInputDir][this.tileXPlusInputDir] !== 1 && this.map[this.tileYPlusInputDir][this.tileXPlusInputDir] !== 6 ? true:false;

            this.tileYPlusInputDir = Math.floor((this.pacman.y - this.mapOffsetY + (1 * this.tileSize))/ this.tileSize);
            this.tileXPlusInputDir = Math.floor((this.pacman.x - this.mapOffsetX + (-1 * this.pacmanRadius * 0.984375))/ this.tileSize);

            this.nextWorldX = this.mapOffsetX + this.tileXPlusInputDir * this.tileSize + this.tileSize / 2;
            this.nextWorldY = this.mapOffsetY + this.tileYPlusInputDir * this.tileSize + this.tileSize / 2;

            const center3 = this.map[this.tileYPlusInputDir][this.tileXPlusInputDir] !== 1 && this.map[this.tileYPlusInputDir][this.tileXPlusInputDir] !== 6 ? true:false;

            if(center === true && center2 === true && center3 === true){
                this.newInputDirection.x = this.preInputDirection.x;
                this.newInputDirection.y = this.preInputDirection.y;
                this.preInputSelected = false;
            }
        }

        this.tileYPlusInputDir = Math.floor((this.pacman.y - this.mapOffsetY + (this.newInputDirection.y * this.pacmanRadius * 1.000001))/ this.tileSize);
        this.tileXPlusInputDir = Math.floor((this.pacman.x - this.mapOffsetX + (this.newInputDirection.x * this.pacmanRadius * 1.000001))/ this.tileSize);

        if(this.map[this.tileYPlusInputDir][this.tileXPlusInputDir] === 1 || this.map[this.tileYPlusInputDir][this.tileXPlusInputDir] === 6){
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

    // Update ghost mode timing
    private updateGhostModes(deltaTime: number) {
        this.modeTimer += deltaTime;
        
        if (this.currentModeIndex < this.modeDurations.length && 
            this.modeTimer >= this.modeDurations[this.currentModeIndex]) {
            
            // Switch mode
            this.currentGhostMode = this.currentGhostMode === GhostMode.SCATTER ? 
                GhostMode.CHASE : GhostMode.SCATTER;
            
            // Apply new mode to all ghosts, but only if they're not currently frightened
            for (const ghost of this.ghosts) {
                // Don't override frightened mode - let individual ghost timers handle it
                if (ghost.mode !== GhostMode.FRIGHTENED) {
                    ghost.setMode(this.currentGhostMode);
                }
            }
            
            this.modeTimer = 0;
            this.currentModeIndex++;
            
            console.log(`Ghost mode changed to: ${this.currentGhostMode} (frightened ghosts unaffected)`);
        }
    }

    // Update all ghosts
    private updateGhosts(deltaTime: number) {
        if (this.ghosts.length === 0) return;

        // Get Pac-Man's current tile position
        const pacmanTileX = Math.floor((this.pacman.x - this.mapOffsetX) / this.tileSize);
        const pacmanTileY = Math.floor((this.pacman.y - this.mapOffsetY) / this.tileSize);
        const pacmanTile = { x: pacmanTileX, y: pacmanTileY };

        // Get Pac-Man's current direction (you'll need to track this)
        const pacmanDirection = this.preInputDirection; // Using existing direction tracking

        // Get Blinky's tile (first ghost)
        const blinkyTile = this.ghosts.length > 0 ? this.ghosts[0].tile : { x: 0, y: 0 };
        
        // Calculate midTile based on current tileSize
        const midTile = { x: this.tileSize / 2, y: this.tileSize / 2 };
        
        for (const ghost of this.ghosts) {
            ghost.update(
                this.map, 
                pacmanTile, 
                pacmanDirection, 
                blinkyTile, 
                this.tileSize, 
                midTile,
                this.mapOffsetX,
                this.mapOffsetY,
                deltaTime,
                this.dotsEaten
            );
        }
    }

    // Check collision between Pac-Man and ghosts
    private checkGhostCollisions() {
        for (const ghost of this.ghosts) {
            const distance = Math.sqrt(
                Math.pow(this.pacman.x - ghost.sprite.x, 2) + 
                Math.pow(this.pacman.y - ghost.sprite.y, 2)
            );
            
            // If collision detected (within collision radius)
            if (distance < this.pacmanRadius) {
                // Double-check frightened state with timer for safety
                const isActuallyFrightened = ghost.mode === GhostMode.FRIGHTENED && ghost.frightenedTimer > 0;
                
                if (isActuallyFrightened) {
                    // Play ghost eating sound
                    this.playOneTimeSound('eating-ghost', 0.4);
                    
                    // Pac-Man eats ghost - authentic scoring: 200, 400, 800, 1600
                    const points = 200 * Math.pow(2, this.ghostEatenCount);
                    this.score += points;
                    this.ghostEatenCount++;
                    
                    EventBus.emit('score-update', this.score);
                    console.log(`Pac-Man ate ${ghost.type} for ${points} points! (Timer: ${ghost.frightenedTimer})`);
                    
                    // Reset ghost to spawn
                    ghost.resetToSpawn();
                    ghost.mode = GhostMode.SCATTER; // Return to normal mode
                    ghost.frightenedTimer = 0; // Ensure timer is reset
                    ghost.drawGhost(); // Redraw with normal color
                } else {
                    // Ghost catches Pac-Man
                    console.log(`${ghost.type} caught Pac-Man! (Mode: ${ghost.mode}, Timer: ${ghost.frightenedTimer})`);
                    this.handlePlayerDeath();
                    return; // Exit early to prevent multiple death triggers
                }
            }
        }
    }

    // Reset all ghosts to their spawn positions
    private resetAllGhosts() {
        for (const ghost of this.ghosts) {
            ghost.resetToSpawn();
        }
        // Reset ghost mode timing
        this.modeTimer = 0;
        this.currentModeIndex = 0;
        this.currentGhostMode = GhostMode.SCATTER;
    }





    // Handle power pellet collision
    private checkPowerPelletCollision() {
        const pacmanTileX = Math.floor((this.pacman.x - this.mapOffsetX) / this.tileSize);
        const pacmanTileY = Math.floor((this.pacman.y - this.mapOffsetY) / this.tileSize);
        
        // Check if current tile has a power pellet (tile value 8)
        if (this.map[pacmanTileY] && this.map[pacmanTileY][pacmanTileX] === 8) {
            // Find and remove the power pellet
            for (let i = 0; i < this.powerPellets.length; i++) {
                const pellet = this.powerPellets[i];
                const pelletTileX = Math.floor((pellet.x - this.mapOffsetX) / this.tileSize);
                const pelletTileY = Math.floor((pellet.y - this.mapOffsetY) / this.tileSize);
                
                if (pelletTileX === pacmanTileX && pelletTileY === pacmanTileY) {
                    // Remove power pellet
                    pellet.destroy();
                    this.powerPellets.splice(i, 1);
                    
                    // Mark tile as collected
                    this.map[pacmanTileY][pacmanTileX] = 3;
                    
                    // Log current ghost states before activation
                    console.log('🔴 BEFORE power pellet activation:');
                    for (const ghost of this.ghosts) {
                        console.log(`  ${ghost.type}: mode=${ghost.mode}, timer=${ghost.frightenedTimer}ms`);
                    }
                    
                    // Make all ghosts frightened
                    this.activateFrightenedMode();
                    
                    // Log ghost states after activation
                    console.log('🔵 AFTER power pellet activation:');
                    for (const ghost of this.ghosts) {
                        console.log(`  ${ghost.type}: mode=${ghost.mode}, timer=${ghost.frightenedTimer}ms`);
                    }
                    
                    // Add score
                    this.score += 50;
                    EventBus.emit('score-update', this.score);
                    
                    console.log('✅ Power pellet eaten! All ghosts should now be frightened for 6000ms!');
                    break;
                }
            }
        }
    }

    // Activate frightened mode for all ghosts
    private activateFrightenedMode() {
        this.ghostEatenCount = 0; // Reset for scoring
        
        // Power pellet sound will be managed by managePowerPelletAudio()
        
        console.log('🔵 Power pellet activated! Resetting all ghost frightened timers...');
        
        for (const ghost of this.ghosts) {
            // Affect ALL ghosts, including those still in ghost house
            const wasAlreadyFrightened = ghost.mode === GhostMode.FRIGHTENED;
            const previousTimer = ghost.frightenedTimer;
            
            ghost.mode = GhostMode.FRIGHTENED;
            ghost.frightenedTimer = ghost.frightenedDuration; // Always reset to full duration
            ghost.canReverseDirection = true; // Allow immediate direction change
            ghost.drawGhost(); // Redraw as blue
            
            console.log(`${ghost.type} frightened timer: ${previousTimer}ms → ${ghost.frightenedTimer}ms (was frightened: ${wasAlreadyFrightened})`);
        }
    }

    // Handle player death
    private handlePlayerDeath() {
        this.lives--;
        
        // Update lives via EventBus (if UI system exists)
        EventBus.emit('lives-update', this.lives);
        
        console.log(`Player died! Lives remaining: ${this.lives}`);
        
        if (this.lives <= 0) {
            this.playDeathSequence(true); // Game over after death sequence
        } else {
            this.playDeathSequence(false); // Respawn after death sequence
        }
    }

    // Play authentic Pac-Man death sequence
    private playDeathSequence(isGameOver: boolean) {
        this.deathSequenceActive = true;
        
        // No game music to pause in this version
        
        // Play death sound
        this.playOneTimeSound('miss', 0.4);
        
        // Freeze all ghosts in place
        for (const ghost of this.ghosts) {
            ghost.sprite.setVisible(true); // Keep ghosts visible but frozen
        }
        
        // Create Pac-Man death animation
        this.createDeathAnimation(isGameOver);
    }

    // Create the spinning/shrinking death animation
    private createDeathAnimation(isGameOver: boolean) {
        // Store original Pac-Man properties
        const originalX = this.pacman.x;
        const originalY = this.pacman.y;
        const originalScale = this.pacman.scaleX;
        
        // Hide the glow effect during death
        if (this.pacmanGlow) {
            this.pacmanGlow.setVisible(false);
        }
        
        // Phase 1: Spinning animation (1 second)
        this.tweens.add({
            targets: this.pacman,
            rotation: Math.PI * 4, // 2 full rotations
            duration: 1000,
            ease: 'Power2.easeOut',
            onComplete: () => {
                // Phase 2: Shrinking animation (0.5 seconds)
                this.tweens.add({
                    targets: this.pacman,
                    scaleX: 0,
                    scaleY: 0,
                    alpha: 0,
                    duration: 500,
                    ease: 'Power2.easeIn',
                    onComplete: () => {
                        // Phase 3: Brief pause (0.5 seconds)
                        this.time.delayedCall(500, () => {
                            if (isGameOver) {
                                this.showGameOver();
                            } else {
                                this.respawnAfterDeath(originalX, originalY, originalScale);
                            }
                        });
                    }
                });
            }
        });
    }

    // Respawn Pac-Man after death sequence
    private respawnAfterDeath(originalX: number, originalY: number, originalScale: number) {
        // Reset Pac-Man to spawn position
        for (let y = 0; y < this.map.length; y++) {
            for (let x = 0; x < this.map[y].length; x++) {
                if (this.map[y][x] === 4) {
                    const spawnX = this.mapOffsetX + x * this.tileSize + this.tileSize / 2;
                    const spawnY = this.mapOffsetY + y * this.tileSize + this.tileSize / 2;
                    
                    // Reset Pac-Man properties
                    this.pacman.x = spawnX;
                    this.pacman.y = spawnY;
                    this.pacman.setScale(originalScale);
                    this.pacman.setAlpha(1);
                    this.pacman.setRotation(0);
                    
                    // Reset glow effect
                    if (this.pacmanGlow) {
                        this.pacmanGlow.x = spawnX;
                        this.pacmanGlow.y = spawnY;
                        this.pacmanGlow.setVisible(true);
                    }
                    break;
                }
            }
        }
        
        // Reset all ghosts to their spawn positions
        this.resetAllGhosts();
        
        // Reset movement state
        this.preInputDirection = { x: 0, y: 0 };
        this.preInputSelected = false;
        this.newInputDirection = { x: 0, y: 0 };
        this.blockedByWall = false;
        
        // No game music to resume in this version
        
        // End death sequence
        this.deathSequenceActive = false;
        
        console.log('Player respawned after death sequence');
    }

    // Handle scene pause
    private onScenePause() {
        this.gamePaused = true;
        
        // Clean up managed audio when pausing
        this.cleanupManagedAudio();
        
        // Pause all tweens (power pellet blinking, etc.)
        this.tweens.pauseAll();
        
        console.log('Game paused');
    }

    // Handle scene resume
    private onSceneResume() {
        this.gamePaused = false;
        
        // Resume all tweens
        this.tweens.resumeAll();
        
        console.log('Game resumed');
    }

    // Play a one-time sound effect (creates new instance each time)
    private playOneTimeSound(soundKey: string, volume: number = 0.3) {
        try {
            const sound = this.sound.add(soundKey, { volume });
            sound.play();
            
            // Clean up the sound object after it finishes playing
            sound.once('complete', () => {
                sound.destroy();
            });
            
            return sound;
        } catch (error) {
            console.log(`Sound '${soundKey}' not available`);
            return null;
        }
    }

    // Manage ghost movement audio (single looping track)
    private manageGhostMovementAudio() {
        // Don't play audio during pause, game over, death sequence, or victory
        if (this.gamePaused || this.gameOverActive || this.deathSequenceActive || this.victorySequenceActive) {
            // Clean up any existing audio if game state changed
            if (this.ghostMovementSound) {
                this.ghostMovementSound.stop();
                this.ghostMovementSound.destroy();
                this.ghostMovementSound = null;
                console.log('Stopped ghost movement audio due to game state change');
            }
            return;
        }
        
        // Check if any ghosts are moving and not frightened
        const activeGhosts = this.ghosts.filter(ghost => 
            ghost.isReleased && 
            ghost.mode !== GhostMode.FRIGHTENED &&
            (ghost.currentDirection.x !== 0 || ghost.currentDirection.y !== 0)
        );
        
        const shouldPlayGhostSound = activeGhosts.length > 0;
        
        if (shouldPlayGhostSound && !this.ghostMovementSound) {
            // Start ghost movement sound loop
            try {
                this.ghostMovementSound = this.sound.add('ghost-normal-move', { 
                    loop: true, 
                    volume: 0.15 
                });
                this.ghostMovementSound.play();
                console.log('Started ghost movement audio loop');
            } catch (error) {
                console.log('Ghost movement sound not available');
            }
        } else if (!shouldPlayGhostSound && this.ghostMovementSound) {
            // Stop ghost movement sound
            this.ghostMovementSound.stop();
            this.ghostMovementSound.destroy();
            this.ghostMovementSound = null;
            console.log('Stopped ghost movement audio loop');
        }
    }

    // Manage power pellet audio (single instance, stops when effect ends)
    private managePowerPelletAudio() {
        // Don't play audio during pause, game over, death sequence, or victory
        if (this.gamePaused || this.gameOverActive || this.deathSequenceActive || this.victorySequenceActive) {
            // Clean up any existing audio if game state changed
            if (this.powerPelletSound) {
                this.powerPelletSound.stop();
                this.powerPelletSound.destroy();
                this.powerPelletSound = null;
                console.log('Stopped power pellet audio due to game state change');
            }
            return;
        }
        
        // Check if any ghosts are in frightened mode
        const frightenedGhosts = this.ghosts.filter(ghost => 
            ghost.mode === GhostMode.FRIGHTENED && ghost.frightenedTimer > 0
        );
        
        const shouldPlayPowerSound = frightenedGhosts.length > 0;
        
        if (shouldPlayPowerSound && !this.powerPelletSound) {
            // Start power pellet sound
            try {
                this.powerPelletSound = this.sound.add('ghost-turn-to-blue', { 
                    loop: false, 
                    volume: 0.3 
                });
                this.powerPelletSound.play();
                
                // Clean up when sound finishes naturally
                this.powerPelletSound.once('complete', () => {
                    if (this.powerPelletSound) {
                        this.powerPelletSound.destroy();
                        this.powerPelletSound = null;
                    }
                });
                
                console.log('Started power pellet audio');
            } catch (error) {
                console.log('Power pellet sound not available');
            }
        } else if (!shouldPlayPowerSound && this.powerPelletSound) {
            // Stop power pellet sound immediately when effect ends
            this.powerPelletSound.stop();
            this.powerPelletSound.destroy();
            this.powerPelletSound = null;
            console.log('Stopped power pellet audio (effect ended)');
        }
    }

    // Clean up managed audio instances
    private cleanupManagedAudio() {
        // Clean up ghost movement sound
        if (this.ghostMovementSound) {
            this.ghostMovementSound.stop();
            this.ghostMovementSound.destroy();
            this.ghostMovementSound = null;
        }
        
        // Clean up power pellet sound
        if (this.powerPelletSound) {
            this.powerPelletSound.stop();
            this.powerPelletSound.destroy();
            this.powerPelletSound = null;
        }
        
        console.log('Cleaned up managed audio instances');
    }



    // Show game over overlay
    private showGameOver() {
        this.gameOverActive = true; // Disable game updates and input
        
        // Clean up all managed audio including ghost movement sound
        this.cleanupManagedAudio();
        
        // Emit game over event to React UI
        EventBus.emit('game-over');
        
        console.log('Game Over - UI overlay triggered');
    }

    // Clean up audio and ghosts when scene ends
    shutdown() {
        console.log('PacTest2 scene shutting down');
        if (this.startMusic) {
            this.startMusic.stop();
        }
        // No game music to stop in this version
        
        // Clean up event listeners
        this.events.off('pause', this.onScenePause, this);
        this.events.off('resume', this.onSceneResume, this);
        
        // Clean up managed audio
        this.cleanupManagedAudio();
        
        // Clean up ghosts
        for (const ghost of this.ghosts) {
            if (ghost.sprite) {
                ghost.sprite.destroy();
            }
        }
        this.ghosts = [];
    }
}