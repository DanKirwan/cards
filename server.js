
const { v1: uuidv1} = require('uuid');

//TODO check ips and make sure no more than 5 can connect from the same address



const express = require('express');
const app  = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const session = require("express-session");


const mongoose = require('mongoose');
const dbUrl = 'mongodb://127.0.0.1:27017/cards';
const MongoStore = require('connect-mongo')(session);

const db = mongoose.connection;
db.once("open", _ => {
    console.log("database connected", dbUrl);
    db.dropCollection("sessions", function(err, result) { //TODO remove this in production
        if(err){
            console.log("error deleting sessions", err)
        } else {
            console.log("deleted sessions");
        }
    })
});


mongoose.connect(dbUrl, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(res => console.log("Connected to DB").catch(err => console.log(err)));





//TODO clean sessions after a certain ammount of time of inactivity




const sharedSession = require("express-socket.io-session");

const util = require('./utils');
const Player = util.Player;
const Game = util.Game;




server.listen(80);

let createdSession = session({

    secret:"no clue what this should be",
    resave : true, //TODO make sure this is correct or change
    saveUninitialized:true, //TODO make this false and make sure the user accepts cookies first
    store: new MongoStore({mongooseConnection: db})
}); //TODO figure out what this should really be called

app.use(createdSession);
io.use(sharedSession(createdSession,  {
    autoSave:true
}));


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

    if(name === '') {
        isValid = false;
    }

    if(name.length > 10) {
        isValid = false;
    }

    return isValid;
}


function safeJoinGame(gameId, player, socket) {



    if(gameId === player.gameId && gameId !== null && typeof games[gameId] !== 'undefined') {
        return true;
    } else {
        let currentGame = player.gameId;
        if(currentGame !== null && typeof games[currentGame] !== "undefined") {
            console.log(currentGame);
            games[player.gameId].removePlayer(player);
            socket.leave(player.gameId);
        }

        let newGame = games[gameId];
        if(typeof newGame !== 'undefined' && Object.keys(newGame.players).length < newGame.maxPlayers) {
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

        io.to(gameId).emit("game:failedJoin", {message: "This game has been deleted"});
        delete games[gameId];
    }
}

function idFromName(name) {
    let nOut = null;
    for(let p in clients) {
        if(clients[p].name === name) {
            nOut = p;
        }
    }

    return nOut;
}


function gameLeave(player, socket) {

    let gameId = player.gameId; //Must be saved as it is deleted in safeLeaveGame()


    let gameJudgeId = undefined;
    if(typeof games[gameId] !== 'undefined') {
        gameJudgeId = games[gameId].getJudgeId();
    }


    safeLeaveGame(player.gameId, player, socket);

    io.to(gameId).emit("game:playerLeave", {name: player.name});

    let game = games[gameId];
    if(typeof game !== 'undefined') {

        if(Object.keys(game.players).length === 0) { //TODO cange this to < 3 and alert players
            console.log(`Deleting empty game ${gameId}`);
            safeDeleteGame(gameId);

        } else if(Object.keys(game.admins).length === 0) {

            let newAdmin = game.players[Object.keys(game.players)[0]];
            game.setGameAdmin(newAdmin);
            //Ugly way of setting the next available player to admin

            game.sendInfo(newAdmin);



        }

        if(game.inGame && gameJudgeId === player.id) {
            io.to(game.id).emit("gamePlay:alert", {message: "The Card Czar left the game, moving on to new round"})

            game.newRound();
        }
    }
}



//websocket handling
io.on('connection', (socket) => {
  console.log(new Date() + " - New connection from origin: " + socket.id );


  let player = new Player(socket.id, socket);
  clients[socket.id] = player;


  let session = socket.handshake.session;

  if(typeof session.connected === 'undefined') {
      session.connected = 0;
      console.log("setting session to 0")
  }




  session.connected ++;
  session.save();

  console.log(session);
    if(session.connected > 1) {
        //Already open on this browser dont allow second connection


        socket.emit("session:failedConnect", {message: "A game is already open on this browser, make sure you've closed any previous games!"})
        socket.disconnect(true);

    } else {

        if(typeof session.username !== "undefined" && nameValid(session.username)) {
            player.name = session.username;
            socket.emit('user:confirmName', {name: player.name});

            if(session.gameId !== null) {
                let id = session.gameId;

                if(safeJoinGame(id, player, socket)) {
                    console.log("Player joined game")
                    games[id].sendInfo(player);

                    io.to(id).emit("game:playerJoin", {name: player.name, points: player.points});
                } else {

                    if(games[id] === undefined) {
                        socket.emit("game:failedJoin", {message:"This game does not exist!"});

                    } else if(Object.keys(games[id].players).length === games[data.gameId].maxPlayers) {
                        socket.emit("game:failedJoin", {message:"This game is full!"});

                    }
                    console.log(new Date() + "  - User " + socket.id + " failed to join game " + "id");


                    session.gameId = null;
                }

            }


        } else {
            socket.emit("user:getName");

        }

    }






  console.log("Connected: " + socket.id);


  //User handling
  socket.on("user:checkName", function(data) {
        console.log(nameValid(data.name));
        socket.emit('user:isNameValid', {isNameValid: nameValid(data.name)});

    });


    socket.on("user:setName", function(data) {
        if(nameValid(data.name)) {
            player.name = data.name;


            session.username = data.name;
            console.log(clients);
            socket.emit("user:confirmName", {name: data.name});
        } else {
            console.log(new Date() + " Error when setting name: " + socket.id)
            socket.emit("user:getName");
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
        games[id] = new Game(io, id, null, 20);

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

            games[id].sendInfo(player);

            io.to(data.gameId).emit("game:playerJoin", {name: player.name, points: player.points});



        } else{
            if(games[data.gameId] === undefined) {
                socket.emit("game:failedJoin", {message:"This game does not exist!"});

            } else if(Object.keys(games[data.gameId].players).length === games[data.gameId].maxPlayers) {
                socket.emit("game:failedJoin", {message:"This game is full!"});

            }
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
            && player.id in games[clients[socket.id].gameId].admins
            && ! (playerToRemove.id in games[clients[socket.id].gameId].admins)) {


            io.to(playerToRemove.gameId).emit("game:playerLeave", {name: playerToRemove.name});
            safeLeaveGame(playerToRemove.gameId, playerToRemove, playerToRemove.socket);

            if(games[player.gameId].players.length === 0) {
               safeDeleteGame(player.gameId);
            }
        }


    });

    socket.on("game:leave", function(data) {
        gameLeave(player, socket);

    });







    socket.on("game:setMaxPlayers", function(data){


        if(player.gameId !== null && games[player.gameId] !== undefined) {
            games[player.gameId].setMaxPlayers(data.maxPlayers);
        }

    });



    //actual gameplay logic

    socket.on("gamePlay:begin", function(data) {

        //TODO send selected cardpacks back to server
        let gameId = player.gameId;
        if(gameId !== undefined && games[gameId] !== undefined) {
            let game = games[gameId];

            let playerCount = Object.keys(game.players).length;


            game.setMaxPlayers(data.maxPlayers);
            game.name = data.name;
            game.maxPoints = Number.isInteger(data.maxPoints)
                    && data.maxPoints > 0
                    && data.maxPoints < 15
                    ? data.maxPoints : 5;

            game.roundTime = Number.isInteger(data.roundTime)
                    && data.roundTime > 10
                    && data.roundTime < 10000
                    ? data.roundTime : 60;

            game.judgeTime = Number.isInteger(data.judgeTime)
                    && data.judgeTime > 10
                    && data.judgeTime < 10000
                    ? data.judgeTime : 60;




            game.inGame = true;



            if(playerCount > 0 && playerCount <= game.maxPlayers) { //TODO make it playerCount > 2 instead
                game.populate();



                game.newRound();

            } else {
                socket.emit("game:failedStart", {message: "Not enough players in the lobby!"});
            }



        } else {
            socket.emit("game:failedStart", {message: "Couldn't start game"});
        }
    });


    socket.on("gamePlay:pickCards", function(data) {

        //TODO make it so that if all players have picked cards then the timer goes to 10 seconds and they get a warning popup
        if(games[player.gameId] !== undefined && !games[player.gameId].inJudging) {
            let game = games[player.gameId];
            let cards = data.cards;

            let validCards = true;
            if(typeof cards !== "undefined") {
                for(let c of cards) {
                    if(player.myCards.indexOf(c) === -1) {
                        validCards = false;
                    }
                }
            } else {
                validCards = false;
            }


            if(validCards) {
                game.judgeCards[player.id] = cards;

                io.to(game.id).emit("gamePlay:playerPick", {name: player.name, pickedCard: true});


                if(Object.keys(game.judgeCards).length  === Object.keys(game.players).length - 1) {

                    if(game.currentRoundTime > 3) {
                        io.to(game.id).emit("gamePlay:accelTimer");
                        game.currentRoundTime = 3;
                        clearTimeout(game.roundTimeout);
                        game.roundTimeout = setTimeout(_ => {

                            game.startJudging();
                        }, 3000);
                        game.currentRoundTime = 3;



                    }
                } //Check if all players have selected a card and accelerate timer*/
            }

            if(typeof data.cards === 'undefined') {
                delete game.judgeCards[player.id]
                io.to(game.id).emit("gamePlay:playerPick", {name: player.name, pickedCard: false});
            }

        }

        console.log("cards picked: " + data.cards);
    });


    socket.on("gamePlay:judgeChoose", function(data) {

        if(typeof games[player.gameId] !== "undefined" ) {
            let game = games[player.gameId];

            clearTimeout(game.judgeTimeout);
            clearInterval(game.judgeCounter);

            if(game.getJudgeId() === player.id) {
                console.log(`Judge Chose Card ${data.cardText}`);
                game.judgeChooseCard(data.cardText);
            }

        }


   });








    //Lobby Commands
    socket.on("lobby:populate", function() {

        let gameLobby = games[player.gameId];


        if(gameLobby !== undefined) {

            socket.emit("lobby:info", {


                cardPacks:[
                    new CardPack("UK TEST", "Obviously superior set of cards"),
                    new CardPack("US Test", "not as funny america sucks"),
                    new CardPack("Custom Pack", "Something less witty as it wasn't written by the Cards against humanity team")]

            });


        }
    });






    socket.on("disconnect", function() {
        session.gameId = player.gameId;
        session.connected --;
        session.save();

        gameLeave(player, socket);



        console.log(new Date() + " - Connection Terminated: " + socket.id);
        delete clients[socket.id];
    });




});