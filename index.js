'use strict';

const debug = require('debug')('chaturbate:socket-server');
const fs = require('fs');
const ChaturbateBrowser = require('@paulallen87/chaturbate-browser');
const ChaturbateController = require('@paulallen87/chaturbate-controller');
const socketIO = require('socket.io');
const {Console} = require('console');

const logging = new Console(process.stdout, process.stderr);

/**
 * Manages multiple sockets for a single Chaturbate Browser.
 */
class SocketGroup {

  /**
   * Constructor.
   *
   * @param {string} username 
   */
  constructor(username) {
    this.username = username;
    this.browser = new ChaturbateBrowser();
    this.controller = new ChaturbateController(this.browser);
    this.sockets = {};
    this.listeners = {};
    this.init = false;

    this.controller.on('init', (e) => this._onInit());
  }

  /**
   * Starts the browser.
   */
  async start() {
    try {
      await this.browser.start();
    } catch (e) {
      logging.warn('failed to start the chrome browser');
      logging.error(e);
      return;
    }
    this.browser.profile(this.username);
  }

  /**
   * Stops the browser.
   */
  stop() {
    this.browser.stop();
  }

  /**
   * Adds a new socket to the group.
   *
   * @param {Object} socket 
   */
  addSocket(socket) {
    this.sockets[socket.id] = socket;
    if (this.init) {
      this._initSocket(socket);
    }
    this._bindEvents(socket);
  }

  /**
   * Removes a socket from the group.
   *
   * @param {string} id 
   */
  removeSocket(id) {
    this._unbindEvents(id);
    delete this.sockets[id];
  }

  /**
   * Checks if the group is empty.
   * 
   * @return {boolean}
   */
  isEmpty() {
    return !Object.keys(this.sockets).length;
  }

  /**
   * Initializes all sockets.
   * 
   * @private
   */
  _onInit() {
    this.init = true;
    this._forEach((socket) => this._initSocket(socket));
  }

  /**
   * Performs a callback for each socket.
   *
   * @param {Function} callback 
   */
  _forEach(callback) {
    Object.keys(this.sockets).forEach((id) => {
      callback(this.sockets[id]);
    });
  }

  /**
   * Initializes a specific socket.
   *
   * @param {Object} socket 
   */
  _initSocket(socket) {
    socket.emit('init', this.controller.settings);
  }

  /**
   * Binds all known events to a socket.
   *
   * @param {*} socket 
   */
  _bindEvents(socket) {
    this.controller.eventNames.forEach((name) => this._bind(name, socket));
  }

  /**
   * Creates and tracks a bound event for a socket.
   *
   * @param {string} name 
   * @param {Object} socket 
   */
  _bind(name, socket) {
    const listener = this._createListener(socket, name, (e) => {
      socket.emit(name, e);
    });
    this.controller.on(name, (e) => listener(e));
  }

  /**
   * Creates an event listener for a socket.
   *
   * @param {Object} socket 
   * @param {string} name 
   * @param {Function} cb 
   * @return {Function}
   */
  _createListener(socket, name, cb) {
    debug(`creating listener '${name}' for socket '${socket.id}'`);
    if (!this.listeners[socket.id]) {
      this.listeners[socket.id] = {};
    }

    this.listeners[socket.id][name] = (e) => cb(e);

    return this.listeners[socket.id][name];
  }

  /**
   * Unbinds all listeners for a socket.
   *
   * @param {string} id 
   */
  _unbindEvents(id) {
    if (!this.listeners[id]) return;

    Object.keys(this.listeners[id]).forEach((key) => {
      debug(`destroying listener '${key}' for socket '${id}'`);
      this.controller.removeListener(key, this.listeners[id][key]);
    });

    delete this.listeners[id];
  }
}

/**
 * A socket server for multiple Chaturbate Browsers.
 */
class ChaturbateSocketServer {

  /**
   * Constructor.
   *
   * @param {number} cleanupInterval
   * @constructor
   */
  constructor(cleanupInterval = 30000) {
    this._io = socketIO();
    this._io.on('connection', (socket) => this._onConnection(socket));
    this._groups = {};
    this._sockets = {};
    this._aclEnabled = false;
    this._aclFile = null;

    setInterval(() => this._cleanup(), cleanupInterval);
  }

  /**
   * Attaches an HTTP server to SocketIO.
   *
   * @param {Object} server 
   * @return {this}
   */
  attach(server) {
    this._io.attach(server);
    return this;
  }

  /**
   * Enables access control.
   *
   * @param {boolean} enabled 
   * @return {this}
   */
  accessControl(enabled) {
    this._aclEnabled = enabled;
    return this;
  }

  /**
   * Sets an access control file to use.
   *
   * @param {string} file
   * @return {this}
   */
  accessList(file) {
    this._aclFile = file;
    return this;
  }

  /**
   * Checks that a username is allowed.
   *
   * @param {string} username 
   * @return {boolean}
   */
  _hasAccess(username) {
    if (!this._aclEnabled) return true;
    if (!this._aclFile) return true;
    if (!fs.existsSync(this._aclFile)) return false;

    const contents = fs.readFileSync(this._aclFile);
    if (!contents) return false;

    try {
      const json = JSON.parse(contents);
      return Boolean(json.users[username]);
    } catch (e) {
      return false;
    }
  }

  /**
   * Performs a cleanup of unused browsers.
   * 
   * @private
   */
  _cleanup() {
    Object.keys(this._groups).forEach((key) => {
      debug(`checking '${key}' socket group for cleanup...`);
      const group = this._groups[key];
      if (group.isEmpty()) {
        debug(`socket group '${key}' is empty`);
        group.stop();
        delete this._groups[group.username];
      }
    });
  }

  /**
   * Called when a new socket connects.
   *
   * @param {Object} socket 
   */
  _onConnection(socket) {
    debug('new connection');
    this._sockets[socket.id] = null;
    socket.on('init', (username) => this._onInit(socket, username));
    socket.on('disconnect', () => this._onDisconnect(socket.id));
    socket.emit('connected');
  }

  /**
   * Called when a socket requests a browser.
   *
   * @param {Object} socket 
   * @param {string} username 
   */
  _onInit(socket, username) {
    debug(`requesting socket group group: ${username}`);
    if (this._hasAccess(username)) {
      const group = this._getOrCreateGroup(username);
      group.addSocket(socket);
      this._sockets[socket.id] = group;
    } else {
      debug(`access denied to '${username}'`);
      socket.emit('denied');
    }
  }

  /**
   * Called when a socket disconnects.
   *
   * @param {string} id 
   */
  _onDisconnect(id) {
    debug(`socket disconnected`);

    if (this._sockets[id] === null) {
      debug('no socket group attached');
      delete this._sockets[id];
      return;
    }

    if (this._sockets[id]) {
      debug('found socket group attached');
      const group = this._sockets[id];
      delete this._sockets[id];
      group.removeSocket(id);
    }
  }

  /**
   * Gets or creates a browser group.
   *
   * @param {string} username 
   * @return {SocketGroup}
   */
  _getOrCreateGroup(username) {
    if (!this._groups[username]) {
      debug(`creating new socket group: ${username}`);
      this._groups[username] = new SocketGroup(username);
      this._groups[username].start();
    }

    return this._groups[username];
  }
}

module.exports = ChaturbateSocketServer;
