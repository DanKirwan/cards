const util = require('./utils');
const Player = util.Player;
const Card = util.Card;

const WebSocketServer = require('websocket').server;
const express = require('express');
let app  = express();


app.use(express.static("app"));


cards = [new Card('abcd'), new Card('defg')];


var server = app.listen(8080, function() {
  console.log("Server now running");

});

wsServer = new WebSocketServer({
  httpServer: server
});

wsServer.on('request', function(request) {
  console.log(new Date() + " Connection from origin: " + request.origin);


  let connection = request.accept(null,request.origin);

  for (let card of cards) {

    connection.sendUTF(
       card.text
    );
  }
  connection.on('message', function(msg){
    if(msg.type === 'utf8') {

      console.log('ping requested');
    }

  });

});