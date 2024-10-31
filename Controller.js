export default class {
    #_input = {};

    init () {
        ['up','down'].map(type => {
            const isDown = type === 'down';

            window.addEventListener(`key${type}`, ({ keyCode, isTrusted }) => isTrusted && (this.#_input[keyCode] = isDown));

            document.querySelector('canvas').addEventListener(`pointer${type}`, ({ clientX, isTrusted }) => isTrusted && this.onPointer(clientX, isDown));
        });
    };

    onPointer (clientX, isDown) {
        this.#_input[[40,32][+(clientX <= (window.innerWidth / 2))]] = isDown;
    };

    getInput () {
        return this.#_input;
    };

    resetInput () {
        this.#_input = {};
    };
};