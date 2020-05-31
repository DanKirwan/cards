let cServices = angular.module("cards.services", []);

cServices.factory('socket', function($rootScope) {

    let socket = io.connect('81.174.161.170:80'); //TODO change later when an actual website is created

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
        timer: null, //Used as the universal countdown which we can cancel before setting another
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
    function Player(name, points) {
        this.name = name;
        this.admin = false;
        this.points = points;
        this.hasPicked = false;
        this.isJudge = false;

    }


    return Player;
});


cServices.factory('Util', function($mdDialog, $timeout) {

    let Util = {};
    Util.currentAlert = undefined;

    Util.showAlert = function(title, message, okMsg, resolveFunct, rejectFunct) {
        if(typeof Util.currentAlert === "undefined") {
            okMsg = okMsg || "Okay";

            let resolve = function() {
                Util.currentAlert = undefined;
                if(typeof resolveFunct === "function") resolveFunct()

            };


            let reject = function() {
                Util.currentAlert = undefined;
                if(typeof rejectFunct === "function") rejectFunct();
            };

            Util.currentAlert = $mdDialog.show(
                $mdDialog.alert()
                    .parent(angular.element(document.body))
                    .clickOutsideToClose(true)
                    .title(title)
                    .textContent(message)
                    .ok(okMsg)
            ).then(resolve, reject);


        }

    };


    Util.infoMessages = [];

    Util.showInfo = function(message, displayTime) {
        Util.infoMessages.push(message);

        $timeout( _ => {
            Util.infoMessages = Util.infoMessages.filter(msg => msg !== message);
        }, displayTime * 1000); //TODO add a delay feature for when two come at the same time
    };


    return Util


});


cServices.factory("gamePlay", function(Util, $location, socket, game, globals, WhiteCard, $interval) {

    //TODO say somewhere when you're the judge
    //TODO Tell everyone else whos judge


    let gamePlay = {};

    gamePlay.myHand = [];
    gamePlay.blackCard = null;
    gamePlay.round = 1;
    gamePlay.isJudge = null;
    gamePlay.judging = false;
    gamePlay.selectedCard = null;
    gamePlay.judgeCards = [];
    gamePlay.roundTime = 0;
    gamePlay.chosenJudgeCard = null;

    gamePlay.judgeTime = 30; //TODO make this a variable in advanced settings

    gamePlay.roundJudge = undefined;


    //gameplay



    gamePlay.deselectAll = function() {
        gamePlay.myHand.forEach(card => card.selected = false);
        gamePlay.selectedCard = null;
    };


    gamePlay.selectCard = function(card) {

        if(!gamePlay.isJudge) {
            gamePlay.selectedCard = card;


            if (card.selected) {
                socket.emit("gamePlay:pickCard", {cardText: undefined});

                gamePlay.deselectAll();
            } else {
                socket.emit("gamePlay:pickCard", {cardText: card.text});

                for (let cTest of gamePlay.myHand) {
                    console.log(card);
                    console.log(cTest);
                    cTest.selected = card === cTest;
                }

            }
            console.log(gamePlay.myHand);
        }
    };

    gamePlay.pickJudgeCard = function(card) {

        if (gamePlay.isJudge && gamePlay.judgeCards.indexOf(card) > -1) {
            card.selected = !card.selected

            if(card.selected) {
                gamePlay.chosenJudgeCard = card;

                gamePlay.judgeCards.forEach(c => {
                    if(c !== card) c.selected = false;
                })
            } else {
                gamePlay.chosenJudgeCard = null;

            }

        }
    };

    gamePlay.confirmJudgeCard = function() {
        if(gamePlay.chosenJudgeCard !== null) {
            socket.emit("gamePlay:judgeChoose", {cardText: gamePlay.chosenJudgeCard.text});
        }
    };


    socket.on("gamePlay:roundWin", function(data) {
        for(let p of game.players) {
            if(p.name === data.playerName) p.points ++;
        }

        Util.showInfo(`${data.playerName} Has won this round`, 3);
        Util.showCard(data.cardText);
    });

    socket.on("gamePlay:gameWin", function(data) {
        Util.showAlert(`${data.playerName} Has Won!`, "", "Main Menu", function(){game.leave()}, function(){game.leave()});
    });

    socket.on("gamePlay:newRound", function(data) {


        $interval.cancel(globals.timer);

        gamePlay.roundJudge = data.roundJudge;

        game.players.forEach(p => p.isJudge = false);
        let pJudge = game.players[game.getIdxFromName(data.roundJudge)];
        if(typeof pJudge !== "undefined") pJudge.isJudge = true;


        gamePlay.roundTime = data.roundTime;
        gamePlay.judgeTime = data.judgeTime;

        gamePlay.selectedCard = null;

        gamePlay.chosenJudgeCard = null;

        gamePlay.judgeCards = [];
        gamePlay.myHand = [];
        for(let cardText of data.hand) {
            gamePlay.myHand.push(new WhiteCard(cardText))
        }

        gamePlay.blackCard = data.blackCard.text;

        //TODO blackcard.pick need sto be used!

        gamePlay.round = data.roundNo;

        gamePlay.isJudge = data.isJudge;
        gamePlay.judging = data.inJudging;

        if(gamePlay.isJudge) {
            Util.showInfo("You are the Card Czar for this round! Wait for all players to pick a card", 5)
        } else {
            Util.showInfo(`This round's Card Czar is ${data.roundJudge}`, 5);
        }


        //Route to game if not already in
        if($location.path() !== "/game/"+globals.gameId) {
            $location.path("/game/"+globals.gameId);
        }


        if(gamePlay.judging) {
            globals.timer = $interval(function() {gamePlay.judgeTime --}, 1000, gamePlay.judgeTime);
        } else {
            globals.timer = $interval(function() {gamePlay.roundTime --} , 1000, gamePlay.roundTime);


        }


    });


    socket.on("gamePlay:accelTimer", function() {

        $interval.cancel(globals.timer);

        gamePlay.roundTime = 3; //TODO this needs to reset the timer too so it doesnt go into -s with lag
        globals.timer = $interval(function() {gamePlay.roundTime --}, 1000, 3);

        Util.showInfo("All players have selected cards, judging in 3 seconds", 3);

    });


    socket.on("gamePlay:judging", function(data) {

        Util.showInfo("Judging is now in progress", 2);



        $interval.cancel(globals.timer);
        globals.timer = $interval(function() {gamePlay.judgeTime --}, 1000, gamePlay.judgeTime);//TODO fix this and maybe use gamePlay.countdown
        gamePlay.judging = true;
        gamePlay.judgeCards = [];
        for(let cardText of data.judgeCards) {
            gamePlay.judgeCards.push(new WhiteCard(cardText))
        }

    });

    socket.on("gamePlay:alert", function(data) {

       Util.showInfo(data.message, 2);
    });


    socket.on("gamePlay:playerPick", function(data) {
        //add picked to player data and deal with adding picked card to an array
        let pickedPlayer = game.players[game.getIdxFromName(data.name)];

        if(data.pickedCard && !pickedPlayer.hasPicked) {
            gamePlay.judgeCards.push(new WhiteCard());
        } else if(!data.pickedCard && pickedPlayer.hasPicked) {
            gamePlay.judgeCards.pop();
        }


        pickedPlayer.hasPicked = data.pickedCard;



    })




    return gamePlay;


});


cServices.factory("game", function(Util, socket, globals, Player, $location, $mdDialog, $interval) {

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

    game.getIdxFromName = function(name) {
        let idx = -1;

        for(let i = 0; i < game.players.length; i++) {
            if(game.players[i].name === name) {
                idx = i;
            }
        }

        return idx;
    }


    function addPlayer(name, points) {
        if(!containsPlayer(name) && typeof name !== 'undefined') {
            console.log("adding Player");
            let p = new Player(name, points);

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
        $interval.cancel(globals.timer);
        if(globals.gameId !== null) {
            socket.emit("game:leave");
        }
        game.reset();
        $location.path('/');

    };

    game.join = function() {

            socket.emit("game:join", {gameId: globals.gameId});

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
        if(Number.isInteger(game.maxPlayers) && game.maxPlayers > 2 && game.maxPlayers < 21) {
            socket.emit("game:setMaxPlayers", {maxPlayers: game.maxPlayers});
        } else {
            game.maxPlayers = 20;
        }

    };

    game.begin = function() {
        socket.emit("game:begin", {
            name: game.name,
            maxPlayers: game.maxPlayers
        });
    };


    socket.on("game:maxPlayers", function(data) {

        game.maxPlayers = data.maxPlayers;
    });



    socket.on("game:playerLeave", function(data) {

        if(containsPlayer(data.name)) {
            game.players.splice(game.getIdxFromName(data.name), 1);
        }

        console.log(globals.username + "Your name - Player To Remove" + data.name)

        if(data.name === globals.username) {
            //Someone has kicked this person
            Util.showAlert("You have been kicked from the game",
                "",
                "Main Menu",
                function () {
                    $location.path("/");
                });
        }
    });

    socket.on("game:playerJoin", function(data) {
        addPlayer(data.name, data.points);
    });

    socket.on("game:info", function(data) {
        globals.gameId = data.gameId;
        game.populated = true;
        game.inGame = data.inGame;
        game.players = [];
        game.maxPlayers = data.maxPlayers;


        for(let p of data.players) {
            addPlayer(p.name, p.points);
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

            socket.emit("lobby:populate");
        }

    });

    socket.on("game:failedJoin", function(data) {
        game.reset();

        Util.showAlert(data.message,
            "Make sure you typed the game code right and try again",
            "Okay!",
            function() {
            $location.path("/")
            });

    });


    socket.on("game:failedStart", function(data) {

        $mdDialog.show(
            $mdDialog.alert()
                .parent(angular.element(document.body))
                .title(data.message)
                .ok("Okay!")
        )
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

        socket.emit("lobby:populate", {gameId: globals.gameId});


    };


    socket.on("lobby:info", function(data) {

        lobby.cardPacks = [];
        for(let pack of data.cardPacks) {

            lobby.cardPacks.push(new CardPack(pack.name, pack.desc));
        }

    });


    return lobby;




    //Admin handling



});



cServices.directive("whiteCard", function() {
    return{
        transclude:true,

        template:
            '<div class="card" >' +
                '<div class="card__inside" md-ink-ripple="true">' +
                    '<ng-transclude></ng-transclude>'+
                '</div>' +
            '</div>',


    }
});


cServices.directive("blackCard", function() {
    return{
        transclude:true,

        template:
            '<div class="card" style="background:black; color:white; overflow:hidden;">' +
                '<div class="card__inside"  md-ink-ripple="true">' +
                    '<ng-transclude></ng-transclude>'+
                '</div>' +
            '</div>',

    }
});

