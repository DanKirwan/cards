
const cards = require('./cards');


function getRandomKey(obj) {
    return Object.keys(obj)[Math.floor(Math.random() * Object.keys(obj).length)];
};



exports.getNewGameID = function() {
    //TODO Fix this horrible way of getting an ID
    let alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let attempts = 0;

    let findingKey = true;
    let code = '';
    while(findingKey) {
        attempts++;
        if(attempts > 1000) {
            console.log("Error finding new game code aborting");
            break;
        }
        code = '';
        for (let i = 0; i < 4; i++) {
            let x = Math.floor(Math.random() * 26);

            code += alpha[x];
        }

        findingKey = (code in games)
    }

    if(attempts > 1000) return false;
    else {
        return code;
    }
};



getUniqueRandomKey = function(source, keyLog, maxAttempts) {
    maxAttempts = (typeof maxAttempts === 'undefined') ? 1000 : maxAttempts;
    let counter = 0;
    let finding = true;
    let testKey = null;
    while(finding) {
        counter ++;
        testKey = getRandomKey(source);
        if(! testKey in keyLog) {
            finding = false;
        }

        if(counter > maxAttempts) {
            console.log('Error finding unique random key');
            break;
        }
    }

    return testKey;
};


exports.Card = class Card {
    constructor(id, text) {
        this.id = id;
        this.text = text;
    }
};

exports.Player =  class Player {
    constructor(id) {
        this.id = id;
        this.name = null;
        this.gameId = null;

        this.myCards = {};
        this.points = 0;
    }


};


exports.Game = class Game {
    constructor(gameId, name, maxPlayers) {
        this.name = '';
        this.id = gameId;
        this.maxPlayers = 20;
        this.players = {};
        this.admins = {};
        this.judgeIdx = 0;
        this.currentBlackCard = null;
        this.blackCardHistory = {};
        this.cardsInPlay = {};

    }

    getPlayerNames() {
        let names = [];

        for(let p in this.players) {
            names.push(this.players[p].name);
        }
        return names;
    }
    //TODO make it so you can add max players in the lobby

    populate() {
        for (let p in this.players) {
            for (let j = 0; j < 10; j++) {


                let cardId = getUniqueRandomKey(cards.whiteCards, this.cardsInPlay);
                let cardText = cards.whiteCards[cardId];

                this.cardsInPlay[cardId] = p;
                this.players[p].myCards[cardId] = cardText;

            }
        }

        //As this is the first black card it doesnt matter checking blackCardHistory
        let blackCardId = getRandomKey(cards.blackCards);
        this.currentBlackCard = cards.blackCards[blackCardId];
        this.blackCardHistory[blackCardId] = this.currentBlackCard;

    }


    sendHand(playerId, io) {
        io.to(playerId).emit('game:fullHand', {hand: this.players[playerId].myCards});
        io.to(playerId).emit('game:blackCard', {cardText: this.currentBlackCard.text});
    }

    sendHandToAll(io) {
        for(let p in this.players) {
            this.sendHand(p, io);
        }
    }

    consumeCard(cardId, playerId) {
        let newCardId = getUniqueRandomKey();


        let p = this.players[playerId];
        delete p.myCards[cardId];

        delete this.cardsInPlay[cardId];

        let txt = cards.whiteCards[newCardId];
        this.cardsInPlay[newCardId] = p.id;
        p.myCards[newCardId] = txt;


    }

    pickWinningCard(cardId) {
        if(cardId in this.cardsInPlay) {
           //This should be written later
        }
    }

    addPlayer(player) {
        console.log(Object.keys(this.players).length);
        if(Object.keys(this.players).length <  this.maxPlayers) {
            this.players[player.id] = player;
        }

    }

    setGameAdmin(player) {
        if(player.id in this.players) {
            this.admins[player.id] = player;
        }
    }

    removePlayer(player) {
        delete this.players[player.id];
    }

    getJudge() {
        return Object.keys(this.players)[this.judgeIdx];
    }

    itrJudge() {
        this.judgeIdx += 1;
        this.judgeIdx %= Object.keys(this.players).length;
    }

};


