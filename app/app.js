
const app = angular.module("app",['ngMessages','ngAnimate','ngAria','ngMaterial', 'ngRoute','ngclipboard', 'cards.services', 'ngSanitize']);


app.config(function($routeProvider) {
    $routeProvider
        .when("/", {
            templateUrl: "mainMenu.htm",
            controller: "mainMenuController"
        })
        .when("/attribution", {
            templateUrl: "attrib.htm"
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



app.controller("globalController", function($window, $location, gamePlay, $scope, $mdDialog, $mdMedia, socket, globals, Util) {



    $scope.Util = Util;
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

    socket.on("user:getName", function() {
        globals.username = null;
        $scope.pickNameDialog();
    });

    socket.on("user:confirmName", function(data) {
        globals.username = data.name;
    });

    socket.on("session:failedConnect", function(data) {
        $mdDialog.show(
            $mdDialog.alert()
                .parent(angular.element(document.body))
                .clickOutsideToClose(true)
                .title(data.message)
                .ok("Okay")
        )

        $location.path('/');
    });


    $scope.players = [];


});

app.controller("routingController", function($scope, socket, globals, $routeParams, game) {




    $scope.initFunct = function() {
        if(globals.username !== null){
            game.reset();
            game.leave();
            globals.gameId = $routeParams.gameCode.toUpperCase();
            game.join();
        } else {

            socket.on("user:confirmName", function(data) {
                globals.username = data.name;
                game.reset();
                globals.gameId = $routeParams.gameCode.toUpperCase();
                game.join();
            }
        )}
    };



});





app.controller("dialogController", function(globals, $scope, socket, $mdDialog, $window) {

    $scope.inputUsername = '';


    $scope.usrNameChange = function() {
        globals.username = $scope.inputUsername;
        socket.emit("user:checkName", {name: globals.username});
        socket.on('user:isNameValid', function(data) {
           $scope.isNameValid = data.isNameValid;
        })
    };



    $scope.usrSetName = function() {
        if($scope.isNameValid || globals.username !== '') {
            socket.emit("user:setName", {name: globals.username});
        }

        if($scope.isNameValid) {
         $mdDialog.cancel();
        }

    }





});






app.controller("mainMenuController", function($scope, socket, game, globals, Util) {

    //main menu code


    $scope.game = game;
    $scope.globals = globals;

    //TODO fix this join game thing and route to main menu if not a valid game code

    $scope.showAttrib = function() {
        Util.showAlert("Attribution", "All cards originally sourced from Cards Against Humanity via JSON against humanity")
    }

    $scope.checkGame = function() {
        globals.gameId = globals.gameId.toUpperCase().substring(0, 4);

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

app.controller("menuController", function (game, gamePlay, globals, $rootScope, $scope, socket, lobby, $routeParams) {








    $scope.showCardPacks = false;
    $scope.showAdvanced = false;
    $scope.lobby = lobby;
    $scope.game = game;
    $scope.gamePlay = gamePlay;
    $scope.globals = globals;




    $scope.initLobby= function () {
        globals.gameId = $routeParams.gameCode.toUpperCase();
        if(globals.username !== null){
            game.join();
            lobby.populate();
        } else {

            socket.on("user:confirmName", function(data) {
                globals.username = data.name;
                game.join();
                lobby.populate();
            });
        }
    };


    $scope.startGame = function() {
        gamePlay.begin();
    };
});



































app.controller("cardController", function(Util, $location, $mdDialog, globals, game, socket, gamePlay, $scope, $mdSidenav, $mdMedia, $timeout, $routeParams, $interval) {



    $scope.$mdMedia = $mdMedia;
    $scope.gamePlay = gamePlay;
    $scope.game = game;
    $scope.globals = globals;



    $scope.$on("$destroy", function() {
        if(!globals.replaying) {
            game.leave()
        }

    });




    $scope.initGameplay = function () {
        globals.gameId = $routeParams.gameCode.toUpperCase();
        if(globals.username !== null){
            game.join();
            if(!$mdMedia("gt-sm")) {
                Util.showInfo("Swipe right to open the menu!", 6);

            }


        } else {

            socket.on("user:confirmName", function(data) {
                globals.username = data.name;
                game.join();

                if(!$mdMedia("gt-sm")) {
                    Util.showInfo("Swipe right to open the menu!", 6);
                }
            });
        }


    };

    $scope.confirmQuit = function() {

        let confirm = $mdDialog.confirm()
            .title("Are you sure you want to Quit?")
            .textContent("You will loose all current points")
            .ok("Main Menu")
            .cancel("Continue")


        $mdDialog.show(confirm).then(function() {
            game.leave()
        }, function() {
           //Do nothing :)
        });

    }








    //Methods used in both Judge and Playing
    $scope.sideNavOpen = false;

    $scope.openSideNav  = function() {
        $mdSidenav('left').open();

    };

    $scope.closeSideNav = function() {
        $mdSidenav('left').close();
    };







});


app.controller("judgeController", function ($scope, $mdMedia, gamePlay) {
    //Judge Setup
    $scope.judgeChoosing = true;

});


app.controller("endGameController", function(gamePlay, $scope, $mdDialog, globals, socket, game, Util){


    $scope.name = gamePlay.winningName;

    $scope.replay = false;

    $scope.replayCount = 0;

    socket.on("game:replay", function(data){

        $scope.replayCount = data.replayCount;

        if($scope.replayCount > 3) $scope.replayCount = 3;

        if(data.replayCount > 2) {

            Util.showInfo("At least 3 players selected to replay, a new game is starting!", 5);
            $mdDialog.hide();
            globals.replaying = true;
        }
    });


    $scope.playAgain = function() {
        $scope.replay = true;
        socket.emit("game:playerReplay", {replay: true});
    };

    $scope.mainMenu = function() {
        $mdDialog.cancel();

        game.leave();
        socket.emit("game:playerReplay", {replay:false});
    };

});