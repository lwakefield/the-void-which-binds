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

        // we expect the clock rate to be 24 pulses per quarter note
        // by default, the sequence is 16 steps long and we want the sequence
        // to be one bar long, therefore, we want to increment the step every
        // (24 * 4) / 16 = 6 pulses
        if (this.run && (this.clock / this.divider) % 6 === 0) {
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
        this.seq = patch.sequence;
        this.divider = patch.divider;
    }
}

module.exports = { ChannelSequence };
