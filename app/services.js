angular.module("cards.services", [])

    .factory('socket', function($rootScope) {

    let socket = io.connect();

    return {
        on: function(eventName, callback) {
            socket.on(eventName, function(){
                let args = aruments;
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