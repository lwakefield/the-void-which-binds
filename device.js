const midi = require('midi');
const Tonal = require('@tonaljs/tonal');

class Device {
    constructor () {
        this.input = new midi.Input();
        this.output = new midi.Output();
    }
    open () {
        this.input.openVirtualPort("TheVoid");
        this.input.ignoreTypes(true, false, true)
        // this.input.on('message', console.log);
        this.output.openVirtualPort("TheVoid");
    }
    close () {
        this.input.closePort();
        this.output.closePort();
    }
    noteOn (note, velocity, channel=0) {
        this.output.sendMessage([144 | channel, Tonal.Midi.toMidi(note), velocity]);
    }
    noteOff (note, velocity, channel=0) {
        this.output.sendMessage([128 | channel, Tonal.Midi.toMidi(note), velocity]);
    }
    sendMessage(...args) {
        this.output.sendMessage(args);
    }
}

module.exports = { Device };
