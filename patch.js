const d3    = require("d3-random");
const Tonal = require('@tonaljs/tonal');

function notesInScale (tonic, scale) {
    const { pc } = Tonal.note(tonic);
    const range = Tonal.Scale.rangeOf(`${pc} ${scale}`);
    return range('c0', 'c8');
}

class Patch {
    constructor () {
        this.bpm       = 100;
        this.tonic     = 'C4';
        this.scale     = 'minor pentatonic';
        this.spread    = 1;
        this.transpose = 0;
        this.density   = 70;
        this.divider   = 1;
        this.seed      = 0;
        this.mutation  = 2;
        this.variation = 0;
        this.sequences = [];
    }
    rand () {
        return d3.randomLcg(this.seed);
    }
    get sequence () {
        return this.sequences[this.variation];
    }
    get notes () {
        return notesInScale(this.tonic, this.scale);
    }
    get rootIndex () {
        return this.notes.indexOf(this.tonic) + this.transpose;
    }
    toSequence (rand) {
        if (!rand) rand = this.rand();

        const res = [];
        const randInt = d3.randomInt.source(rand)(0, 100);
        const randNml = d3.randomNormal.source(rand)(0, this.spread);

        for (let i = 0; i < 16; i++) {
            const hit = randInt() < this.density;
            const offset = Math.round(randNml());
            res.push(hit ? this.notes[this.rootIndex + offset] : null);
        }
        return res;
    }
    baseSequence () {
        return this.toSequence();
    }
    genSequences () {
        const rand = this.rand();
        const randInt = d3.randomInt.source(rand);
        const randNml = d3.randomNormal.source(rand)(0, this.spread);

        const sequences = [this.baseSequence(rand)];

        for (let i = 1; i < 16; i++) {
            const lastSequence = sequences[i - 1];
            const nextSequence = [...lastSequence];


            for (let j = 0; j < this.mutation; j++) {
                const type = randInt(0, 100)() > 50 ? 'rhythm' : 'note';

                const index = randInt(0, nextSequence.length)();
                const offset = Math.round(randNml());
                if (type === 'rhythm') {
                    if (nextSequence[index]) {
                        nextSequence[index] = null;
                    } else {
                        nextSequence[index] = this.notes[this.rootIndex + offset];
                    }
                } else {
                    nextSequence[index] = this.notes[this.rootIndex + offset];
                }
            }


            sequences.push(nextSequence);
        }

        this.sequences = sequences;
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
