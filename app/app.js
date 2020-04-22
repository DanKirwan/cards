

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

app.controller("cardController", function($scope, $mdSidenav, $timeout) {

    $scope.selectedCard = null;
    $scope.cardsFocussed = true;

    $scope.popUpMessage = '';
    $scope.showPopUp = false;

    $scope.isJudge = true;


    //normal play
    class Card {
    constructor(xPos, text) {
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


  //Judge Setup

    $scope.judgeChoosing = true;

  //Methods used in both Judge and Playing
  $scope.sideNavOpen = false;

  $scope.openSideNav  = function() {
      $mdSidenav('left').open();
  }

  $scope.closeSideNav = function() {
      $mdSidenav('left').close();
  }







  $scope.cards = [
      new Card(10,  "Test1"),

      new Card(30,  "Test2"),
      new Card(70,  "Test3"),
      new Card(40,  "Test4"),
      new Card(60,  "Test5"),
      new Card(50,  "Test6"),
      new Card(30,  "Test7"),
      new Card(70,  "Test8"),
      new Card(40,  "Test9"),
      new Card(60,  "Test10"),
      ]



  $scope.openLeftMenu = function() {
    $mdSidenav('left').toggle();
    console.log($mdSidenav('left').isOpen());
  }




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

