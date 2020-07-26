//Variables
var endTime = 0;
var slots = 0;
var muted = false;
var chosenAvatar = -1;

//Sounds
var nightMusic;
var dayMusic;
var buttonPress;

//Misc
var scrim;
var basicPopdown;

//Sign-in
var signInSection;
var signInInput;
var signInError;
var signInButton;
var avatarSelect;

var rejoinSection;

var disconnectSection;

var tutorialSection;

//Header
var headerSection;
var headerSickNum;
var headerInfectedNum;
var headerRound;
var headerTimer;
var headerCure;
var muteButton;

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
var nightResearch;
var nightResearchInfect;
var sabotageButton;

//End Game
var endSection;

function loadGame() {
  variableAssignment();
  addEventListeners();
  loadSounds();
  populateAvatars();
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
  avatarSelect = document.querySelector("#avatar-select");

  rejoinSection = document.querySelector("#rejoin");

  disconnectSection = document.querySelector("#disconnect");

  tutorialSection = document.querySelector("#tutorial");

  //Header
  headerSection = document.querySelector("#header");
  headerSickNum = document.querySelector("#header__sick-num");
  headerInfectedNum = document.querySelector("#header__infected-num");
  headerRound = document.querySelector("#header__round");
  headerTimer = document.querySelector("#header__timer");
  headerCure = document.querySelector("#header__cure");
  muteButton = document.querySelector("#mute-button");

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
  nightResearch = document.querySelector("#night__research");
  nightResearchInfect = document.querySelector("#night__research--infected");
  sabotageButton = document.querySelector("#sabotage-button");

  //End game
  endSection = document.querySelector("#end");
}

function addEventListeners() {
  signInSection.addEventListener("keyup", function(event) {
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
  socket.emit("signInRequest",signInInput.value,chosenAvatar);
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
    basicPopdown.querySelector("button").setAttribute("onclick","playSound(buttonPress); " + onclick);
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

function populateAvatars() {
  for(var i = 0; i < 25; i++) {
    var button = document.createElement("button");
    var image = document.createElement("img");

    button.setAttribute("onclick","playSound(buttonPress);  choseAvatar(" + i + ")");
    image.setAttribute("src",getIconSrc(i));

    button.appendChild(image);
    avatarSelect.appendChild(button);
  }
  choseAvatar(0);
}

function choseAvatar(avatar) {
  var avatarButtons = avatarSelect.getElementsByTagName("button");
  //Remove previous
  if(chosenAvatar != -1) {
    var select = avatarButtons[chosenAvatar].querySelector(".selected");
    avatarButtons[chosenAvatar].removeChild(select);
  }
  var div = document.createElement("div");
  div.setAttribute("class","selected");
  avatarButtons[avatar].appendChild(div);
  chosenAvatar = avatar;
}

//Sounds
function loadSounds() {
  nightMusic = createAudio("/client/audio/Dark-Things-2-V001.mp3");
  nightMusic.playbackRate = 1.5;
  dayMusic = createAudio("/client/audio/City-of-Dread-Looping.mp3");
  dayMusic.addEventListener("ended", function() {
    dayMusic.play();
  });
  buttonPress = createAudio("/client/audio/button-click.mp3");
}

function createAudio(src) {
  var audio = document.createElement("audio");
  audio.src = src;
  return audio;
}

function playSound(sound, isMusic = false) {
  if(isMusic) {
    nightMusic.pause();
    dayMusic.pause();
  }
  sound.currentTime = 0;
  sound.play();
}

function toggleMute() {
  if(muted) {
    dayMusic.muted = false;
    nightMusic.muted = false;
    buttonPress.muted = false;
    muteButton.classList.remove("muted");
    muted = false;
  }
  else {
    dayMusic.muted = true;
    nightMusic.muted = true;
    buttonPress.muted = true;
    muteButton.classList.add("muted");
    muted = true;
  }
}

//Tutorial
function showTutorial() {
  tutorialSection.classList.add("active");
  signInSection.classList.remove("active");
}

function leaveTutorial() {
  tutorialSection.classList.remove("active");
  signInSection.classList.add("active");
}

//Lobby
function editPlayerList(actionType, name, icon = null) {
  if(actionType == "add") {
    var playerButton = document.createElement("button");
    var playerIcon = document.createElement("img");
    var playerName = document.createElement("p");

    playerButton.setAttribute("onclick","playSound(buttonPress);  socket.emit('updateLobby','moveToClosed','" + name + "'); socket.emit('infectPlayer','" + name + "')");
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
      playerButton.setAttribute("onclick","playSound(buttonPress);  socket.emit('updateLobby','moveToOpen','" + name + "'); socket.emit('infectPlayer','" + name + "')");
      lobbyClosedList.appendChild(playerButton);
      slots--;
      lobbyLimit.innerHTML = "Open Spots: " + slots;
    }
    else if(actionType == "moveToOpen") {
      playerButton.setAttribute("onclick","playSound(buttonPress);  socket.emit('updateLobby','moveToClosed','" + name + "'); socket.emit('infectPlayer','" + name + "')");
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
    else if(actionType == "cure") {
      adjustStatusIcon(true, "cure", playerButton);
    }
    else if(actionType == "notCure") {
      adjustStatusIcon(false, "cure", playerButton);
    }
    else if(actionType == "voteWait") {
      adjustStatusIcon(true, "vote", playerButton);
    }
    else if(actionType == "voteDone") {
      adjustStatusIcon(false, "vote", playerButton);
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
  if(icon == -1) {
    return "/client/images/characters/bot.png";
  }
  else {
    return "/client/images/characters/character" + icon + ".png";
  }
}

function updateDayNum(infectedNum, sickNum, closedNum, roundNum, cureNum) {
  slots = closedNum;
  headerInfectedNum.innerHTML = infectedNum;
  headerSickNum.innerHTML = sickNum;
  lobbyLimit.innerHTML = "Open Spots: " + slots;
  headerRound.innerHTML = "Round " + roundNum;
  headerCure.innerHTML = "Cure: " + cureNum + "/5";
}

function convertState(state) {
  headerSection.querySelector("h1").innerHTML = "You are: " + state;
}

function updateTimer() {
  var curTime = new Date().getTime();
  timeLeft = Math.ceil((endTime - curTime)/1000);
  if(timeLeft < 0) {
    timeLeft = 0;
  }
  var seconds = (timeLeft%60)
  headerTimer.innerHTML = Math.floor(timeLeft/60) + ":" + (seconds < 10 ? "0" + seconds : seconds);
  if(curTime < endTime) {
    requestAnimationFrame(updateTimer);
  }
}

function startTimer(seconds) {
  var time = new Date().getTime();
  if(endTime < time) {
    endTime = time + seconds*1000;
    updateTimer();
  }
  else {
    endTime = time + seconds*1000;
  }
}

function selectSabotage(selected) {
  if(selected) {
    if(sabotageButton.querySelector(".chosen") == null) {
      var span = document.createElement("span");
      span.setAttribute("class","chosen");

      sabotageButton.appendChild(span);
    }
  }
  else {
    var chosen = sabotageButton.querySelector(".chosen");
    if(chosen != null) {
      sabotageButton.removeChild(chosen);
    }
  }
}

function showNightResults(healthAdded, sickAdded, infectedAdded, slotGains, infected, cureAttempt, winCondition) {
  var cureNews = "";
  if(cureAttempt == true) {
    var cureNews = " The cure has developed!";
  }
  else if(cureAttempt == false) {
    var cureNews = " The cure was sabotaged!";
  }
  if(winCondition == null) {
    var gainNum = (slotGains == 1) ? " slot!" : " slots!"
    createPopdown("Quarantine gained " + slotGains + gainNum ,"Continue","getNextPopdown('nightResults'," + infected + ")","There were " + healthAdded + " players healed, " + sickAdded + " players got sick, and " + infectedAdded + " players got infected!" + cureNews);
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
  else if(winCondition == "overtime") {
    createPopdown("Healthy win the game!","Finish Game","finishGame();", "A cure was developed!");
    endSection.classList.add("active");
    endSection.querySelector("h1").innerHTML = "Healthy players won!";
    hostDay.classList.remove("active");
  }
}

function finishGame() {
  closePopdown(basicPopdown);
  startTimer(0);
  socket.emit("requestInfected");
  socket.emit("endGameButton");
}

function resetGame() {
  updateDayNum(0,0,0,0,0);
  convertState("healthy");

  var openChildren = lobbyOpenList.getElementsByTagName('button');
  while(openChildren.length > 0) {
    lobbyOpenList.removeChild(openChildren[0]);
  }
  var closedChildren = lobbyClosedList.getElementsByTagName('button');
  while(closedChildren.length > 0) {
    lobbyClosedList.removeChild(closedChildren[0]);
  }
  hostBecome.classList.add("active");
  hostEndGame.classList.remove("active");
  endSection.classList.remove("active");
  nightInfected.classList.remove("active");
}
