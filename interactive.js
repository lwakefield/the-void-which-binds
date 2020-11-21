const World = require('./world.js');
const UI    = require('./ui.js');

World.init();
World.mode = 'ui';

UI.init(World);

UI.start();
World.start();

process.on('SIGINT', () => {
    World.stop();
    process.exit(0);
});
