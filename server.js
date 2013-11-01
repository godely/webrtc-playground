var express = require('express');
var http = require('http');
var AM = require('./app/server/modules/account-manager');
var app = express();

app.configure(function(){
	app.set('port', 8080);
	app.set('views', __dirname + '/app/server/views');
	app.set('view engine', 'jade');
	app.locals.pretty = true;
//  app.use(express.favicon());
//  app.use(express.logger('dev'));
	app.use(express.bodyParser());
	app.use(express.cookieParser());
	app.use(express.session({ secret: 'super-duper-secret-secret' }));
	app.use(express.methodOverride());
	app.use(require('stylus').middleware({ src: __dirname + '/app/public' }));
	app.use(express.static(__dirname + '/app/public'));
});

app.configure('development', function(){
	app.use(express.errorHandler());
});

require('./app/server/router')(app);

var serv = http.createServer(app).listen(app.get('port'), function() {
	console.log("Express server listening on port " + app.get('port'));
});

var io = require('socket.io').listen(serv);
io.set('log level', 1);

io.of('/chat').on('connection', function(socket) {

	function log(){
		var array = [">>> "];
	  for (var i = 0; i < arguments.length; i++) {
		array.push(arguments[i]);
	  }
		socket.emit('log', array);
	}

	socket.on('connect', function(msg) {
		var user = msg.user;
		var pass = msg.pass;
		AM.authenticate(user, pass, function(noerror) {
			if (noerror) {
				var newToken = AM.md5(new Date().getTime() + user + pass + Math.random());
				AM.updateToken(user, newToken, function(e,o) {
					if (!e) {
						socket.set('username', user);
						socket.set('pass', pass);
						socket.set('token', newToken);
						socket.join(newToken);
						socket.emit('success', {'connected': true, 'text': "User " + user + " created room " + newToken, 'token': newToken, 'user': user});
					} else {
						socket.emit('error', {'not_connected': true, 'text': "User " + user + " was unable to update its room token."});
					}
				});
			} else {
				socket.emit('error', {'not_connected': true, 'text': "User " + user + " was unable to authenticate."});
			}
		});
	});

	socket.on('invite', function(msg) {
		var from_token = msg.from_token;
		var from_user = msg.from_user;
		var to_user = msg.to_user;
		AM.findByUsername(to_user, function(e, o) {
			if (!e) {
				var to_token = o.token;
				var numClients = io.of('/chat').clients(to_token).length;

				if (numClients < 1) {
					socket.emit('error', {'invalid_token': true, 'text': "You tried to connect to an invalid token."});
				} else if (numClients > 1) {
					socket.emit('error', {'invalid_token': true, 'text': "You tried to connect to an used token."});
				} else {
					//Not sure if that works to get the actual to_token socket
					var to_socket = io.of('/chat').clients(to_token)[0];

					//We subtract 2 because these two rooms are the '' and '/chat' namespaces respectively

					var to_numRooms = Object.keys(io.sockets.manager.roomClients[to_socket.id]).length - 2;

					if (to_numRooms != 1) {
						socket.emit('error', {'invalid_token': true, 'text': "You are trying to connect to an user that is already talking to someone."});
					} else {
						msg.invited = true;
						msg.text = 'User ' + from_user + ' invited you to chat.';
						to_socket.emit('success', msg);
					}
				}
			}
		});
	});

	socket.on('accept or reject invite', function(msg) {
		//Ajeitar os casos em que to_socket é undefined
		var to_socket = io.of('/chat').clients(msg.token)[0];
		if (msg.accepted) {
			to_socket.emit('success', {'accepted': true, 'token': msg.token});
		} else {
			to_socket.emit('error', {'rejected': true});
		}
	});

	// This user is leaving the room, and is broadcasting to all current users in this room.
	socket.on('leaving', function (msg) {
		socket.broadcast.to(msg.token).emit('error', {'user_leave': true, 'has_to_leave': msg.isInitiator, 'token': msg.token});
	});

	// This user has to leave this room because the owner has left
	socket.on('leave', function(msg) {
		socket.leave(msg.token);
	});

	socket.on('message', function (message) {
		log('Got message: ', message);
		socket.broadcast.emit('message', message); // should be room only
	});
});

/*var chat = io.of('/chat');

chat.on('connection', function (socket) {
	console.log('oi');
});*/

/*io.set('log level', 1);
io.sockets.on('connection', function (socket) {

	

	function getSocketByName(username, callback) {
		for (var socketId in io.sockets.sockets) {
			io.sockets.sockets[socketId].get('username', function(err, nickname) {
				if(nickname == username) {
					callback(io.sockets.sockets[socketId]);
				}
			});
		}
	}

	socket.on('stablish name', function (username) {
		socket.set('username', username);
	});

	socket.on('create', function(details) {
		from = details.from;
		to = details.to;
		room = details.room;

		if (to === from) {
			socket.emit('error', 'Você não pode conversar consigo mesmo.');
		} else {
			var ret = getSocketByName(to, function (foundSocket) {
				log('Request to create room', room);
				socket.join(room);
				socket.emit('invited', room);
				foundSocket.emit('invitation', details);
			});
		}
	});

	socket.on('join', function (details) {
		from = details.from;
		to = details.to;
		room = details.room;

		var numClients = io.sockets.clients(room).length;
		
		// ver aquiiiiiiiii
		if (numClients == 0){
			socket.emit('error', 'Sala inválida.');
		} else if (numClients == 1) {
			io.sockets.in(room).emit('join', room);
			socket.join(room);
			socket.emit('joined', room);
		} else { // max two clients
			socket.emit('full', room);
		}
		socket.emit('emit(): client ' + socket.id + ' joined room ' + room);
		socket.broadcast.emit('broadcast(): client ' + socket.id + ' joined room ' + room);

	});

});*/