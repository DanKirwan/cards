

const app = angular.module("app",['ngAnimate','ngAria','ngMaterial', 'ngRoute','ngclipboard', 'cards.services' ]);
app.config(function($routeProvider) {
    $routeProvider
        .when("/", {
            templateUrl: "mainMenu.htm",
            controller: "menuController"
        })
        .when("/game", {
            templateUrl: "game.htm",
            controller: "cardController"
        })
        .when("/createGame", {
            templateUrl: "createGame.htm",
            controller: "menuController"
    });

});


app.controller("globalController", function($scope) {
    class Player {
        constructor (id, name) {
            this.id = id;
            this.name = name;
            this.leader = false;
        }
    }

    $scope.players = [
        new Player(0, "Dan"),
        new Player(1, "Test1")
    ];

});


app.controller("dialogController", function($scope, socket, $mdDialog) {

    $scope.username = null;
    $scope.nameValid = true;

    $scope.usrNameChange = function() {
        socket.emit("user:checkName", {name: $scope.username});
        socket.on('user:isNameValid', function(data) {
           $scope.isNameValid = data.isNameValid;
        })
    };



    $scope.usrSetName = function() {
        socket.emit("user:setName", {name: $scope.username});

        if($scope.nameValid) {
         $mdDialog.cancel();
        }

    }



});


app.controller("cardController", function($scope, $mdSidenav, $mdMedia, $timeout) {


    $scope.selectedCard = null;
    $scope.cardsFocussed = true;

    $scope.popUpMessage = '';
    $scope.showPopUp = false;

    $scope.isJudge = false;

    //normal play
    class Card {
    constructor(text) {
      this.selected = false;
      this.text = text;
    }

    onClick() {



        if(this.selected === false) {

          if ($scope.cardsFocussed) {

              for (let x = 0; x < $scope.cards.length; x++) {
                  let card = $scope.cards[x];
                  card.selected = false;
              }
              //Selecting Card Logic
              this.selected = true;
              $scope.selectedCard = this;

              $scope.cardsFocussed = false;


              //Pop up handingR
              $scope.popUpMessage = "Card Selected";
              $scope.showPopUp = true;

              $timeout( function() {
                  $scope.showPopUp = false;
              }, 200);

              console.log(this.text);
          } else {
              $scope.focusCards();

        }
        } else { //Card already selected so not in card bar
            this.selected = false;
            $scope.selectedCard = null;
            $scope.focusCards();
      }

      console.log($scope.cardsFocussed);
    }

  }

  $scope.focusCards = function () {
        $scope.cardsFocussed = true;
  };

  $scope.unfocusCards = function () {
        $scope.cardsFocussed = false;
  };







  //Methods used in both Judge and Playing
  $scope.sideNavOpen = false;

  $scope.openSideNav  = function() {
      $mdSidenav('left').open();

  };

  $scope.closeSideNav = function() {
      $mdSidenav('left').close();
  };






  $scope.cards = [
      new Card("Test1"),
      new Card("Test2"),
      new Card("Test3"),
      new Card("test4"),
      new Card( "test5"),
      new Card( "test6"),
      new Card( "test7"),
      new Card( "test8"),
      new Card( "test9"),
      new Card("test10")];
  console.log($scope.server.myHand);









});


app.controller("judgeController", function ($scope, $mdMedia) {
    //Judge Setup
    $scope.chosenJudgeCard = null;


    class JudgeCard {
        constructor(text) {
            this.text = text;
            this.selected = false;
        }

        onClick() {
            let selected = this.selected;
            for (let x = 0; x < $scope.judgeCards.length; x++) {
                let card = $scope.judgeCards[x];
                card.selected = false;
            }

            this.selected = !selected;

            if(this.selected) $scope.chosenJudgeCard = this;
            else $scope.chosenJudgeCard = null;
            console.debug(this.text + " Seleceted");
        }
    }

    $scope.judgeCards = [
        new JudgeCard('TestOne'),
        new JudgeCard('TestTwo'),
        new JudgeCard('TestOne'),
        new JudgeCard('TestTwo'),
        new JudgeCard('TestOne'),
        new JudgeCard('TestTwo')
    ];



    $scope.judgeChoosing = true;



    $scope.confirmJudgeCard = function () {
        //send stuff to server about winning card

    };


    $scope.getCardColumns = function () {
        if ($mdMedia('xs')) return 2;
        if ($mdMedia('sm') || $mdMedia('md')) return 5;
        return 10;
    };
});





app.controller("menuController", function ($scope, $mdDialog, $mdMedia, $timeout) {
    class Game {
        constructor(name, id) { //other stuff about game as in private max players etc
            this.name = name;
            this.id = 0;
        }


    }

    class CardPack {
        constructor(name, description) {
            this.name=name;
            this.desc = description;
            this.selected = false;

        }
    }


    $scope.showSwipeAlert = function(ev) {
        if (!$mdMedia("gt-md")) {

            console.log("Showing Popup");
            $mdDialog.show(
                {
                    templateUrl: 'pickNameDialog.tmpl.html',
                    parent:angular.element(document.body),
                    targetEvent: ev,
                    clickOutsideToClose: false
                }
            );
        }
    };

    $scope.showCardPacks = false;
    $scope.cardPacks = [
        new CardPack("UK TEST", "Obviously superior set of cards"),
        new CardPack("US Test", "not as funny america sucks"),
        new CardPack("Custom Pack", "Something less witty as it wasn't written by the Cards against humanity team")
    ];


    $scope.gameName = '';


});

