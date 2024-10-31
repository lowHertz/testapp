const PLAYER_ANIMS = {
    IDLE: 0,
    RUN: 1,
    JUMP: 2,
    SIT: 3
},
getRandom = arr => arr[Math.floor(Math.random() * arr.length)];

export default class {
    container = new PIXI.Container();
    isGameSpeedUp = false;

    #_assets;
    #_screen;
    #_firstBackground;
    #_secondBackground;
    #_sun;
    #_groundObjects;
    #_lastGroundObjectId;
    #_parallaxSprites = [];
    player = {
        size: null,
        sprite: null,
        carSprite: null,
        currentAnim: null,
        animations: {}
    };

    constructor (assets, screen, playerSize) {
        this.player.size = playerSize;

        this.#_assets = assets;
        this.#_screen = screen;
    };

    init () {
        this.container.scale.set(2);
        this.container.position.set(0, 277);

        this.#_firstBackground = new PIXI.Sprite(this.#_assets.separated['background_0.png']);
        this.#_firstBackground.scale.set(0.9);
        this.#_firstBackground.position.y = -140;
        this.container.addChild(this.#_firstBackground);

        this.#_secondBackground = new PIXI.Sprite(this.#_assets.separated['background_1.png']);
        this.#_secondBackground.scale.set(0.9);
        this.#_secondBackground.position.y = -140;
        this.container.addChild(this.#_secondBackground);

        this.#_sun = new PIXI.Sprite(this.#_assets.separated['sun.png']);
        this.#_sun.scale.set(0.75);
        this.#_sun.position.set(100, -10);
        this.container.addChild(this.#_sun);

        this.#_groundObjects = this.#_assets.separatedEntries.filter(([key]) => key.startsWith('ground_object_')).map(([_, texture], i) => (texture.objectId = i, texture));

        this.#_createParallaxSprite(
            this.#_assets.separated['buildings_far.png'],
            [0, -110],
            7.5,
            0.25
        );

        this.#_createParallaxSprite(
            this.#_assets.separated['clouds_0.png'],
            [-45, -300],
            5,
            0.95,
            'clouds'
        );

        this.#_createParallaxSprite(
            this.#_assets.separated['buildings_near.png'],
            [0, -110],
            25,
            0.25
        );

        this.#_createParallaxSprite(
            this.#_assets.separated['ground_0.png'],
            [0, -90],
            125,
            0.22,
            'ground'
        );

        this.#_createPlayerSprites();

        this.#_createCarSprite();

        this.#_createTutorialUI();
    };

    update (delta, { gameStarted, gameIdle }) {
        if(gameStarted || gameIdle) this.#_parallaxSprites.map(({ speed, list }) => {
            list.map(sprite => {
                const isClouds = sprite.type === 'clouds';

                if(!gameStarted && !isClouds) return;

                sprite.position.x -= speed * ((this.isGameSpeedUp + 1) + ((gameStarted && isClouds) ? 3 : 0)) * delta;
            });

            const [farSprite, nearSprite] = list.sort((a, b) => (a.position.x > b.position.x) ? 1 : -1);

            if(farSprite.position.x <= -farSprite.width) {
                farSprite.position.x = nearSprite.position.x + farSprite.width;

                if(farSprite.type === 'ground') {
                    farSprite.removeChildren();

                    farSprite.addChild(this.#_createGroundObject(getRandom(this.#_groundObjects.filter(x => x.objectId !== this.#_lastGroundObjectId))));
                };
            };
        });
    };

    setPlayerAnimation (anim) {
        //console.log('PLAYER ANIMATION SETTED TO', anim);

        const prevPlayerAnim = this.player.animations[this.player.currentAnim];

        if(prevPlayerAnim) prevPlayerAnim.visible = false;

        anim = PLAYER_ANIMS[anim];
        
        this.player.currentAnim = anim;

        const playerAnim = this.player.animations[anim];

        playerAnim.visible = !this.isGameSpeedUp;

        this.player.sprite = playerAnim;
    };

    toggleTutorialUI (visible) {
        this.dark.visible = visible;
        this.hintText.visible = visible;
        this.hintTextJump.visible = visible;
        this.hintTextCrouch.visible = visible;
        this.tapIcon1.visible = visible;
        this.tapIcon2.visible = visible;
    };

    createObstacleSprite ({ type, animationSpeed, bWidth, bHeight, sWidth, sHeight }) {
        const sprite = new PIXI.Sprite(PIXI.Texture.WHITE);
        sprite.anchor.set(0.5);
        sprite.width = bWidth;
        sprite.height = bHeight;
        sprite.visible = false;

        let spriteTest;

        if(animationSpeed) {
            spriteTest = new PIXI.AnimatedSprite(Object.values(this.#_assets.sheets[`obstacle_${type}`].textures));
            spriteTest.loop = true;
            spriteTest.animationSpeed = animationSpeed;
            spriteTest.gotoAndPlay(0);
        } else spriteTest = new PIXI.Sprite(this.#_assets.separated[`obstacle_${type}.png`]);

        spriteTest.anchor.set(0.5);
        spriteTest.width = sWidth;
        spriteTest.height = sHeight;

        this.container.addChild(sprite, spriteTest);

        return [sprite, spriteTest];
    };

    setDayState (day) {
        this.#_firstBackground.visible = day;
        this.#_sun.visible = day;
        this.#_secondBackground.visible = !day;

        this.#_parallaxSprites.map(({ list }) => list.map(x => (x.type === 'ground' && (x.texture = this.#_assets.separated[`ground_${+!day}.png`]))));
    };

    resetGraphics () {
        this.#_parallaxSprites.map(({ list }) => list.map(sprite => {
            sprite.position.x = sprite.startX;

            if(sprite.type === 'ground') sprite.texture = this.#_assets.separated['ground_0.png'];
        }));

        this.isGameSpeedUp = false;

        this.player.carSprite.visible = false;

        this.setDayState(true);

        this.toggleTutorialUI(true);

        this.setPlayerAnimation('IDLE');
    };

    #_createCarSprite () {
        const sprite = new PIXI.Sprite(this.#_assets.separated['car.png']);
        sprite.anchor.set(0.5);
        sprite.scale.set(0.2);
        sprite.visible = false;

        this.player.carSprite = sprite;

        this.container.addChild(sprite);
    };

    #_createPlayerSprites () {
        this.#_createPlayerAnimation('idle', 0.075, 25, [0.5, 1]);
        this.#_createPlayerAnimation('run', void 0, -20);
        this.#_createPlayerAnimation('jump', void 0, -20);
        this.#_createPlayerAnimation('sit', 0.095, 13, [0.5, 1]);

        this.setPlayerAnimation('IDLE');
    };

    #_createPlayerAnimation (animation, animationSpeed = 0.085, offsetY = 0, anchor = [0.5, 0.5]) {
        const animatedSprite = new PIXI.AnimatedSprite(this.#_assets.separatedEntries.filter(([key]) => key.startsWith(`player_${animation}_`)).map(([_, texture]) => texture));

        animatedSprite.offsetY = offsetY;
        animatedSprite.visible = false;
        animatedSprite.loop = true;
        animatedSprite.gotoAndPlay(0);
        animatedSprite.animationSpeed = animationSpeed;
        animatedSprite.anchor.set(...anchor);
        animatedSprite.width = this.player.size[9];
        animatedSprite.height = this.player.size[1];
        animatedSprite.scale.set(0.35);

        this.player.animations[PLAYER_ANIMS[animation.toUpperCase()]] = animatedSprite;

        this.container.addChild(animatedSprite);

        return animatedSprite;
    };

    #_createParallaxSprite (texture, [x, y], speed, scale = 1, type) {
        const firstSprite = new PIXI.Sprite(texture);
        firstSprite.scale.set(scale);
        firstSprite.position.set(x, y);
        firstSprite.startX = x;
        firstSprite.type = type;

        const x2 = firstSprite.width,
        secondSprite = new PIXI.Sprite(texture);
        secondSprite.scale.set(scale);
        secondSprite.position.set(x2, y);
        secondSprite.startX = x2;
        secondSprite.type = type;

        if(firstSprite.type === 'ground') {
            firstSprite.addChild(this.#_createGroundObject(getRandom(this.#_groundObjects)));
            secondSprite.addChild(this.#_createGroundObject(getRandom(this.#_groundObjects.filter(x => x.objectId !== this.#_lastGroundObjectId))));
        };

        this.container.addChild(firstSprite, secondSprite);

        this.#_parallaxSprites.push({
            speed,
            list: [firstSprite, secondSprite]
        });
    };

    #_createGroundObject (texture) {
        const object = new PIXI.Sprite(texture);
        object.scale.set(0.55);
        object.position.set(210, 445);

        this.#_lastGroundObjectId = texture.objectId;

        return object;
    };

    #_createTutorialUI () {
        this.dark = new PIXI.Sprite(this.#_assets.separated['dark.png']);
        this.dark.anchor.set(0.5);
        this.dark.width = this.#_screen.width * 0.025;
        this.dark.height = this.#_screen.height;
        this.dark.position.x = this.#_screen.width / 4;
        this.dark.alpha = 0.5;
        this.container.addChild(this.dark);

        const textOptions = {
            fontFamily: 'Minimalpixelfont',
            fontSize: 25,
            fill: 0xffffff,
            strokeThickness: 2.5
        };

        this.hintText = new PIXI.Text('PRESS TO', textOptions);
        this.hintText.anchor.set(0.5);
        this.hintText.position.set(this.#_screen.width / 4, -50);
        this.container.addChild(this.hintText);

        this.tapIcon1 = new PIXI.Sprite(this.#_assets.separated['tap.png']);
        this.tapIcon1.anchor.set(0.5);
        this.tapIcon1.scale.set(0.35);
        this.tapIcon1.position.set(this.#_screen.width / 8, 0);
        this.container.addChild(this.tapIcon1);

        this.hintTextJump = new PIXI.Text('JUMP', textOptions);
        this.hintTextJump.anchor.set(0.5);
        this.hintTextJump.position.set(this.#_screen.width / 8, -30);
        this.container.addChild(this.hintTextJump);

        this.tapIcon2 = new PIXI.Sprite(this.#_assets.separated['tap.png']);
        this.tapIcon2.anchor.set(0.5);
        this.tapIcon2.scale.set(0.35);
        this.tapIcon2.position.set(this.#_screen.width / 2.75, 0);
        this.container.addChild(this.tapIcon2);

        this.hintTextCrouch = new PIXI.Text('CROUCH', textOptions);
        this.hintTextCrouch.anchor.set(0.5);
        this.hintTextCrouch.position.set(this.#_screen.width / 2.75, -30);
        this.container.addChild(this.hintTextCrouch);
    };
};