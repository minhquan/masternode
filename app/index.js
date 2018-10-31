// Dependencies
const http = require('http');
const url = require('url');

// The server should respond to all requests with a string
const server = http.createServer((req, res) => {
  
  // Get the url and parse it
  var parsedUrl = url.parse(req.url, true);

  // Get the path
  var path = parsedUrl.pathname;
  var trimmedPath = path.replace(/^\/+|\/+$/g,'');

  // Get the query string as an object
  var queryStringObject = parsedUrl.query;

  // Get the HTTP Method
  var method = req.method.toLowerCase();

  // Send the response
  res.end('Hello World\n');

  // Log the request path
  console.log(`Request received on path: ${trimmedPath} with method: ${method} and with these query string parameters:`, queryStringObject);
});

// Start the server, and have it listen on port 3000
server.listen(3000, () => console.log('The server is listening on port 3000 now'));