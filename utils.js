
const cards = require('./cards');



function getRandomKey(obj) {
    return Object.keys(obj)[Math.floor(Math.random() * Object.keys(obj).length)];
}

function getRandomIndex(arr) {
    return arr
}



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



getUniqueCard = function(source, cardLog, maxAttempts) { //both are arrays
    maxAttempts = (typeof maxAttempts === 'undefined') ? 1000 : maxAttempts;
    let counter = 0;
    let finding = true;
    let testCard = null;
    while(finding) {
        counter ++;
        testCard = source[Math.floor(Math.random() * source.length)];
        if(cardLog.indexOf(testCard) === -1) {
            finding = false;
        }

        if(counter > maxAttempts) {
            console.log('Error finding unique random key');
            break;
        }
    }

    return testCard;
};


exports.Card = class Card {
    constructor(id, text) {
        this.id = id;
        this.text = text;
    }
};

exports.Player =  class Player {
    constructor(id, socket) {
        this.id = id;
        this.socket = socket;


        this.name = null;
        this.gameId = null;

        this.myCards = [];
        this.points = 0;
    }


};


exports.Game = class Game {
    constructor(io, gameId, name, maxPlayers) {
        this.inGame = false; //this means that its in the lobby
        this.name = '';
        this.id = gameId;
        this.maxPlayers = maxPlayers;
        this.players = {};
        this.admins = {};

        this.io = io;

        this.judgeIdx = 0;
        this.currentBlackCard = null;
        this.blackCardHistory = {};
        this.cardsInPlay = [];

        this.judgeCards = {};

        this.roundTime = 10;
        this.round = 0;

    }

    getPlayerNames() {
        let names = [];

        for(let p in this.players) {
            names.push(this.players[p].name);
        }
        return names;
    }

    populatePlayer(playerId) {
        this.players[playerId].myCards = [];

        for (let j = 0; j < 10; j++) {


            let cardText = getUniqueCard(cards.whiteCards, this.cardsInPlay);
            if(typeof this.cardsInPlay !== "undefined") {
                this.cardsInPlay.push(cardText);


                this.players[playerId].myCards.push(cardText);


            }

        }

    }

    populate() {
        for (let p in this.players) {
            this.populatePlayer(p);
        }

        //As this is the first black card it doesnt matter checking blackCardHistory
        let blackCardId = getRandomKey(cards.blackCards);
        this.currentBlackCard = cards.blackCards[blackCardId];
        this.blackCardHistory[blackCardId] = this.currentBlackCard;

    }


    sendHand(playerId) {
        this.io.to(playerId).emit('gamePlay:newRound', {
            roundTime: this.roundTime,
            hand: this.players[playerId].myCards,
            blackCard: this.currentBlackCard.text,
            roundNo: this.round,
            isJudge: this.getJudgeId() === playerId,
        });
    }   //TODO add multiple card picking

    sendHandToAll() {
        for(let p in this.players) {
            this.sendHand(p);
        }
    }

    consumeCard(cardText, playerId) { //only to be used at the end of the round
        let newCard = getUniqueCard(cards.whiteCards, this.cardsInPlay);


        let p = this.players[playerId];
        if(typeof p !== 'undefined') {
            p.myCards.filter(cText => cText !== cardText);

            this.cardsInPlay.filter(cText => cText !== cardText);

            this.cardsInPlay.push = newCard;
            p.myCards.push(newCard);

        }



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


            if(this.inGame) {
                this.populatePlayer(player.id);
                this.sendHand(player.id);
            }
        }



    }

    setGameAdmin(player) {
        if(player.id in this.players) {
            this.admins[player.id] = player;
        }
    }

    removePlayer(player) {
        delete this.players[player.id];

        delete this.admins[player.id];
    }

    getJudgeId() {
        return Object.keys(this.players)[this.judgeIdx];
    }

    itrJudge() {
        this.judgeIdx += 1;
        this.judgeIdx %= Object.keys(this.players).length;
    }


    newRound() {
        this.sendHandToAll();

        setTimeout(_ => {
            this.itrJudge();
            //Runs after round is completed

            this.io.to(this.id).emit("gamePlay:judging", {
                judgeCards: Object.values(this.judgeCards)
            });

            for(let playerId in this.judgeCards) {
                this.consumeCard(this.judgeCards[playerId], playerId)
            }





        }, 1000*this.roundTime);

        this.round ++;
    }

    judgeChooseCard(cardText) {
        for(let pId in this.judgeCards) {
            if(this.judgeCards[pId] === cardText) {
                this.players[pId].points ++;
            }
        }

        this.newRound();
    }


    setMaxPlayers(mPlayers) {
        if(Number.isInteger(mPlayers)
            && mPlayers > 2
            && mPlayers < 21) {

            this.maxPlayers = mPlayers;

            this.io.to(this.id).emit("game:maxPlayers", {maxPlayers: this.maxPlayers});


            let pList = Object.keys(this.players);
            let counter = 100;
            while(pList.length > mPlayers) {
                counter --;
                if(counter < 0) break;
                console.log("removing Player");
                let pId = pList[0];
                if(pId in this.admins) {
                    pId = pList[pList.length - 1]; //shouldn't remove admin so if first player is admin just select another one
                }
                let playerToRemove = this.players[pId];
                this.io.to(playerToRemove.gameId).emit("game:playerLeave", {name: playerToRemove.name});

                this.removePlayer(playerToRemove);
                playerToRemove.socket.leave(this.id);

                pList = pList.filter(id => id !== pId);


            }

        }


    }


    sendInfo(player) {
        player.socket.emit("game:info", {
            gameId: this.id,
            isAdmin: (player.socket.id in this.admins),
            players: this.getPlayerNames(),
            inGame: this.inGame,
            maxPlayers: this.maxPlayers

            //TODO make this object return from a function inside utils.Game
        });
    }
}
;


