

const app = angular.module("app",['ngAnimate','ngAria','ngMaterial', 'ngRoute']);
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
    };

    onClick() {


        if(this.selected == false) {

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
              }, 100);

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
  }

  $scope.closeSideNav = function() {
      $mdSidenav('left').close();
  }







  $scope.cards = [
      new Card("Test1"),

      new Card("Test2"),
      new Card("Test3"),
      new Card("Test4"),
      new Card("Test5"),
      new Card("Test6"),
      new Card("Test7"),
      new Card("Test8"),
      new Card("Test9"),
      new Card("Test10"),
      ]








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





app.controller("menuController", function ($scope) {
    class Game {
        constructor(name, id) { //other stuff about game as in private max players etc
            this.name = name;
            this.id = 0;
        }


    }

    $scope.gameName = '';


});

