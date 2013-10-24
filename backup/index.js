var server = require("./server");
var router = require("./router");
var requestHandlers = require("./requestHandlers");
var Kinvey = require('kinvey');

Kinvey.init({
    appKey    : 'kid_VVe2VNJSii',
    appSecret : 'c776bf4c25714ecc8dc1cd32e5752777'
});

var handle = {}
handle["/"] = requestHandlers.start;
handle["/start"] = requestHandlers.start;
handle["/upload"] = requestHandlers.upload;

server.start(router.route, handle);