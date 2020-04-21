

const app = angular.module("app",['ngAnimate','ngAria','ngMaterial']);

app.controller("cardController", function($scope, $mdSidenav) {
  class Card {
    constructor(xPos, text) {
      this.selected = false;
      this.x = xPos;
      this.text = text;
    };

    onClick() {
      if(this.selected == false) {
        for(let x = 0; x < $scope.cards.length; x++) {
          let card = $scope.cards[x];
          card.selected = false;
        }
        this.selected = true;
        $scope.isCardSelected = true;
        $scope.selectedCard = this;

        console.log(this.text);

      } else {
        this.selected = false;
        $scope.isCardSelected = false;
        $scope.selectedCard = null;
      }
    }

  }


  $scope.sideNavOpen = false;

  $scope.openSideNav  = function() {
      $mdSidenav('left').open();
  }

  $scope.closeSideNav = function() {
      $mdSidenav('left').close();
  }

  $scope.selectedCard = null;
  $scope.isCardSelected = false;

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