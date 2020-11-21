const d3    = require("d3-random");
const Tonal = require('@tonaljs/tonal');

function notesInScale (tonic, scale) {
    const { pc } = Tonal.note(tonic);
    const range = Tonal.Scale.rangeOf(`${pc} ${scale}`);
    return range('c0', 'c8');
}

class Patch {
    constructor () {
        this.bpm     = 100;
        this.tonic   = 'C4';
        this.scale   = 'minor pentatonic';
        this.spread  = 1;
        this.density = 70;
        this.divider = 1;
        this.seed    = 0;
    }
    toSequence () {
        const res = [];
        const randInt = d3.randomInt.source(d3.randomLcg(this.seed))(0, 100);
        const randNml = d3.randomNormal.source(d3.randomLcg(this.seed))(0, this.spread);
        const notes = notesInScale(this.tonic, this.scale);
        const tonicIndex = notes.indexOf(this.tonic);
        for (let i = 0; i < 16; i++) {
            const hit = randInt() < this.density;
            const offset = Math.round(randNml());
            res.push(hit ? notes[tonicIndex + offset] : null);
        }
        return res;
    }
    toString () {
        let str = '';
        str += `bpm=${this.bpm} `;
        str += `tonic=${this.tonic} `;
        str += `scale=${this.scale} `;
        str += `spread=${this.spread} `;
        str += `density=${this.density} `;
        str += `divider=${this.divider} `;
        str += `seed=${this.seed}`;
        return str;
    }
}

module.exports = Patch;
