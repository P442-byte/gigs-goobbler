import { Scene, GameObjects } from 'phaser';
import { EventBus } from '../EventBus';

export class PacTest2 extends Phaser.Scene {

    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private space!: Phaser.Input.Keyboard.Key;

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

    private pacman!: Phaser.GameObjects.Arc;
    private pacmanSpeed: number = 2;
    // private currentInputDirection: { x: number, y: number } = { x: 0, y: 0 };
    private newInputDirection: { x: number, y: number } = { x: 0, y: 0 };
    private tileXPlusInputDir: number = 0;
    private tileYPlusInputDir: number = 0;
    private nextWorldX: number = 0;
    private nextWorldY: number = 0;

    private blockedByWall: boolean = false;

    constructor() {
        super('PacTest2');
    }
    
    create(){
        this.cursors = this.input.keyboard!.createCursorKeys();
        this.space = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

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
        this.pacman = this.add.arc(spawnX , spawnY , 16, 0, 360, false, 0xffffff);
    }

    private createDot(spawnX: number, spawnY: number) {
        const dot = this.add.arc(spawnX, spawnY, 4, 0, 360, false, 0xffffff);
        this.dots.push(dot);
    }

    update(){
        if (!this.cursors) return;

        this.playerMovement();
    }

    private playerMovement(){
        if (this.cursors.left.isDown) {
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
            this.newInputDirection.x = -1;
            this.newInputDirection.y = 0;
            }
        }
        else if (this.cursors.right.isDown) {
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
                this.newInputDirection.x = 1;
                this.newInputDirection.y = 0;
            }
        }
        else if (this.cursors.up.isDown) {
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
                this.newInputDirection.x = 0;
                this.newInputDirection.y = -1;
            }
        }
        else if (this.cursors.down.isDown) {
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
                this.newInputDirection.x = 0;
                this.newInputDirection.y = 1;
            }
        }

        this.tileYPlusInputDir = Math.floor((this.pacman.y + (this.newInputDirection.y * 16.000001))/ this.tileSize);
        this.tileXPlusInputDir = Math.floor((this.pacman.x + (this.newInputDirection.x * 16.000001))/ this.tileSize);

        this.nextWorldX = this.tileXPlusInputDir * this.tileSize + this.tileSize / 2;
        this.nextWorldY = this.tileYPlusInputDir * this.tileSize + this.tileSize / 2;

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
}