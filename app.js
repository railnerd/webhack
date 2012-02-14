//  NodeJS+Express+Socket.IO Proof of Concept
//  Hacked on November 19th, 2011 by Dave Falkenburg
//
//  This code sketch is intended to demonstrate a lightweight server implementation
//  for shared state management utilizing Javascript on both the client and the server.


//  Simplified layoutState
//
//  We're just going to have an array of state variables.  The variable/object name will be
// index into the array.
var layoutState = [];

//  Our HTTP server is just an Express web server object fused with a socket.io
//  server. The socket.io module is where most of the real magic lives, it is a
//  package which supports connections via WebSockets, long-lived XMLHttpRequests,
//  or worst case Adobe Flash sockets (ick).

var express = require('express')
var app = express.createServer();
var io = require('socket.io').listen(app);
var jmri = require('./jmri.js');

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

    // Install a callback for whenever a client sends a 'click' message. In a the real
    // implementation, we would most likely support primitives like "get/set" instead.
    socket.on('panelToServer',function parsePanelMessage(data)
    {
        var updatedStates = [];
        var requestingSocketReturnStates = [];
            
        var panelName = data.panelName;
        var objectPayload = data.panelPayload;
            
        // Walk through the layoutState to see what changed
        for (var i in objectPayload)
        {
            // if object not found or input value not null, accept new state
            if((layoutState[objectPayload[i].name] == undefined) || (objectPayload[i].value != null))
            {
                layoutState[objectPayload[i].name] = objectPayload[i];
                updatedStates.push(layoutState[objectPayload[i].name]);
            }
            
            // Return server state of everything given to original client
            requestingSocketReturnStates.push(layoutState[objectPayload[i].name]);
        }
           
        // for each changed object, handle appropriately (tell JMRI to do something as appropriate)
        for (i in updatedStates)
        {
            // if new state is not null
            if(layoutState[updatedStates[i].name].value != null)
            {
                var changedState = layoutState[updatedStates[i].name];
            
                // if object is of type turnout
                if(changedState.type == "T")
                {
                    var turnoutState = (changedState.value === 'N' ? '2' : '4');
                    var turnoutName = changedState.name;

                    // talk to the jmri server
                    jmri.xmlioRequest('10.0.0.25',12080,{'xmlio':{'turnout':{'name':turnoutName,'set':turnoutState}}},function (data) {
                    console.log('got '+data);
                    });
                }
            }
        }
        
        // Send the changed layout elements back to all the clients (except the one that requested the state change).
        if(updatedStates.length > 0)
            socket.broadcast.emit('serverToPanel', { panelName:panelName, panelPayload:updatedStates } );

        // NOTE: We need to specifically reply to the requesting client,
        // because socket.broadcast.emit skips that by default.
        socket.emit('serverToPanel', { panelName:panelName, panelPayload:requestingSocketReturnStates });
    });
});
