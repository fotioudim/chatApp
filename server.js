'use strict';

const express = require("express");
const app = express(); 
const moment = require("moment");
const http = require('http');
const rand = require('random-key');

const hostname = '127.0.0.1';
const port = 3000;

const server = http.createServer(app);

var clientInfo = {}; // all clients' info are saved here from the whole namespace io
var activeRooms = [];

//socket io module
var io = require("socket.io")(server);

// expose the folder via express thought
app.use(express.static(__dirname + '/public'));

// send current users to provided socket
function sendCurrentUsers(socket) { // loading current users
	var info = clientInfo[socket.id];
	var activeusers = [];
	var busyusers = [];
	var awayusers = [];
	
	if (typeof info === 'undefined') {
		return;
	}
	// filter name based on rooms
	Object.keys(clientInfo).forEach(function(socketId) {
		var userinfo = clientInfo[socketId];
		// check if user room and selected room same or not
		// as user should see names in only his chat room
		if (info.room == userinfo.room) {
			if (userinfo.status == "active") 
				activeusers.push({name: userinfo.name, socket: socketId});
			else if (userinfo.status == "busy")
				busyusers.push({name: userinfo.name, socket: socketId});
			else if (userinfo.status == "away")
				awayusers.push({name: userinfo.name, socket: socketId});
		}
	});
  
	io.in(info.room).emit("activeUsers", activeusers);
	io.in(info.room).emit("busyUsers", busyusers);
	io.in(info.room).emit("awayUsers", awayusers);
}


// io.on listens for events
io.on("connection", function(socket) {
	console.log("User is connected");
	
	//for disconnection
	socket.on("disconnect", function() {
		var userdata = clientInfo[socket.id];
		if (typeof(userdata !== undefined)) {
			console.log(userdata.name + " has left");
			socket.leave(userdata.room); // leave the room
			//broadcast leave room to only members of same room
			socket.broadcast.to(userdata.room).emit("message", {
				text: userdata.name + " has left",
				name: "Chat App",
				timestamp: moment().valueOf()
			});
		// delete user data
		delete clientInfo[socket.id];
		}
	});

	// for private chat
	socket.on('joinRoom', function(req) {
		clientInfo[socket.id] = req;
		socket.join(req.room);
		console.log("User: " + req.name +" connected to chat room");
	});
		
	socket.on('createChat', function(req) {
		
		// find a non used room name
		var roomName;
		do {
			if ( roomName )
				writeLog('info', 'Room already exists', roomName);
			roomName = rand.generate(6); // 6 character long random string contaning 0-9, a-z, A-Z (base62)
		} while ( activeRooms[roomName] != undefined );
		
		activeRooms[roomName] = "active";
		
		socket.leave(clientInfo[socket.id].room);
		req.room = roomName;
		clientInfo[socket.id] = req;
		socket.join(roomName);
		
		console.log("User: " + req.name +" entered private chat, in room: " + roomName);
		
		socket.emit("message", {
			text: "Welcome to the chat room !",
			timestamp: moment().valueOf(),
			name: "Chat App"
		});
		
		io.to(`${req.socket}`).emit('call', roomName);
		
		socket.emit("roomCreated", {room: roomName});
	});	
		
	socket.on('joinChat', function(req) {
		socket.leave(clientInfo[socket.id].room);
		clientInfo[socket.id] = req;
		socket.join(req.room);
		console.log("User: " + req.name +" entered private chat, in room: " + req.room);
		
		socket.emit("message", {
			text: "Welcome to the chat room !",
			timestamp: moment().valueOf(),
			name: "Chat App"
		});
		
		socket.broadcast.to(req.room).emit("message", {
			name: "Chat App",
			text: req.name + ' has joined',
			timestamp: moment().valueOf()
		});
	});
	
	// to show who is typing Message
	socket.on('typing', function(message) { // broadcast this message to all users in that room
		socket.broadcast.to(clientInfo[socket.id].room).emit("typing", message);
	});

	// to check if user seen Message
	socket.on("userSeen", function(msg) {
		socket.broadcast.to(clientInfo[socket.id].room).emit("userSeen", msg);
	});

	// listen for client message
	socket.on("message", function(message) {
		console.log("Message Received : " + message.text);
		// to show all current users
		if (message.text === "@currentUsers") {
			sendCurrentUsers(socket);
		} else {
			//broadcast to all users except for sender
			message.timestamp = moment().valueOf();
			// now message should be only sent to users who are in same room
			socket.broadcast.to(clientInfo[socket.id].room).emit("message", message);
		}
	});
	
	socket.on("status", function(message) {
		clientInfo[socket.id].status = message.status;
		sendCurrentUsers(socket);
	});
	
	socket.on('disconnecting', function(reason) {
		// socket.rooms contains all room that socket is currently connected
		for(var roomName in socket.rooms)
			if ( roomName != socket.id ) // If roomName is different than the automatically generated room during socket creation
				if (activeRooms[roomName] != undefined) {
				delete activeRooms[roomName];	// remove "roomName" room from "activeRooms" list of rooms
				console.log("Deleting room: " + roomName);
				}
	});
});

server.listen(port, hostname, () => {
	console.log(`Server running at http://${hostname}:${port}/`);
});