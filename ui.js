const readline = require('readline');

const rev = (val) => '\033[7m' + val + '\033[0m';

function seqToString2 (seq) {
    return () => seq.seq.map((v, k) => {
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
            mkitem(this.channelName(0), seqToString2(this.world.channelSequences[0]), this.channelHandler(0)),
            mkitem(this.channelName(1), seqToString2(this.world.channelSequences[1]), this.channelHandler(1)),
            mkitem(this.channelName(2), seqToString2(this.world.channelSequences[2]), this.channelHandler(2)),
            mkitem(this.channelName(3), seqToString2(this.world.channelSequences[3]), this.channelHandler(3)),
            mkitem(this.channelName(4), seqToString2(this.world.channelSequences[4]), this.channelHandler(4)),
            mkitem(this.channelName(5), seqToString2(this.world.channelSequences[5]), this.channelHandler(5)),
            mkitem(this.channelName(6), seqToString2(this.world.channelSequences[6]), this.channelHandler(6)),
            mkitem(this.channelName(7), seqToString2(this.world.channelSequences[7]), this.channelHandler(7)),
            mkseparator(),
            mkitem(this._itemName('seed'),      () => this.world.patch.seed.toString(36), this.reseedHandler),
            mkitem(this._itemName('tonic'),     () => this.world.patch.tonic,     this.tonicHandler),
            mkitem(this._itemName('transpose'), () => this.world.patch.transpose, this.changeHandler('transpose')),
            mkitem(this._itemName('scale'),     () => this.world.patch.scale,     this.changeHandler('scale')),
            mkitem(this._itemName('spread'),    () => this.world.patch.spread,    this.changeHandler('spread')),
            mkitem(this._itemName('density'),   () => this.world.patch.density,   this.changeHandler('density')),
            mkitem(this._itemName('mutation'),  () => this.world.patch.mutation,  this.changeHandler('mutation')),
            mkitem(this._itemName('divider'),   () => this.world.patch.divider,   this.changeHandler('divider')),
            mkitem(this._itemName('steps'),     () => this.world.patch.steps,     this.changeHandler('steps')),
            mkseparator(),
            mkitem(this._itemName('midisync'), () => this.world.midiSync, () => {
                this.world.midiSync ? this.world.turnOffMidiSync() : this.world.turnOnMidiSync();
            }),
            mkitem(this._itemName('bpm'), () => this.world.bpm, this.bpmHandler),
        ];
    }

    static _itemName (n) {
        return () => {
            let str = '';
            str += this.world.sync[n] ? '*' : ' ';
            str += n;
            str += ':';
            return str.padEnd(14);
        }
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
            if (k === 'l') { patch.changeVariation(1); }
            if (k === 'h') { patch.changeVariation(-1); }

            this.world.updateSequence(c);
        }
    }

    static reseedHandler (k)  {
        const patches = this.world.sync.seed ? this.world.patches : [this.world.patch];
        if (k === '\r') patches.forEach(p => p.randomizeSeed());
        if (k === 'l')  patches.forEach(p => p.changeSeed(1));
        if (k === 'h')  patches.forEach(p => p.changeSeed(-1));
        if (k === '\t') this.world.sync.seed = !this.world.sync.seed;

        this.world.sync.seed ? this.world.updateSequences() : this.world.updateSequence();
    }

    static tonicHandler (k) {
        const patches = this.world.sync.seed ? this.world.patches : [this.world.patch];
        if (k === 'l') patches.forEach(p => p.changeTonic(1));
        if (k === 'h') patches.forEach(p => p.changeTonic(-1));
        if (k === '\t') this.world.sync.tonic = !this.world.sync.tonic;

        this.world.sync.seed ? this.world.updateSequences() : this.world.updateSequence();
        // this.world.updateSequence();
    }

    static changeHandler (name) {
        return (k) => {
            let val = this.world.patch[name];

            if (k === '\t') this.world.sync[name] = !(this.world.sync[name]);

            const patches = this.world.sync[name] ? this.world.patches : [this.world.patch];
            if (k === 'l') patches.forEach(p => p[`change${capitalize(name)}`](1));
            if (k === 'h') patches.forEach(p => p[`change${capitalize(name)}`](-1));

            this.world.sync.seed ? this.world.updateSequences() : this.world.updateSequence();
        };
    }
    static bpmHandler (k) {
        if (k === 'l') this.world.bpm += 1;
        if (k === 'h') this.world.bpm -= 1;
        if (this.world.bpm < 1) this.world.bpm = 1;
        if (this.world.bpm > 999) this.world.bpm = 999;
    }
}

module.exports = UI;
