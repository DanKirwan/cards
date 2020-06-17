
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



getUniqueCard = function(sourceIdxs, source, cardLog, maxAttempts) { //both are arrays
    maxAttempts = (typeof maxAttempts === 'undefined') ? 1000 : maxAttempts;
    let counter = 0;
    let finding = true;
    let testCard= null;
    while(finding) {
        counter ++;
        testCard = source[sourceIdxs[Math.floor(Math.random() * sourceIdxs.length)]]; //Not the most elegant approach but it works
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

        this.roundTimeout = null;
        this.roundTime = 10;
        this.currentRoundTime = this.roundTime;
        this.round = 0;


        this.inJudging = false;

        this.judgeTimeout = null;
        this.judgeCounter = null;
        this.judgeTime = 10;
        this.currentJudgeTime = this.judgeTime;


        this.maxPoints = 5;

        this.judge = undefined;


        //Handling replaying game

        this.replayPlayers = []


        //Handling which cards to select
        this.whiteIdxs = [];
        this.blackIdxs = [];

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


            let cardText = getUniqueCard(this.whiteIdxs, cards.whiteCards, this.cardsInPlay);
            if(typeof this.cardsInPlay !== "undefined") {
                this.cardsInPlay.push(cardText);


                this.players[playerId].myCards.push(cardText);


            }

        }

    }

    populate() {
        this.blackCardHistory = [];
        this.round = 0;

        clearTimeout(this.judgeTimeout);
        clearInterval(this.judgeCounter);

        clearTimeout(this.roundTimeout);
        clearInterval(this.roundCounter);


        for (let p in this.players) {
            this.populatePlayer(p);
            this.players[p].points = 0;
        }


    }


    sendHand(playerId) {
        if(this.players.length !== 0) {
            this.io.to(playerId).emit('gamePlay:newRound', {
                roundTime: this.currentRoundTime,
                judgeTime: this.currentJudgeTime,
                hand: this.players[playerId].myCards,
                blackCard: this.currentBlackCard,
                roundNo: this.round,
                isJudge: this.judge === playerId,
                inJudging: this.inJudging,
                roundJudge: this.players[this.judge].name,
                maxPoints: this.maxPoints,
            });

        }

    }

    sendHandToAll() {
        for(let p in this.players) {
            this.sendHand(p);
        }
    }

    consumeCard(cardText, playerId) { //only to be used at the end of the round
        let newCard = getUniqueCard(this.whiteIdxs, cards.whiteCards, this.cardsInPlay);


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

            if(this.inJudging) {
                player.socket.emit("gamePlay:judging", {
                    judgeCards: Object.values(this.judgeCards),
                });
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


        if(this.replayPlayers.length > 0) {

            this.replayPlayers = this.replayPlayers.filter(p => p !== player.id);

            this.io.to(this.id).emit("game:replay", {replayCount: this.replayPlayers.length});
        }
    }



    itrJudge() {
        this.judgeIdx += 1;
        this.judgeIdx %= Object.keys(this.players).length;
        this.judge = Object.keys(this.players)[this.judgeIdx];
    }

    startJudging() {
        clearInterval(this.roundCounter);
        //Runs after round is completed
        if(this.judgeCards && Object.keys(this.judgeCards).length > 0) {
            this.inJudging = true;
            this.io.to(this.id).emit("gamePlay:judging", {
                judgeCards: Object.values(this.judgeCards),
            });

            for (let playerId in this.judgeCards) {
                for(let c of this.judgeCards[playerId]) {
                    this.consumeCard(c, playerId)
                }

            }


            this.judgeCounter = setInterval(_ => {
                if(this.currentJudgeTime > 0) this.currentJudgeTime --;
            }, 1000);

            this.judgeTimeout = setTimeout( _ => {
                this.io.to(this.id).emit("gamePlay:alert", {message: "The Card Czar didn't select a card in time. No one wins the round"});
                clearInterval(this.judgeCounter);
                this.newRound();
            }, this.judgeTime * 1000 + 500);
        } else {

            this.io.to(this.id).emit("gamePlay:alert", {message: "No cards were selected, moving on to next round"});
            this.newRound();
        }

    }


    newRound() {
        this.round ++;
        this.currentRoundTime = this.roundTime;
        this.currentJudgeTime = this.judgeTime;


        //make sure to clear all previous rounds timeouts and counters
        clearTimeout(this.judgeTimeout);
        clearTimeout(this.roundTimeout);
        clearInterval(this.judgeCounter);
        clearInterval(this.roundCounter);

        this.inJudging = false;


        this.currentBlackCard = getUniqueCard(this.blackIdxs, cards.blackCards,  this.blackCardHistory);

        this.blackCardHistory.push(this.currentBlackCard);

        this.itrJudge();
        this.sendHandToAll();

        this.judgeCards = [];

        this.roundCounter = setInterval(_ => {
            if(this.currentRoundTime > 0) this.currentRoundTime --;
        }, 1000);

        this.roundTimeout = setTimeout(_ => {
            this.startJudging();
        }, 1000*this.roundTime + 500); //needs wrapper function for (this) context also +500 just incase you select at the very end

    }

    judgeChooseCards(idx) {

        let cards = Object.values(this.judgeCards)[idx];
        for(let pId in this.judgeCards) {
            if(this.judgeCards[pId] === cards) {
                if(typeof this.players[pId] !== "undefined") {
                    this.players[pId].points++;
                    this.io.to(this.id).emit("gamePlay:roundWin", {cardsIdx: idx, playerName: this.players[pId].name});


                    if(this.players[pId].points >= this.maxPoints) {
                        this.io.to(this.id).emit("gamePlay:gameWin", {playerName: this.players[pId].name});
                    } else {
                        this.inJudging = false;
                        setTimeout( _ => this.newRound(), 4000);
                    }
                } else {
                    this.io.to(this.id).emit("gamePlay:alert", {message: "Player who won the round has left the game, next round"})
                    this.newRound();
                } //TODO make this nicer so it asks if you want to play again etc
            }
        }


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

        if(typeof player !== "undefined") {
            player.socket.emit("game:info", {
                gameId: this.id,
                isAdmin: (player.socket.id in this.admins),
                players: this.getPlayersToBroadcast(),
                inGame: this.inGame,
                maxPlayers: this.maxPlayers,
                name: this.name,
                judge: this.inGame && this.players[this.judge] ? this.players[this.judge].name : undefined,
            });

        }

    }
}
;


