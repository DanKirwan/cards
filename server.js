
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

function safeJoinGame(gameId, playerId, socket) {
    let pCurrGame = clients[playerId].gameId;
    if(!(gameId === pCurrGame)) {
        if(pCurrGame !== null) {
            games[pCurrGame].removePlayer(playerId);
            socket.leave(pCurrGame)
        }

        if(games[gameId] !== undefined) {
            games[gameId].addPlayer(clients[playerId]);
            clients[playerId].gameId = gameId;
            socket.join(gameId);
            return true;
        } else {
            return false;
        }
    }
}


//websocket handling
io.on('connection', (socket) => {
  console.log(new Date() + " - New connection from origin: " + socket.id );

  socket.emit("user:getName");


  let userId = socket.id;

  console.log("Connected: " + userId)
  let player = new Player(userId);
  clients[userId] = player;

  //User handling
  socket.on("user:checkName", function(data) {
        console.log(nameValid(data.name));
        socket.emit('user:isNameValid', {isNameValid: nameValid(data.name)});

    });


    socket.on("user:setName", function(data) {
        if(nameValid(data.name)) {
            player.name = data.name;
            console.log(clients);
        } else {
            console.log(new Date() + " Error when setting name: " + userId)
        }
    });


    //Game Handling

    socket.on("game:checkExists" , function(data) {
        let gameExists = false;
        if(data.gameId in games) {
            gameExists = true;
        }

        socket.emit("game:confirmExists", {exists: gameExists})


    });


    socket.on("game:create", function() {

        let id = util.getNewGameID();
        games[id] = new Game(id, null, null);

        safeJoinGame(id, socket.id, socket);
        games[id].setGameAdmin(clients[socket.id]);
        console.log(games);
        console.log('Player created game: ' + socket.id + "Client: " + clients[socket.id]);

        socket.emit('game:confirmCreate', {
            confirmed: true,
            code: id
        });
    });

    //Temporarily here
    class CardPack {
        constructor(name, description) {
            this.name=name;
            this.desc = description;


        }
    }

    socket.on("game:joinLobby", function(data) {

        let gameLobby = games[data.gameId];


        if(gameLobby !== undefined) {
            safeJoinGame(data.gameId, socket.id, socket);
            console.log(gameLobby);

            socket.emit("game:lobbyInfo", {

                isAdmin: (socket.id in gameLobby.admins),
                players: gameLobby.getPlayerNames(),
                cardPacks:[
                    new CardPack("UK TEST", "Obviously superior set of cards"),
                    new CardPack("US Test", "not as funny america sucks"),
                    new CardPack("Custom Pack", "Something less witty as it wasn't written by the Cards against humanity team")]

                //TODO add card packs and stuff here
            });


            //update other players that player has joined

            io.to(data.gameId).emit("game:playerJoin", {name: clients[socket.id].name});

        }
    });

    socket.on("game:removePlayer", function(data) {


    });



    //TODO leave lobbies if you actually leave them, update players when they join and a load of other stuff



    //actual gameplay logic

    socket.on("game:begin", function(data) {
        let gameId = clients[socket.id].gameId;
        if(gameId !== undefined && games[gameId] !== undefined) {


            games[gameId].maxPlayers = data.maxPlayers;
            games[gameId].name = data.name;

            games[gameId].populate();

            games[gameId].sendHandToAll();

        }
    });


    socket.on("game:join", function(data) {

        let id = data.gameId;

        if(games[id] !== undefined) {
            if(safeJoinGame(id)){
                games[id].sendHand(socket.id, io);
            } else{
                console.log(new Date() + "  - User " + socket.id + " failed to join game " + "id");
            }


        }


    });




    socket.on("disconnect", function() {
        if(clients[userId].gameId !== undefined) {
            io.to(clients[userId].gameId).emit("game:playerLeave", {name: clients[userId].name});
        }
        console.log(new Date() + " - Connection Terminated: " + userId);
        delete clients[userId];
    })








});