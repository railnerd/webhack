//  NodeJS+Express+Socket.IO Proof of Concept
//  Hacked on November 19th, 2011 by Dave Falkenburg
//
//  This code sketch is intended to demonstrate a lightweight server implementation
//  for shared state management utilizing Javascript on both the client and the server.


//  Simplified layoutState
//
//  In our contrived example, we have 3 turnouts, with the following initial states.
//  In the real world, this should or could be in a database or key-value server, but
//  for now we're just going to use a javascript array of objects for this demo.

var layoutState = [
  {id:'t100',state:'thrown'},
  {id:'t101',state:'normal'},
  {id:'t102',state:'normal'}
];


//  Our HTTP server is just an Express web server object fused with a socket.io
//  server. The socket.io module is where most of the real magic lives, it is a
//  package which supports connections via WebSockets, long-lived XMLHttpRequests,
//  or worst case Adobe Flash sockets (ick).

var express = require('express')
var app = express.createServer();
var io = require('socket.io').listen(app);

//  Our server running on port 3000, and we'll serve up static files for now.

app.configure( function() {
  app.use(express.logger());
  app.use(express.bodyParser());
});

app.configure('development', function(){
    app.use(express.static(__dirname + '/static'));
    app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
  var oneYear = 31557600000;
  app.use(express.static(__dirname + '/static', { maxAge: oneYear }));
  app.use(express.errorHandler());
});

app.listen(3000);


//  socket.io Callbacks
//
//  Allow web client(s) to connect using a socket interface. The client and server
//  ship streamed JSON objects back and forth to get the job done.
//
//  Whenever a client connects, it is given a copy of the entire layout state, and
//  a callback is installed for that client which allows individual elements to be
//  "clicked" via a JSON blob send from client to server. In response to the click,
//  the server broadcasts the changed state back to ALL clients.
//
//  NOTE: In the real world case, the client should indicate what subset of the state
//  they are interested in, but for now we just give every client the full state.

io.configure('production', function(){
  io.enable('browser client minification');  // send minified client
  io.enable('browser client etag');          // enable caching
  io.enable('browser client gzip');          // gzip the file
  io.set('log level', 1);                    // disable debug logs
});

io.configure('development', function(){
  io.set('transports', ['websocket']);
});

io.sockets.on('connection', function (socket) {

  // whenever a new client connects, send the entire layout state
  socket.emit('update', layoutState);

  // Install a callback for whenever a client sends a 'click' message. In a the real
  // implementation, we would most likely support primitives like "get/set" instead.
    
  socket.on('click',function parseClickMessage(data) {
      var changedState = [];

      // Incomming data is a JSON object of the form "{'click':<id>}"
      var clickTargetId = data['click'];
        
      // Walk through the layoutState array to toggle the state               
      for (i in layoutState) {
        if (layoutState[i].id == clickTargetId) {
          if (layoutState[i].state == 'thrown') {
            layoutState[i].state = 'normal';
          } else {
            layoutState[i].state = 'thrown';
          }
          changedState.push(layoutState[i]);
        }
      }

      // Send the changed layout elements to all the clients.
      socket.broadcast.emit('update', changedState);

      // NOTE: We need to specifically reply to the requesting client,
      // because socket.broadcast.emit skips that by default.
      socket.emit('update', changedState);
    }
  );

});
