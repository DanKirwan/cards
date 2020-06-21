const mongoose = require("mongoose");

exports.gameSchema = new mongoose.Schema({
    date: Date,
    code: String,
    name: String,
    rounds: [{
        blackCard: String,
        whiteCards: [{
            cards: [String],
            player: String,
            won: Boolean,
        }],
        czar: String,
    }],
    players: [{
        name: String,
        points: Number,
    }],
    winningPlayer: String,

});

exports.GameAnalytics =  class GameAnalytics {
    constructor(model) {
        this.model = model;
        this.rounds = [];
    }

    addRound(blackCardText,  judgeCards, winningIdx, judge, players) {

        let whiteCards = [];

        let entries = Object.entries(judgeCards);

        let idx = 0;
        for(let [id, cards] of entries) {
            whiteCards.push({
                cards: cards,
                player: players[id].name,
                won: idx === winningIdx,
            });
            idx++;
        }

        this.rounds.push({
            blackCard: blackCardText,
            whiteCards: whiteCards,
            czar: judge,
        })
    }

    clear() {
        this.rounds = [];
    }

    save(game, winningPlayer) {

        let displayPlayers = [];

        Object.values(game.players).forEach(p => {
            displayPlayers.push({
                name: p.name,
                points: p.points
            })
        })

        let gameAnalytics = this;

        this.model.create({
            date: new Date(),
            code: game.id,
            name: game.name,
            rounds: this.rounds,
            players: displayPlayers,
            winningPlayer: winningPlayer,
        }, function(err, res) {
            if(err) console.log(`Error saving game to database: ${err}`);
            gameAnalytics.clear();

        });
    }
};


