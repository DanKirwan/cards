angular.module("cards.services", [])

    .factory('socket', function($rootScope) {

    let socket = io.connect('localhost:80');
    socket.on("test", function() {
        console.log("TEST");
    });

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