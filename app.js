//	NodeJS+Express+Socket.IO Proof of Concept
//	Hacked on November 19th, 2011 by Dave Falkenburg
//
//	This code sketch is intended to demonstrate a lightweight server implementation
//	for shared state management utilizing Javascript on both the client and the server.


//	Simplified layoutState
//
//	In our contrived example, we have 3 turnouts, with the following initial states.
//	In the real world, this should or could be in a database or key-value server, but
//	for now we're just going to use a javascript array of objects for this demo.

var layoutState = [
	{id:'t100',state:'thrown'},
	{id:'t101',state:'normal'},
	{id:'t102',state:'normal'}
	];


//	Our HTTP server is just an Express web server object fused with a socket.io
//	server. The socket.io module is where most of the real magic lives, it is a
//	package which supports connections via WebSockets, long-lived XMLHttpRequests,
//	or worst case Adobe Flash sockets (ick).

var app = require('express').createServer()
  , io = require('socket.io').listen(app);
  
//	Our server running on port 3000, wand for now serves up a single index.html file.
//	It can clearly be extended to serve up a plethora of other resources.

app.get('/', function (req, res) {
  res.sendfile(__dirname + '/index.html');
});

app.listen(3000);


//	socket.io Callbacks
//
//	Allow web client(s) to connect using a socket interface. The client and server
//	ship streamed JSON objects back and forth to get the job done.
//
//	Whenever a client connects, it is given a copy of the entire layout state, and
//	a callback is installed for that client which allows individual elements to be
//	"clicked" via a JSON blob send from client to server. In response to the click,
//	the server broadcasts the new layout state back to ALL clients.
//
//	NOTE: In the real world case, the client should indicate what subset of the state
//	they are interested in, but for now we just give every client the full state.

io.sockets.on('connection', function (socket) {

	// whenever a new client connects, just send the entire layout state
	socket.emit('update', layoutState);

	// Install a callback for whenever a client sends a 'click' message. In a the real
	// implementation, we would most likely support primitives like "get/set" instead.
		
	socket.on('click',
	  	function (data) {

			// For now, data is a JSON object of the form "{'click':<id>}"

	  		var clickTargetId = data['click'];
	  		
	  		// Walk through the layoutState array to toggle the state
	  		//
	  		// Yes, this is brain-dead, but the idea here is to demonstrate the use of the
	  		// socket.io framework capabilities to accept requests and broadcast changes
	  		// to all clients.
	  		
			for (i in layoutState) {
				if (layoutState[i].id == clickTargetId) {
					if (layoutState[i].state == 'thrown') {
						layoutState[i].state = 'normal';
					} else {
						layoutState[i].state = 'thrown';
					}
				}
			}
		
			// Broadcast new layout state to all the clients. For this hack, we are
			// sending the full state, but we only need to send an array of changed
			// layout elements.

			socket.broadcast.emit('update', layoutState);

			// NOTE: We need to specifically reply to the requesting client,
			// because socket.broadcast.emit skips that by default.

			socket.emit('update', layoutState);
		}
	);

});
