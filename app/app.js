

const app = angular.module("app",['ngMessages','ngAnimate','ngAria','ngMaterial', 'ngRoute','ngclipboard', 'cards.services']);
app.config(function($routeProvider) {
    $routeProvider
        .when("/", {
            templateUrl: "mainMenu.htm",
            controller: "menuController"
        })
        .when("/:gameCode", {
            templateUrl: "routing.htm",
            controller: "routingController"
        })
        .when("/game/:gameCode", {
            templateUrl: "game.htm",
            controller: "cardController"
        })
        .when("/lobby/:gameCode", {
            templateUrl: "lobby.htm",
            controller: "menuController"
    });

});



app.controller("globalController", function($scope, $mdDialog, $mdMedia, socket, globals) {


    $scope.pickNameDialog = function() {


        console.log("Showing Popup");
        $mdDialog.show(
            {
                templateUrl: 'pickNameDialog.tmpl.html',
                parent: angular.element(document.body),
                clickOutsideToClose: false,
                escapeToClose:false,


            }
        )
    };

    socket.on("user:getName", function(data) {
        $scope.pickNameDialog();
    });



    $scope.players = [];


});

app.controller("routingController", function($scope, socket, globals, $routeParams, game) {




    $scope.initFunct = function() {
        if(globals.username !== null){
            globals.gameId = $routeParams.gameCode;
            game.join();
        } else {

            socket.on("user:confirmName", function() {
                globals.gameId = $routeParams.gameCode;
                game.join();
            }
        )}
    };



});





app.controller("dialogController", function(globals, $scope, socket, $mdDialog) {

    $scope.inputUsername = '';

    $scope.nameValid = true;

    $scope.usrNameChange = function() {
        globals.username = $scope.inputUsername;
        socket.emit("user:checkName", {name: globals.username});
        socket.on('user:isNameValid', function(data) {
           $scope.isNameValid = data.isNameValid;
        })
    };



    $scope.usrSetName = function() {
        socket.emit("user:setName", {name: globals.username});

        if($scope.nameValid) {
         $mdDialog.cancel();
        }

    }



});






app.controller("mainMenuController", function($scope, socket, game, globals) {

    //main menu code


    $scope.game = game;
    $scope.globals = globals;

    //TODO fix this join game thing and route to main menu if not a valid game code


    $scope.checkGame = function() {
        console.log(globals.gameId);

        game.checkExists();




    };

    $scope.joinGame = function() {

        if(game.valid) {
            game.join();
        }

    };


    $scope.createGame = function() {
        game.create();
    }


});

app.controller("menuController", function (game, globals, $rootScope, $scope, socket, lobby, $routeParams) {








    $scope.showCardPacks = false;
    $scope.lobby = lobby;
    $scope.game = game;
    $scope.globals = globals;




    $scope.initLobby= function () {
        globals.gameId = $routeParams.gameCode;
        if(globals.username !== null){
            game.join();
            lobby.populate();
        } else {

            socket.on("user:confirmName", function() {
                game.join();
                lobby.populate();
            });
        }


    };



    $scope.startGame = function() {
        socket.emit("game:begin", {
            name: game.name,
            maxPlayers: game.maxPlayers
        });

        socket.on("game:confirmBegin", function(data) {

            //Todo fix this shouldn't be $scope.
            $scope.gameCreated = data.confirmed;


            console.log(data.code);

            //$location.path("/game/" + data.code);
            }
        )
    };
});



































app.controller("cardController", function($scope, $mdSidenav, $mdMedia, $timeout, $routeParams) {


    $scope.selectedCard = null;
    $scope.cardsFocussed = true;

    $scope.popUpMessage = '';
    $scope.showPopUp = false;

    $scope.isJudge = false;

    //normal play
    class Card {
        constructor(text) {
            this.selected = false;
            this.text = text;
        }

        onClick() {



            if(this.selected === false) {

                if ($scope.cardsFocussed) {

                    for (let x = 0; x < $scope.cards.length; x++) {
                        let card = $scope.cards[x];
                        card.selected = false;
                    }
                    //Selecting Card Logic
                    this.selected = true;
                    $scope.selectedCard = this;

                    $scope.cardsFocussed = false;


                    //Pop up handingR
                    $scope.popUpMessage = "Card Selected";
                    $scope.showPopUp = true;

                    $timeout( function() {
                        $scope.showPopUp = false;
                    }, 200);

                    console.log(this.text);
                } else {
                    $scope.focusCards();

                }
            } else { //Card already selected so not in card bar
                this.selected = false;
                $scope.selectedCard = null;
                $scope.focusCards();
            }

            console.log($scope.cardsFocussed);
        }

    }

    $scope.focusCards = function () {
        $scope.cardsFocussed = true;
    };

    $scope.unfocusCards = function () {
        $scope.cardsFocussed = false;
    };







    //Methods used in both Judge and Playing
    $scope.sideNavOpen = false;

    $scope.openSideNav  = function() {
        $mdSidenav('left').open();

    };

    $scope.closeSideNav = function() {
        $mdSidenav('left').close();
    };






    $scope.cards = [
        new Card("Test1"),
        new Card("Test2"),
        new Card("Test3"),
        new Card("test4"),
        new Card( "test5"),
        new Card( "test6"),
        new Card( "test7"),
        new Card( "test8"),
        new Card( "test9"),
        new Card("test10")];









});


app.controller("judgeController", function ($scope, $mdMedia) {
    //Judge Setup
    $scope.chosenJudgeCard = null;


    class JudgeCard {
        constructor(text) {
            this.text = text;
            this.selected = false;
        }

        onClick() {
            let selected = this.selected;
            for (let x = 0; x < $scope.judgeCards.length; x++) {
                let card = $scope.judgeCards[x];
                card.selected = false;
            }

            this.selected = !selected;

            if(this.selected) $scope.chosenJudgeCard = this;
            else $scope.chosenJudgeCard = null;
            console.debug(this.text + " Seleceted");
        }
    }

    $scope.judgeCards = [
        new JudgeCard('TestOne'),
        new JudgeCard('TestTwo'),
        new JudgeCard('TestOne'),
        new JudgeCard('TestTwo'),
        new JudgeCard('TestOne'),
        new JudgeCard('TestTwo')
    ];



    $scope.judgeChoosing = true;



    $scope.confirmJudgeCard = function () {
        //send stuff to server about winning card

    };


    $scope.getCardColumns = function () {
        if ($mdMedia('xs')) return 2;
        if ($mdMedia('sm') || $mdMedia('md')) return 5;
        return 10;
    };
});
