var http = require("http");
var url = require("url");
var Kinvey = require('kinvey');

function start(route, handle) {
	function onRequest(request, response) {
		var pathname = url.parse(request.url).pathname;
		console.log("Request for " + pathname + " received.");

		//route(handle, pathname, response);

		Kinvey.ping({
		    success: function(response) {
		        console.log('Kinvey Ping Success. Kinvey Service is alive, version: ' + response.version + ', response: ' + response.kinvey);
		    },
		    error: function(error) {
		        console.log('Kinvey Ping Failed. Response: ' + error.description);
		    }
		});
	}

	http.createServer(onRequest).listen(8888);
	console.log("Server has started.");
}

exports.start = start;