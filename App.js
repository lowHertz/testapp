import ResourceManager from './ResourceManager.js';
import PlayerManager from './PlayerManager.js';
import GameManager from './GameManager.js';
import UIManager from './UIManager.js';

const RESOLUTION = 4,
WIDTH = 375,
HEIGHT = 600,
ASSETS_DIR = 'assets',
SPRITESHEETS = ['obstacle_1'],
SEPARATED_TEXTURES = ['dark.png','tap.png','ground_0.png','ground_1.png','background_0.png','background_1.png','sun.png','buildings_far.png','buildings_near.png','obstacle_0.png','obstacle_2.png','obstacle_3.png','car.png','clouds_0.png','ground_object_0.png','ground_object_1.png','ground_object_2.png','player_idle_0.png','player_idle_1.png','player_idle_2.png','player_idle_3.png','player_idle_4.png','player_idle_5.png','player_idle_6.png','player_idle_7.png','player_idle_8.png','player_idle_9.png','player_idle_10.png','player_idle_11.png','player_idle_12.png','player_run_0.png','player_run_1.png','player_run_2.png','player_run_3.png','player_run_4.png','player_run_5.png','player_jump_0.png','player_jump_1.png','player_jump_2.png','player_jump_3.png','player_sit_0.png','player_sit_1.png','player_sit_2.png','player_sit_3.png'],
SOUNDS = [];

window.DEBUG_MODE = 1;

export default class extends PIXI.Application {
    #_playerData = new PlayerManager();
    #_uiManager = new UIManager();
    #_gameManager;

    constructor () {
        super({
            width: WIDTH,
            height: HEIGHT,
            resolution: RESOLUTION,
            view: document.querySelector('canvas')
        });

        this.#_init();
    };

    async #_init () {
        if(await this.#_playerData.init(window.DEBUG_MODE ? 1 : window.Telegram.WebApp?.initDataUnsafe?.user?.id)) return console.log('NO USER, APP HAS NOT BEEN STARTED');

        this.#_gameManager = new GameManager(
            this.#_playerData,
            await (new ResourceManager(ASSETS_DIR)).loadAssets(SPRITESHEETS, SEPARATED_TEXTURES, SOUNDS),
            {
                width: this.screen.width,
                height: this.screen.height
            }
        );
        this.stage.addChild(this.#_gameManager.getGraphicsContainer());

        this.#_uiManager.init(this.#_gameManager, this.#_playerData);

        this.stage.eventMode = 'static';
    
        this.ticker.add(() => {
            this.#_resize();

            this.#_gameManager.update(this.ticker.elapsedMS / 1000);
        });
    };

    #_resize () {
        const ratio = WIDTH / HEIGHT,
        width = window.innerWidth,
        height = window.innerHeight;

        let newWidth, newHeight;
    
        if(width / height > ratio) {
            newHeight = height;
            newWidth = height * ratio;
        } else {
            newWidth = width;
            newHeight = width / ratio;
        };
    
        this.renderer.resize(newWidth, newHeight);
        this.stage.scale.set(newWidth / WIDTH, newHeight / HEIGHT);
    
        this.view.style.width = `${newWidth}px`;
        this.view.style.height = `${newHeight}px`;
        this.view.style.margin = 'auto';
    };
};