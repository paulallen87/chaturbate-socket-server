Chaturbate Socket Server
=========

![build status](https://travis-ci.org/paulallen87/chaturbate-socket-server.svg?branch=master)
![coverage status](https://coveralls.io/repos/github/paulallen87/chaturbate-socket-server/badge.svg?branch=master)
![dependencies](https://img.shields.io/david/paulallen87/chaturbate-socket-server.svg)
![dev dependencies](https://img.shields.io/david/dev/paulallen87/chaturbate-socket-server.svg)
![npm version](https://img.shields.io/npm/v/@paulallen87/chaturbate-socket-server.svg)

A socket server that publishes Chaturbate events from a profile.


## Installation

```shell
npm install @paulallen87/chaturbate-socket-server
```

## Server Usage

```javascript
const app = express();
const server = http.createServer(app);
const cb = new ChaturbateSocketServer(server);

process.on('exit', () => {
  cb.stop();
  server.close();
});

server.listen(8080, () => {
  console.log(`Listening on ${server.address().port}`);
});
```

## Client Usage

See [chaturbate-events](https://github.com/paulallen87/chaturbate-events#events) module for more details.

```javascript
const socket = io();

// username of the room to monitor 
const USERNAME = 'myusername'; 

socket.on('connect', () => {
  console.log('connected')

  socket.emit('init', USERNAME);
});

socket.on('silence', (e) => {
  console.log(`${e.target} was silenced by ${e.source}`);
});

socket.on('kick', (e) => {
  console.log(`${e.target} was kicked`); 
});

socket.on('notice', (e) => {
  console.log(`NOTICE: ${e.message}`);  
});

socket.on('tip', (e) => {
  console.log(`${e.user.username} tipped ${e.amount} tokens`);   
});

socket.on('message', (e) => {
  console.log(`${e.user.username}: ${e.message}`);  
});

socket.on('room_message', (e) => {
  console.log(`ROOM: ${e.message}`);  
});

socket.on('moderator_message', (e) => {
  console.log(`MODERATOR: ${e.user.username} has ${e.action}`); 
});

socket.on('fanclub_message', (e) => {
  console.log(`FANCLUB: ${e.user.username} has ${e.action}`); 
});

socket.on('purchase', (e) => {
  console.log(`PURCHASE: ${e.message}`);
});

socket.on('disconnect', () => {
  console.log('disconnect')
});
```

## Tests

```shell
npm test
```