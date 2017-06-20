'use strict';

const debug = require('debug')('chaturbate:socket-server');
const ChaturbateBrowser = require('@paulallen87/chaturbate-browser');
const ChaturbateController = require('@paulallen87/chaturbate-controller');
const SocketIO = require('socket.io');


class SocketGroup {

  constructor(username) {
    this.username = username;
    this.browser = new ChaturbateBrowser();
    this.controller = new ChaturbateController(this.browser);
    this.sockets = {};

    this.controller.on('state_change', (e) => this._onStateChange(e));
  }

  async start() {
    await this.browser.start();
    this.browser.navigate(this.username);
  }

  stop() {
    this.browser.stop();
  }

  addSocket(socket) {
    this.sockets[socket.id] = socket;
    this._initSocket(socket);
    this._bindEvents(socket);
  }

  removeSocket(id) {
    delete this.sockets[id];
  }

  isEmpty() {
    return !Object.keys(this.sockets).length;
  }

  _forEach(callback) {
    Object.keys(this.sockets).forEach((id) => {
      callback(this.sockets[id]);
    })
  }

  _initSocket(socket) {
    socket.emit('init', this.controller.settings)
  }

  _bindEvents(socket) {
    this.controller.eventNames.forEach((name) => {
      this.controller.on(name, (e) => socket.emit(name, e))
    })
  }

  _onStateChange(e) {
    this._forEach((socket) => this._initSocket(socket))
  }
}


class ChaturbateSocketServer {

  constructor(server) {
    this.io = SocketIO(server);
    this.io.on('connection', (socket) => this._onConnection(socket));
    this.groups = {};
    this.sockets = {};
  }

  stop() {
    Object.keys(this.groups).forEach((key) => {
      debug(`stopping browser for '${key}'...`);
      this.groups[key].stop();
    })
  }

  cleanup() {
    Object.keys(this.groups).forEach((key) => {
      debug(`checking '${key}' socket group for cleanup...`);
      const group = this.groups[key];
      if (group.isEmpty()) {
        debug(`socket group '${key}' is empty`);
        group.stop();
        delete this.groups[group.username];
      }
    })
  }

  _onConnection(socket) {
    debug('new connection')
    this.sockets[socket.id] = null;
    socket.on('init', (username) => this._onInit(socket, username));
    socket.on('disconnect', () => this._onDisconnect(socket.id));
    socket.emit('connected');
  }

  _onInit(socket, username) {
    debug(`requesting socket group group: ${username}`)
    const group = this._getOrCreateGroup(username);
    group.addSocket(socket);
    this.sockets[socket.id] = group;
  }

  _onDisconnect(id) {
    debug(`socket disconnected`)

    if (this.sockets[id] == null) {
      debug('no socket group attached')
      delete this.sockets[id];
      return;
    }

    if (this.sockets[id]) {
      debug('found socket group attached')
      const group = this.sockets[id];
      delete this.sockets[id];
      group.removeSocket(id);
    }
  }

  _getOrCreateGroup(username) {
    if (!this.groups[username]) {
      debug(`creating new socket group: ${username}`)
      this.groups[username] = new SocketGroup(username);
      this.groups[username].start();
    }

    return this.groups[username];
  }
}

module.exports = ChaturbateSocketServer;