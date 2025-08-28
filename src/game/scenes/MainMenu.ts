import { GameObjects, Scene } from 'phaser';

import { EventBus } from '../EventBus';

export class MainMenu extends Scene
{
    background: GameObjects.Image;
    logo: GameObjects.Image;
    logoTween: Phaser.Tweens.Tween | null;
    menuMusic: Phaser.Sound.BaseSound;

    constructor ()
    {
        super('MainMenu');
    }

    create ()
    {
        console.log('MainMenu scene created');
        
        // Try to start menu music, handling browser autoplay restrictions
        this.startMenuMusic();

        // Add input for starting the game (keeping P key as backup)
        this.input.keyboard!.on('keydown-P', () => {
            console.log('Starting game via P key');
            if (this.menuMusic) {
                this.menuMusic.stop(); // Stop menu music when starting game
            }
            this.scene.start('PacTest2');
        });

        // Add Enter key as alternative
        this.input.keyboard!.on('keydown-ENTER', () => {
            console.log('Starting game via Enter key');
            if (this.menuMusic) {
                this.menuMusic.stop(); // Stop menu music when starting game
            }
            this.scene.start('PacTest2');
        });

        EventBus.emit('current-scene-ready', this);
    }

    private startMenuMusic() {
        // Try to play music immediately, but set up fallback for user interaction
        this.time.delayedCall(500, () => {
            this.attemptToPlayMusic();
        });
        
        // Also set up listeners for user interaction as fallback
        const unlockAudio = () => {
            console.log('User interaction detected, attempting to start menu music');
            if (!this.menuMusic || !this.menuMusic.isPlaying) {
                this.attemptToPlayMusic();
            }
            // Remove listeners after first interaction
            this.input.off('pointerdown', unlockAudio);
            this.input.keyboard?.off('keydown', unlockAudio);
        };
        
        this.input.once('pointerdown', unlockAudio);
        this.input.keyboard?.once('keydown', unlockAudio);
    }

    private attemptToPlayMusic() {
        try {
            if (!this.menuMusic) {
                this.menuMusic = this.sound.add('coffee-break-music', {
                    loop: true,
                    volume: 0.25
                });
            }
            
            if (!this.menuMusic.isPlaying) {
                this.menuMusic.play();
                console.log('Menu music started successfully');
            }
        } catch (error) {
            console.log('Failed to start menu music:', error);
            // Retry after a short delay
            this.time.delayedCall(1000, () => {
                this.attemptToPlayMusic();
            });
        }
    }

    shutdown() {
        console.log('MainMenu scene shutting down');
        if (this.menuMusic) {
            this.menuMusic.stop();
        }
    }

    moveLogo (vueCallback: ({ x, y }: { x: number, y: number }) => void)
    {
        if (this.logoTween)
        {
            if (this.logoTween.isPlaying())
            {
                this.logoTween.pause();
            }
            else
            {
                this.logoTween.play();
            }
        } 
        else
        {
            this.logoTween = this.tweens.add({
                targets: this.logo,
                x: { value: 750, duration: 3000, ease: 'Back.easeInOut' },
                y: { value: 80, duration: 1500, ease: 'Sine.easeOut' },
                yoyo: true,
                repeat: -1,
                onUpdate: () => {
                    if (vueCallback)
                    {
                        vueCallback({
                            x: Math.floor(this.logo.x),
                            y: Math.floor(this.logo.y)
                        });
                    }
                }
            });
        }
    }
}
