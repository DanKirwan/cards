const { v1: uuidv1} = require('uuid');



const express = require('express');
const app  = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);


const util = require('./utils');
const Player = util.Player;
const Game = util.Game;

server.listen(80);

app.use(express.static("app"));


clients = {};
games = {};

function getNewGameID() {
    //TODO Fix this horrible way of getting an ID
    let alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

    let attempts = 0;

    let findingKey = true;
    let code = '';
    while(findingKey) {
        attempts++;
        if(attempts > 1000) {
            console.log("Error finding new game code aborting");
            break;
        }
        code = '';
        for (let i = 0; i < 4; i++) {
            let x = Math.floor(Math.random() * 26);

            code += alpha[x];
        }

        findingKey = (code in games)
    }

    if(attempts > 1000) return false;
    else {
        return code;
    }
}


io.on('connection', (socket) => {
  console.log(new Date() + " - New connection from origin: " + socket.id );

  socket.emit("test");

  let userID = socket.id;

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
  });


    socket.on("game:create", function(data) {

        let id = getNewGameID();
        games[id] = new Game(id, data.name, data.maxPlayers);
        console.log(clients[socket.id]);
        games[id].addPlayer(clients[socket.id]);
        console.log(games[id].players);

        socket.emit('game:confirmCreate', {
            confirmed: true,
            code:id
        });
    });





    socket.on("disconnect", function() {
        console.log(new Date() + " - Connection Terminated: " + userID);
        delete clients[userID];
    })








});