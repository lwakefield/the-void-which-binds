const readline = require('readline');

const Tonal = require('@tonaljs/tonal');

const rev = (val) => '\033[7m' + val + '\033[0m';

function seqToString2 (seq) {
    return seq.seq.map((v, k) => {
        let part = (v || '').padEnd(4)
        if (k === seq.index) {
            part = '\x1b[33m' + part + '\x1b[39m';
        }
        return part;
    }).join(' ');
}

let mkitem = (name, fn, handler) => ({ name, fn, handler });
let mkseparator = () => mkitem('', () => '', () => {});


class UI {
    static world = null;
    static selectedIndex = 0;
    static items = [];

    static init (world) {
        this.world = world;
        this.items = [
            mkitem(this.channelName(0), () => seqToString2(this.world.channelSequences[0]), this.channelHandler(0)),
            mkitem(this.channelName(1), () => seqToString2(this.world.channelSequences[1]), this.channelHandler(1)),
            mkitem(this.channelName(2), () => seqToString2(this.world.channelSequences[2]), this.channelHandler(2)),
            mkitem(this.channelName(3), () => seqToString2(this.world.channelSequences[3]), this.channelHandler(3)),
            mkitem(this.channelName(4), () => seqToString2(this.world.channelSequences[4]), this.channelHandler(4)),
            mkitem(this.channelName(5), () => seqToString2(this.world.channelSequences[5]), this.channelHandler(5)),
            mkitem(this.channelName(6), () => seqToString2(this.world.channelSequences[6]), this.channelHandler(6)),
            mkitem(this.channelName(7), () => seqToString2(this.world.channelSequences[7]), this.channelHandler(7)),
            mkseparator(),
            mkitem('seed:'.padEnd(11),      () => this.world.patch.seed.toString(36), this.reseedHandler),
            mkitem('tonic:'.padEnd(11),     () => this.world.patch.tonic,             this.tonicHandler),
            mkitem('transpose:'.padEnd(11), () => this.world.patch.transpose,         this.transposeHandler),
            mkitem('scale:'.padEnd(11),     () => this.world.patch.scale,             this.scaleHandler),
            mkitem('spread:'.padEnd(11),    () => this.world.patch.spread,            this.spreadHandler),
            mkitem('density:'.padEnd(11),   () => this.world.patch.density,           this.densityHandler),
            mkitem('mutation:'.padEnd(11),  () => this.world.patch.mutation,          this.mutationHandler),
            mkitem(
                () => (this.world.sync ? 'div:' : 'bpm:').padEnd(11),
                () => this.world.sync ? this.world.patch.divider : this.world.patch.bpm,
                (...a) => this.world.sync ? this.dividerHandler(...a) : this.bpmHandler(...a)
            ),
            mkitem('sync:'.padEnd(11),    () => this.world.sync),
        ];
    }

    static drawScreen () {
        let screen = '';
        for (let i = 0; i < this.items.length; i++) {
            const item = this.items[i];
            let name = item.name instanceof Function ? item.name() : item.name;
            let line = `${name} ${item.fn()}`;

            if (i === this.selectedIndex) { line = rev(line); }

            screen += line;
            screen += '\n';
        }
        process.stdout.write(screen);
    }

    static redraw () {
        process.stdout.write('\x1b[2J');
        process.stdout.write('\x1b[H');
        this.drawScreen();
    }

    static get item () {
        return this.items[this.selectedIndex];
    }

    static start () {
        readline.emitKeypressEvents(process.stdin);
        process.stdin.setRawMode(true);

        process.stdin.on('keypress', (str, key) => {
            if (key.sequence === '\u0003') { this.world.stop(); process.exit(0); }
            else if (key.sequence === 'j') { this.selectedIndex += 1 }
            else if (key.sequence === 'k') { this.selectedIndex -= 1 }
            else if (this.item.handler)    { this.item.handler.call(this, key.sequence) }

            if (this.selectedIndex >= this.items.length) { this.selectedIndex = 0 }
            if (this.selectedIndex < 0)                  { this.selectedIndex = this.items.length - 1 }

            this.redraw();
        });

        this.redraw();
    }

    // item fns under here
    // vvvvvvvvvvvvvvvvvvv

    static channelName (c) {
        return () => this.world.channel === c 
            ? `>seq${c}/${this.world.patches[c].variation}`.padEnd(8) 
            : ` seq${c}/${this.world.patches[c].variation}`.padEnd(8);
    }

    static channelHandler (c) {
        return (k) => {
            const patch = this.world.patches[c];
            if (k === '\r') this.world.channel = c;
            if (k === 'l') { patch.variation += 1; }
            if (k === 'h') { patch.variation -= 1; }

            if (patch.variation >= patch.sequences.length) { patch.variation = 0; }
            if (patch.variation < 0)                       { patch.variation = patch.sequences.length - 1; }

            this.world.updateSequence(c);
        }
    }

    static reseedHandler (k)  {
        const MAX_UINT32 = 4294967295;
        if (k === '\r') this.world.patch.seed = Math.round(Math.random() * MAX_UINT32);
        if (k === 'l')  this.world.patch.seed += 1;
        if (k === 'h')  this.world.patch.seed -= 1;

        if (this.world.patch.seed > MAX_UINT32) this.world.patch.seed = 0;
        if (this.world.patch.seed < 0)          this.world.patch.seed = MAX_UINT32;

        this.world.updateSequence();
    }

    static tonicHandler (k) {
        const tonic = this.world.patch.tonic;
        if (k === 'l') this.world.patch.tonic = Tonal.Note.simplify(Tonal.transpose(tonic, '2m'));
        if (k === 'h') this.world.patch.tonic = Tonal.Note.simplify(Tonal.transpose(tonic, '-2m'));

        this.world.updateSequence();
    }

    static transposeHandler (k) {
        if (k === 'l') this.world.patch.transpose += 1;
        if (k === 'h') this.world.patch.transpose -= 1;

        this.world.updateSequence();
    }

    static scaleHandler (k) {
        const scales = Tonal.Scale.names();
        let index = scales.indexOf(this.world.patch.scale);

        if (k === 'l') { index += 1 }
        if (k === 'h') { index -= 1 }

        if (index >= scales.length) { index = 0 }
        if (index < 0)              { index = scales.length - 1 }

        this.world.patch.scale = scales[index];
        this.world.updateSequence();
    }

    static spreadHandler (k) {
        if (k === 'l') { this.world.patch.spread += 10; }
        if (k === 'h') { this.world.patch.spread -= 10; }

        this.world.updateSequence();
    }

    static densityHandler (k) {
        if (k === 'l') { this.world.patch.density += 5; }
        if (k === 'h') { this.world.patch.density -= 5; }

        this.world.updateSequence();
    }

    static mutationHandler (k) {
        if (k === 'l') { this.world.patch.mutation += 1; }
        if (k === 'h') { this.world.patch.mutation -= 1; }

        this.world.updateSequence();
    }

    static dividerHandler (k) {
        if (k === 'l') { this.world.patch.divider *= 2; }
        if (k === 'h') { this.world.patch.divider /= 2; }

        this.world.updateSequence();
    }
    static bpmHandler (k) { }
}

module.exports = UI;
