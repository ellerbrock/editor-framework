'use strict';

/**
 * The `core-level` debugger utils, when you turn on the debugger,
 * it actually run a [node-inspector](https://github.com/node-inspector/node-inspector)
 * process in the low-level, and you can use your chrome browser debug the core module.
 * @module Editor.Debugger
 */
let Debugger = {};
module.exports = Debugger;

// requires
const Electron = require('electron');
const ChildProcess = require('child_process');
const Repl = require('repl');

const MainMenu = require('./main-menu');
const i18n = require('./i18n');

// DISABLE: vorpal
const Chalk = require('chalk');
// const Vorpal = require('vorpal');

const Console = require('./console');

// interal
let _replServer = null;
let _nodeInspector = null;
let _dbgPort = 3030;

function _eval ( cmd, context, filename, callback ) {
  try {
    let result = eval(cmd);
    callback(null, result);
  } catch (e) {
    console.log(Chalk.red(e.stack));
  }
}

// DISABLE: vorpal
// let _vorpal = Vorpal();
// _vorpal.delimiter('editor$');

// _vorpal.mode('debug')
//   .delimiter('debugger>')
//   .description('Enters REPL debug mode.')
//   .action(function (command, callback) {
//     try {
//       if ( command === 'debugger' ) {
//         throw new Error('debugger command is not allowed!');
//       }

//       let result = eval(command);
//       this.log(result);
//     } catch (e) {
//       this.log(Chalk.red(e));
//     }
//     callback();
//   })
//   ;

// ==========================
// exports
// ==========================

/**
 * Toggle on or off the `core-level` debugger
 * @method toggle
 */
Debugger.toggleRepl = function () {
  if ( _replServer ) {
    Debugger.stopRepl();
  } else {
    Debugger.startRepl();
  }

  return _replServer !== null;
};

Debugger.startRepl = function () {
  let fmtMenuPath = i18n.formatPath(
    'i18n:MAIN_MENU.developer.title/i18n:MAIN_MENU.developer.toggle_repl'
  );

  _replServer = Repl.start({
    prompt: 'editor$ > ',
    eval: _eval
  }).on('exit', () => {
    // process.exit(0); // DISABLE
    console.info('Repl debugger closed');

    _replServer = null;
    MainMenu.set(fmtMenuPath, { checked: false });
  });

  MainMenu.set(fmtMenuPath, { checked: true });

  // DISABLE
  // _vorpal.show();
  // _vorpal.exec('debug');
};

Debugger.stopRepl = function () {
  if ( !_replServer ) {
    return;
  }

  // DISABLE
  // _replServer.removeAllListeners('exit');
  _replServer.write('.exit\n');

  // DISABLE
  // _vorpal.hide();
};

/**
 * Toggle on or off the `core-level` debugger
 * @method toggle
 */
Debugger.toggleNodeInspector = function () {
  if ( _nodeInspector ) {
    Debugger.stopNodeInspector();
  } else {
    Debugger.startNodeInspector();
  }

  return _nodeInspector !== null;
};

/**
 * Turn on the `core-level` debugger
 * @method start
 */
Debugger.startNodeInspector = function () {
  let exePath = Electron.app.getPath('exe');
  let fmtMenuPath = i18n.formatPath(
    'i18n:MAIN_MENU.developer.title/i18n:MAIN_MENU.developer.toggle_node_inspector'
  );
  let url = `http://127.0.0.1:8080/debug?ws=127.0.0.1:8080&port=${_dbgPort}`;

  try {
    // start node-inspector
    _nodeInspector = ChildProcess.spawn(exePath, [
      'node_modules/node-inspector/bin/inspector.js',
      `--debug-port=${_dbgPort}`,
    ], {
      stdio: 'inherit',
      env: {
        ELECTRON_RUN_AS_NODE: true
      },
    });
    MainMenu.set(fmtMenuPath, { checked: true });

    // on-close
    _nodeInspector.on('close', () => {
      _nodeInspector = null;
      MainMenu.set(fmtMenuPath, { checked: false });

      Console.info('node-inspector stopped');
    });
  } catch ( err ) {
    Console.failed ( `Failed to start node-inspector: ${err.message}` );
    _nodeInspector = null;

    return;
  }

  Console.info(`node-inspector started: ${url}`);

  // DISABLE: break point will lead to crash
  // setTimeout(() => {
  //   let win = new Electron.BrowserWindow({
  //     title: 'node-inspector',
  //     webPreferences: {
  //       nodeIntegration: false,
  //     }
  //   });
  //   win.loadURL(url);
  //   win.on('closed', () => {
  //     if ( _nodeInspector ) {
  //       _nodeInspector.kill();
  //     }
  //   });
  // }, 1000);
};

/**
 * Turn off the `core-level` debugger
 * @method stop
 */
Debugger.stopNodeInspector = function () {
  if ( _nodeInspector ) {
    _nodeInspector.kill();
  }
};

/**
 * Active devtron
 * @method activeDevtron
 */
Debugger.activeDevtron = function () {
  // activate devtron for the user if they have it installed
  try {
    Electron.BrowserWindow.addDevToolsExtension(require('devtron').path);
  } catch (err) {
    Console.error(`Failed to active devtron: ${err.message}`);
  }
};

Object.defineProperty(Debugger, 'debugPort', {
  enumerable: true,
  get () { return _dbgPort; },
  set ( value ) { _dbgPort = value; },
});

Object.defineProperty(Debugger, 'isReplEnabled', {
  enumerable: true,
  get () { return _replServer !== null; }
});

Object.defineProperty(Debugger, 'isNodeInspectorEnabled', {
  enumerable: true,
  get () { return _nodeInspector !== null; }
});
