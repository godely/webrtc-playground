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

var clients = {}
var isChatting = {}

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
						clients[newToken] = socket;
						isChatting[newToken] = false;
						socket.emit('connected', {'token': newToken, 'user': user});
					} else {
						socket.emit('not_connected');
					}
				});
			} else {
				socket.emit('not_connected');
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
				if (isChatting[to_token]) {
					socket.emit('invalid_token', {'type': 'user_occupied'});
				} else if (isChatting[from_token]) {
					socket.emit('invalid_token', {'type': 'this_occupied'});
				} else {
					var to_socket = clients[to_token];
					isChatting[from_token] = true;
					to_socket.emit('invited', msg);
				}
			}
		});
	});

	socket.on('accept or reject invite', function(msg) {
		//Ajeitar os casos em que to_socket é undefined
		var to_socket = clients[msg.token];
		if (msg.accepted) {
			socket.join(msg.token);
			isChatting[msg.from_token] = true;
			console.log(msg.from_token);
			to_socket.emit('accepted invitation', {'token': msg.token});
		} else {
			isChatting[msg.token] = false;
			to_socket.emit('rejected invitation');
		}
	});

	// This user is leaving the room, and is broadcasting to all current users in this room.
	socket.on('leaving', function (msg) {
		delete clients[msg.token];
		delete isChatting[msg.token];
		socket.broadcast.to(msg.room).emit('user_leave', {'has_to_leave': msg.is_owner, 'token': msg.room});
	});

	// This user has to leave this room because the owner has left
	socket.on('leave', function(msg) {
		isChatting[msg.from_token] = false;
		if (msg.leave_room) socket.leave(msg.token);
	});

	socket.on('message', function (msg) {
		log('Got message: ', msg);
		socket.broadcast.to(msg.room).emit('message', msg.text);
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