const Device                  = require('./device.js');
const Patch                   = require('./patch.js');
const UI                      = require('./ui.js');
const { ChannelSequence }     = require('./channel_sequence.js');
const { last, cmpArr, sleep } = require('./util.js');

class World {
    static channel = -1;
    static mode = null;

    static device = new Device();
    static patches = [];
    static channelSequences = [];

    static bpm = 120;
    static midiSync = true;

    static sync = {};

    static init () {
        const NUM_CHANNELS = 8;
        for (let i = 0; i < NUM_CHANNELS; i++) {
            this.patches.push(new Patch());
            if (i > 0) last(this.patches).density = 0;

            last(this.patches).genSequences();
            this.channelSequences.push(new ChannelSequence(this.device, i));
            last(this.channelSequences).updateFromPatch(last(this.patches));
        }
        this.channel = 0;
    }

    static start () {
        this.device.open();
        this.loop();
    }
    static stop () {
        for (const chseq of this.channelSequences) {
            if (chseq.note) chseq.dev.noteOff(chseq.note);
        }
        this.device.close();
    }

    static async loop () {
        this.device.handler = (time, msg) => {
            if (cmpArr(msg, [248])) {
                if (time === 0) {
                    this.channelSequences.forEach(s => s.reset());
                }

                this.channelSequences.forEach(s => s.tick());

            } else if (cmpArr(msg, [250])) {
                this.channelSequences.forEach(s => s.run = true);
            } else if (cmpArr(msg, [251])) {
                this.channelSequences.forEach(s => s.run = true);
            } else if (cmpArr(msg, [252])) {
                this.channelSequences.forEach(s => s.run = false);
            }

            if (this.mode === 'ui') UI.redraw();
        };

        while (true) {
            if (!this.midiSync) {
                this.channelSequences.forEach(s => s.tick());
            }
            let delay = 60_000 / (this.bpm * 24);

            const $sleep = sleep(delay);

            if (this.mode === 'ui') UI.redraw();

            await $sleep;
        }
    }

    static turnOnMidiSync () {
        this.midiSync = true;
        this.channelSequences.forEach(s => s.run = false);
    }

    static turnOffMidiSync () {
        this.midiSync = false;
        this.channelSequences.forEach(s => s.run = true);
    }

    static get patch () {
        return this.patches[this.channel];
    }

    static get channelSequence () {
        return this.channelSequences[this.channel];
    }

    static updateSequences () {
        for (let i = 0; i < this.patches.length; i++) {
            this.patches[i].genSequences();
            this.channelSequences[i].updateFromPatch(this.patches[i]);
        }
    }

    static updateSequence (channel) {
        if (typeof channel !== 'undefined') {
            this.patches[channel].genSequences();
            this.channelSequences[channel].updateFromPatch(this.patches[channel]);
        } else {
            this.patch.genSequences();
            this.channelSequence.updateFromPatch(this.patch);
        }
    }
}


module.exports = World;
