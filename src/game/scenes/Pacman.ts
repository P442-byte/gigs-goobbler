import { Scene, GameObjects } from 'phaser';
import { EventBus } from '../EventBus';

export class Pacman extends Scene {
    private camera!: Phaser.Cameras.Scene2D.Camera;
    private player!: GameObjects.Arc;
    private ghosts: GameObjects.Arc[] = [];
    private pellets: GameObjects.Arc[] = [];
    private powerPellets: GameObjects.Arc[] = [];
    private walls: GameObjects.Rectangle[] = [];
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private score: number = 0;
    private scoreText!: GameObjects.Text;
    private gameOverText!: GameObjects.Text;
    private lives: number = 3;
    private livesText!: GameObjects.Text;
    private playerSpeed: number = 100;
    private ghostSpeed: number = 80;
    private powerMode: boolean = false;
    private powerModeTimer?: Phaser.Time.TimerEvent;
    private currentDirection: { x: number, y: number } = { x: 0, y: 0 };
    private bufferedDirection: { x: number, y: number } = { x: 0, y: 0 };
    private targetGridX: number = 9; // Starting grid position
    private targetGridY: number = 15;
    private isMoving: boolean = false;
    private debugTarget?: GameObjects.Rectangle; // Debug indicator for target position
    private debugText?: GameObjects.Text; // Debug text for movement info
    private debugRay?: GameObjects.Graphics; // Debug ray showing movement direction
    private debugDot?: GameObjects.Arc; // Debug dot showing target position
    private rayTargetGridX: number = 0; // Grid X position of the red dot
    private rayTargetGridY: number = 0; // Grid Y position of the red dot
    private aStarPath: { x: number, y: number }[] = []; // A* calculated path
    private currentPathIndex: number = 0; // Current position in path
    private isFollowingPath: boolean = false; // Whether player is following A* path
    
    // Maze layout - 1 = wall, 0 = empty, 2 = pellet, 3 = power pellet
    private maze: number[][] = [
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,2,2,2,2,2,2,2,2,1,1,2,2,2,2,2,2,2,2,1],
        [1,3,1,1,1,2,1,1,1,1,1,1,1,1,2,1,1,1,3,1],
        [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
        [1,2,1,1,1,2,1,2,1,1,1,1,2,1,2,1,1,1,2,1],
        [1,2,2,2,2,2,1,2,2,1,1,2,2,1,2,2,2,2,2,1],
        [1,1,1,1,1,2,1,1,2,1,1,2,1,1,2,1,1,1,1,1],
        [1,1,1,1,1,2,1,2,2,2,2,2,2,1,2,1,1,1,1,1],
        [1,1,1,1,1,2,1,2,1,0,0,1,2,1,2,1,1,1,1,1],
        [2,2,2,2,2,2,2,2,1,0,0,1,2,2,2,2,2,2,2,2],
        [1,1,1,1,1,2,1,2,1,0,0,1,2,1,2,1,1,1,1,1],
        [1,1,1,1,1,2,1,2,2,2,2,2,2,1,2,1,1,1,1,1],
        [1,1,1,1,1,2,1,1,2,1,1,2,1,1,2,1,1,1,1,1],
        [1,2,2,2,2,2,2,2,2,1,1,2,2,2,2,2,2,2,2,1],
        [1,2,1,1,1,2,1,1,1,1,1,1,1,1,2,1,1,1,2,1],
        [1,3,2,2,1,2,2,2,2,2,2,2,2,2,2,1,2,2,3,1],
        [1,1,1,2,1,2,1,2,1,1,1,1,2,1,2,1,2,1,1,1],
        [1,2,2,2,2,2,1,2,2,1,1,2,2,1,2,2,2,2,2,1],
        [1,2,1,1,1,1,1,1,2,1,1,2,1,1,1,1,1,1,2,1],
        [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
    ];

    private tileSize: number = 32;

    constructor() {
        super('Pacman');
    }

    create() {
        this.camera = this.cameras.main;
        this.camera.setBackgroundColor(0x000000);

        // Create UI
        this.scoreText = this.add.text(16, 16, 'Score: 0', {
            fontSize: '32px',
            color: '#ffffff'
        });

        this.livesText = this.add.text(16, 56, 'Lives: 3', {
            fontSize: '32px',
            color: '#ffffff'
        });

        // Generate maze
        this.generateMaze();

        this.drawConnectedPaths();

        // Create player
        this.createPlayer();

        // Create ghosts
        //this.createGhosts();

        // Setup collisions
        this.setupCollisions();

        // Setup input
        this.cursors = this.input.keyboard!.createCursorKeys();

        // Setup player collision interactions
        this.setupPlayerCollisions();

        // Setup ghost AI
        //this.setupGhostAI();

        // Create debug ray system
        this.createDebugRay();

        EventBus.emit('current-scene-ready', this);
    }

    update() {
        if (!this.cursors || this.gameOverText) return;

        // Handle debug ray input
        this.handleDebugRayInput();
        
        // Update A* path following
        this.updateAStarMovement();
    }

    private handleDebugRayInput() {
        let direction = { x: 0, y: 0 };

        if (this.cursors.left.isDown) {
            direction = { x: -1, y: 0 };
        } else if (this.cursors.right.isDown) {
            direction = { x: 1, y: 0 };
        } else if (this.cursors.up.isDown) {
            direction = { x: 0, y: -1 };
        } else if (this.cursors.down.isDown) {
            direction = { x: 0, y: 1 };
        }

        // If a direction is pressed, check if immediate movement is possible
        if (direction.x !== 0 || direction.y !== 0) {
            if (this.canMoveInDirection(direction)) {
                this.updateDebugRay(direction);
                // Calculate A* path to the red dot and start following it
                this.startAStarMovement();
            }
            // If immediate movement is blocked, don't change ray direction
        }
        // Ray stays visible when no input - removed hideDebugRay() call
    }

    private canMoveInDirection(direction: { x: number, y: number }): boolean {
        // Get current player grid position
        const currentGridX = this.getGridX(this.player.x);
        const currentGridY = this.getGridY(this.player.y);

        // Calculate immediate next position
        const nextGridX = currentGridX + direction.x;
        const nextGridY = currentGridY + direction.y;

        // Check if immediate next position is valid (not a wall)
        return this.canMoveToGridPosition(nextGridX, nextGridY);
    }

    private createDebugRay() {
        // Create graphics object for the ray
        this.debugRay = this.add.graphics();
        this.debugRay.setDepth(250);

        // Create dot for the target position
        this.debugDot = this.add.circle(0, 0, 6, 0xff0000);
        this.debugDot.setDepth(260);
        this.debugDot.setVisible(false);
    }

    private updateDebugRay(direction: { x: number, y: number }) {
        if (!this.debugRay || !this.debugDot) return;

        // Get current player grid position
        const currentGridX = this.getGridX(this.player.x);
        const currentGridY = this.getGridY(this.player.y);
        
        // Get player world position (center of current grid cell)
        const startX = this.getWorldX(currentGridX);
        const startY = this.getWorldY(currentGridY);

        // Cast ray in the specified direction until hitting a wall
        let rayGridX = currentGridX;
        let rayGridY = currentGridY;
        let lastValidGridX = currentGridX;
        let lastValidGridY = currentGridY;

        // Keep stepping in direction until we hit a wall
        while (true) {
            rayGridX += direction.x;
            rayGridY += direction.y;

            // Check if this position is valid (not a wall and within bounds)
            if (this.canMoveToGridPosition(rayGridX, rayGridY)) {
                lastValidGridX = rayGridX;
                lastValidGridY = rayGridY;
            } else {
                // Hit a wall or boundary, stop here
                break;
            }
        }

        // Calculate end position (last valid position before wall)
        const endX = this.getWorldX(lastValidGridX);
        const endY = this.getWorldY(lastValidGridY);

        // Store the target grid position for player movement
        this.rayTargetGridX = lastValidGridX;
        this.rayTargetGridY = lastValidGridY;

        // Clear previous ray and draw new one
        this.debugRay.clear();
        
        // Only draw if there's actually movement possible
        if (lastValidGridX !== currentGridX || lastValidGridY !== currentGridY) {
            // Draw ray line
            this.debugRay.lineStyle(3, 0x00ff00, 0.8); // Green line
            this.debugRay.lineBetween(startX, startY, endX, endY);

            // Position and show the red dot at the end
            this.debugDot.setPosition(endX, endY);
            this.debugDot.setVisible(true);
        } else {
            // No movement possible in this direction
            this.debugDot.setVisible(false);
        }
    }

    // COMMENTED OUT - Player movement methods
    // private movePlayerToRedDot() {
    //     // Only move if there's a valid target and player isn't already moving
    //     if (this.debugDot && this.debugDot.visible) {
    //         // Start movement to the red dot position
    //         this.targetGridX = this.rayTargetGridX;
    //         this.targetGridY = this.rayTargetGridY;
    //         this.isMoving = true;
    //     }
    // }

    // private updatePlayerMovement() {
    //     if (!this.isMoving) return;

    //     const targetWorldX = this.getWorldX(this.targetGridX);
    //     const targetWorldY = this.getWorldY(this.targetGridY);
        
    //     const playerBody = this.player.body as Phaser.Physics.Arcade.Body;
        
    //     // Calculate distance to target
    //     const deltaX = targetWorldX - this.player.x;
    //     const deltaY = targetWorldY - this.player.y;
    //     const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
    //     // If close enough, snap to target and stop moving
    //     if (distance < 2) {
    //         this.player.x = targetWorldX;
    //         this.player.y = targetWorldY;
    //         playerBody.setVelocity(0, 0);
    //         this.isMoving = false;
    //     } else {
    //         // Move towards target
    //         const speed = this.playerSpeed;
    //         const velocityX = (deltaX / distance) * speed;
    //         const velocityY = (deltaY / distance) * speed;
    //         playerBody.setVelocity(velocityX, velocityY);
    //     }
    // }

    private hideDebugRay() {
        if (this.debugRay) {
            this.debugRay.clear();
        }
        if (this.debugDot) {
            this.debugDot.setVisible(false);
        }
    }

    private startAStarMovement() {
        // Get current player grid position
        const startX = this.getGridX(this.player.x);
        const startY = this.getGridY(this.player.y);
        
        // Get target position (red dot)
        const goalX = this.rayTargetGridX;
        const goalY = this.rayTargetGridY;
        
        // Calculate A* path
        this.aStarPath = this.findAStarPath(startX, startY, goalX, goalY);
        
        if (this.aStarPath.length > 0) {
            this.currentPathIndex = 0;
            this.isFollowingPath = true;
            console.log(`A* path found with ${this.aStarPath.length} steps`);
        }
    }

    private updateAStarMovement() {
        if (!this.isFollowingPath || this.aStarPath.length === 0) return;

        // If not currently moving, start moving to next point in path
        if (!this.isMoving) {
            if (this.currentPathIndex < this.aStarPath.length) {
                const nextPoint = this.aStarPath[this.currentPathIndex];
                this.targetGridX = nextPoint.x;
                this.targetGridY = nextPoint.y;
                this.isMoving = true;
                this.currentPathIndex++;
            } else {
                // Reached end of path
                this.isFollowingPath = false;
                console.log("A* path completed!");
            }
        }

        // Handle smooth movement to current target
        if (this.isMoving) {
            const targetWorldX = this.getWorldX(this.targetGridX);
            const targetWorldY = this.getWorldY(this.targetGridY);
            
            const playerBody = this.player.body as Phaser.Physics.Arcade.Body;
            
            // Calculate distance to target
            const deltaX = targetWorldX - this.player.x;
            const deltaY = targetWorldY - this.player.y;
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            
            // If close enough, snap to target and continue to next point
            if (distance < 2) {
                this.player.x = targetWorldX;
                this.player.y = targetWorldY;
                playerBody.setVelocity(0, 0);
                this.isMoving = false;
            } else {
                // Move towards target
                const speed = this.playerSpeed;
                const velocityX = (deltaX / distance) * speed;
                const velocityY = (deltaY / distance) * speed;
                playerBody.setVelocity(velocityX, velocityY);
            }
        }
    }

    private findAStarPath(startX: number, startY: number, goalX: number, goalY: number): { x: number, y: number }[] {
        // A* node structure
        interface AStarNode {
            x: number;
            y: number;
            g: number; // Distance from start
            h: number; // Heuristic distance to goal
            f: number; // Total cost (g + h)
            parent: AStarNode | null;
        }

        const openList: AStarNode[] = [];
        const closedList: AStarNode[] = [];

        // Create start node
        const startNode: AStarNode = {
            x: startX,
            y: startY,
            g: 0,
            h: this.calculateHeuristic(startX, startY, goalX, goalY),
            f: 0,
            parent: null
        };
        startNode.f = startNode.g + startNode.h;

        openList.push(startNode);

        while (openList.length > 0) {
            // Find node with lowest F cost
            let currentNode = openList[0];
            let currentIndex = 0;
            
            for (let i = 1; i < openList.length; i++) {
                if (openList[i].f < currentNode.f) {
                    currentNode = openList[i];
                    currentIndex = i;
                }
            }

            // Move current node from open to closed list
            openList.splice(currentIndex, 1);
            closedList.push(currentNode);

            // Check if we reached the goal
            if (currentNode.x === goalX && currentNode.y === goalY) {
                return this.reconstructPath(currentNode);
            }

            // Check all neighbors (up, down, left, right)
            const neighbors = [
                { x: currentNode.x + 1, y: currentNode.y }, // Right
                { x: currentNode.x - 1, y: currentNode.y }, // Left
                { x: currentNode.x, y: currentNode.y + 1 }, // Down
                { x: currentNode.x, y: currentNode.y - 1 }  // Up
            ];

            for (const neighbor of neighbors) {
                // Skip if neighbor is a wall or out of bounds
                if (!this.canMoveToGridPosition(neighbor.x, neighbor.y)) {
                    continue;
                }

                // Skip if neighbor is in closed list
                if (closedList.some(node => node.x === neighbor.x && node.y === neighbor.y)) {
                    continue;
                }

                // Calculate new G cost
                const newG = currentNode.g + 1;

                // Check if this path to neighbor is better
                const existingNode = openList.find(node => node.x === neighbor.x && node.y === neighbor.y);
                
                if (!existingNode || newG < existingNode.g) {
                    const neighborNode: AStarNode = existingNode || {
                        x: neighbor.x,
                        y: neighbor.y,
                        g: 0,
                        h: 0,
                        f: 0,
                        parent: null
                    };

                    neighborNode.g = newG;
                    neighborNode.h = this.calculateHeuristic(neighbor.x, neighbor.y, goalX, goalY);
                    neighborNode.f = neighborNode.g + neighborNode.h;
                    neighborNode.parent = currentNode;

                    if (!existingNode) {
                        openList.push(neighborNode);
                    }
                }
            }
        }

        // No path found
        return [];
    }

    private calculateHeuristic(x1: number, y1: number, x2: number, y2: number): number {
        // Manhattan distance (perfect for grid-based movement)
        return Math.abs(x2 - x1) + Math.abs(y2 - y1);
    }

    private reconstructPath(goalNode: any): { x: number, y: number }[] {
        const path: { x: number, y: number }[] = [];
        let currentNode: any = goalNode;

        while (currentNode !== null) {
            path.unshift({ x: currentNode.x, y: currentNode.y });
            currentNode = currentNode.parent;
        }

        // Remove the first node (current player position) since we don't need to move there
        if (path.length > 0) {
            path.shift();
        }

        return path;
    }

    private drawConnectedPaths() {
        const graphics = this.add.graphics();
        graphics.lineStyle(2, 0xffff00, 0.7); // Yellow lines
        
        for (let row = 0; row < this.maze.length; row++) {
            for (let col = 0; col < this.maze[row].length; col++) {
                if (this.maze[row][col] !== 1) { // Current cell is not a wall
                    const currentX = this.getWorldX(col);
                    const currentY = this.getWorldY(row);
                    
                    // Check right neighbor
                    if (col + 1 < this.maze[row].length && this.maze[row][col + 1] !== 1) {
                        const rightX = this.getWorldX(col + 1);
                        graphics.lineBetween(currentX, currentY, rightX, currentY);
                    }
                    
                    // Check bottom neighbor
                    if (row + 1 < this.maze.length && this.maze[row + 1][col] !== 1) {
                        const bottomY = this.getWorldY(row + 1);
                        graphics.lineBetween(currentX, currentY, currentX, bottomY);
                    }
                }
            }
        }
    }

    private generateMaze() {
        const offsetX = 100;
        const offsetY = 150;

        for (let row = 0; row < this.maze.length; row++) {
            for (let col = 0; col < this.maze[row].length; col++) {
                const x = offsetX + col * this.tileSize;
                const y = offsetY + row * this.tileSize;
                
                switch (this.maze[row][col]) {
                    case 1: // Wall
                        const wall = this.add.rectangle(x, y, this.tileSize, this.tileSize, 0x0000ff);
                        this.physics.add.existing(wall, true); // true makes it immovable
                        this.walls.push(wall);
                        break;
                    case 2: // Pellet
                        const pellet = this.add.circle(x, y, 3, 0xffff00);
                        this.physics.add.existing(pellet);
                        this.pellets.push(pellet);
                        break;
                    case 3: // Power pellet
                        const powerPellet = this.add.circle(x, y, 8, 0xffff00);
                        this.physics.add.existing(powerPellet);
                        this.powerPellets.push(powerPellet);
                        break;
                }
            }
        }
    }

    private createPlayer() {
        // Start at grid position (9, 15)
        this.targetGridX = 9;
        this.targetGridY = 15;
        
        const startX = this.getWorldX(this.targetGridX);
        const startY = this.getWorldY(this.targetGridY);
        
        this.player = this.add.circle(startX, startY, 12, 0xffff00);
        this.physics.add.existing(this.player);
        
        const playerBody = this.player.body as Phaser.Physics.Arcade.Body;
        playerBody.setCollideWorldBounds(true);
    }

    private createGhosts() {
        const ghostColors = [0xff0000, 0xffc0cb, 0x00ffff, 0xffa500]; // Red, Pink, Cyan, Orange
        const startPositions = [
            { x: this.getWorldX(9), y: this.getWorldY(9) },
            { x: this.getWorldX(10), y: this.getWorldY(9) },
            { x: this.getWorldX(8), y: this.getWorldY(9) },
            { x: this.getWorldX(11), y: this.getWorldY(9) }
        ];

        for (let i = 0; i < 4; i++) {
            const ghost = this.add.circle(
                startPositions[i].x,
                startPositions[i].y,
                12,
                this.powerMode ? 0x0000ff : ghostColors[i]
            );
            this.physics.add.existing(ghost);
            
            const ghostBody = ghost.body as Phaser.Physics.Arcade.Body;
            ghostBody.setCollideWorldBounds(true);
            
            // Set initial direction to one of the 4 cardinal directions only
            const directions = [
                { x: this.ghostSpeed, y: 0 },   // Right
                { x: -this.ghostSpeed, y: 0 },  // Left
                { x: 0, y: this.ghostSpeed },   // Down
                { x: 0, y: -this.ghostSpeed }   // Up
            ];
            const initialDirection = directions[Math.floor(Math.random() * directions.length)];
            ghostBody.setVelocity(initialDirection.x, initialDirection.y);
            
            this.ghosts.push(ghost);
        }
    }

    private setupCollisions() {
        // REMOVED: Physical colliders - using pure visual debug system
        // this.physics.add.collider(this.player, this.walls);
        // this.ghosts.forEach(ghost => {
        //     this.physics.add.collider(ghost, this.walls);
        // });
    }

    private setupPlayerCollisions() {
        this.physics.add.overlap(this.player, this.pellets, (player, pellet) => {
            const pelletObj = pellet as GameObjects.Arc;
            pelletObj.destroy();
            this.pellets = this.pellets.filter(p => p !== pelletObj);
            this.score += 10;
            this.updateScore();
            this.checkWinCondition();
        });

        this.physics.add.overlap(this.player, this.powerPellets, (player, powerPellet) => {
            const powerPelletObj = powerPellet as GameObjects.Arc;
            powerPelletObj.destroy();
            this.powerPellets = this.powerPellets.filter(p => p !== powerPelletObj);
            this.score += 50;
            this.updateScore();
            this.activatePowerMode();
        });

        this.physics.add.overlap(this.player, this.ghosts, (player, ghost) => {
            if (this.powerMode) {
                this.eatGhost(ghost as GameObjects.Arc);
            } else {
                this.playerDied();
            }
        });
    }

    private setupGhostAI() {
        this.time.addEvent({
            delay: 2000,
            callback: this.updateGhostMovement,
            callbackScope: this,
            loop: true
        });
    }

    private updateGhostMovement() {
        this.ghosts.forEach(ghost => {
            const ghostBody = ghost.body as Phaser.Physics.Arcade.Body;
            
            // Only change direction if ghost is not moving or randomly
            if (Math.abs(ghostBody.velocity.x) < 10 && Math.abs(ghostBody.velocity.y) < 10 || Math.random() < 0.3) {
                const directions = [
                    { x: this.ghostSpeed, y: 0 },   // Right
                    { x: -this.ghostSpeed, y: 0 },  // Left
                    { x: 0, y: this.ghostSpeed },   // Down
                    { x: 0, y: -this.ghostSpeed }   // Up
                ];
                
                const randomDirection = directions[Math.floor(Math.random() * directions.length)];
                ghostBody.setVelocity(randomDirection.x, randomDirection.y);
            }
        });
    }

    private activatePowerMode() {
        this.powerMode = true;
        
        // Change ghost colors to blue
        this.ghosts.forEach(ghost => {
            ghost.setFillStyle(0x0000ff);
        });

        // Clear existing timer if any
        if (this.powerModeTimer) {
            this.powerModeTimer.destroy();
        }

        // Set timer to deactivate power mode
        this.powerModeTimer = this.time.delayedCall(8000, () => {
            this.deactivatePowerMode();
        });
    }

    private deactivatePowerMode() {
        this.powerMode = false;
        const ghostColors = [0xff0000, 0xffc0cb, 0x00ffff, 0xffa500];
        
        this.ghosts.forEach((ghost, index) => {
            ghost.setFillStyle(ghostColors[index]);
        });
    }

    private eatGhost(ghost: GameObjects.Arc) {
        this.score += 200;
        this.updateScore();
        
        // Respawn ghost at center
        ghost.x = this.getWorldX(9);
        ghost.y = this.getWorldY(9);
    }

    private playerDied() {
        this.lives--;
        this.updateLives();
        
        if (this.lives <= 0) {
            this.gameOver();
        } else {
            // Reset player position to grid
            this.targetGridX = 9;
            this.targetGridY = 15;
            this.player.x = this.getWorldX(this.targetGridX);
            this.player.y = this.getWorldY(this.targetGridY);
            
            // Stop movement
            this.currentDirection = { x: 0, y: 0 };
            this.bufferedDirection = { x: 0, y: 0 };
            this.isMoving = false;
            const playerBody = this.player.body as Phaser.Physics.Arcade.Body;
            playerBody.setVelocity(0, 0);
        }
    }

    private updateScore() {
        this.scoreText.setText('Score: ' + this.score);
    }

    private updateLives() {
        this.livesText.setText('Lives: ' + this.lives);
    }

    private checkWinCondition() {
        if (this.pellets.length === 0 && this.powerPellets.length === 0) {
            this.gameWon();
        }
    }

    private gameWon() {
        this.gameOverText = this.add.text(512, 384, 'YOU WIN!\nPress SPACE to return to menu', {
            fontSize: '48px',
            color: '#00ff00',
            align: 'center'
        }).setOrigin(0.5);

        this.input.keyboard!.once('keydown-SPACE', () => {
            this.scene.start('MainMenu');
        });
    }

    private gameOver() {
        this.gameOverText = this.add.text(512, 384, 'GAME OVER\nPress SPACE to return to menu', {
            fontSize: '48px',
            color: '#ff0000',
            align: 'center'
        }).setOrigin(0.5);

        this.input.keyboard!.once('keydown-SPACE', () => {
            this.scene.start('MainMenu');
        });
    }

    // COMMENTED OUT - Grid movement system
    // private updateGridMovement() {
    //     const playerBody = this.player.body as Phaser.Physics.Arcade.Body;
        
    //     // If not currently moving, try to start movement
    //     if (!this.isMoving) {
    //         // Try buffered direction first
    //         if (this.bufferedDirection.x !== 0 || this.bufferedDirection.y !== 0) {
    //             if (this.canMoveToGridPosition(this.targetGridX + this.bufferedDirection.x, this.targetGridY + this.bufferedDirection.y)) {
    //                 this.startGridMovement(this.bufferedDirection);
    //                 this.bufferedDirection = { x: 0, y: 0 };
    //             }
    //         }
    //         // Try current direction if no buffered direction or buffered direction blocked
    //         else if (this.currentDirection.x !== 0 || this.currentDirection.y !== 0) {
    //             if (this.canMoveToGridPosition(this.targetGridX + this.currentDirection.x, this.targetGridY + this.currentDirection.y)) {
    //                 this.startGridMovement(this.currentDirection);
    //             }
    //         }
    //     }

    //     // Handle ongoing movement
    //     if (this.isMoving) {
    //         const targetWorldX = this.getWorldX(this.targetGridX);
    //         const targetWorldY = this.getWorldY(this.targetGridY);
            
    //         const deltaX = targetWorldX - this.player.x;
    //         const deltaY = targetWorldY - this.player.y;
    //         const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            
    //         // If close enough to target, snap to it and stop moving
    //         if (distance < 2) {
    //             this.player.x = targetWorldX;
    //             this.player.y = targetWorldY;
    //             playerBody.setVelocity(0, 0);
    //             this.isMoving = false;
                
    //             // Try to continue in same direction if possible
    //             if (this.canMoveToGridPosition(this.targetGridX + this.currentDirection.x, this.targetGridY + this.currentDirection.y)) {
    //                 this.startGridMovement(this.currentDirection);
    //             }
    //         } else {
    //             // Continue moving towards target
    //             const speed = this.playerSpeed;
    //             const velocityX = (deltaX / distance) * speed;
    //             const velocityY = (deltaY / distance) * speed;
    //             playerBody.setVelocity(velocityX, velocityY);
    //         }
    //     }
    // }

    // COMMENTED OUT - Start grid movement
    // private startGridMovement(direction: { x: number, y: number }) {
    //     this.currentDirection = { ...direction };
    //     this.targetGridX += direction.x;
    //     this.targetGridY += direction.y;
    //     this.isMoving = true;
        
    //     // Update debug target position
    //     this.updateDebugTarget();
    // }

    // COMMENTED OUT - Debug methods
    // private createDebugTarget() {
    //     // Create a small red rectangle to show target position
    //     this.debugTarget = this.add.rectangle(
    //         this.getWorldX(this.targetGridX),
    //         this.getWorldY(this.targetGridY),
    //         8, 8, 0xff0000, 0.8
    //     );
    //     this.debugTarget.setDepth(200); // Make sure it's visible above other objects
        
    //     // Create debug text
    //     this.debugText = this.add.text(16, 120, '', {
    //         fontSize: '16px',
    //         color: '#ffffff',
    //         backgroundColor: '#000000',
    //         padding: { x: 8, y: 4 }
    //     });
    //     this.debugText.setDepth(300);
    // }

    // private updateDebugTarget() {
    //     if (this.debugTarget) {
    //         this.debugTarget.x = this.getWorldX(this.targetGridX);
    //         this.debugTarget.y = this.getWorldY(this.targetGridY);
    //     }
    // }

    // private showBufferedDirection() {
    //     let debugInfo = '';
        
    //     if (this.bufferedDirection.x !== 0 || this.bufferedDirection.y !== 0) {
    //         // Calculate where the player would move if buffered direction is executed
    //         const bufferedTargetX = this.targetGridX + this.bufferedDirection.x;
    //         const bufferedTargetY = this.targetGridY + this.bufferedDirection.y;
            
    //         const directionName = this.getDirectionName(this.bufferedDirection);
    //         debugInfo = `Buffered: ${directionName} -> (${bufferedTargetX}, ${bufferedTargetY})`;
            
    //         // Check if the buffered move is valid
    //         if (this.canMoveToGridPosition(bufferedTargetX, bufferedTargetY)) {
    //             // Show buffered target with a different color (yellow)
    //             if (this.debugTarget) {
    //                 this.debugTarget.setFillStyle(0xffff00, 0.8); // Yellow for buffered
    //                 this.debugTarget.x = this.getWorldX(bufferedTargetX);
    //                 this.debugTarget.y = this.getWorldY(bufferedTargetY);
    //             }
    //             debugInfo += ' ✓';
    //         } else {
    //             // Show current target in red (blocked)
    //             if (this.debugTarget) {
    //                 this.debugTarget.setFillStyle(0xff0000, 0.8); // Red for blocked
    //                 this.updateDebugTarget();
    //             }
    //             debugInfo += ' ✗ BLOCKED';
    //         }
    //     } else {
    //         // No buffered direction, show current target in green
    //         if (this.debugTarget) {
    //             this.debugTarget.setFillStyle(0x00ff00, 0.8); // Green for current
    //             this.updateDebugTarget();
    //         }
    //         debugInfo = `Current Target: (${this.targetGridX}, ${this.targetGridY})`;
    //     }
        
    //     // Add current position and movement state
    //     const currentGridX = this.getGridX(this.player.x);
    //     const currentGridY = this.getGridY(this.player.y);
    //     const currentDir = this.getDirectionName(this.currentDirection);
        
    //     debugInfo += `\nPosition: (${currentGridX}, ${currentGridY})`;
    //     debugInfo += `\nMoving: ${this.isMoving ? 'YES' : 'NO'}`;
    //     debugInfo += `\nDirection: ${currentDir}`;
        
    //     if (this.debugText) {
    //         this.debugText.setText(debugInfo);
    //     }
    // }

    // private getDirectionName(direction: { x: number, y: number }): string {
    //     if (direction.x === -1) return 'LEFT';
    //     if (direction.x === 1) return 'RIGHT';
    //     if (direction.y === -1) return 'UP';
    //     if (direction.y === 1) return 'DOWN';
    //     return 'NONE';
    // }

    private canMoveToGridPosition(gridX: number, gridY: number): boolean {
        // Check bounds
        if (gridX < 0 || gridX >= this.maze[0].length || gridY < 0 || gridY >= this.maze.length) {
            return false;
        }
        
        // Check if position is a wall
        return this.maze[gridY][gridX] !== 1;
    }

    private getWorldX(gridX: number): number {
        return 100 + gridX * this.tileSize;
    }

    private getWorldY(gridY: number): number {
        return 150 + gridY * this.tileSize;
    }

    private getGridX(worldX: number): number {
        return Math.round((worldX - 100) / this.tileSize);
    }

    private getGridY(worldY: number): number {
        return Math.round((worldY - 150) / this.tileSize);
    }



    changeScene() {
        this.scene.start('MainMenu');
    }
} 