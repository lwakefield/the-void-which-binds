const midi = require('midi');
const Tonal = require('@tonaljs/tonal');

class Device {
    constructor () {
        this.input = new midi.Input();
        this.output = new midi.Output();
    }
    open () {
        log('device', 'opening ports...');
        this.input.openVirtualPort("TheVoid");
        this.input.ignoreTypes(true, false, true)
        this.output.openVirtualPort("TheVoid");
        log('device', 'done opening ports');

        this.input.on('message', (time, msg) => {
            log('device', `read ${msg.join(', ')}`);

            if (this.handler) this.handler(time, msg);
        });
    }
    close () {
        log('device', 'closing ports...');
        this.input.closePort();
        this.output.closePort();
        log('device', 'done closing ports');
    }
    noteOn (note, velocity, channel=0) {
        this.sendMessage(144 | channel, Tonal.Midi.toMidi(note), velocity);
    }
    noteOff (note, velocity, channel=0) {
        this.sendMessage(128 | channel, Tonal.Midi.toMidi(note), velocity);
    }
    sendMessage(...args) {
        log('device', `sending ${args.join(', ')}`);
        this.output.sendMessage(args);
    }
}

module.exports = Device;
