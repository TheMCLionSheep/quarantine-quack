//Variables

//Misc
var scrim;
var basicPopdown;

//Sign-in
var signInSection;
var signInInput;
var signInError;
var signInButton;

var rejoinSection;

var disconnectSection;

//Header
var headerSection;

//Lobby
var lobbySection;
var lobbyOpenList;
var lobbyClosedList;

//Host
var hostSection;
var hostBecome;
var hostStart;
var hostDay;
var hostMove;
var hostPass;

//Vote
var voteSection;
var votePoll;
var voteResults;
var voteResultsAgree;
var voteResultsDisagree;

//Night
var nightSection;
var nightInfected;

//End Game
var endSection;

function loadGame() {
  variableAssignment();
  addEventListeners();
}

function variableAssignment() {
  //Misc
  scrim = document.querySelector("#scrim");
  basicPopdown = document.querySelector("#basic-popdown");

  //Sign-in
  signInSection = document.querySelector("#sign-in");
  signInInput = document.querySelector("#sign-in__input");
  signInError = document.querySelector("#sign-in__error");
  signInButton = document.querySelector("#sign-in__button");

  rejoinSection = document.querySelector("#rejoin");

  disconnectSection = document.querySelector("#disconnect");

  //Header
  headerSection = document.querySelector("#header");

  //Lobby
  lobbySection = document.querySelector("#lobby");
  lobbyOpenList = document.querySelector("#lobby__open-list");
  lobbyClosedList = document.querySelector("#lobby__closed-list");

  //Host
  hostSection = document.querySelector("#host");
  hostBecome = document.querySelector("#host__become");
  hostStart = document.querySelector("#host__start");
  hostDay = document.querySelector("#host__day");
  hostMove = document.querySelector("#host__move");
  hostPass = document.querySelector("#host__pass");

  //Vote
  voteSection = document.querySelector("#vote");
  votePoll = document.querySelector("#vote__poll");
  voteResults = document.querySelector("#vote__results");
  voteResultsInfo = document.querySelector("#vote__results__info");
  voteResultsAgree = document.querySelector("#vote__results--agree");
  voteResultsDisagree = document.querySelector("#vote__results--disagree");

  //Night
  nightSection = document.querySelector("#night");
  nightInfected = document.querySelector("#night__infected");

  //End game
  endSection = document.querySelector("#end");
}

function addEventListeners() {
  signInInput.addEventListener("keyup", function(event) {
    if(event.keyCode == 13) {
      event.preventDefault();
      signInButton.click();
    }
  });
}

//Sign-In

function rejoinGame() {
  rejoinScrim.classList.remove("active");
  rejoinSection.classList.remove("active");
  socket.emit("rejoinGame");
}

function joinGame() {
  socket.emit("signInRequest",signInInput.value);
}

function createPopdown(title, buttonName, onclick, content = null) {
  scrim.classList.add("active");
  if(basicPopdown.classList.contains("active")) {
    basicPopdown.classList.remove("active");
    var waitTime = 500;
  }
  else {
    var waitTime = 0;
  }
  setTimeout( function() {
    basicPopdown.querySelector("h1").innerHTML = title;
    if(content != null) {
      basicPopdown.querySelector("p").innerHTML = content;
    }
    basicPopdown.querySelector("button").innerHTML = buttonName;
    basicPopdown.querySelector("button").setAttribute("onclick",onclick);
    basicPopdown.classList.add("active");
  }, waitTime);
}

function closePopdown(popdown) {
  scrim.classList.remove("active");
  popdown.classList.remove("active");
}

function getNextPopdown(type, extraVar = null) {
  switch(type) {
    case "start":
      createPopdown("You're " + (extraVar ? "infected!" : "healthy!"), "Continue","closePopdown(this.parentNode)",(extraVar ? "To win, infect 50% of the population. Avoid being caught!" : "To win, isolate all infected people in quarantine. Figure out who's infected!"));
      break;
    case "nightResults":
      if(extraVar) {
        createPopdown("You've been infected!", "Continue", "closePopdown(this.parentNode)", "To win, infect 50% of the population. Avoid being caught!");
      }
      else {
        closePopdown(basicPopdown);
      }
      break;
  }
}

function newPlayer() {
  scrim.classList.remove("active");
  rejoinSection.classList.remove("active");
  socket.emit("login",null);
}

function rejoinGame() {
  scrim.classList.remove("active");
  rejoinSection.classList.remove("active");
  socket.emit('rejoinGame');
}

//Lobby
function editPlayerList(actionType, name, icon = null) {
  if(actionType == "add") {
    var playerButton = document.createElement("button");
    var playerIcon = document.createElement("img");
    var playerName = document.createElement("p");

    playerButton.setAttribute("onclick","socket.emit('updateLobby','moveToClosed','" + name + "'); socket.emit('infectPlayer','" + name + "')");
    playerButton.setAttribute("id","open-list-name--" + name);
    playerButton.setAttribute("class","wooden-button")
    playerIcon.setAttribute("src",getIconSrc(icon));
    playerName.innerHTML = name;

    playerButton.appendChild(playerIcon);
    playerButton.appendChild(playerName);
    lobbyOpenList.appendChild(playerButton);
    console.log(lobbyOpenList);
  }
  else {
    var playerButton = document.querySelector("#open-list-name--" + name);
    if(actionType == "moveToClosed") {
      playerButton.setAttribute("onclick","socket.emit('updateLobby','moveToOpen','" + name + "'); socket.emit('infectPlayer','" + name + "')");
      lobbyClosedList.appendChild(playerButton);
    }
    else if(actionType == "moveToOpen") {
      playerButton.setAttribute("onclick","socket.emit('updateLobby','moveToClosed','" + name + "'); socket.emit('infectPlayer','" + name + "')");
      lobbyOpenList.appendChild(playerButton);
    }
    else if(actionType == "host") {
      playerButton.classList.add("host");
    }
    else if(actionType == "stopHost") {
      playerButton.classList.remove("host");
    }
    else if(actionType == "voteAgree") {
      playerButton.classList.remove("disagree");
      playerButton.classList.add("agree");
    }
    else if(actionType == "voteDisagree") {
      playerButton.classList.remove("agree");
      playerButton.classList.add("disagree");
    }
    else if(actionType == "noVote") {
      playerButton.classList.remove("disagree");
      playerButton.classList.remove("agree");
    }
    else if(actionType == "infected") {
      playerButton.classList.add("infected");
    }
    else if(actionType == "remove") {
      var playerButton = document.querySelector("#open-list-name--" + name);
      playerButton.parentNode.removeChild(playerButton);
    }
  }
}

function getIconSrc(icon) {
  return "/client/images/avatar.png";
}

function convertInfected() {
  headerSection.querySelector("h1").innerHTML = "INFECTED";
}

function showNightResults(infectedAdded, infectClosed, infected, winCondition) {
  if(winCondition == null) {
    createPopdown((infectedAdded == 1 ? infectedAdded + " player was infected!" : infectedAdded + " players were infected!"),"Continue","getNextPopdown('nightResults'," + infected + ")","There were " + infectClosed + " infected in quarantine!");
  }
  else if(winCondition == "infect") {
    createPopdown("Infected win the game!","Finish Game","finishGame();", (infectedAdded == 1 ? infectedAdded + " player was infected!" : infectedAdded + " players were infected!"));
  }
  else if(winCondition == "healthy") {
    createPopdown("Healthy win the game!","Finish Game","finishGame();", "All infected were isolated!");
  }
}

function finishGame() {
  closePopdown(basicPopdown);
  socket.emit("requestInfected");
  socket.emit("endGameButton");
}
