
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
        if(p.name === name) {

            isValid = false;
        }
    });

    return isValid;
}


function safeJoinGame(gameId, player, socket) {



    if(gameId === player.gameId && gameId !== null) {
        return true;
    } else {
        let currentGame = player.gameId;
        if(currentGame !== null) {
            console.log(currentGame);
            games[player.gameId].removePlayer(player);
            socket.leave(player.gameId);
        }

        let newGame = games[gameId];
        if(newGame !== undefined) {
            newGame.addPlayer(player);
            player.gameId = gameId;
            socket.join(gameId);
            return true;
        }
    }

    return false;
}


function safeLeaveGame(gameId, player, socket) {
    if(games[gameId] !== undefined && gameId === player.gameId ) {
        player.gameId = null;
        games[gameId].removePlayer(player);
        socket.leave(gameId);
    }
}

function safeDeleteGame(gameId) {
    if(games[gameId] !== undefined) {
        delete games[gameId];
    }
}

function idFromName(name) {
    let nOut = null;
    for(let p in clients) {
        console.log(clients[p].name + " - " + name);
        if(clients[p].name === name) {
            nOut = p;
        }
    }

    return nOut;
}



//websocket handling
io.on('connection', (socket) => {
  console.log(new Date() + " - New connection from origin: " + socket.id );

  socket.emit("user:getName");



  console.log("Connected: " + socket.id)
  let player = new Player(socket.id, socket);
  clients[socket.id] = player;

  //User handling
  socket.on("user:checkName", function(data) {
        console.log(nameValid(data.name));
        socket.emit('user:isNameValid', {isNameValid: nameValid(data.name)});

    });


    socket.on("user:setName", function(data) {
        if(nameValid(data.name)) {
            player.name = data.name;
            console.log(clients);
            socket.emit("user:confirmName");
        } else {
            console.log(new Date() + " Error when setting name: " + socket.id)
        }
    });


    //Game Handling

    socket.on("game:checkExists" , function(data) {
        let gameExists = data.gameId in games;

        socket.emit("game:confirmExists", {
            exists: gameExists
        });


    });






    socket.on("game:create", function() {

        let id = util.getNewGameID();
        games[id] = new Game(id, null, null);

        if(safeJoinGame(id, player, socket)) {
            games[id].setGameAdmin(clients[socket.id]);
            console.log(games);
            console.log('Player created game: ' + socket.id + "Client: " + clients[socket.id]);

            socket.emit('game:confirmCreate', {
                confirmed: true,
                code: id
            });
            }

    });


    socket.on("game:join", function(data) {
        //TODO Make sure you can only get your games info and send back stuff server side (tomorrow)

        let id = data.gameId;

        if(safeJoinGame(id, player, socket)){
            console.log("Sending game info to " + id);

            socket.emit("game:info", {
                isAdmin: (socket.id in games[id].admins),
                players: games[id].getPlayerNames(),
                inGame: games[data.gameId].inGame

            });

            io.to(data.gameId).emit("game:playerJoin", {name: clients[socket.id].name});



        } else{
            socket.emit("game:failedJoin");
            console.log(new Date() + "  - User " + socket.id + " failed to join game " + "id");
        }

    });





    //Temporarily here
    class CardPack {
        constructor(name, description) {
            this.name=name;
            this.desc = description;


        }
    }




    socket.on("game:removePlayer", function(data) {

        console.log(`Trying to remove player ${data.name}`)
        let playerToRemove = clients[idFromName(data.name)];


        if(typeof playerToRemove !== 'undefined'
            && player.gameId === playerToRemove.gameId
            && player.id in games[clients[socket.id].gameId].admins) {


            io.to(playerToRemove.gameId).emit("game:playerLeave", {name: playerToRemove.name});
            safeLeaveGame(playerToRemove.gameId, playerToRemove, playerToRemove.socket);

            if(games[player.gameId].players.length === 0) {
               safeDeleteGame(player.gameId);
            }
        }


    });

    socket.on("game:leave", function(data) {

            let gameId = player.gameId; //Must be saved as it is deleted in safeLeaveGame()
            safeLeaveGame(player.gameId, player, socket);

            io.to(gameId).emit("game:playerLeave", {name: player.name});

            let game = games[gameId];
            if(game !== undefined) {

                if(Object.keys(game.players).length === 0) {
                    console.log(`Deleting empty game ${gameId}`);
                    safeDeleteGame(player.gameId);

                } else if(Object.keys(game.admins).length === 0) {

                    let newAdmin = game.players[Object.keys(game.players)[0]];
                    game.setGameAdmin(newAdmin);
                    //Ugly way of setting the next available player to admin

                    io.to(newAdmin.id).emit("game:info", {
                        isAdmin: true,
                        players: game.getPlayerNames(),
                        inGame: game.inGame
                    });



                }
            }
        //TODO add functionality to delete game when noone is in it and if admin is removed make it so that a new admin is selected
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



    //Lobby Commands
    socket.on("lobby:join", function(data) {

        let gameLobby = games[data.gameId];


        if(gameLobby !== undefined) {
            safeJoinGame(data.gameId, player, socket);
            console.log(gameLobby);

            socket.emit("lobby:info", {


                cardPacks:[
                    new CardPack("UK TEST", "Obviously superior set of cards"),
                    new CardPack("US Test", "not as funny america sucks"),
                    new CardPack("Custom Pack", "Something less witty as it wasn't written by the Cards against humanity team")]

            });


            //update other players that player has joined



        }
    });






    socket.on("disconnect", function() {
        if(player.gameId !== null){

            io.to(player.gameId).emit("game:playerLeave", {name: clients[socket.id].name});

            safeLeaveGame(player.gameId, player, socket)

        }
        console.log(new Date() + " - Connection Terminated: " + socket.id);
        delete clients[socket.id];
    })








});