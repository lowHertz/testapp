export default class {
    _dir;

    constructor (dir) {
        this._dir = dir;
    };

    async loadAssets (sheets, separated, sounds) {
        await PIXI.Assets.load(`./${this._dir}/fonts/MinimalPixelFont.ttf`);

        return {
            sheets: Object.fromEntries(await Promise.all(sheets.map(sheet => new Promise(async r => {
                const spritesheetData = await (await fetch(`./${this._dir}/images/sheets/${sheet}_spritesheet.json`)).json();

                const spritesheet = new PIXI.Spritesheet(
                    await PIXI.Assets.load(`./${this._dir}/images/sheets/${spritesheetData.meta.image}`),
                    spritesheetData
                );
                
                await spritesheet.parse();

                r([sheet, spritesheet]);
            })))),
            
            separated: Object.fromEntries(await Promise.all(separated.map(texture => new Promise(async r => r([
                texture,
                await PIXI.Assets.load(`./${this._dir}/images/separated/${texture}`)
            ]))))),

            sounds: Object.fromEntries(sounds.map(sound => [
                sound,
                PIXI.sound.Sound.from(`./${this._dir}/sounds/${sound}.ogg`)
            ]))
        };
    };
};