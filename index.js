const readline = require('readline');

const Tonal = require('@tonaljs/tonal');
const d3    = require("d3-random");

const util = require('./util.js');
const { Device } = require('./device.js');
const { ChannelSequence } = require('./channel_sequence.js');

const dev = new Device();
dev.open();

function exitHandler () {
    dev.close();
    process.exit();
}

// process.on('exit', exitHandler);
process.on('SIGINT', exitHandler);

const NUM_CHANNELS = 8;
const BASE_PATCH = {
    bpm: 100,
    tonic: 'C4',
    scale: 'minor pentatonic',
    spread: 1,
    density: 70,
    divider: 1,
    seed: 0,
}
const patch = [];
patch.push(util.clone(BASE_PATCH));
for (let i = 1; i < NUM_CHANNELS; i++) {
    patch.push({ ...util.clone(BASE_PATCH), density: 0 });
}

let channel = 0;
let sync = true;
let mode = null;
let seqs = patch.map((p, i) => {
    const seq = new ChannelSequence(dev, i);
    seq.seq = genSequence(p)
    return seq;
});

function notesInScale (tonic, scale) {
    const { pc } = Tonal.note(tonic);
    const range = Tonal.Scale.rangeOf(`${pc} ${scale}`);
    return range('c0', 'c8');
}

function genSequence (patch) {
    const res = [];
    const randInt = d3.randomInt.source(d3.randomLcg(patch.seed))(0, 100);
    const randNml = d3.randomNormal.source(d3.randomLcg(patch.seed))(0, patch.spread);
    const notes = notesInScale(patch.tonic, patch.scale);
    const tonicIndex = notes.indexOf(patch.tonic);
    for (let i = 0; i < 16; i++) {
        const hit = randInt() < patch.density;
        const offset = Math.round(randNml());
        res.push(hit ? notes[tonicIndex + offset] : null);
    }
    return res;
}

function seqToString (seq) {
    return seq.seq.map(v => (v || 'off').padEnd(4)).join(' ');
}
function seqToString2 (seq) {
    return seq.seq.map((v, k) => {
        let part = (v || 'off').padEnd(4)
        if (k === seq.index) {
            part = '\x1b[33m' + part + '\x1b[39m';
        }
        return part;
    }).join(' ');
}
function patchToString (patch) {
    let str = '';
    str += `bpm=${patch.bpm} `;
    str += `tonic=${patch.tonic} `;
    str += `scale=${patch.scale} `;
    str += `spread=${patch.spread} `;
    str += `density=${patch.density} `;
    str += `divider=${patch.divider} `;
    str += `seed=${patch.seed}`;
    return str;
}

async function repl () {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    console.log(patchToString(patch[channel]));
    console.log(seqToString(seqs[channel]));

    rl.prompt();
    rl.on('line', line => {
        if (line == 'exit')      { dev.close(); process.exit(0); }

        if (line == 'debug=on')                 debug = true;
        if (line == 'debug=off')                debug = false;

        if (line == 'sync=on')                  sync = true;
        if (line == 'sync=off')                 sync = false;

        if (m = line.match(/(?<=channel=)\d+/)) channel = Number(m);
        if (line == 'channel++')                channel = (( channel + 1 ) % NUM_CHANNELS);
        if (line == 'channel--')                channel = (( channel - 1 ) % NUM_CHANNELS);

        let tonic = patch[channel].tonic;
        if (m = line.match(/(?<=tonic=)\w+/))   patch[channel].tonic = m[0];
        if (line == 'tonic++')                  patch[channel].tonic = Tonal.transpose(tonic, '2m');
        if (line == 'tonic--')                  patch[channel].tonic = Tonal.transpose(tonic, '-2m');

        if (m = line.match(/(?<=bpm=)\d+/))     patch[channel].bpm = Number(m);
        if (line == 'bpm++')                    patch[channel].bpm += 5;
        if (line == 'bpm--')                    patch[channel].bpm -= 5;

        if (m = line.match(/(?<=spread=)\d+/))  patch[channel].spread = Number(m);
        if (line == 'spread++')                 patch[channel].spread += 0.1;
        if (line == 'spread--')                 patch[channel].spread -= 0.1;

        if (m = line.match(/(?<=density=)\d+/)) patch[channel].density = Number(m);
        if (line == 'density++')                patch[channel].density += 5
        if (line == 'density--')                patch[channel].density -= 5

        if (line == 'divider++')                patch[channel].divider *= 2
        if (line == 'divider--')                patch[channel].divider /= 2

        if (line == 'regen')                    patch[channel].seed = Math.random();  

        seqs[channel].seq     = genSequence(patch[channel]);
        seqs[channel].divider = patch[channel].divider;

        console.log(patchToString(patch[channel]));
        console.log(seqToString(seqs[channel]));

        rl.prompt();
    });
}

async function seqLoop () {
    dev.input.on('message', (time, msg) => {
        if (sync === false) return;

        if (util.cmpArr(msg, [248])) {
            if (time === 0) {
                seqs.forEach(s => s.reset());
            }

            seqs.forEach(s => s.tick());

        } else if (util.cmpArr(msg, [250])) {
            seqs.forEach(s => s.run = true);
        } else if (util.cmpArr(msg, [251])) {
            seqs.forEach(s => s.run = true);
        } else if (util.cmpArr(msg, [252])) {
            seqs.forEach(s => s.run = false);
        }

        if (mode === 'ui') UI.redraw();
    });

    // (async () => {
    //     while (true) {
    //         if (sync === false) nextNote();
    //         await util.sleep(60000 / patch[0].bpm);
    //     }
    // })();
}

const channelName = (c) => () => channel === c ? `>seq${c}` : ` seq${c}`;
const channelHandler = (c) => (k) => {
    if (k === '\r') channel = c;
}
const reseedHandler = (k) => {
    if (k === '\r') patch[channel].seed = Math.random() 

    seqs[channel].seq     = genSequence(patch[channel]);
}
const tonicHandler = (k) => {
    const tonic = patch[channel].tonic;
    if (k === 'l') patch[channel].tonic = Tonal.Note.simplify(Tonal.transpose(tonic, '2m'));
    if (k === 'h') patch[channel].tonic = Tonal.Note.simplify(Tonal.transpose(tonic, '-2m'));
};
const scaleHandler = (k) => {
    const scales = Tonal.Scale.names();
    let index = scales.indexOf(patch[channel].scale);

    if (k === 'l') { index += 1 }
    if (k === 'h') { index -= 1 }

    if (index >= scales.length) { index = 0 }
    if (index < 0)              { index = scales.length - 1 }

    patch[channel].scale = scales[index];
    seqs[channel].seq     = genSequence(patch[channel]);
};
const spreadHandler = (k) => {
    if (k === 'l') { patch[channel].spread += 0.1; }
    if (k === 'h') { patch[channel].spread -= 0.1; }

    seqs[channel].seq     = genSequence(patch[channel]);
};
const densityHandler = (k) => {
    if (k === 'l') { patch[channel].density += 5; }
    if (k === 'h') { patch[channel].density -= 5; }

    seqs[channel].seq     = genSequence(patch[channel]);
};
const dividerHandler = (k) => {
    if (k === 'l') { patch[channel].divider *= 2; }
    if (k === 'h') { patch[channel].divider /= 2; }

    seqs[channel].divider     = patch[channel].divider;
};
const bpmHandler = (k) => {
};

let selectedIndex = 0;
let mkitem = (name, fn, handler) => ({ name, fn, handler });
let mkseparator = () => mkitem('', () => '', () => {});
let items = [
    mkitem(channelName(0), () => seqToString2(seqs[0]), channelHandler(0)),
    mkitem(channelName(1), () => seqToString2(seqs[1]), channelHandler(1)),
    mkitem(channelName(2), () => seqToString2(seqs[2]), channelHandler(2)),
    mkitem(channelName(3), () => seqToString2(seqs[3]), channelHandler(3)),
    mkitem(channelName(4), () => seqToString2(seqs[4]), channelHandler(4)),
    mkitem(channelName(5), () => seqToString2(seqs[5]), channelHandler(5)),
    mkitem(channelName(6), () => seqToString2(seqs[6]), channelHandler(6)),
    mkitem(channelName(7), () => seqToString2(seqs[7]), channelHandler(7)),
    mkseparator(),
    mkitem('seed:'.padEnd(11),    () => patch[channel].seed,    reseedHandler),
    mkitem('tonic:'.padEnd(11),   () => patch[channel].tonic,   tonicHandler),
    mkitem('scale:'.padEnd(11),   () => patch[channel].scale,   scaleHandler),
    mkitem('spread:'.padEnd(11),  () => patch[channel].spread,  spreadHandler),
    mkitem('density:'.padEnd(11), () => patch[channel].density, densityHandler),
    mkitem(
        () => (sync ? 'div:' : 'bpm:').padEnd(11),
        () => sync ? patch[channel].divider : patch[channel].bpm,
        (...a) => sync ? dividerHandler(...a) : bpmHandler(...a)
    ),
    mkitem('sync:'.padEnd(11),    () => sync),
]
const rev = (val) => '\033[7m' + val + '\033[0m';


class UI {
    static drawScreen () {
        let screen = '';
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            let name = item.name instanceof Function ? item.name() : item.name;
            let line = `${name} ${item.fn()}`;

            if (i === selectedIndex) { line = rev(line); }

            screen += line;
            screen += '\n';
        }
        console.log(screen);

        return;
    }
    static redraw () {
        process.stdout.write('\x1b[2J');
        process.stdout.write('\x1b[H');
        this.drawScreen();
    }
}

seqLoop();
if (process.argv.includes('--repl')) {
    mode = 'repl';
    repl();
} else {
    mode = 'ui';
    readline.emitKeypressEvents(process.stdin);
    process.stdin.setRawMode(true);

    process.stdin.on('keypress', (str, key) => {
        if (key.sequence === '\u0003')         { process.exit(); }
        else if (key.sequence === 'j')         { selectedIndex += 1 }
        else if (key.sequence === 'k')         { selectedIndex -= 1 }
        else if (items[selectedIndex].handler) { items[selectedIndex].handler(key.sequence) }

        if (selectedIndex >= items.length) { selectedIndex = 0 }
        if (selectedIndex < 0)             { selectedIndex = items.length - 1 }

        UI.redraw();
    });

    UI.redraw();
}



// +--------------------------------------------------------------------------------+
// |                                                                                |
// |  seq0: C4          C4          C4          C4          C4          C4          |
// |  seq0: C4          C4          C4          C4          C4          C4          |
// |  seq0: C4          C4          C4          C4          C4          C4          |
// |  seq0: C4          C4          C4          C4          C4          C4          |
// |  seq0: C4          C4          C4          C4          C4          C4          |
// |  seq0: C4          C4          C4          C4          C4          C4          |
// |  seq0: C4          C4          C4          C4          C4          C4          |
// |  seq0: C4          C4          C4          C4          C4          C4          |
// |                                                                                |
// |  seed:    0.000000000                                                          |
// |  tonic:   C4                                                                   |
// |  scale:   minor pentatonic                                                     |
// |  spread:  1.1                                                                  |
// |  density: 80                                                                   |
// |  bpm:     120                                                                  |
// |  sync:    on                                                                   |
// |                                                                                |
// |                                                                                |
// |                                                                                |
// |                                                                                |
// |                                                                                |
// +--------------------------------------------------------------------------------+
