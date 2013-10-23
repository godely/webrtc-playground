var http = require("http");

function start() {
	function onRequest(request, response) {
		console.log("Request received.");
	    response.writeHead(200, {"Content-Type": "text/plain"});
	    response.write("Hello World");
	    response.end();

	    /*if (url.parse(request.url).pathname == "login") {
	    	login(request,response);
	    }*/
	}

	http.createServer(onRequest).listen(8888);
	console.log("Server has started.");
}

exports.start = start;


function login(request, response) {
	var names = url.parse(request.url).query;
	querystring(names)["user"];
}