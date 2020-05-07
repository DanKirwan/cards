const { v1: uuidv1} = require('uuid');



const express = require('express');
const app  = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);

server.listen(80);

app.use(express.static("app"));



clients = {};


io.on('connection', (socket) => {
  console.log(new Date() + " - New connection from origin: " );

  let userID = uuidv1();

  console.log("Connected: " + userID)

  socket.on('test1', function() {
    console.log('message recieved' )
  })


});