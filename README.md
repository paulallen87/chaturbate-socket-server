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

See chaturbate-events](https://github.com/paulallen87/chaturbate-events#events) module for more details.

```javascript
const socket = io();

// username of the room to monitor 
const USERNAME = 'myusername'; 

socket.on('connect', () => {
  console.log('connected')
  // tell the backend to load this profile
  socket.emit('init', USERNAME);
});

socket.on('init', (e) => {
  console.log(`Welcome to ${e.room}'s room!`);
  console.log(`Current room subject is: ${e.subject}`);
});

socket.on('room_entry', (e) => {
  console.log(`${e.user.username} has joined the room`);
});

socket.on('room_leave', (e) => {
  console.log(`${e.user.username} has left the room`); 
});

socket.on('tip', (e) => {
  console.log(`${e.user.username} tipped ${e.amount} tokens`);   
});

socket.on('room_message', (e) => {
  console.log(`${e.user.username}: ${e.message}`);  
});

socket.on('disconnect', () => {
  console.log('disconnect')
});
```

## Emits

  ### **init**
  The client can emit this message with a username as the payload. The server will load a [chaturbate-controller](https://github.com/paulallen87/chaturbate-controller) and respond with an **init** event.

## Events

  ### **connected**
  Called when the socket is connected.

  ### **init**
  Called when the profile has been initialized by the [chaturbate-controller](https://github.com/paulallen87/chaturbate-controller)

  The payload consists of all the properties on the [chaturbate-controller](https://github.com/paulallen87/chaturbate-controller).

## Chaturbate Events
All events supported by [chaturbate-events](https://github.com/paulallen87/chaturbate-events#events) are also broadcasted on these socket connections.


## Tests

```shell
npm test
```