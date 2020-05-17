let cServices = angular.module("cards.services", []);

cServices.factory('socket', function($rootScope) {

    let socket = io.connect('84.93.39.204:80');

    return {
        on: function(eventName, callback) {
            socket.removeAllListeners(eventName); //this makes it so socket.on sets a unique callback for this event
            socket.on(eventName, function(){
                let args = arguments;
                $rootScope.$apply(function() {
                    callback.apply(socket, args);
                })

            })
        },

        emit: function(eventName, data, callback) {
            socket.emit(eventName, data, function() {
                var args = arguments;
                $rootScope.$apply(function() {
                    if(callback) {
                        callback.apply(socket, args);
                    }
                })
            })
        }
    }

});

cServices.factory("globals", function() {
    return {
        username: null,
        usernameSet: false,
        players: [],
        gameId: '',
    }
});



cServices.factory('WhiteCard', function(){
    function WhiteCard(text) {
        this.text = text;
        this.selected = false;

    }

    return WhiteCard;
});


cServices.factory('Player', function() {
    function Player(name) {
        this.name = name;
        this.admin = false;
        this.points = 0;

    }


    return Player;
});



cServices.factory('routing', function(socket, $mdDialog, $location, globals) {




    return { //TODO make sure this is the best way of defining things (its probably not)




        initRouting: function() {
            socket.on("route:confirmRoute", function(data) {
                console.log(`checking game exists ${data.exists}`);
                if(data.exists) {
                    socket.emit("game:getStatus", {gameId: globals.gameId});


                    socket.on("game:status", function(data) {
                        console.log(`Game Status: ${data.inGame}`);

                        if(data.inGame) {
                            //Handle going into the actual game
                        } else {
                            //Go to lobby
                            if(!($location.path() === ("/lobby/"+ globals.gameId))){

                                console.log("going to lobby " + globals.gameId);
                                $location.path("/lobby/" + globals.gameId);


                            }
                        }

                    });

                } else {



                }
            });
        }
    }

});




cServices.factory("game", function(socket, globals, Player, $location, $mdDialog) {

    //Right now, only the first time you join you can create a game, afterwards it wont let you
    let game = {};

    game.name = null;
    game.maxPlayers = 20;


    game.valid = false;


    game.thisPlayer = null;
    game.inGame = null;

    game.players = [];

    game.isAdmin = null;

    game.populated = false;




    game.reset = function () {
        globals.gameId = null;
        game.valid = false;
        game.inGame = null;
        game.players = [];
        game.populated = false;
        game.maxPlayers = 20;
    };

    function containsPlayer(name) {
        let cont = false;

        for(let p of game.players) {
            if(p.name === name) {
                cont = true;
            }
        }

        return cont;
    }

    function getIdxFromName(name) {
        let idx = -1;

        for(let i = 0; i < game.players.length; i++) {
            if(game.players[i].name === name) {
                idx = i;
            }
        }

        return idx;
    }


    function addPlayer(name) {
        if(!containsPlayer(name) && typeof name !== 'undefined') {
            console.log("adding Player");
            let p = new Player(name);

            if(p.name === globals.username) {
                p.admin = true;
                game.thisPlayer = p;
            }

            game.players.push(p);
        }

    }





    //TODO add stuff for your hand etc




    game.removePlayer = function(name) {
        if(containsPlayer(name)) { //TODO make sure this is being checked server side after client refactor
            socket.emit("game:removePlayer", {name: name});
        }
    };

    game.checkExists = function() {
        socket.emit("game:checkExists", {gameId: globals.gameId});

        socket.on("game:confirmExists", function(data) {
            game.valid = data.exists;
        })
    };



    game.leave =  function() {
        if(globals.gameId !== null) {
            socket.emit("game:leave");
        }
        game.reset();
        $location.path('/');

    };

    game.join = function() {
        if(!game.populated) {
            socket.emit("game:join", {gameId: globals.gameId});
        }
    };



    game.create = function() {
        socket.emit("game:create");
        socket.on("game:confirmCreate", function(data) {
            if(data.confirmed) {
                globals.gameId = data.code;
                game.valid = true;
                game.join();
            }
        });
    };


    game.updateMaxPlayers = function() {
        socket.emit("game:setMaxPlayers", {maxPlayers: game.maxPlayers});
    };

    socket.on("game:maxPlayers", function(data) {

        game.maxPlayers = data.maxPlayers;
    });



    socket.on("game:playerLeave", function(data) {

        if(containsPlayer(data.name)) {
            game.players.splice(getIdxFromName(data.name), 1);
        }

        console.log(globals.username + "Your name - Player To Remove" + data.name)

        if(data.name === globals.username) {
            //Someone has kicked this person
            $mdDialog.show(
                $mdDialog.alert()
                    .parent(angular.element(document.body))
                    .clickOutsideToClose(true)
                    .title("You have been kicked from the game")
                    .ok("Main Menu")
            ).then(function () {
                $location.path("/");
            }, function () {

            });
        }
    });

    socket.on("game:playerJoin", function(data) {
        addPlayer(data.name);
    });

    socket.on("game:info", function(data) {
        game.populated = true;
        game.inGame = data.inGame;
        game.players = [];
        game.maxPlayers = data.maxPlayers;


        for(let p of data.players) {
            addPlayer(p);
        }


        game.isAdmin = data.isAdmin;

        //Handle routing
        if(data.inGame) {
            if($location.path() !== '/game/' + globals.gameId) {
                $location.path('/game/' + globals.gameId);
            }

            //TODO get ingame info
        } else {
            if($location.path() !== '/lobby/' + globals.gameId) {
                $location.path('/lobby/' + globals.gameId);
            }

            socket.emit("lobby:join", {gameId: globals.gameId});
        }

    });

    socket.on("game:failedJoin", function(data) {
        game.reset();
        $mdDialog.show(
            $mdDialog.alert()
                .parent(angular.element(document.body))
                .clickOutsideToClose(true)
                .title(data.message)
                .textContent("Make sure you typed the game code right and try again")
                .ok("Okay!")
        ).then(function () {
            $location.path("/");
        }, function () {

        });
    });


    return game;


});


cServices.factory("lobby", function(game, socket, globals) {

    //Card Packs

    let lobby = {};

    class CardPack {
        constructor(name, description) {
            this.name=name;
            this.desc = description;
            this.selected = false;

        }
    }

    lobby.cardPacks = [];

    lobby.populate = function() {
        console.log("POPULATING LOBBY");

        socket.emit("lobby:join", {gameId: globals.gameId});


    };


    socket.on("lobby:info", function(data) {


        for(let pack of data.cardPacks) {
            lobby.cardPacks.push(new CardPack(pack.name, pack.desc));
        }

    });


    return lobby;




    //Admin handling



});