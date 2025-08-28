import { useRef, useState, useEffect } from 'react';
import { IRefPhaserGame, PhaserGame } from './PhaserGame';
import { MainMenu } from './game/scenes/MainMenu';
import { EventBus } from './game/EventBus';

interface GameState {
    score: number;
    lives: number;
    level: number;
    isPaused: boolean;
    progression: number; // Current progression value (0-100)
    maxProgression: number; // Max progression value (10% of total dots)
    reward: number; // Current reward level in MB
    isGameWon: boolean; // Game win state
    isGameOver: boolean; // Game over state
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
        isPaused: false,
        progression: 0,
        maxProgression: 0,
        reward: 0,
        isGameWon: false,
        isGameOver: false
    });
    
    const [showRewardPopup, setShowRewardPopup] = useState(false);

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

        EventBus.on('progression-update', (progression: number) => {
            setGameState(prev => ({ ...prev, progression: progression }));
        });

        EventBus.on('max-progression-update', (maxProgression: number) => {
            setGameState(prev => ({ ...prev, maxProgression: maxProgression }));
        });

        EventBus.on('reward-update', (reward: number) => {
            setGameState(prev => ({ ...prev, reward: reward }));
        });

        EventBus.on('show-reward-popup', () => {
            setShowRewardPopup(true);
            setTimeout(() => setShowRewardPopup(false), 2000); // Hide after 2 seconds
        });

        EventBus.on('game-won', () => {
            setGameState(prev => ({ ...prev, isGameWon: true }));
        });

        EventBus.on('game-over', () => {
            setGameState(prev => ({ ...prev, isGameOver: true, isPaused: false }));
        });

        return () => {
            EventBus.removeListener('score-update');
            EventBus.removeListener('lives-update');
            EventBus.removeListener('game-pause');
            EventBus.removeListener('progression-update');
            EventBus.removeListener('max-progression-update');
            EventBus.removeListener('reward-update');
            EventBus.removeListener('show-reward-popup');
            EventBus.removeListener('game-won');
            EventBus.removeListener('game-over');
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
            // Stop all sounds before starting game
            phaserRef.current.scene.sound.stopAll();
            
            // Reset game state when starting new game
            setGameState({
                score: 0,
                lives: 3,
                level: 1,
                isPaused: false,
                progression: 0,
                maxProgression: 0,
                reward: 0,
                isGameWon: false,
                isGameOver: false
            });
            phaserRef.current.scene.scene.start('PacTest2');
        }
    }

    const backToMenu = () => {
        if(phaserRef.current && phaserRef.current.scene)
        {
            // Stop any playing sounds before switching scenes
            phaserRef.current.scene.sound.stopAll();
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

    const restartGame = () => {
        if(phaserRef.current && phaserRef.current.scene)
        {
            // Reset game state
            setGameState({
                score: 0,
                lives: 3,
                level: 1,
                isPaused: false,
                progression: 0,
                maxProgression: 0,
                reward: 0,
                isGameWon: false,
                isGameOver: false
            });
            // Stop all sounds and restart scene fresh
            phaserRef.current.scene.sound.stopAll();
            phaserRef.current.scene.scene.stop();
            phaserRef.current.scene.scene.start('PacTest2');
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
                        <h1 className="game-title">Gigs Gobbler</h1>
                        <p className="game-subtitle">Navigate the digital maze and collect all the data!</p>
                        <div className="menu-buttons">
                            <button className="menu-button primary" onClick={startGame}>
                                Start Game
                            </button>
                        </div>
                        <div className="controls-info">
                            <p>Use arrow keys or swipe screen to change direction</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Game UI Overlay */}
            {currentScene === 'PacTest2' && (
                <div className="game-overlay">
                    {/* Top HUD Row */}
                    <div className="top-hud">
                        <div className="top-hud-left">
                            <div className="lives">Lives: {gameState.lives}</div>
                        </div>
                        <div className="top-hud-right">
                            <button 
                                className="game-button pause-btn" 
                                onClick={togglePause}
                                disabled={gameState.isGameOver}
                                title={gameState.isGameOver ? "Game Over" : (gameState.isPaused ? "Resume" : "Pause")}
                                style={{ opacity: gameState.isGameOver ? 0.5 : 1, cursor: gameState.isGameOver ? 'not-allowed' : 'pointer' }}
                            >
                                {gameState.isPaused ? '▶' : '⏸'}
                            </button>
                            <button 
                                className="game-button menu-btn" 
                                onClick={backToMenu}
                                title="Back to Menu"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* Progress Bar Section */}
                    <div className="progress-section">
                        <div className="progress-bar-top">
                            <div 
                                className="progress-fill-top" 
                                style={{ width: `${gameState.maxProgression > 0 ? (gameState.progression / gameState.maxProgression) * 100 : 0}%` }}
                            ></div>
                            {/* Milestone dots */}
                            {[...Array(10)].map((_, index) => (
                                <div 
                                    key={index}
                                    className={`milestone-dot ${gameState.progression >= (gameState.maxProgression * (index + 1) / 10) ? 'completed' : ''}`}
                                    style={{ left: `${(index + 1) * 10}%` }}
                                >
                                    
                                </div>
                            ))}
                        </div>
                        <div className="reward-display">
                            <div className="reward">Reward: {gameState.reward}MB</div>
                        </div>
                    </div>

                    {/* Reward Popup */}
                    {showRewardPopup && (
                        <div className="reward-popup">
                            +100MB Earned!
                        </div>
                    )}
                    
                    {/* Pause Overlay */}
                    {gameState.isPaused && !gameState.isGameOver && (
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

                    {/* Game Over Overlay */}
                    {gameState.isGameOver && (
                        <div className="pause-overlay">
                            <div className="pause-container">
                                <h2>Game Over</h2>
                                <div className="win-summary">
                                    <div className="summary-item">
                                        <span className="summary-label">Final Score</span>
                                        <span className="summary-value">{gameState.score.toLocaleString()}</span>
                                    </div>
                                    <div className="summary-item">
                                        <span className="summary-label">Data Collected</span>
                                        <span className="summary-value">{gameState.progression.toFixed(1)} MB</span>
                                    </div>
                                </div>
                                <div className="pause-buttons">
                                    <button className="menu-button primary" onClick={restartGame}>
                                        Play Again
                                    </button>
                                    <button className="menu-button secondary" onClick={backToMenu}>
                                        Main Menu
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Win Screen Overlay */}
                    {gameState.isGameWon && (
                        <div className="win-overlay">
                            <div className="win-container">
                                <h1>🎉 Data Collection Complete! 🎉</h1>
                                <div className="win-summary">
                                    <div className="summary-item">
                                        <span className="summary-label">Final Score:</span>
                                        <span className="summary-value">{gameState.score.toLocaleString()}</span>
                                    </div>
                                    <div className="summary-item">
                                        <span className="summary-label">Data Collected:</span>
                                        <span className="summary-value">{gameState.reward}MB</span>
                                    </div>
                                    <div className="summary-item">
                                        <span className="summary-label">Lives Remaining:</span>
                                        <span className="summary-value">{gameState.lives}</span>
                                    </div>
                                </div>
                                <div className="win-buttons">
                                    <button className="menu-button primary" onClick={restartGame}>
                                        Play Again
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
