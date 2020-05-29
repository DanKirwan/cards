
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
            console.log('Error finding unique random card');
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
        this.blackCardHistory = [];
        this.cardsInPlay = [];

        this.judgeCards = {};

        this.roundTime = 10;
        this.currentRoundTime = this.roundTime;
        this.round = 0;


        this.inJudging = false;

        this.judgeTimeout = null;
        this.judgeCounter = null;
        this.judgeTime = 10;
        this.currentJudgeTime = this.judgeTime;


        this.maxPoints = 5;
    }

    getPlayersToBroadcast() {
        let names = [];

        for(let p in this.players) {
            names.push({name: this.players[p].name, points: this.players[p].points});
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


    }


    sendHand(playerId) {
        this.io.to(playerId).emit('gamePlay:newRound', {
            roundTime: this.currentRoundTime,
            judgeTime: this.currentJudgeTime,
            hand: this.players[playerId].myCards,
            blackCard: this.currentBlackCard,
            roundNo: this.round,
            isJudge: this.getJudgeId() === playerId,
            inJudging: this.inJudging,
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
            p.myCards = p.myCards.filter(cText => cText !== cardText);

            this.cardsInPlay = this.cardsInPlay.filter(cText => cText !== cardText);

            this.cardsInPlay.push(newCard);
            p.myCards.push(newCard);

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
        this.round ++;
        this.currentRoundTime = this.roundTime;
        this.currentJudgeTime = this.judgeTime;

        this.inJudging = false;

        if(this.currentBlackCard !== null) this.blackCardHistory.push(this.currentBlackCard);
        this.currentBlackCard = getUniqueCard(cards.blackCards, this.blackCardHistory);

        this.itrJudge();
        this.sendHandToAll();

        this.judgeCards = [];

        let counter = setInterval(_ => {
            if(this.currentRoundTime > 0) this.currentRoundTime --;
        }, 1000);

        setTimeout(_ => {
            clearInterval(counter)
            //Runs after round is completed
            if(Object.keys(this.judgeCards).length > 0) {
                this.inJudging = true;
                this.io.to(this.id).emit("gamePlay:judging", {
                    judgeCards: Object.values(this.judgeCards),
                });

                for (let playerId in this.judgeCards) {
                    this.consumeCard(this.judgeCards[playerId], playerId)
                }


                this.judgeCounter = setInterval(_ => {
                    if(this.currentJudgeTime > 0) this.currentJudgeTime --;
                }, 1000);

                this.judgeTimeout = setTimeout( _ => {
                    this.io.to(this.id).emit("gamePlay:alert", {message: "The Card Czar didn't select a card in time. No one wins the round"});
                    clearInterval(this.judgeCounter);
                    this.newRound();
                }, this.judgeTime * 1000);
            } else {

                this.io.to(this.id).emit("gamePlay:alert", {message: "No cards were selected, moving on to next round"});
                this.newRound();
            }

        }, 1000*this.roundTime);

    }

    judgeChooseCard(cardText) {
        for(let pId in this.judgeCards) {
            if(this.judgeCards[pId] === cardText) {
                this.players[pId].points ++;
                this.io.to(this.id).emit("gamePlay:roundWin", {playerName: this.players[pId].name});


                if(this.players[pId].points >= this.maxPoints) {
                    this.io.to(this.id).emit("gamePlay:gameWin", {playerName: this.players[pId].name});
                } //TODO make this nicer so it asks if you want to play again etc
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
            players: this.getPlayersToBroadcast(),
            inGame: this.inGame,
            maxPlayers: this.maxPlayers

            //TODO make this object return from a function inside utils.Game
        });
    }
}
;


