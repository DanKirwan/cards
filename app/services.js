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
        players: []
    }
})