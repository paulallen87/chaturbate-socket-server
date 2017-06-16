'use strict';

const debug = require('debug')('chaturbate:socket-server');
const ChaturbateBrowser = require('@paulallen87/chaturbate-browser');
const ChaturbateEvents = require('@paulallen87/chaturbate-events');
const SocketIO = require('socket.io');


class User {

  constructor(username) {
    this.username = username;
    this.browser = new ChaturbateBrowser();
    this.events = new ChaturbateEvents(this.browser);
    this.sockets = [];
  }

  async start() {
    await this.browser.start();
    this.browser.navigate(this.username);
  }
}


class ChaturbateSocketServer {

  constructor(server) {
    this.io = SocketIO(server);
    this.io.on('connection', (socket) => this._onConnection(socket));
    this.users = {};
  }

  stop() {
    Object.keys(this.users).forEach((key) => {
      debug(`stopping browser for '${key}'...`);
      this.users[key].browser.stop();
    })
  }

  _onConnection(socket) {
    debug('new connection')
    socket.on('init', (username) => this._onInit(socket, username));
    socket.on('disconnect', () => this._onDisconnect(socket));
    socket.emit('connected');
  }

  _onInit(socket, username) {
    debug(`requesting user: ${username}`)
    const user = this._getOrCreateUser(username);
    user.sockets.push(socket);
    this._bindEvents(user.events, socket);
  }

  _onDisconnect(socket) {
    
  }

  _bindEvents(events, socket) {
    events.names.forEach((name) => {
      events.on(name, (e) => socket.emit(name, e))
    })
  }

  _getOrCreateUser(username) {
    if (!this.users[username]) {
      debug(`creating new user: ${username}`)
      this.users[username] = new User(username);
      this.users[username].start();
    }

    return this.users[username];
  }
}

module.exports = ChaturbateSocketServer;