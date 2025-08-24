import { useRef, useState, useEffect } from 'react';
import { IRefPhaserGame, PhaserGame } from './PhaserGame';
import { MainMenu } from './game/scenes/MainMenu';
import { EventBus } from './game/EventBus';

interface GameState {
    score: number;
    lives: number;
    level: number;
    isPaused: boolean;
}

function App()
{
    // The sprite can only be moved in the MainMenu Scene
    const [canMoveSprite, setCanMoveSprite] = useState(true);
    const [currentScene, setCurrentScene] = useState<string>('MainMenu');
    const [gameState, setGameState] = useState<GameState>({
        score: 0,
        lives: 3,
        level: 1,
        isPaused: false
    });

    //  References to the PhaserGame component (game and scene are exposed)
    const phaserRef = useRef<IRefPhaserGame | null>(null);
    const [spritePosition, setSpritePosition] = useState({ x: 0, y: 0 });

    useEffect(() => {
        // Listen for game events from Phaser
        EventBus.on('score-update', (newScore: number) => {
            setGameState(prev => ({ ...prev, score: newScore }));
        });

        EventBus.on('lives-update', (newLives: number) => {
            setGameState(prev => ({ ...prev, lives: newLives }));
        });

        EventBus.on('game-pause', (paused: boolean) => {
            setGameState(prev => ({ ...prev, isPaused: paused }));
        });

        return () => {
            EventBus.removeListener('score-update');
            EventBus.removeListener('lives-update');
            EventBus.removeListener('game-pause');
        };
    }, []);

    const changeScene = () => {

        if(phaserRef.current)
        {     
            const scene = phaserRef.current.scene as MainMenu;
            
            if (scene)
            {
                scene.changeScene();
            }
        }
    }

    const startGame = () => {
        if(phaserRef.current && phaserRef.current.scene)
        {
            // Reset game state when starting new game
            setGameState({
                score: 0,
                lives: 3,
                level: 1,
                isPaused: false
            });
            phaserRef.current.scene.scene.start('PacTest2');
        }
    }

    const backToMenu = () => {
        if(phaserRef.current && phaserRef.current.scene)
        {
            phaserRef.current.scene.scene.start('MainMenu');
        }
    }

    const togglePause = () => {
        if(phaserRef.current && phaserRef.current.scene && currentScene === 'PacTest2')
        {
            const scene = phaserRef.current.scene;
            if (gameState.isPaused) {
                scene.scene.resume();
            } else {
                scene.scene.pause();
            }
            setGameState(prev => ({ ...prev, isPaused: !prev.isPaused }));
        }
    }

    const moveSprite = () => {

        if(phaserRef.current)
        {

            const scene = phaserRef.current.scene as MainMenu;

            if (scene && scene.scene.key === 'MainMenu')
            {
                // Get the update logo position
                scene.moveLogo(({ x, y }) => {

                    setSpritePosition({ x, y });

                });
            }
        }

    }

    const addSprite = () => {

        if (phaserRef.current)
        {
            const scene = phaserRef.current.scene;

            if (scene)
            {
                // Add more stars
                const x = Phaser.Math.Between(64, scene.scale.width - 64);
                const y = Phaser.Math.Between(64, scene.scale.height - 64);
    
                //  `add.sprite` is a Phaser GameObjectFactory method and it returns a Sprite Game Object instance
                const star = scene.add.sprite(x, y, 'star');
    
                //  ... which you can then act upon. Here we create a Phaser Tween to fade the star sprite in and out.
                //  You could, of course, do this from within the Phaser Scene code, but this is just an example
                //  showing that Phaser objects and systems can be acted upon from outside of Phaser itself.
                scene.add.tween({
                    targets: star,
                    duration: 500 + Math.random() * 1000,
                    alpha: 0,
                    yoyo: true,
                    repeat: -1
                });
            }
        }
    }

    // Event emitted from the PhaserGame component
    const currentSceneChange = (scene: Phaser.Scene) => {
        setCanMoveSprite(scene.scene.key !== 'MainMenu');
        setCurrentScene(scene.scene.key);
    }

    return (
        <div id="app">
            <PhaserGame ref={phaserRef} currentActiveScene={currentSceneChange} />
            
            {/* Main Menu UI Overlay */}
            {currentScene === 'MainMenu' && (
                <div className="menu-overlay">
                    <div className="menu-container">
                        <h1 className="game-title">Data Dash</h1>
                        <p className="game-subtitle">Navigate the digital maze and collect all the data!</p>
                        <div className="menu-buttons">
                            <button className="menu-button primary" onClick={startGame}>
                                Start Game
                            </button>
                            <button className="menu-button secondary">
                                Instructions
                            </button>
                        </div>
                        <div className="controls-info">
                            <p>Use arrow keys to move • Press Enter or P to start</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Game UI Overlay */}
            {currentScene === 'PacTest2' && (
                <div className="game-overlay">
                    <div className="game-hud">
                        <div className="hud-left">
                            <div className="score">Score: {gameState.score.toLocaleString()}</div>
                            <div className="lives">Lives: {gameState.lives}</div>
                            <div className="level">Level: {gameState.level}</div>
                        </div>
                        <div className="hud-right">
                            <button 
                                className="game-button pause-btn" 
                                onClick={togglePause}
                                title={gameState.isPaused ? "Resume" : "Pause"}
                            >
                                {gameState.isPaused ? '▶️' : '⏸️'}
                            </button>
                            <button 
                                className="game-button menu-btn" 
                                onClick={backToMenu}
                                title="Back to Menu"
                            >
                                🏠
                            </button>
                        </div>
                    </div>
                    
                    {/* Pause Overlay */}
                    {gameState.isPaused && (
                        <div className="pause-overlay">
                            <div className="pause-container">
                                <h2>Game Paused</h2>
                                <div className="pause-buttons">
                                    <button className="menu-button primary" onClick={togglePause}>
                                        Resume Game
                                    </button>
                                    <button className="menu-button secondary" onClick={backToMenu}>
                                        Back to Menu
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

export default App
