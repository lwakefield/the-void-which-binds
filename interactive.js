const World = require('./world.js');
const UI    = require('./ui.js');

require('./log.js').patch();

log('global', 'initializing...');

World.init();
World.mode = 'ui';

UI.init(World);

log('global', 'done initializing');
log('global', 'starting ui and sequencer...');

UI.start();
World.start();

log('global', 'done starting ui and sequencer');

process.on('SIGINT', () => {
    World.stop();
    process.exit(0);
});

// TODO:
// - [x] transpose
// - [x] sequence mutation
// - [x] seed -> words
// - [ ] step length
// - [ ] lock
// - [ ] rhythm/emphasis
