const d3    = require("d3-random");
const Tonal = require('@tonaljs/tonal');

const MAX_UINT32 = 4294967295;

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
        this.spread    = 100;
        this.transpose = 0;
        this.density   = 70;
        this.divider   = 1;
        this.seed      = 0;
        this.mutation  = 2;
        this.variation = 0;
        this.steps     = 16;
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
        const randNml = d3.randomNormal.source(rand)(0, this.spread/100);

        for (let i = 0; i < this.steps; i++) {
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
        const randNml = d3.randomNormal.source(rand)(0, this.spread/100);

        const sequences = [this.baseSequence(rand)];

        const numOfMutatedSequences = 16;
        for (let i = 1; i < numOfMutatedSequences; i++) {
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

    changeVariation (dir) {
        this.variation = clamp(this.variation + dir, 0, this.sequences.length-1);
    }

    changeTonic (dir) {
        this.tonic = Tonal.Note.simplify(Tonal.transpose(this.tonic, dir > 0 ? '2m' : '-2m'));
    }

    randomizeSeed () {
        this.seed = Math.round(Math.random() * MAX_UINT32);
    }

    changeSeed (dir) {
        this.seed = clamp(this.seed + dir, 0, MAX_UINT32);
    }

    changeScale (dir) {
        const choices = Tonal.Scale.names();
        const index = clamp(choices.indexOf(this.scale) + dir, 0, choices.length-1);
        this.scale = choices[index];
    }

    changeTranspose (dir) {
        this.transpose = clamp(this.transpose + dir, -12, 12);
    }

    changeSpread (dir) {
        this.spread = clamp(this.spread + (10 * dir), 0, 250);
    }

    changeDensity (dir) {
        this.density = clamp(this.density + (5 * dir), 0, 100);
    }

    changeMutation (dir) {
        this.mutation = clamp(this.mutation + dir, 0, 16);
    }

    changeDivider (dir) {
        const choices = [0.125, 0.25, 0.5, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
        const index = clamp(choices.indexOf(this.divider) + dir, 0, choices.length-1);
        this.divider = choices[index];
    }

    changeSteps (dir) {
        this.steps = clamp(this.steps + dir, 1, 16);
    }
}

module.exports = Patch;
