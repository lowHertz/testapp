import Controller from './Controller.js';
import GraphicsManager from './GraphicsManager.js';
import SoundManager from './SoundManager.js';

const { Engine, Render, Composite, Bodies, Body, Events } = Matter,
getRandom = arr => arr[Math.floor(Math.random() * arr.length)];

const GAME_STATES = {
    IDLE: 0,
    STARTED: 1,
    WIN: 2,
    LOSE: 3 
},
OBSTACLES_TYPES = {
    DEATH: {
        bodySize: [60, 35],
        spriteSize: [85, 42]
    },
    COIN: {
        bodySize: [25, 25],
        spriteSize: [25, 25],
        animationSpeed: 0.85
    },
    POLICEMAN: {
        bodySize: [25, 200],
        spriteSize: [50, 53]
    },
    SPEEDUP: {
        bodySize: [40, 50],
        spriteSize: [37, 60]
    }
},
OBSTACLES_HIT_TYPES = {
    DEATH: 0,
    COIN: 1,
    POLICEMAN: 2,
    SPEEDUP: 3
}, SPEED_UP_TIME = 3;

export default class {
    #_render;
    #_engine;
    #_world;
    #_graphicsManager;
    #_soundManager;
    #_player = {
        data: null,
        currentAnim: -1,
        body: null, // ХИТБОКС
        positionX: 60, // СПАВН ХИТБОКСА ПО ИКСУ
        size: [20, 45], // РАЗМЕР ХИТБОКСА
        jumpPower: 7, // СИЛА ПРЫЖКА
        maxJumps: 1, // МАКС. КОЛ. ПРЫЖКОВ
        jumpCounts: 0, // ДОСТУПНОЕ КОЛ. ПРЫЖКОВ
        speedUpTime: 0, // ОСТАВШЕЕСЯ ВРЕМЯ УСКОРЕНИЯ
        canJump: false, // МОЖЕТ ЛИ ПРЫГНУТЬ
        crouch: false, // СОСТОЯНИЕ ПРИСЯДА
        controller: new Controller() // КОНТРОЛЛЕР ВВОДА
    };
    #_game = {
        id: -1,
        gravity: 0.98,
        score: 0,
        scoreReward: 0,
        maxScore: 0,
        time: 0,
        levelTime: 60,
        speedMultipliers: [1, 1.5],
        state: GAME_STATES.IDLE,
        night: false,
        nightTime: 0.8
    };
    #_ground = {
        body: null,
        position: [300, 178],
        size: [600, 100]
    };
    #_obstacles = {
        list: new Map(),
        spawnX: 700,
        removeX: -50,
        speed: [125, 125],
        spawnCooldown: 1,
        maxCount: 5,
        skyTypes: ['COIN'],
        skyOffsetY: 20
    };
    #_resultMessages = {
        [GAME_STATES.WIN]: 'GAME WIN!',
        [GAME_STATES.LOSE]: 'GAME OVER'
    };
    #_html = {
        gameContainer: document.querySelector('#game'),
        score: document.querySelector('#score'),
        result: document.querySelector('#result'),
        resultForm: document.querySelector('#resultForm'),
        progressBarSlider: document.querySelector('#progressBar-slider')
    };

    constructor (playerData, { separated, sheets, sounds }, screen) {
        this.#_player.data = playerData;

        this.#_graphicsManager = new GraphicsManager(
            {
                sheets,
                separated,
                separatedEntries: Object.entries(separated)
            },
            screen,
            this.#_player.size
        );

        this.#_soundManager = new SoundManager(sounds);

        this.#_init();
    };
    
    #_init () {
        this.#_engine = Engine.create({
            gravity: {
                y: this.#_game.gravity
            }
        });

        this.#_world = this.#_engine.world;

        Composite.add(
            this.#_world,
            [this.#_initPlayer(), this.#_initGround()]
        );

        this.#_graphicsManager.init();

        this.#_player.controller.init();

        this.#_initEventListeners();

        if(window.DEBUG_MODE) {
            return;

            this.#_render = Render.create({
                element: document.querySelector('#game'),
                engine: this.#_engine,
                options: {
                    width: 600,
                    height: 152,
                    showPositions: true
                }
            });

            document.querySelector('canvas').style.width = '100%';
            
            Render.run(this.#_render);
        };
    };

    getGraphicsContainer () {
        return this.#_graphicsManager.container;
    };

    update (delta) {
        delta = Math.min(0.016, delta);

        const input = this.#_player.controller.getInput();

        if(input[32] || input[87]) {
            if(this.#_player.canJump && (this.#_isState('IDLE') || this.#_isState('LOSE'))) {
                console.log('GAME STARTED');

                this.#_graphicsManager.toggleTutorialUI(false);

                this.#_graphicsManager.setPlayerAnimation('RUN');

                this.#_setState('STARTED');
            };

            if(this.#_player.jumpCounts > 0 && this.#_player.canJump && !this.#_player.crouch) {
                console.log('JUMP');

                this.#_player.jumpCounts--;
    
                this.#_player.canJump = false;

                this.#_graphicsManager.setPlayerAnimation('JUMP');
    
                Body.setVelocity(
                    this.#_player.body,
                    {
                        x: this.#_player.body.velocity.x,
                        y: -this.#_player.jumpPower
                    }
                );
            };
        } else this.#_player.canJump = true;

        if(this.#_isState('STARTED') || this.#_isState('IDLE')) {
            if(!input[40] && !input[83] && this.#_player.crouch) {
                console.log('UNCROUCH');
    
                Body.scale(this.#_player.body, 1, this.#_player.speedUpScaled ? 1 : 2);

                Body.setPosition(
                    this.#_player.body,
                    {
                        x: this.#_player.positionX,
                        y: this.#_ground.position[1] - (this.#_player.size[1] * 2 - 20)
                    }
                );

                this.#_graphicsManager.setPlayerAnimation(this.#_isState('STARTED') ? 'RUN' :  'IDLE');
    
                this.#_player.crouch = false;
            };
            
            if((input[40] || input[83]) && !this.#_player.crouch) {
                console.log('CROUCH');
    
                if(this.#_player.speedUpTime <= 0) {
                    Body.scale(this.#_player.body, 1, 0.5);

                    this.#_graphicsManager.setPlayerAnimation('SIT');
        
                    this.#_player.crouch = true;
                };

                Body.setPosition(
                    this.#_player.body,
                    {
                        x: this.#_player.positionX,
                        y: this.#_ground.position[1] - this.#_player.size[1]
                    }
                );
            };

            if(this.#_isState('STARTED')) {
                this.#_player.speedUpTime -= delta;

                if(this.#_player.speedUpTime < 0) {
                    this.#_player.speedUpTime = 0;

                    if(this.#_player.speedUpScaled) {
                        this.#_player.speedUpScaled = false;

                        Body.scale(this.#_player.body, 0.5, this.#_player.crouch ? 0.5 : 1);
                    };
                } else if(!this.#_player.speedUpScaled) {
                    this.#_player.speedUpScaled = true;

                    Body.scale(this.#_player.body, 2, this.#_player.crouch ? 2 : 1);
                };

                const isGameSpeedUp = this.#_isGameSpeedUp;

                this.#_graphicsManager.isGameSpeedUp = isGameSpeedUp;

                this.#_graphicsManager.player.sprite.visible = !isGameSpeedUp;
                this.#_graphicsManager.player.carSprite.visible = isGameSpeedUp;

                this.#_game.time += delta * (isGameSpeedUp + 1);

                const gameTimePassed = this.#_game.time / this.#_game.levelTime;

                this.#_html.progressBarSlider.style.width = `${gameTimePassed * 100}%`;

                if(gameTimePassed >= this.#_game.nightTime) {
                    if(!this.#_game.night) {
                        console.log('BACKGROUND IMAGE CHANGED');

                        this.#_game.night = true;

                        this.#_graphicsManager.setDayState(false);
                    };

                    if(gameTimePassed >= 1) {
                        console.log('GAME WON!');

                        this.#_setState('WIN');
                    };
                };

                this.#_obstacles.spawnCooldown -= delta;

                if(Math.random() >= 0.8 && this.#_obstacles.spawnCooldown <= 0 && this.#_obstacles.list.size < this.#_obstacles.maxCount) {
                    // ЭТО ПЕРЕДЕЛАТЬ

                    this.#_createObstacle(getRandom(Object.keys(OBSTACLES_TYPES)));

                    this.#_obstacles.spawnCooldown = 1 + 2 * Math.random();
                };

                [...this.#_obstacles.list.values()].map(body => {
                    Body.setPosition(
                        body,
                        {
                            x: body.position.x - (body.gameSpeed * this.#_game.speedMultipliers[isGameSpeedUp] * delta),
                            y: body.position.y
                        }
                    );
    
                    if(body.position.x <= this.#_obstacles.removeX) this.#_removeObstacle(body);
                });
            };

            Engine.update(this.#_engine, delta * 1000);

            Body.setAngle(this.#_player.body, 0);

            let playerBodyY = this.#_player.body.position.y;

            if(this.#_player.crouch) {
                if(this.#_player.speedUpScaled) playerBodyY = (this.#_ground.position[1] - this.#_ground.size[1] / 2) - this.#_player.size[1] / 2;
                else playerBodyY = (this.#_ground.position[1] - this.#_ground.size[1] / 2) - this.#_player.size[1] / 2 + this.#_player.size[1] / 4;
            };
            
            Body.setPosition(
                this.#_player.body,
                {
                    x: this.#_player.positionX,
                    y: playerBodyY
                }
            );

            if(!this.#_graphicsManager.player.carSprite.minY) this.#_graphicsManager.player.carSprite.minY = this.#_ground.position[1] - (this.#_ground.size[1] / 2 + this.#_player.size[1] / 2);

            this.#_graphicsManager.player.sprite.position.copyFrom(this.#_player.body.position);
            this.#_graphicsManager.player.sprite.position.y += this.#_graphicsManager.player.sprite.offsetY;
            this.#_graphicsManager.player.carSprite.position.copyFrom(this.#_player.body.position);
            this.#_graphicsManager.player.carSprite.position.x -= 7.5;
            this.#_graphicsManager.player.carSprite.position.y = Math.min(this.#_graphicsManager.player.carSprite.minY, this.#_graphicsManager.player.carSprite.position.y);

            [...this.#_obstacles.list.values()].map(obstacle => {
                obstacle.sprite.position.copyFrom(obstacle.position);

                obstacle.spriteTest.position.x = obstacle.position.x;
            });

            this.#_graphicsManager.update(
                delta,
                {
                    gameStarted: this.#_isState('STARTED'),
                    gameIdle: this.#_isState('IDLE')
                }
            );
        };
    };

    createLevel (score, gameId, maxScore) {
        console.log('LEVEL CREATED');

        this.#_game.id = gameId;

        this.#_game.time = this.#_player.speedUpTime = 0;

        if(this.#_player.speedUpScaled) {
            this.#_player.speedUpScaled = false;

            Body.scale(this.#_player.body, 0.5, this.#_player.crouch ? 0.5 : 1);
        };

        Body.setPosition(
            this.#_player.body,
            {
                x: this.#_player.positionX,
                y: this.#_ground.position[1] - this.#_player.size[1]
            }
        );

        this.#_setScore(score, maxScore);

        this.#_html.progressBarSlider.style.width = '0%';

        [...this.#_obstacles.list.values()].map(body => this.#_removeObstacle(body));

        this.#_player.controller.resetInput();

        this.#_graphicsManager.resetGraphics();

        this.#_setState('IDLE');
    };
    
    get speedUpTime () {
        return this.#_player.speedUpTime;
    };

    get #_isGameSpeedUp () {
        return +(this.#_player.speedUpTime > 0);
    };

    #_initPlayer () {
        const [width, height] = this.#_player.size;

        this.#_player.body = Bodies.rectangle(
            this.#_player.positionX,
            this.#_ground.position[1] - height * 2 - height / 2,
            width,
            height,
            { restitution: 0, frictionAir: 0 }
        );

        return this.#_player.body;
    };

    #_initGround () {
        const [x, y] = this.#_ground.position,
        [width, height] = this.#_ground.size,
        ground = Bodies.rectangle(
            x,
            y,
            width,
            height,
            { isStatic: true }
        );

        this.#_ground.body = ground.id;

        return ground;
    };

    #_initEventListeners () {
        document.addEventListener('visibilitychange', () => this.#_soundManager.changeVolume(document.hidden));

        Events.on(this.#_engine, 'collisionStart', ({ source: { detector: { collisions } } }) => {
            const plrId = this.#_player.body.id;

            collisions.map(({ bodyA, bodyB }) => {
                if(
                    (bodyA.id === plrId || bodyB.id === plrId)
                    &&
                    (bodyA.id !== this.#_ground.body && bodyB.id !== this.#_ground.body)
                ) {
                    const hitType = bodyA.hitType || bodyB.hitType || 0;

                    console.log('HITTED OBSTACLE', hitType);
    
                    this.#_removeObstacle([bodyA, bodyB][+(bodyA.id === plrId)]);
    
                    switch (hitType) {
                        case OBSTACLES_HIT_TYPES.DEATH:
                            console.log('GAME LOSE');
    
                            this.#_setState('LOSE');
    
                            break;
                        case OBSTACLES_HIT_TYPES.COIN:
                            console.log('ADD SCORE');
    
                            this.#_game.score = Math.min(this.#_game.maxScore, this.#_game.score + this.#_game.scoreReward);

                            this.#_updateScore();
    
                            break;
                        case OBSTACLES_HIT_TYPES.POLICEMAN:
                            console.log('REMOVE SCORE');

                            this.#_game.score = Math.max(0, this.#_game.score - this.#_game.scoreReward);

                            this.#_updateScore();
    
                            break;
                        case OBSTACLES_HIT_TYPES.SPEEDUP:
                            console.log('SPEED UP');

                            this.#_player.speedUpTime += SPEED_UP_TIME;
    
                            break;
                    };
                } else {
                    console.log('CAN JUMP');
        
                    this.#_player.jumpCounts = this.#_player.maxJumps;

                    if(this.#_isState('STARTED') && !this.#_player.crouch) this.#_graphicsManager.setPlayerAnimation('RUN');
                };
            });
        });
    };

    #_createObstacle (type) {
        const {
            animationSpeed,
            bodySize: [bWidth, bHeight],
            spriteSize: [sWidth, sHeight]
        } = OBSTACLES_TYPES[type],
        body = Bodies.rectangle(
            this.#_obstacles.spawnX,
            this.#_ground.position[1] - ((this.#_ground.size[1] / 2) + (bHeight / 2 + (this.#_obstacles.skyTypes.includes(type) ? (this.#_obstacles.skyOffsetY * (Math.random() + 1)) : 0))),
            bWidth,
            bHeight,
            { isStatic: true }
        );

        console.log('OBSTACLE CREATED', type, body.id);

        body.hitType = OBSTACLES_HIT_TYPES[type];

        const [sprite, spriteTest] = this.#_graphicsManager.createObstacleSprite({
            type: body.hitType,
            animationSpeed,
            bWidth,
            bHeight,
            sWidth,
            sHeight
        });

        body.sprite = sprite;
        body.spriteTest = spriteTest;

        body.spriteTest.position.y = this.#_ground.position[1] - ((this.#_ground.size[1] / 2) + (sHeight / 2 + (this.#_obstacles.skyTypes.includes(type) ? (this.#_obstacles.skyOffsetY * (Math.random() + 1)) : 0)));

        body.gameSpeed = this.#_obstacles.speed[+this.#_obstacles.skyTypes.includes(type)];

        this.#_obstacles.list.set(body.id, body);

        Composite.add(this.#_world, [body]);
    };

    #_removeObstacle (body) {
        console.log('REMOVING OBSTACLE', body.id);

        body.sprite.destroy();
        body.spriteTest.destroy();

        Composite.remove(this.#_world, body);

        this.#_obstacles.list.delete(body.id);
    };
    
    #_setScore (score, maxScore) {
        this.#_game.score = score;

        this.#_game.maxScore = maxScore;

        this.#_game.scoreReward = score * 0.25;

        this.#_updateScore();
    };

    #_updateScore () {
        this.#_html.score.textContent = `SCORE: ${this.#_game.score}`;
    };

    #_setState (state) {
        this.#_game.state = GAME_STATES[state] || 0;

        switch (this.#_game.state) {
            case GAME_STATES.WIN:
            case GAME_STATES.LOSE:
                this.#_html.gameContainer.style.display = 'none';
                this.#_html.resultForm.style.visibility = 'visible';

                this.#_html.result.textContent = this.#_resultMessages[this.#_game.state];

                break;
        };
    };

    #_isState (state) {
        return this.#_game.state === GAME_STATES[state];
    };
};