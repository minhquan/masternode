// Dependencies
const http = require('http');
const url = require('url');

// Instantiate and start the server
const httpServer = http.createServer((req, res) => {
  // Get the url and parse it
  var parsedUrl = url.parse(req.url, true);

  // Get the path
  var trimmedPath = parsedUrl.pathname.replace(/^\/+|\/+$/g, '');

  // Choose the handler the request should go to. If one is not found, go to notFound handler.
  var chosenHandler = typeof (router[trimmedPath]) !== 'undefined' ? router[trimmedPath] : handlers.notFound;

  var data = {
    'method': req.method.toLocaleUpperCase(),
    'headers': req.headers
  };

  chosenHandler(data, (statusCode, payload) => {
    // Use the status code called back by the handler, or default to 200
    statusCode = typeof (statusCode) == 'number' ? statusCode : 200

    // Use the payload called back by the handler, or default to an empty object
    payload = typeof (payload) == 'object' ? payload : {};

    // Convert the payload object to JSON string
    var payloadString = JSON.stringify(payload);

    // Return the response
    res.setHeader('Content-Type', 'application/json');
    res.writeHead(statusCode);
    res.end(payloadString);

    // Log
    console.log('Returning this response: ', statusCode, payloadString);
  })
});
httpServer.listen(1234, () => console.log('The server is listening on port 1234'));

// Define the handlers
var handlers = {};

// Say Hello handler
handlers.sayHello = (data, callback) => {
  callback(200, { 'message': 'Hello, how are you today?' });
};

// Not found handler
handlers.notFound = (data, callback) => callback(404);

// Define request route(s)
const router = {
  'hello': handlers.sayHello
};