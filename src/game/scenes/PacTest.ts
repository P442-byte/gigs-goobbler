import { Scene, GameObjects } from 'phaser';
import { EventBus } from '../EventBus';

export class PacTest extends Phaser.Scene {

    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;

    private tileSize: number = 32;
    // The center point of a tile (for 32x32 tiles, center is at 16,16)
    private midTile: { x: number, y: number } = { x: 16, y: 16 };
    
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

    private pacman!: Phaser.GameObjects.Arc;
    private pacmanSpeed: number = 2;
    private inputDirection: { x: number, y: number } = { x: 0, y: 0 };
    private currentDirection: { x: number, y: number } = { x: 0, y: 0 }; // NEW: Current movement direction
    private stopped: boolean = true; // NEW: Whether Pac-Man is currently stopped
    
    // DEBUG: Visual indicator for next tile
    private debugRect?: Phaser.GameObjects.Rectangle;
    
    // NEW: Enhanced coordinate tracking system
    private pacmanTile: { x: number, y: number } = { x: 0, y: 0 };           // Which tile Pac-Man is in
    private pacmanTilePixel: { x: number, y: number } = { x: 0, y: 0 };      // Position within that tile
    private pacmanDistToMid: { x: number, y: number } = { x: 0, y: 0 };      // Distance to tile center

    constructor() {
        super('PacTest');
    }
    
    create(){
        this.cursors = this.input.keyboard!.createCursorKeys();

        for (let y = 0; y < this.map.length; y++) {
            for (let x = 0; x < this.map[y].length; x++) {
                const tile = this.map[y][x];
                const tileColor = tile === 1 ? 0xffffff : 0x000000;

                this.createTile(x, y, tileColor);
            }
        }
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
    }

    private createTile(x: number, y: number, tileColor: number) {
        const mapTile = this.add.rectangle(x * this.tileSize, y * this.tileSize, this.tileSize, this.tileSize, tileColor).setOrigin(0, 0);
        mapTile.setFillStyle(tileColor);
        mapTile.setZ(10);
    }

    private createPacman(spawnX: number, spawnY: number) {
        this.pacman = this.add.arc(spawnX, spawnY, 16, 0, 360, false, 0xffffff);
        // Initialize coordinate tracking
        this.updatePacmanCoordinates();
    }

    private createDot(spawnX: number, spawnY: number) {
        const dot = this.add.arc(spawnX, spawnY, 4, 0, 360, false, 0xffffff);
        this.dots.push(dot);
    }

    // NEW: Update all coordinate tracking when Pac-Man moves
    private updatePacmanCoordinates() {
        // Calculate which tile Pac-Man is currently in
        this.pacmanTile.x = Math.floor(this.pacman.x / this.tileSize);
        this.pacmanTile.y = Math.floor(this.pacman.y / this.tileSize);
        
        // Calculate position within the current tile (0 to tileSize-1)
        this.pacmanTilePixel.x = this.pacman.x % this.tileSize;
        this.pacmanTilePixel.y = this.pacman.y % this.tileSize;
        
        // Handle negative coordinates (for tunnel wrapping)
        if (this.pacmanTilePixel.x < 0) this.pacmanTilePixel.x += this.tileSize;
        if (this.pacmanTilePixel.y < 0) this.pacmanTilePixel.y += this.tileSize;
        
        // Calculate distance to the center of the current tile
        // This is CRUCIAL for determining when Pac-Man can turn
        this.pacmanDistToMid.x = this.midTile.x - this.pacmanTilePixel.x;
        this.pacmanDistToMid.y = this.midTile.y - this.pacmanTilePixel.y;
    }

    // NEW: Check if a specific tile coordinate is walkable
    private isWalkableTile(tileX: number, tileY: number): boolean {
        // Check bounds first
        if (tileY < 0 || tileY >= this.map.length || tileX < 0 || tileX >= this.map[0].length) {
            return false; // Out of bounds = not walkable
        }
        
        // In your map: 0 = walkable, 1 = wall, 4 = Pac-Man spawn (also walkable)
        const tile = this.map[tileY][tileX];
        return tile === 0 || tile === 4;
    }

    // NEW: Check if Pac-Man can move in a specific direction
    private canMoveInDirection(direction: { x: number, y: number }): boolean {
        // Calculate what the next tile would be
        const nextTileX = this.pacmanTile.x + direction.x;
        const nextTileY = this.pacmanTile.y + direction.y;

        // DEBUG: Show where we're checking (remove/comment this out later)
        if (this.debugRect) {
            this.debugRect.destroy();
        }
        // Position the rectangle correctly - multiply by tileSize to get pixel position
        // and set origin to (0,0) so it aligns with tile grid
        this.debugRect = this.add.rectangle(
            nextTileX * this.tileSize,      // X pixel position
            nextTileY * this.tileSize,      // Y pixel position  
            this.tileSize,                  // Width
            this.tileSize,                  // Height
            0xff0000,                       // Red color
            0.5                             // 50% transparency
        ).setOrigin(0, 0);                  // Set origin to top-left to match tile positioning
        
        return this.isWalkableTile(nextTileX, nextTileY);
    }

    // NEW: Check if Pac-Man should stop moving (hit a wall)
    private shouldStopMoving(direction: { x: number, y: number }): boolean {
        // Only check for walls when we're at the center of a tile
        // This prevents stopping in the middle of tiles
        const axis = direction.x !== 0 ? 'x' : 'y'; // axis of movement
        
        if (this.pacmanDistToMid[axis] === 0) {
            // We're at the center, check if next tile is walkable
            return !this.canMoveInDirection(direction);
        }
        
        return false; // Don't stop if we're not at center
    }

    update(){
        if (!this.cursors) return;

        this.playerMovement();
    }

    private playerMovement(){
        // Step 1: Handle input (store desired direction)
        if (this.cursors.left.isDown) {
            this.inputDirection.x = -1;
            this.inputDirection.y = 0;
        }
        else if (this.cursors.right.isDown) {
            this.inputDirection.x = 1;
            this.inputDirection.y = 0;
        }
        else if (this.cursors.up.isDown) {
            this.inputDirection.x = 0;
            this.inputDirection.y = -1;
        }
        else if (this.cursors.down.isDown) {
            this.inputDirection.x = 0;
            this.inputDirection.y = 1;
        }

        // Step 2: Check if we can change direction (ONLY when perfectly centered)
        const isPerfectlyCentered = (this.pacmanDistToMid.x === 0 && this.pacmanDistToMid.y === 0);
        const wantsToChangeDirection = (this.inputDirection.x !== this.currentDirection.x || this.inputDirection.y !== this.currentDirection.y);
        
        if (isPerfectlyCentered && wantsToChangeDirection) {
            if (this.canMoveInDirection(this.inputDirection)) {
                // Change direction and start moving
                this.currentDirection.x = this.inputDirection.x;
                this.currentDirection.y = this.inputDirection.y;
                this.stopped = false;
                console.log(`Direction changed to (${this.currentDirection.x}, ${this.currentDirection.y}) at center of tile (${this.pacmanTile.x}, ${this.pacmanTile.y})`);
            } else {
                // Can't move in desired direction, but we're centered - show why
                console.log(`Can't turn to (${this.inputDirection.x}, ${this.inputDirection.y}) - blocked by wall`);
            }
        } else if (wantsToChangeDirection && !isPerfectlyCentered) {
            // Input buffering: Remember the input, will try again when centered
            console.log(`Input buffered: (${this.inputDirection.x}, ${this.inputDirection.y}) - waiting for center. Current DistToMid: (${this.pacmanDistToMid.x}, ${this.pacmanDistToMid.y})`);
        }

        // Step 3: Check if we should stop (hit a wall)
        if (!this.stopped && this.shouldStopMoving(this.currentDirection)) {
            this.stopped = true;
            console.log("Stopped! Hit a wall.");
        }

        // Step 4: Move if not stopped
        if (!this.stopped) {
            this.pacman.setX(this.pacman.x + this.currentDirection.x * this.pacmanSpeed);
            this.pacman.setY(this.pacman.y + this.currentDirection.y * this.pacmanSpeed);
        }
        
        // Step 5: Update coordinate tracking after movement
        this.updatePacmanCoordinates();

        // Step 6: Handle tunnel wrapping (simplified for now)
        if (this.pacman.x < 0) {
            this.pacman.setX(this.map[0].length * this.tileSize);
            this.updatePacmanCoordinates();
        }
        else if (this.pacman.x > this.map[0].length * this.tileSize) {
            this.pacman.setX(0);
            this.updatePacmanCoordinates();
        }

        if (this.pacman.y < 0) {
            this.pacman.setY(this.map.length * this.tileSize);
            this.updatePacmanCoordinates();
        }
        else if (this.pacman.y > this.map.length * this.tileSize) {
            this.pacman.setY(0);
            this.updatePacmanCoordinates();
        }
        
        // DEBUG: Show current state (less frequent to reduce spam)
        if (isPerfectlyCentered) {
            console.log(`🎯 CENTERED at tile (${this.pacmanTile.x}, ${this.pacmanTile.y}), Stopped: ${this.stopped}, Direction: (${this.currentDirection.x}, ${this.currentDirection.y})`);
        }
    }
}