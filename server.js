var express = require('express');
var http = require('http');
var app = express();

app.configure(function(){
	app.set('port', 8080);
	app.set('views', __dirname + '/app/server/views');
	app.set('view engine', 'jade');
	app.locals.pretty = true;
//	app.use(express.favicon());
//	app.use(express.logger('dev'));
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
io.sockets.on('connection', function (socket) {

	/*io.sockets.sockets[]

	for (var socketId in io.sockets.sockets) {
	    io.sockets.sockets[socketId].get('nickname', function(err, nickname) {
	        console.log(nickname);
	    });
	}*/

	function log(){
		var array = [">>> "];
	  for (var i = 0; i < arguments.length; i++) {
	  	array.push(arguments[i]);
	  }
	    socket.emit('log', array);
	}

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

	socket.on('invite user', function (users) {
		var ret = getSocketByName(users.to, function (foundSocket) {
			foundSocket.emit('invitation', users.from);
		});
	});

	socket.on('message', function (message) {
		log('Got message: ', message);
		socket.broadcast.emit('message', message); // should be room only
	});

	socket.on('create or join', function (room) {
		var numClients = io.sockets.clients(room).length;

		log('Room ' + room + ' has ' + numClients + ' client(s)');
		log('Request to create or join room', room);

		if (numClients == 0){
			socket.join(room);
			socket.emit('created', room);
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

});