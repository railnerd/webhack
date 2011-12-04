// JMRI xmlio testing, will get converted into a module eventually

var http = require('http');
var parser = require('xml2json');

var xmlIOTest = {'xmlio':{'list':{'type':'sensor'}}};

var postData = parser.toXml(xmlIOTest);

var postOptions = {
  host: 'localhost',
  port: '12080',
  path: '/xmlio',
  method: 'POST',
  headers: {
	  'Content-Type': 'text/xml',
	  'Content-Length': postData.length
  }
};

var responseXML = [];

var req = http.request(postOptions, function(res) {
  res.setEncoding('utf8');
  res.on('data', function (dataChunk) {
      //console.log('statusCode: ' + res.statusCode);
      //console.log('headers: ' + JSON.stringify(res.headers));
	  //console.log('response: ' + dataChunk);
	  responseXML.push(dataChunk);
  });
  
  res.on('end',function () {
    //console.log("got: "+responseXML);
    var jsonData = parser.toJson(responseXML.toString());
    console.log("response as json: "+ jsonData);
  });
});

req.on('error', function(e) {
  console.log('problem with request: ' + e.message);
});

console.log('sending: '+postData);
req.write(postData);
req.end();
