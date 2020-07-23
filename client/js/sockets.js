const socket = io();

socket.on("connect",function(){
  socket.emit("login",localStorage.getItem("playerID"));
});

socket.on("disconnect", function() {
  scrim.classList.add("active");
  disconnectSection.classList.add("active");
  setTimeout(function() {disconnectSection.querySelector(".popdown").classList.add("active");},1);
});

socket.on("rejoinPopup", function() {
  var scrim = document.querySelector("#scrim");
  var rejoinSection = document.querySelector("#rejoin");
  scrim.classList.add("active");
  rejoinSection.classList.add("active");
  setTimeout(function() {rejoinSection.querySelector(".popdown").classList.add("active");},1)
})

socket.on("signInReject", function(reason) {
  signInError.innerHTML = reason;
  signInError.classList.add("active");
});

socket.on("joinGame", function(host, started) {
  playSound(dayMusic, true);
  signInSection.classList.remove("active");
  headerSection.classList.add("active");
  lobbySection.classList.add("active");
  hostSection.classList.add("active");
  if(!started && !host) {
    hostBecome.classList.add("active");
  }
  // if(host) {
  //   hostBtn.classList.remove("active");
  // }
  // else {
  //   hostBtn.classList.add("active");
  // }
  // if(started) {
  //   waitingInfo.innerHTML = "Game in progress...";
  // }
  //curButton = null;
});

socket.on("startingPopdown", function(isInfected, infectedNum) {
  createPopdown("A virus has started!","Continue","getNextPopdown('start',"+isInfected+")",infectedNum + " people are infected!");
});

socket.on("saveID", function(id) {
  localStorage.setItem("playerID", id);
});

//Lobby
socket.on("moveToDay", function(isHost, healthState, infectedNum, sickNum, closedNum) {
  playSound(dayMusic, true);
  if(isHost) {
    hostStart.classList.remove("active");
    hostDay.classList.add("active");
  }
  convertState(healthState == "sick" ? "healthy" : healthState);
  updateDayNum(infectedNum, sickNum, closedNum);
});

socket.on("playerLobby", function(packet) {
  editPlayerList(packet.type, packet.name);
});

socket.on("retryDay", function(isHost) {
  voteResults.classList.remove("active");
  if(isHost) {
    hostDay.classList.add("active");
  }
});

//Host
socket.on("updateHost", function (packet) {
  var playerButton = document.querySelector("#open-list-name--" + name);
  if(packet.type == "host") {
    hostBecome.classList.remove("active");
  }
  else if(packet.type == "stopHost") {
    hostBecome.classList.add("active");
  }
});

socket.on("becomeHost", function(become) {
  if(become) {
    hostStart.classList.add("active");
  }
  else {
    hostStart.classList.remove("active");
  }
});

//Vote
socket.on("removeHostDay", function() {
  hostDay.classList.remove("active");
});

socket.on("voteForClosed", function() {
  voteSection.classList.add("active");
  votePoll.classList.add("active");
});

socket.on("finishedVoting", function() {
  votePoll.classList.remove("active");
})

socket.on("voteResults", function(agreeList, disagreeList, isHost, voteResult) {
  voteResults.classList.add("active");
  for(var i = 0; i < agreeList.length; i++) {
    editPlayerList("voteAgree", agreeList[i]);
  }
  for(var i = 0; i < disagreeList.length; i++) {
    editPlayerList("voteDisagree", disagreeList[i]);
  }
  voteResultsAgree.querySelector("h2").innerHTML = agreeList.length;
  voteResultsDisagree.querySelector("h2").innerHTML = disagreeList.length;

  if(voteResult) {
    voteResultsInfo.innerHTML = "The Quarantine is accepted!";
    if(isHost) {
      hostMove.classList.add("active");
    }
  }
  else {
    voteResultsInfo.innerHTML = "The Quarantine is denied!";
    if(isHost) {
      hostPass.classList.add("active");
    }
  }
});

socket.on("removeHostVote", function() {
  hostPass.classList.remove("active");
  hostMove.classList.remove("active");
});

//Night
socket.on("nightPhase", function(isInfected) {
  playSound(nightMusic, true);
  voteSection.classList.remove("active");
  voteResults.classList.remove("active");
  nightSection.classList.add("active");
  createPopdown("It's night time!","Continue","closePopdown(this.parentNode)","Any infected that aren't in quarantine can infect players in the open.");
  if(isInfected) {
    nightInfected.classList.add("active");
    startNightTimer(20);
  }
});
socket.on("nightResults", function(healthAdded, sickAdded, infectedAdded, slotGains, infected, winCondition) {
  nightSection.classList.remove("active");
  showNightResults(healthAdded, sickAdded, infectedAdded, slotGains, infected, winCondition);
});

//End game
socket.on("infectedList", function(infectedList, sickList) {
  for(var i = 0; i < infectedList.length; i++) {
    editPlayerList("infected", infectedList[i]);
  }
});
socket.on("endGameButton", function() {
  hostEndGame.classList.add("active");
})
