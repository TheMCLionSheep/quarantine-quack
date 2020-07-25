//node app.js

//heroku login
//heroku git:remote -a shrouded-retreat-94598
//git add .
//git commit -am "Make it better"
//git push heroku master
//heroku logs

var express = require("express");
var app = express();
var serv = require("http").Server(app);

app.get("/",function(req, res) {
  res.sendFile(__dirname + "/client/index.html");
});
app.use("/client",express.static(__dirname + "/client"));

serv.listen(process.env.PORT || 2000);
console.log("Server Started.");

var names = require('./server/first-name.json');

var SOCKET_LIST = {};

var curGameId = 1;

var io = require("socket.io") (serv,{});
io.sockets.on("connection", function(socket) {
  socket.on("login", function(savedID) {
    if(savedID != null && Player.list[savedID] != null) {
      socket.emit("rejoinPopup");
    }
    else {
      socket.id = Math.random();
      SOCKET_LIST[socket.id] = socket;
    }

    socket.on("rejoinGame", function() {
      socket.id = savedID;
      SOCKET_LIST[socket.id] = socket;
      Player.onConnect(socket, Player.list[savedID].name, Player.list[savedID].avatar, true);
      console.log(Player.list[savedID].name + " rejoined the game.");
    });

    socket.on("deleteAccount", function(id) {
      Player.onDisconnect(id);
    })

    socket.on("signInRequest", function(name, avatar) {
      if(Game.list[curGameId].round == 0) {
        if(name.length > 10) {
          socket.emit("signInReject","*Max character length of 10!");
        }
        else {
          var letterNumber = /^[0-9a-zA-Z]+$/;
          if(name.match(letterNumber)) {
            var isValid = true;
            for(var pl in Player.list) {
              if(Player.list[pl].name == name) {
                isValid = false;
              }
            }
            if(isValid) {
              Player.onConnect(socket, name, avatar);
              console.log(name + " joined the game.");
            }
            else {
              socket.emit("signInReject","*Name is already taken!");
            }
          }
          else{
            socket.emit("signInReject","*Only use letters and numbers!");
          }
        }
      }
      else {
        socket.emit("signInReject","*Game already in session!");
      }
    })

    socket.on("disconnect",function() {
      delete SOCKET_LIST[socket.id];
      Player.onDisconnect(socket.id);
    });
  });
});

//Classes
var Game = function(id) {
  var game = {
    id: 0,
    round: 0,
    phase: 0,
    playerList: {},
    vote: null,
    infectedNum: 0,
    sickNum: 0,
    closedNum: 0,
    closedSlots: 0,
    slotGains: 0,
    hostId: 0,
    timeLeft: 0,
    timer: null,
    win: null
  }
  game.startGame = function () {
    //Create Bots
    for(var i = size(game.playerList); i < 10; i++) {
      while(true) {
        var isValid = true;
        var randomName = getRandomName();
        for(var pl in Player.list) {
          if(Player.list[pl].name == randomName) {
            isValid = false;
          }
        }
        if(isValid) {
          break;
        }
      }
      Player.createBot(randomName);
    }

    game.round = 1;
    game.phase = 1;
    game.infectedNum = Math.round(size(game.playerList) / 5);
    game.closedSlots = Math.round(size(game.playerList) / 2);

    //Make infected
    game.playerList = shuffleObject(game.playerList);
    var infectedCounter = 0;
    for(pl in game.playerList) {
      if(infectedCounter < game.infectedNum) {
        console.log(game.playerList[pl].name + " is infected!");
        game.playerList[pl].state = "infected";
        infectedCounter++;
      }
      else {
        break;
      }
    }

    var infectedList = [];
    for(pl in game.playerList) {
      if(game.playerList[pl].state == "infected") {
        infectedList.push(game.playerList[pl].name);
      }
    }

    game.playerList = shuffleObject(game.playerList);

    //Set Time
    game.timer = startTimer(game, 300);

    for(pl in game.playerList) {
      var tempSocket = SOCKET_LIST[pl];
      if(tempSocket != null) {
        tempSocket.emit("moveToDay", game.hostId == pl, game.playerList[pl].state, game.infectedNum, game.sickNum, game.closedSlots, game.round);
        tempSocket.emit("startingPopdown", game.playerList[pl].state == "infected", game.infectedNum);
        tempSocket.emit("saveID", pl);
        if(game.playerList[pl].state == "infected") {
          tempSocket.emit("infectedList", infectedList);
        }
      }
    }
  }
  game.confirmQuarantine = function() {
    game.phase = 2;
    var voteArray = [];
    for(pl in game.playerList) {
      if(!game.playerList[pl].isBot) {
        voteArray.push(game.playerList[pl].name);
      }
    }
    for(pl in game.playerList) {
      var tempSocket = SOCKET_LIST[pl];
      if(tempSocket != null) {
        if(game.hostId == pl) {
          tempSocket.emit("removeHostDay");
        }
        tempSocket.emit("voteForClosed", voteArray);
      }
      if(game.playerList[pl].isBot) {
        game.playerList[pl].agree = game.playerList[pl].getBotVote();
        console.log(game.playerList[pl].name + " has voted");
      }
    }
  }
  game.checkVotes = function() {
    for(pl in game.playerList) {
      if(game.playerList[pl].agree === null) {
        return;
      }
    }

    //All players have voted
    var agreeList = [];
    var disagreeList = [];
    for(pl in game.playerList) {
      if(game.playerList[pl].agree) {
        agreeList.push(game.playerList[pl].name);
      }
      else{
        disagreeList.push(game.playerList[pl].name);
      }
    }
    game.vote = ( disagreeList.length < agreeList.length );

    for(pl in game.playerList) {
      var tempSocket = SOCKET_LIST[pl];
      if(tempSocket != null) {
        tempSocket.emit("voteResults", agreeList, disagreeList, game.hostId == pl, game.vote);
      }
    }
  }
  game.passLeadership = function() {
    game.phase = 1;
    game.resetClosed();
    game.resetVotes();
    Player.updateLobby("stopHost", game.playerList[game.hostId]);
    game.hostId = game.findNextLeader();
    Player.updateLobby("host", game.playerList[game.hostId]);

    for(pl in game.playerList) {
      var tempSocket = SOCKET_LIST[pl];
      if(tempSocket != null) {
        tempSocket.emit("retryDay", pl == game.hostId);
      }
    }
  }
  game.resetClosed = function() {
    for(pl in game.playerList) {
      if(game.playerList[pl].closed) {
        game.playerList[pl].closed = null;
        Player.updateLobby("moveToOpen", game.playerList[pl]);
      }
    }
    game.closedNum = 0;

    clearTimeout(game.timer);
    game.timer = startTimer(game, 300);
  }
  game.adjustSlots = function() {
    game.slotGains += (game.infectedNum + game.sickNum);
    game.closedSlots += (game.slotGains - game.closedNum);
    game.slotGains = 0;
  }
  game.resetVotes = function() {
    game.vote = null;
    for(pl in game.playerList) {
      Player.updateLobby("noVote", game.playerList[pl]);
      game.playerList[pl].agree = null;
    }
  }
  game.findNextLeader = function() {
    var foundHost = false;
    for(pl in game.playerList) {
      if(foundHost && !game.playerList[pl].isBot) {
        console.log(game.playerList[pl].name + " is host");
        return pl;
      }
      if(pl == game.hostId) {
        foundHost = true;
      }
    }

    for(pl in game.playerList) {
      if(!game.playerList[pl].isBot) {
        console.log(game.playerList[pl].name + " is host");
        return pl;
      }
    }
  }
  game.moveToNight = function() {
    game.phase = 3;
    game.resetVotes();
    //Check win condition for healthy
    var checkQuarantine = true;
    for(pl in game.playerList) {
      if((game.playerList[pl].state == "infected" && !game.playerList[pl].closed) || (game.playerList[pl].state != "infected" && game.playerList[pl].closed)) {
        checkQuarantine = false;
      }
    }
    if(checkQuarantine) {
      game.win = "healthy";
    }
    if(game.round >= 2) {
      game.win = "overtime"
    }

    for(pl in game.playerList) {
      var tempSocket = SOCKET_LIST[pl];
      if(tempSocket != null) {
        game.playerList[pl].toInfect = false;
        tempSocket.emit("nightPhase", game.playerList[pl].state == "infected");
      }
      if(game.playerList[pl].isBot && !game.playerList[pl].closed) {
        game.playerList[pl].toInfect = game.playerList[pl].getBotInfect();
      }
    }
    clearTimeout(game.timer);

    game.timer = startTimer(game, 20);
  }
  game.infectAttempt = function() {
    var sickAdded = 0;
    var healthyAdded = 0;
    var infectedAdded = 0;
    for(pl in game.playerList) {
      //If player is sick, heal or infect
      if(game.playerList[pl].state == "sick") {
        //If in quarantine
        if(game.playerList[pl].closed) {
          game.playerList[pl].state = "healthy";
          console.log(game.playerList[pl].name + " is healthy!");
          healthyAdded++;
          game.sickNum--;
          game.slotGains++;
        }
        //If in open
        else{
          game.playerList[pl].state = "new";
          console.log(game.playerList[pl].name + " is infected!");
          infectedAdded++;
          game.infectedNum++;
          game.sickNum--;
        }
      }
    }
    for(pl in game.playerList) {
      //If infected, in the open, and has chosen
      if(game.playerList[pl].state == "infected" && !game.playerList[pl].closed && game.playerList[pl].toInfect) {
        var tempSocket = SOCKET_LIST[pl];
        if(tempSocket != null) {
          var pack = {
            type: "stopChosen",
            name: game.playerList[pl].toInfect
          };
          tempSocket.emit("playerLobby", pack);
        }

        var infectedPlayer = Player.findPlayerId(game.playerList[pl].toInfect);
        if(infectedPlayer.state == "healthy") {
          infectedPlayer.state = "sick";
          console.log(infectedPlayer.name + " is sick!");
          sickAdded++;
          game.sickNum++;
        }
      }
    }
    return [healthyAdded,sickAdded,infectedAdded];
  }
  game.moveToDay = function() {
    var infectResult = game.infectAttempt();

    //Reset for next round
    game.round++;
    game.phase = 1;
    game.adjustSlots();
    game.resetClosed();
    Player.updateLobby("stopHost", game.playerList[game.hostId]);
    game.hostId = game.findNextLeader();
    Player.updateLobby("host", game.playerList[game.hostId]);

    if(2*game.infectedNum >= size(game.playerList)) {
      //Win state for infected
      game.win = "infect";
    }

    var infectedList = [];
    var sickList = [];
    for(pl in game.playerList) {
      if(game.playerList[pl].state == "infected" || game.playerList[pl].state == "new") {
        infectedList.push(game.playerList[pl].name);
      }
      if(game.playerList[pl].state == "sick") {
        sickList.push(game.playerList[pl].name);
      }
    }

    for(pl in game.playerList) {
      var tempSocket = SOCKET_LIST[pl];
      if(tempSocket != null) {
        tempSocket.emit("moveToDay", game.hostId == pl, game.playerList[pl].state, game.infectedNum, game.sickNum, game.closedSlots, game.round);
        tempSocket.emit("nightResults", infectResult[0], infectResult[1], infectResult[2], game.slotGains, game.playerList[pl].state == "new", game.win);
        if(game.playerList[pl].state == "new") {
          game.playerList[pl].state = "infected";
        }
        if(game.playerList[pl].state == "infected") {
          tempSocket.emit("infectedList", infectedList);
          game.playerList[pl].toInfect = false;
        }
      }
    }
  }
  game.endGame = function() {
    curGameId++;
    new Game(curGameId);
    for(pl in game.playerList) {
      var tempSocket = SOCKET_LIST[pl];
      var player = game.playerList[pl];
      if(tempSocket != null) {
        tempSocket.emit("resetGame");
        player.newGame(curGameId);
      }
    }

    for(pl in game.playerList) {
      var tempSocket = SOCKET_LIST[pl];
      if(tempSocket != null) {
        Player.loadLobby(tempSocket,true);
      }
    }
  }
  Game.list[id] = game;
  return game;
}
Game.list = {};
new Game(curGameId);

var Player = function(id, name, avatar, game, bot = false) {
  var self = {
    x:250,
    y:250,
    id: id,
    name: name,
    avatar: avatar,
    online: true,
    state: "healthy",
    closed: false,
    agree: null,
    toInfect: false,
    gameId: game,
    isBot: bot
  }
  self.newGame = function(gameId) {
    self.state = "healthy";
    self.closed = false;
    self.agree = null;
    self.toInfect = null;
    self.gameId = gameId;
    Game.list[gameId].playerList[id] = self;
  }
  self.getBotVote = function() {
    return (Math.random() < 0.7 ? true : false);
  }
  self.getBotInfect = function() {
    var curGame = Game.list[self.gameId];
    var potentialList = [];
    for(pl in curGame.playerList) {
      if(!curGame.playerList[pl].closed && curGame.playerList[pl].state == "healthy") {
        potentialList.push(curGame.playerList[pl].name);
      }
    }
    if(potentialList.length == 0) {
      return false;
    }
    else {
      return potentialList[(potentialList.length * Math.random() << 0)];
    }
  }
  Player.list[id] = self;
  Game.list[self.gameId].playerList[id] = self;
  return self;
}
Player.list = {};
Player.onConnect = function(socket, name, avatar, returningPlayer = false) {
  //Creating player
  if(returningPlayer) {
    var player = Player.list[socket.id];
  }
  else {
    var player = Player(socket.id, name, avatar, curGameId);
  }

  socket.emit("joinGame", Game.list[player.gameId].hostId != 0, Game.list[player.gameId].round != 0);

  //Loading lobby
  if(returningPlayer) {
    player.online = true;
    player.isBot = false;
    Player.loadLobby(socket, true);
    Player.rejoinLoad(socket);
  }
  else {
    Player.loadLobby(socket, false);
    Player.updateLobby("add", player);
  }

  //Sockets
  socket.on("updateLobby", function(actionType, name) {
    var curGame = Game.list[player.gameId];
    if(actionType == "moveToClosed" || actionType == "moveToOpen") {
      if(curGame.round != 0 && curGame.hostId == player.id && curGame.phase == 1 && curGame.win == null) {
        if(actionType == "moveToClosed" && curGame.closedNum < curGame.closedSlots) {
          curGame.closedNum++;
          var pl = Player.findPlayerId(name);
          pl.closed = (actionType == "moveToClosed" ? true : false);
          Player.updateLobby(actionType, pl);
        }
        else if(actionType == "moveToOpen") {
          curGame.closedNum--;
          var pl = Player.findPlayerId(name);
          pl.closed = (actionType == "moveToClosed" ? true : false);
          Player.updateLobby(actionType, pl);
        }
      }
    }
  });

  socket.on("becomeHost", function(become) {
    var curGame = Game.list[player.gameId];
    if(curGame.hostId == 0 && become) {
      curGame.hostId = player.id;
      Player.updateLobby("host", player, true);
      socket.emit("becomeHost", true);
    }
    else if(curGame.hostId == player.id && !become) {
      curGame.hostId = 0;
      Player.updateLobby("stopHost", player, true);
      socket.emit("becomeHost", false);
    }
  });

  socket.on("startGame", function() {
    var curGame = Game.list[player.gameId];
    if(curGame.hostId == player.id) {
      curGame.startGame();
    }
  });

  //Day
  socket.on("confirmQuarantine", function() {
    var curGame = Game.list[player.gameId];
    if(curGame.hostId == player.id && curGame.phase == 1) {
      curGame.confirmQuarantine();
    }
  });

  socket.on("voteDecision", function(decision) {
    var curGame = Game.list[player.gameId];
    if(curGame.phase == 2 && player.agree === null) {
      player.agree = decision;
      console.log(player.name + " has voted");
      socket.emit("finishedVoting");
      Player.updateLobby("voteDone", player);
      curGame.checkVotes();
    }
  });

  socket.on("moveToNight", function() {
    var curGame = Game.list[player.gameId];
    if(curGame.hostId == player.id && curGame.phase == 2 && curGame.vote == true) {
      socket.emit("removeHostVote");
      curGame.moveToNight();
    }
  });
  socket.on("passLeadership", function() {
    var curGame = Game.list[player.gameId];
    if(curGame.hostId == player.id && curGame.phase == 2 && curGame.vote == false) {
      socket.emit("removeHostVote");
      curGame.passLeadership();
    }
  });

  //Night
  socket.on("infectPlayer", function(name) {
    var curGame = Game.list[player.gameId];
    if(curGame.phase == 3 && player.state == "infected") {
      var plInfect = Player.findPlayerId(name);
      if(plInfect != player && !plInfect.closed && plInfect.state != "infected" && !player.closed) {
        console.log("Infecting " + name);
        if(player.toInfect) {
          var pack = {
            type: "stopChosen",
            name: player.toInfect
          };
          socket.emit("playerLobby", pack);
        }
        player.toInfect = name;
        var pack = {
          type: "chosen",
          name: name
        };
        socket.emit("playerLobby", pack);
      }
    }
  });

  //End game
  socket.on("requestInfected", function() {
    var curGame = Game.list[player.gameId];
    if(player.state == "infected" || curGame.win != null) {
      var infectedList = [];
      for(pl in curGame.playerList) {
        if(curGame.playerList[pl].state == "infected" || curGame.playerList[pl].state == "new") {
          infectedList.push(curGame.playerList[pl].name);
        }
      }
      socket.emit("infectedList", infectedList);
    }
  });

  socket.on("endGameButton", function() {
    var curGame = Game.list[player.gameId];
    if(player.id == curGame.hostId && curGame.win != null) {
      socket.emit("endGameButton");
    }
  })

  socket.on("endGame", function() {
    var curGame = Game.list[player.gameId];
    if(player.id == curGame.hostId && curGame.win != null) {
      curGame.endGame();
    }
  });
}
Player.findPlayerId = function(name) {
  for(pl in Player.list) {
    if( Player.list[pl].name == name) {
      return Player.list[pl];
    }
  }
  return null;
}
Player.createBot = function(name) {
  var player = Player(Math.random(), name, -1, curGameId, true);
  Player.updateLobby("add", player);
}
Player.loadLobby = function(socket, showSelf) {
  for(var pl in Game.list[Player.list[socket.id].gameId].playerList) {
    if(pl != socket.id || showSelf) {
      var pack = {
        type: "add",
        name: Player.list[pl].name,
        avatar: Player.list[pl].avatar
      };
      if(Player.list[pl].online || true) {
        socket.emit("playerLobby",pack);
        var curGame = Game.list[Player.list[pl].gameId];
        if(curGame.hostId == pl) {
          pack.type = "host";
          socket.emit("playerLobby",pack);
        }
        if(curGame.playerList[pl].closed) {
          pack.type = "moveToClosed";
          socket.emit("playerLobby",pack);
        }
        if(curGame.playerList[socket.id].state == "infected" && curGame.playerList[pl].state == "infected") {
          pack.type = "infected";
          socket.emit("playerLobby",pack);
        }
        if(curGame.phase == 2 && curGame.vote != null) {
          if(curGame.playerList[pl].agree === true) {
            pack.type = "voteAgree";
          }
          else if(curGame.playerList[pl].agree === false) {
            pack.type = "voteDisagree";
          }
          else {
            pack.type = "noVote";
          }
          socket.emit("playerLobby",pack);
        }
      }
      else {
        pack.type = "gray";
        socket.emit("playerLobby",pack);
      }
    }
  }
}
Player.updateLobby = function(type, player, isHost) {
  var pack = {
    type: type,
    name: player.name,
  };
  for(var pl in Player.list) {
    if(type == "remove" && player.id == pl) {
      continue;
    }
    if(type == "add") {
      pack.avatar = player.avatar;
    }
    var tempSocket = SOCKET_LIST[pl];
    if(tempSocket != null) {
      tempSocket.emit("playerLobby",pack);
      if(isHost) {
        tempSocket.emit("updateHost",pack);
      }
    }
  }
}
Player.rejoinLoad = function(socket) {
  var curGame = Game.list[Player.list[socket.id].gameId];
  var player = curGame.playerList[socket.id];
  socket.emit("moveToDay",curGame.hostId == player.id, player.state, curGame.infectedNum, curGame.sickNum, curGame.closedSlots, curGame.round);
  if(curGame.phase == 2) {
    if(curGame.hostId == player.id) {
      socket.emit("removeHostDay");
    }
    if(player.agree === null) {
      socket.emit("voteForClosed");
    }
    if(curGame.vote != null) {
      var agreeList = [];
      var disagreeList = [];
      for(pl in curGame.playerList) {
        if(curGame.playerList[pl].agree) {
          agreeList.push(curGame.playerList[pl].name);
        }
        else{
          disagreeList.push(curGame.playerList[pl].name);
        }
      }
      socket.emit("voteResults", agreeList, disagreeList, curGame.hostId == player.id, curGame.vote);
    }
  }
  else if(curGame.phase == 3) {
    if(curGame.hostId == player.id) {
      socket.emit("removeHostDay");
    }
    socket.emit("nightPhase", player.state == "infected");
  }
}
Player.onDisconnect = function(socketId) {
  if(Player.list[socketId] != null) {
    console.log(Player.list[socketId].name + " left the game.");
    var curGame = Game.list[Player.list[socketId].gameId];
    if(curGame.round == 0) {
      Player.updateLobby("remove", Player.list[socketId]);
      if(curGame.hostId == socketId) {
        curGame.hostId = 0;
        Player.updateLobby("stopHost", Player.list[socketId].name, true);
      }
      delete curGame.playerList[socketId];
      delete Player.list[socketId];
    }
    else {
      Player.list[socketId].online = false;
      Player.list[socketId].isBot = true;
    }
  }
}

function size(obj) {
  var size = 0;
  for(var key in obj) {
    size++;
  }
  return size;
}

function shuffleObject(object) {
  var array = Object.entries(object);
  array = shuffle(array);
  return Object.fromEntries(array);
}

function shuffle(a) {
  var j, x, i;
  for (i = a.length - 1; i > 0; i--) {
    j = Math.floor(Math.random() * (i + 1));
    x = a[i];
    a[i] = a[j];
    a[j] = x;
  }
  return a;
}

function getRandomName() {
  var name = "Bot" + names[Math.floor(Math.random() * names.length)];
  return name.substring(0, Math.min(name.length, 10));
}

function startTimer(game, time) {
  game.timeEnd = (new Date().getTime() + time*1000);
  var timer = setTimeout(function() {
    if(game.phase == 3) {
      game.moveToDay();
    }
    else if(game.phase == 1) {
      game.confirmQuarantine();
    }
  },(time*1000));
  return timer;
}
