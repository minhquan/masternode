// Dependencies
const http = require('http');
const url = require('url');
var StringDecoder = require('string_decoder').StringDecoder;

// The server should respond to all requests with a string
const server = http.createServer((req, res) => {

  // Get the url and parse it
  var parsedUrl = url.parse(req.url, true);

  // Get the path
  var path = parsedUrl.pathname;
  var trimmedPath = path.replace(/^\/+|\/+$/g, '');

  // Get the query string as an object
  var queryStringObject = parsedUrl.query;

  // Get the HTTP Method
  var method = req.method.toLowerCase();

  // Get the headers as an object
  var headers = req.headers;

  // Get the payload, if any
  var decoder = new StringDecoder('utf-8');
  var buffer = '';
  req.on('data', (data) => buffer += decoder.write(data));
  req.on('end', () => {
    buffer += decoder.end();

    // Send the response
    res.end('Hello World\n');

    // Doing some loggings
    console.log(`Request received on path: ${trimmedPath} with method: ${method} and with these query string parameters:`, queryStringObject);
    console.log('Request received with these headers: ', headers);
    console.log('Request received with this payload: ', buffer);
  });
});

// Start the server, and have it listen on port 3000
server.listen(3000, () => console.log('The server is listening on port 3000 now'));