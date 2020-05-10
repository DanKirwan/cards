let cServices = angular.module("cards.services", []);

cServices.factory('socket', function($rootScope) {

    let socket = io.connect('87.112.192.250:80');

    return {
        on: function(eventName, callback) {
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


cServices.factory('server', function(socket, $mdDialog, $location, ) {
   return {

       checkGameExists: function(gameId) {
           socket.emit("game:checkExists", {gameId: gameId});
       },


       handleRouting: function(gameId) {
           socket.emit("route:checkGameExists", {gameId: gameId});

           socket.on("route:confirmGameExists", function(data) {
               console.log(`checking game exists ${data.exists}`);
               if(data.exists) {
                   socket.emit("game:getStatus", {gameId: gameId});


                   socket.on("game:status", function(data) {
                       console.log(`Game Status: ${data.inGame}`);

                       if(data.inGame) {
                           //Handle going into the actual game
                       } else {
                           //Go to lobby
                           if(!($location.path() === ("/lobby/"+gameId))){
                               $location.path("/lobby/" + gameId);


                           }
                       }

                   });

               } else {

                   $mdDialog.show(
                       $mdDialog.alert()
                           .parent(angular.element(document.body))
                           .clickOutsideToClose(true)
                           .title("This game does not exist!")
                           .textContent("Make sure you typed the game code right and try again")
                           .ok("Okay!")
                   ).then(function () {
                       $location.path("/");
                   }, function () {

                   });

               }
           });
       }

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

cServices.factory("globals", function() {
    return {
        username: '',
        usernameSet: false,
        players: [],

    }
});