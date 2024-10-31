const BASE_VOLUME = 0.1, SOUNDS_CONFIG = {
    soundtrack: {
        autoPlay: true,
        loop: true,
        volume: 0.05
    },
    transition: {
        volume: 0.25
    }
};

export default class {
    _sounds;

    constructor (sounds) {
        this._sounds = sounds;

        for (const key in this._sounds) {
            const { autoPlay = false, loop = false, volume = BASE_VOLUME } = SOUNDS_CONFIG[key] || {},
            sound = this._sounds[key];

            sound.autoPlay = autoPlay;
            sound.loop = loop;
            sound.volume = volume;
        };
    };

    play (sound) {
        this._sounds[sound].play();
    };

    changeVolume (mute) {
        PIXI.sound[`${['un',''][+mute]}muteAll`]();
    };
};