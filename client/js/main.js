//Variables
var endTime = 0;
var slots = 0;

//Sounds
var nightMusic;
var dayMusic;

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
var headerSickNum;
var headerInfectedNum;

//Lobby
var lobbySection;
var lobbyOpenList;
var lobbyClosedList;
var lobbyLimit;

//Host
var hostSection;
var hostBecome;
var hostStart;
var hostDay;
var hostMove;
var hostPass;
var hostEndGame;

//Vote
var voteSection;
var votePoll;
var voteResults;
var voteResultsAgree;
var voteResultsDisagree;

//Night
var nightSection;
var nightInfected;
var nightTimer;

//End Game
var endSection;

function loadGame() {
  variableAssignment();
  addEventListeners();
  loadSounds();
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
  headerSickNum = document.querySelector("#header__sick-num");
  headerInfectedNum = document.querySelector("#header__infected-num");

  //Lobby
  lobbySection = document.querySelector("#lobby");
  lobbyOpenList = document.querySelector("#lobby__open-list");
  lobbyClosedList = document.querySelector("#lobby__closed-list");
  lobbyLimit = document.querySelector("#lobby__limit");

  //Host
  hostSection = document.querySelector("#host");
  hostBecome = document.querySelector("#host__become");
  hostStart = document.querySelector("#host__start");
  hostDay = document.querySelector("#host__day");
  hostMove = document.querySelector("#host__move");
  hostPass = document.querySelector("#host__pass");
  hostEndGame = document.querySelector("#host__end-game");

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
  nightTimer = document.querySelector("#night__timer");

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

function loadSounds() {
  nightMusic = createAudio("/client/audio/Dark-Things-2_V001.mp3");
  nightMusic.volume = 0.7;
  nightMusic.playbackRate = 1.5;
  dayMusic = createAudio("/client/audio/City-of-Dread_Looping.mp3");
  dayMusic.volume = 0.3;
  dayMusic.addEventListener("ended", function() {
    dayMusic.play();
  });
}

function createAudio(src) {
  var audio = document.createElement("audio");
  audio.src = src;
  return audio;
}

function playSound(sound, isMusic) {
  if(isMusic) {
    nightMusic.pause();
    dayMusic.pause();
  }
  sound.currentTime = 0;
  sound.play();
}

//Lobby
function editPlayerList(actionType, name, icon = null) {
  if(actionType == "add") {
    var playerButton = document.createElement("button");
    var playerIcon = document.createElement("img");
    var playerName = document.createElement("p");

    playerButton.setAttribute("onclick","socket.emit('updateLobby','moveToClosed','" + name + "'); socket.emit('infectPlayer','" + name + "')");
    playerButton.setAttribute("id","open-list-name--" + name);
    playerIcon.setAttribute("src",getIconSrc(icon));
    playerName.innerHTML = name;

    playerButton.appendChild(playerIcon);
    playerButton.appendChild(playerName);
    lobbyOpenList.appendChild(playerButton);
  }
  else {
    var playerButton = document.querySelector("#open-list-name--" + name);
    if(actionType == "moveToClosed") {
      playerButton.setAttribute("onclick","socket.emit('updateLobby','moveToOpen','" + name + "'); socket.emit('infectPlayer','" + name + "')");
      lobbyClosedList.appendChild(playerButton);
      slots--;
      lobbyLimit.innerHTML = "Open Spots: " + slots;
    }
    else if(actionType == "moveToOpen") {
      playerButton.setAttribute("onclick","socket.emit('updateLobby','moveToClosed','" + name + "'); socket.emit('infectPlayer','" + name + "')");
      lobbyOpenList.appendChild(playerButton);
      slots++;
      lobbyLimit.innerHTML = "Open Spots: " + slots;
    }
    else if(actionType == "host") {
      adjustStatusIcon(true, "host", playerButton);
    }
    else if(actionType == "stopHost") {
      adjustStatusIcon(false, "host", playerButton);
    }
    else if(actionType == "voteAgree") {
      adjustStatusIcon(true, "agree", playerButton);
      adjustStatusIcon(false, "disagree", playerButton);
    }
    else if(actionType == "voteDisagree") {
      adjustStatusIcon(false, "agree", playerButton);
      adjustStatusIcon(true, "disagree", playerButton);
    }
    else if(actionType == "noVote") {
      adjustStatusIcon(false, "agree", playerButton);
      adjustStatusIcon(false, "disagree", playerButton);
    }
    else if(actionType == "infected") {
      adjustStatusIcon(true, "infected", playerButton);
    }
    else if(actionType == "chosen") {
      adjustStatusIcon(true, "chosen", playerButton);
    }
    else if(actionType == "stopChosen") {
      adjustStatusIcon(false, "chosen", playerButton);
    }
    else if(actionType == "remove") {
      var playerButton = document.querySelector("#open-list-name--" + name);
      playerButton.parentNode.removeChild(playerButton);
    }
  }
}

function adjustStatusIcon(add, status, parent) {
  var statusIcon = parent.querySelector("." + status);
  if(add && statusIcon == null) {
    statusIcon = document.createElement("span");
    statusIcon.setAttribute("class","status " + status);
    parent.appendChild(statusIcon);
  }
  else if(!add && statusIcon != null) {
    parent.removeChild(statusIcon);
  }
}

function getIconSrc(icon) {
  return "/client/images/avatar.png";
}

function updateDayNum(infectedNum, sickNum, closedNum) {
  slots = closedNum;
  headerInfectedNum.innerHTML = infectedNum;
  headerSickNum.innerHTML = sickNum;
  lobbyLimit.innerHTML = "Open Spots: " + slots;
}

function convertState(state) {
  headerSection.querySelector("h1").innerHTML = "You are: " + state;
}

function updateNightTimer() {
  var curTime = new Date().getTime();
  timeLeft = Math.ceil((endTime - curTime)/1000);
  nightTimer.innerHTML = timeLeft + (timeLeft == 1 ? " second" : " seconds");
  requestAnimationFrame(updateNightTimer);
}

function startNightTimer(seconds) {
  nightTimer.innerHTML = seconds + " seconds";
  endTime = new Date().getTime() + seconds*1000;
  updateNightTimer();
}

function showNightResults(healthAdded, sickAdded, infectedAdded, slotGains, infected, winCondition) {
  if(winCondition == null) {
    var gainNum = (slotGains == 1) ? " slot!" : " slots!"
    createPopdown("Quarantine gained " + slotGains + gainNum ,"Continue","getNextPopdown('nightResults'," + infected + ")","There were " + healthAdded + " players healed, " + sickAdded + " players got sick, and " + infectedAdded + " players got infected!");
  }
  else if(winCondition == "infect") {
    createPopdown("Infected win the game!","Finish Game","finishGame();", (infectedAdded == 1 ? infectedAdded + " player was infected!" : infectedAdded + " players were infected!"));
    endSection.classList.add("active");
    endSection.querySelector("h1").innerHTML = "Infected players won!";
    hostDay.classList.remove("active");
  }
  else if(winCondition == "healthy") {
    createPopdown("Healthy win the game!","Finish Game","finishGame();", "All infected were isolated!");
    endSection.classList.add("active");
    endSection.querySelector("h1").innerHTML = "Healthy players won!";
    hostDay.classList.remove("active");
  }
}

function finishGame() {
  closePopdown(basicPopdown);
  socket.emit("requestInfected");
  socket.emit("endGameButton");
}
