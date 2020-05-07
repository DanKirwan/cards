const { v1: uuidv1} = require('uuid');



const express = require('express');
const app  = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);


const util = require('./utils');
const Player = util.Player;

server.listen(80);

app.use(express.static("app"));


clients = {};


io.on('connection', (socket) => {
  console.log(new Date() + " - New connection from origin: " + socket.id );

  socket.emit("test");

  let userID = uuidv1();

  console.log("Connected: " + userID)
  let player = new Player(userID);
  clients[userID] = player;


  function nameValid(name) {
      let isValid = true;
      Object.keys(clients).forEach(function(key){
          let p = clients[key];
          console.log(p.name + " Client Name:" +name);
          if(p.name === name) {

              isValid = false;
          }
      });

      return isValid;
  }

  socket.on("user:checkName", function(data) {
      console.log(nameValid(data.name));
      socket.emit('user:isNameValid', {isNameValid: nameValid(data.name)});

  });


  socket.on("user:setName", function(data) {
      if(nameValid(data.name)) {
          player.name = data.name;
          console.log(clients);
      } else {
          console.log(new Date() + " Error when setting name: " + userID)
      }
  })


    socket.on("disconnect", function() {
        console.log(new Date() + " - Connection Terminated: " + userID);
        delete clients[userID];
    })








});