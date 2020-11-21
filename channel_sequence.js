class ChannelSequence {
    constructor (dev, channel) {
        this.dev = dev;
        this.channel = channel;
        this.divider = 1;
        this.run = false;
        this.clock = -1;
        this.index = -1;
        this.seq = [];
        this.note = null;
    }
    reset () {
        this.clock = -1;
        this.index = -1;
    }
    tick () {
        this.clock += 1;

        if (this.run && (this.clock / this.divider) % 24 === 0) {
            this.nextNote();
        }
    }
    nextNote () {
        this.note && this.dev.noteOff(this.note, 127, this.channel);

        // move to the next note
        this.index += 1;
        this.index %= this.seq.length;
        this.note = this.seq[this.index];

        // turn on  the next note
        this.note && this.dev.noteOn(this.note, 127, this.channel);
    }
    updateFromPatch (patch) {
        this.seq = patch.toSequence();
        this.divider = patch.divider;
    }
}

module.exports = { ChannelSequence };
