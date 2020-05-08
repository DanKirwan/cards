exports.Player =  class Player {
    constructor(id, name) {
        this.id = id;
        this.name = null;
        this.gameId = null;
    }

}


exports.Game = class Game {
    constructor(gameId, name, maxPlayers) {
        this.name = name;
        this.id = gameId;
        this.maxPlayers = maxPlayers;
        this.players = {};
        this.judgeIdx = 0;

    }

    addPlayer(player) {
        if(Object.keys(this.players).length <  this.maxPlayers) {
            this.players[player.id] = player;
        }

    }

    removePlayer(player) {
        this.players = this.players.filter(function(value) {
            return value !== player;
        })
    }

    getJudge() {
        return this.players[this.judgeIdx];
    }

    itrJudge() {
        this.judgeIdx += 1;
        this.judgeIdx %= this.players.length;
    }

};

exports.Card =  class Card {
    constructor(text) {
        this.selected = false;
        this.text = text;

    }
};
