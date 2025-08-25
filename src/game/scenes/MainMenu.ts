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
        
        // Start menu background music with longer delay to ensure audio system is ready
        this.time.delayedCall(500, () => {
            this.menuMusic = this.sound.add('coffee-break-music', {
                loop: true,
                volume: 0.25
            });
            this.menuMusic.play();
            console.log('Menu music started');
        });

        // Add input for starting the game (keeping P key as backup)
        this.input.keyboard!.on('keydown-P', () => {
            console.log('Starting game via P key');
            this.menuMusic.stop(); // Stop menu music when starting game
            this.scene.start('PacTest2');
        });

        // Add Enter key as alternative
        this.input.keyboard!.on('keydown-ENTER', () => {
            console.log('Starting game via Enter key');
            this.menuMusic.stop(); // Stop menu music when starting game
            this.scene.start('PacTest2');
        });

        EventBus.emit('current-scene-ready', this);
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
