import { Scene, GameObjects } from 'phaser';
import { EventBus } from '../EventBus';

export class GigsGobbler extends Scene {
    private camera!: Phaser.Cameras.Scene2D.Camera;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    // Player movement system based on classic Pac-Man
    private dir: { x: number, y: number } = { x: 0, y: 0 }; // current direction
    private nextDir: { x: number, y: number } = { x: 0, y: 0 }; // queued direction
    private inputDir: { x: number, y: number } = { x: 0, y: 0 }; // player input direction
    private pixel: { x: number, y: number } = { x: 0, y: 0 }; // exact pixel position
    private tile: { x: number, y: number } = { x: 0, y: 0 }; // current tile position
    private distToMid: { x: number, y: number } = { x: 0, y: 0 }; // distance to tile center
    private stopped: boolean = true;
    private playerSpeed: number = 2; // pixels per step
    private eatPauseFramesLeft: number = 0;
    
    // Maze layout: 1 = wall, 0 = empty space, 2 = dot
    private maze: number[][] = [
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,2,2,2,2,2,2,2,2,1,1,2,2,2,2,2,2,2,2,1],
        [1,2,1,1,2,1,1,1,2,1,1,2,1,1,1,2,1,1,2,1],
        [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
        [1,2,1,1,2,1,2,1,1,1,1,1,1,2,1,2,1,1,2,1],
        [1,2,2,2,2,1,2,2,2,1,1,2,2,2,1,2,2,2,2,1],
        [1,1,1,1,2,1,1,1,0,1,1,0,1,1,1,2,1,1,1,1],
        [0,0,0,1,2,1,0,0,0,0,0,0,0,0,1,2,1,0,0,0],
        [1,1,1,1,2,1,0,1,1,0,0,1,1,0,1,2,1,1,1,1],
        [0,0,0,0,2,0,0,1,0,0,0,0,1,0,0,2,0,0,0,0],
        [1,1,1,1,2,1,0,1,1,1,1,1,1,0,1,2,1,1,1,1],
        [0,0,0,1,2,1,0,0,0,0,0,0,0,0,1,2,1,0,0,0],
        [1,1,1,1,2,1,1,1,0,1,1,0,1,1,1,2,1,1,1,1],
        [1,2,2,2,2,2,2,2,2,1,1,2,2,2,2,2,2,2,2,1],
        [1,2,1,1,2,1,1,1,2,1,1,2,1,1,1,2,1,1,2,1],
        [1,2,2,1,2,2,2,2,2,2,2,2,2,2,2,2,1,2,2,1],
        [1,1,2,1,2,1,2,1,1,1,1,1,1,2,1,2,1,2,1,1],
        [1,2,2,2,2,1,2,2,2,1,1,2,2,2,1,2,2,2,2,1],
        [1,2,1,1,1,1,1,1,2,1,1,2,1,1,1,1,1,1,2,1],
        [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
    ];

    private player!: GameObjects.Arc;
    private tileSize: number = 32;

    constructor() {
        super('GigsGobbler');
    }

    create() {
        this.camera = this.cameras.main;
        this.camera.setBackgroundColor(0x000000);
        // Setup input
        this.cursors = this.input.keyboard!.createCursorKeys();

        this.createTilemap();
        this.createPlayer();
        
        EventBus.emit('current-scene-ready', this);
    }

    private createTilemap() {
        this.tileSet();
        // Create the visual representation of our maze
        this.styleTiles();
    }

    private tileSet() {
        // Calculate position to the right of the maze
        const mazeWidth = this.maze[0].length * this.tileSize;
        const startX = mazeWidth + 50; // 50px gap from maze
        const startY = 50; // Start from top with some padding
        const gap = 4; // Small gap between tiles
        const tilesPerRow = 11; // Arrange in 15 columns

        // Define different tile types and their appearances
        const tileTypes = [
            { type: 'wall', color: 0x0000ff, stroke: 0x0033ff, strokeWidth: 2, corners: { tl: 8, tr: 8, bl: 8, br: 8 } },
            { type: 'wall1', color: 0x0000ff, stroke: 0x0033ff, strokeWidth: 2, corners: { tl: 0, tr: 0, bl: 8, br: 8 } },
            { type: 'wall2', color: 0x0000ff, stroke: 0x0033ff, strokeWidth: 2, corners: { tl: 8, tr: 0, bl: 8, br: 0 } },
            { type: 'wall3', color: 0x0000ff, stroke: 0x0033ff, strokeWidth: 2, corners: { tl: 0, tr: 0, bl: 8, br: 0 } },
            { type: 'wall4', color: 0x0000ff, stroke: 0x0033ff, strokeWidth: 2, corners: { tl: 8, tr: 8, bl: 0, br: 0 } },
            { type: 'wall5', color: 0x0000ff, stroke: 0x0033ff, strokeWidth: 2, corners: { tl: 0, tr: 0, bl: 0, br: 0 } },
            { type: 'wall6', color: 0x0000ff, stroke: 0x0033ff, strokeWidth: 2, corners: { tl: 8, tr: 0, bl: 0, br: 0 } },
            { type: 'wall7', color: 0x0000ff, stroke: 0x0033ff, strokeWidth: 2, corners: { tl: 0, tr: 8, bl: 0, br: 12 } },
            { type: 'wall8', color: 0x0000ff, stroke: 0x0033ff, strokeWidth: 2, corners: { tl: 12, tr: 0, bl: 12, br: 0 } },
            { type: 'wall9', color: 0x0000ff, stroke: 0x0033ff, strokeWidth: 2, corners: { tl: 0, tr: 0, bl: 0, br: 8 } },
            { type: 'wall10', color: 0x0000ff, stroke: 0x0033ff, strokeWidth: 2, corners: { tl: 0, tr: 8, bl: 0, br: 0 } },
        ];
        // Create 15 different tiles
        for (let i = 0; i < 11; i++) {
            const row = Math.floor(i / tilesPerRow);
            const col = i % tilesPerRow;
            
            const x = startX + col * (this.tileSize + gap);
            const y = startY + row * (this.tileSize + gap);
            const centerX = x + this.tileSize / 2;
            const centerY = y + this.tileSize / 2;
            
            const tileType = tileTypes[i];
            
            // Create different shapes based on tile type
            this.createTileByType(tileType, centerX, centerY);
        }
    }

    private createTileByType(tileType: any, centerX: number, centerY: number) {
        switch (tileType.type) {
            case 'wall':
            case 'wall1':
            case 'wall2':
            case 'wall3':
            case 'wall4':
            case 'wall5':
            case 'wall6':
            case 'wall7':
            case 'wall8':
            case 'wall9':
            case 'wall10':
                this.createWallTile(tileType, centerX, centerY, tileType.corners);
                break;
                
            case 'dot':
                // Background
                this.add.rectangle(centerX, centerY, this.tileSize, this.tileSize, 0x000000)
                    .setStrokeStyle(1, 0x333333);
                // Dot
                this.add.circle(centerX, centerY, 3, tileType.color);
                break;
                
            case 'empty':
                this.add.rectangle(centerX, centerY, this.tileSize, this.tileSize, tileType.color)
                    .setStrokeStyle(tileType.strokeWidth, tileType.stroke);
                break;
                
            case 'power-pellet':
                // Background
                this.add.rectangle(centerX, centerY, this.tileSize, this.tileSize, 0x000000)
                    .setStrokeStyle(1, 0x333333);
                // Large pellet
                this.add.circle(centerX, centerY, 8, tileType.color)
                    .setStrokeStyle(tileType.strokeWidth, tileType.stroke);
                break;
                
            case 'player':
                // Background
                this.add.rectangle(centerX, centerY, this.tileSize, this.tileSize, 0x000000)
                    .setStrokeStyle(1, 0x333333);
                // Player circle
                this.add.arc(centerX, centerY, 12, 0, 360, false, tileType.color);
                break;
                
            case 'ghost-red':
            case 'ghost-pink':
            case 'ghost-cyan':
            case 'ghost-orange':
                // Background
                this.add.rectangle(centerX, centerY, this.tileSize, this.tileSize, 0x000000)
                    .setStrokeStyle(1, 0x333333);
                // Ghost shape (rounded rectangle)
                this.add.rectangle(centerX, centerY, this.tileSize - 8, this.tileSize - 8, tileType.color)
                    .setStrokeStyle(tileType.strokeWidth, tileType.stroke);
                break;
                
            case 'fruit':
                // Background
                this.add.rectangle(centerX, centerY, this.tileSize, this.tileSize, 0x000000)
                    .setStrokeStyle(1, 0x333333);
                // Fruit (diamond shape using triangle)
                this.add.triangle(centerX, centerY - 8, centerX - 8, centerY + 4, centerX + 8, centerY + 4, tileType.color)
                    .setStrokeStyle(tileType.strokeWidth, tileType.stroke);
                break;
                
            case 'teleport':
                // Swirling pattern
                this.add.rectangle(centerX, centerY, this.tileSize, this.tileSize, tileType.color)
                    .setStrokeStyle(tileType.strokeWidth, tileType.stroke);
                this.add.circle(centerX, centerY, 6, 0x000000);
                break;
                
            default:
                // Default rectangle for other types
                this.add.rectangle(centerX, centerY, this.tileSize, this.tileSize, tileType.color)
                    .setStrokeStyle(tileType.strokeWidth, tileType.stroke);
                break;
        }
    }

    private createWallTile(tileType: any, centerX: number, centerY: number, corners: { tl: number, tr: number, bl: number, br: number }) {
        // Create graphics object for custom rounded rectangle
        const wallGraphics = this.add.graphics();
        wallGraphics.fillStyle(tileType.color);
        wallGraphics.lineStyle(tileType.strokeWidth, tileType.stroke);
        
        const halfSize = this.tileSize / 2;
        const x = centerX - halfSize;
        const y = centerY - halfSize;
        const width = this.tileSize;
        const height = this.tileSize;
        
        // Draw rounded rectangle with individual corner radii
        wallGraphics.fillRoundedRect(x, y, width, height, {
            tl: corners.tl,  // top-left
            tr: corners.tr,  // top-right
            bl: corners.bl,  // bottom-left
            br: corners.br   // bottom-right
        });
        wallGraphics.strokeRoundedRect(x, y, width, height, {
            tl: corners.tl,
            tr: corners.tr,
            bl: corners.bl,
            br: corners.br
        });
    }

    private styleTiles() {
        // Get the tileset definitions
        const tileTypes = [
            { type: 'wall', color: 0x0000ff, stroke: 0x0033ff, strokeWidth: 2, corners: { tl: 8, tr: 8, bl: 8, br: 8 } },
            { type: 'wall1', color: 0x0000ff, stroke: 0x0033ff, strokeWidth: 2, corners: { tl: 0, tr: 0, bl: 8, br: 8 } },
            { type: 'wall2', color: 0x0000ff, stroke: 0x0033ff, strokeWidth: 2, corners: { tl: 8, tr: 0, bl: 8, br: 0 } },
            { type: 'wall3', color: 0x0000ff, stroke: 0x0033ff, strokeWidth: 2, corners: { tl: 0, tr: 0, bl: 8, br: 0 } },
            { type: 'wall4', color: 0x0000ff, stroke: 0x0033ff, strokeWidth: 2, corners: { tl: 8, tr: 8, bl: 0, br: 0 } },
            { type: 'wall5', color: 0x0000ff, stroke: 0x0033ff, strokeWidth: 2, corners: { tl: 0, tr: 0, bl: 0, br: 0 } },
            { type: 'wall6', color: 0x0000ff, stroke: 0x0033ff, strokeWidth: 2, corners: { tl: 8, tr: 0, bl: 0, br: 0 } },
            { type: 'wall7', color: 0x0000ff, stroke: 0x0033ff, strokeWidth: 2, corners: { tl: 0, tr: 8, bl: 0, br: 12 } },
            { type: 'wall8', color: 0x0000ff, stroke: 0x0033ff, strokeWidth: 2, corners: { tl: 12, tr: 0, bl: 12, br: 0 } },
            { type: 'wall9', color: 0x0000ff, stroke: 0x0033ff, strokeWidth: 2, corners: { tl: 0, tr: 0, bl: 0, br: 8 } },
            { type: 'wall10', color: 0x0000ff, stroke: 0x0033ff, strokeWidth: 2, corners: { tl: 0, tr: 8, bl: 0, br: 0 } },
        ];

        // Iterate through all tiles and style them
        for (let y = 0; y < this.maze.length; y++) {
            for (let x = 0; x < this.maze[y].length; x++) {
                const tileValue = this.maze[y][x];
                const worldX = x * this.tileSize;
                const worldY = y * this.tileSize;
                const centerX = worldX + this.tileSize / 2;
                const centerY = worldY + this.tileSize / 2;

                if (tileValue === 1) {
                    // Wall tile - use bitwise detection to select appropriate tile
                    const selectedTile = this.selectWallTileByNeighbors(x, y, tileTypes);
                    this.createWallTile(selectedTile, centerX, centerY, selectedTile.corners);
                } else if (tileValue === 2) {
                    // Dot tile - small yellow circle
                    this.add.circle(centerX, centerY, 3, 0xffff00);
                }
                // tileValue === 0 is empty space, so we don't draw anything
            }
        }
    }

    private selectWallTileByNeighbors(x: number, y: number, tileTypes: any[]): any {
        // Generate face value using bitwise OR (same as the C++ example)
        let face = 0;
        
        // Check each direction and set the corresponding bit
        if (y > 0 && this.isWall(x, y - 1)) {
            face |= 1;  // North (top) neighbor is solid
        }
        if (x < this.maze[0].length - 1 && this.isWall(x + 1, y)) {
            face |= 2;  // East (right) neighbor is solid
        }
        if (y < this.maze.length - 1 && this.isWall(x, y + 1)) {
            face |= 4;  // South (bottom) neighbor is solid
        }
        if (x > 0 && this.isWall(x - 1, y)) {
            face |= 8;  // West (left) neighbor is solid
        }

        // Map face values to tile indices (only 11 tiles available: 0-10)
        const faceToTileMap: { [key: number]: number } = {
            0:  5,  // 0000 - Isolated (wall5 - all sharp corners)
            1:  1,  // 0001 - Only north (wall1 - bottom corners rounded)
            2:  2,  // 0010 - Only east (wall2 - left corners rounded)
            3:  9,  // 0011 - North+East corner (wall9 - bottom-right rounded)
            4:  4,  // 0100 - Only south (wall4 - top corners rounded)
            5:  2,  // 0101 - North+South corridor (wall2 - left corners rounded)
            6:  10, // 0110 - East+South corner (wall10 - top-right rounded)
            7:  10, // 0111 - T-junction → use wall10
            8:  8,  // 1000 - Only west (wall8 - left corners rounded)
            9:  6,  // 1001 - North+West corner (wall6 - top-left rounded)
            10: 8,  // 1010 - East+West corridor (wall8 - left corners rounded)
            11: 6,  // 1011 - T-junction → use wall6
            12: 3,  // 1100 - South+West corner (wall3 - bottom-left rounded)
            13: 1,  // 1101 - T-junction → use wall1
            14: 4,  // 1110 - T-junction → use wall4
            15: 0   // 1111 - All neighbors (wall - all corners rounded)
        };

        const tileIndex = faceToTileMap[face] !== undefined ? faceToTileMap[face] : 0;
        return tileTypes[tileIndex];
    }

    private isWall(x: number, y: number): boolean {
        if (y < 0 || y >= this.maze.length || x < 0 || x >= this.maze[0].length) {
            return true; // Treat out of bounds as walls
        }
        return this.maze[y][x] === 1;
    }

    private createPlayer() {
        // Find a good starting position (first empty space or dot)
        let startX = this.tileSize + this.tileSize / 2;
        let startY = this.tileSize + this.tileSize / 2;
        
        for (let y = 0; y < this.maze.length; y++) {
            for (let x = 0; x < this.maze[y].length; x++) {
                if (this.maze[y][x] === 2) {
                    startX = x * this.tileSize + this.tileSize / 2;
                    startY = y * this.tileSize + this.tileSize / 2;
                    break;
                }
            }
            if (startX !== this.tileSize + this.tileSize / 2) break;
        }

        this.player = this.add.arc(startX, startY, 12, 0, 360, false, 0xffff00);
        
        // Initialize player position system
        this.pixel.x = startX;
        this.pixel.y = startY;
        this.updateTilePosition();
    }

    // Helper method to check if a position is walkable
    public isWalkable(x: number, y: number): boolean {
        const tileX = Math.floor(x / this.tileSize);
        const tileY = Math.floor(y / this.tileSize);
        
        if (tileY < 0 || tileY >= this.maze.length || tileX < 0 || tileX >= this.maze[0].length) {
            return false;
        }
        
        return this.maze[tileY][tileX] !== 1;
    }

    // Helper method to get tile value at world coordinates
    public getTileAt(x: number, y: number): number {
        const tileX = Math.floor(x / this.tileSize);
        const tileY = Math.floor(y / this.tileSize);
        
        if (tileY < 0 || tileY >= this.maze.length || tileX < 0 || tileX >= this.maze[0].length) {
            return 1; // Treat out of bounds as walls
        }
        
        return this.maze[tileY][tileX];
    }

    // Method to remove a dot when collected
    public collectDot(x: number, y: number): boolean {
        const tileX = Math.floor(x / this.tileSize);
        const tileY = Math.floor(y / this.tileSize);
        
        if (this.maze[tileY] && this.maze[tileY][tileX] === 2) {
            this.maze[tileY][tileX] = 0; // Convert dot to empty space
            return true;
        }
        return false;
    }

    // Helper methods for the classic Pac-Man movement system
    private updateTilePosition() {
        this.tile.x = Math.floor(this.pixel.x / this.tileSize);
        this.tile.y = Math.floor(this.pixel.y / this.tileSize);
        
        // Calculate distance to tile center
        const centerX = this.tile.x * this.tileSize + this.tileSize / 2;
        const centerY = this.tile.y * this.tileSize + this.tileSize / 2;
        this.distToMid.x = centerX - this.pixel.x;
        this.distToMid.y = centerY - this.pixel.y;
    }

    private commitPos() {
        this.updateTilePosition();
        this.player.x = this.pixel.x;
        this.player.y = this.pixel.y;
    }

    private setDir(dirX: number, dirY: number) {
        this.dir.x = dirX;
        this.dir.y = dirY;
    }

    private setNextDir(dirX: number, dirY: number) {
        this.nextDir.x = dirX;
        this.nextDir.y = dirY;
    }

    private setInputDir(dirX: number, dirY: number) {
        this.inputDir.x = dirX;
        this.inputDir.y = dirY;
    }

    private isNextTileFloor(dir: { x: number, y: number }): boolean {
        const nextTileX = this.tile.x + dir.x;
        const nextTileY = this.tile.y + dir.y;
        
        if (nextTileY < 0 || nextTileY >= this.maze.length || nextTileX < 0 || nextTileX >= this.maze[0].length) {
            return false;
        }
        
        return this.maze[nextTileY][nextTileX] !== 1;
    }

    private sign(x: number): number {
        if (x < 0) return -1;
        if (x > 0) return 1;
        return 0;
    }

    update() {
        if (!this.cursors) return;

        // Skip frames if eating pause is active
        if (this.eatPauseFramesLeft > 0) {
            this.eatPauseFramesLeft--;
            return;
        }

        // Handle input
        this.handleInput();

        // Determine direction (steering logic)
        this.steer();

        // Move one step
        this.step();
    }

    private handleInput() {
        // Check for input and set input direction
        if (this.cursors.left.isDown) {
            this.setInputDir(-1, 0);
        } else if (this.cursors.right.isDown) {
            this.setInputDir(1, 0);
        } else if (this.cursors.up.isDown) {
            this.setInputDir(0, -1);
        } else if (this.cursors.down.isDown) {
            this.setInputDir(0, 1);
        }
    }

    private steer() {
        // If we have input direction, try to use it
        if (this.inputDir.x !== 0 || this.inputDir.y !== 0) {
            // Check if input direction is open
            const inputDirOpen = this.isNextTileFloor(this.inputDir);

            if (inputDirOpen) {
                this.setDir(this.inputDir.x, this.inputDir.y);
                this.setNextDir(this.inputDir.x, this.inputDir.y);
                this.stopped = false;
            } else {
                if (!this.stopped) {
                    this.setNextDir(this.inputDir.x, this.inputDir.y);
                }
            }
        }

        // If stopped, try to use next direction
        if (this.stopped) {
            this.setDir(this.nextDir.x, this.nextDir.y);
        }
    }

    private step(): number {
        // Don't proceed past the middle of a tile if facing a wall
        this.stopped = this.stopped || (this.distToMid.x === 0 && this.distToMid.y === 0 && !this.isNextTileFloor(this.dir));
        
        if (!this.stopped) {
            // Identify the axes of motion
            const a = (this.dir.x !== 0) ? 'x' : 'y'; // axis of motion
            const b = (this.dir.x !== 0) ? 'y' : 'x'; // axis perpendicular to motion

            // Move in the direction of travel
            this.pixel[a] += this.dir[a] * this.playerSpeed;

            // Drift toward the center of the track (cornering)
            this.pixel[b] += this.sign(this.distToMid[b]);
        }

        this.commitPos();

        // Check for dot collection
        if (this.distToMid.x === 0 && this.distToMid.y === 0) {
            const t = this.maze[this.tile.y] && this.maze[this.tile.y][this.tile.x];
            if (t === 2) {
                this.collectDot(this.pixel.x, this.pixel.y);
                this.eatPauseFramesLeft = 1; // Brief pause when eating dot
                console.log("Dot collected!");
            }
        }

        return this.stopped ? 0 : 1;
    }
}
