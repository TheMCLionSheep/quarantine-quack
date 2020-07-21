//node app.js

//heroku login
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

var SOCKET_LIST = {};

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
      Player.onConnect(socket, Player.list[savedID].name, true);
      console.log(Player.list[savedID].name + " rejoined the game.");
    });

    socket.on("deleteAccount", function(id) {
      Player.onDisconnect(id);
    })

    socket.on("signInRequest", function(name) {
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
            Player.onConnect(socket, name);
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
    hostId: 0,
    win: null
  }
  game.startGame = function () {
    //Create Bots
    for(var i = size(game.playerList); i < 10; i++) {
      Player.createBot("Bot" + i);
    }

    game.round = 1;
    game.phase = 1;
    game.infectedNum = Math.round(size(game.playerList) / 5);

    //Make infected
    game.playerList = shuffleObject(game.playerList);
    var infectedCounter = 0;
    for(pl in game.playerList) {
      if(infectedCounter < game.infectedNum) {
        console.log(game.playerList[pl].name + " is infected!");
        game.playerList[pl].infected = true;
        infectedCounter++;
      }
      else {
        break;
      }
    }

    var infectedList = [];
    for(pl in game.playerList) {
      if(game.playerList[pl].infected) {
        infectedList.push(game.playerList[pl].name);
      }
    }

    game.playerList = shuffleObject(game.playerList);

    for(pl in game.playerList) {
      var tempSocket = SOCKET_LIST[pl];
      if(tempSocket != null) {
        tempSocket.emit("moveToDay", game.hostId == pl, game.playerList[pl].infected, game.infectedNum);
        tempSocket.emit("startingPopdown", game.playerList[pl].infected, game.infectedNum);
        tempSocket.emit("saveID", pl);
        if(game.playerList[pl].infected) {
          tempSocket.emit("infectedList", infectedList);
        }
      }
    }
  }
  game.confirmQuarantine = function() {
    game.phase = 2;
    for(pl in game.playerList) {
      var tempSocket = SOCKET_LIST[pl];
      if(tempSocket != null) {
        tempSocket.emit("voteForClosed");
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
    game.resetRound();
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
  game.resetRound = function() {
    game.vote = null;
    for(pl in game.playerList) {
      game.playerList[pl].agree = null;
      Player.updateLobby("noVote", game.playerList[pl]);
      if(game.playerList[pl].closed) {
        game.playerList[pl].closed = null;
        Player.updateLobby("moveToOpen", game.playerList[pl]);
      }
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
    var checkQuarantine = true;
    for(pl in game.playerList) {
      if((game.playerList[pl].infected && !game.playerList[pl].closed) || (!game.playerList[pl].infected && game.playerList[pl].closed)) {
        checkQuarantine = false;
      }
    }
    if(checkQuarantine) {
      game.win = "healthy";
    }
    for(pl in game.playerList) {
      var tempSocket = SOCKET_LIST[pl];
      if(tempSocket != null) {
        tempSocket.emit("nightPhase", game.playerList[pl].infected);
      }
      if(game.playerList[pl].isBot) {
        game.playerList[pl].toInfect = game.playerList[pl].getBotInfect();
      }
    }
    game.checkNightFinished();
  }
  game.checkNightFinished = function() {
    for(pl in game.playerList) {
      if(game.playerList[pl].infected && game.playerList[pl].toInfect === null) {
        return;
      }
    }

    //All infected have chosen
    game.moveToDay();
  }
  game.infectAttempt = function() {
    var infectedAdded = 0;
    var infectClosed = 0;
    for(pl in game.playerList) {
      if(game.playerList[pl].infected === true) {
        //In Quarrantine
        if(game.playerList[pl].closed) {
          var infectRate = 0.5;
          infectClosed++;
        }
        //In Open
        else {
          var infectRate = 0.25;
        }

        console.log(game.playerList[pl].toInfect);

        if(game.playerList[pl].toInfect && Math.random() < infectRate) {
          var infectedPlayer = Player.findPlayerId(game.playerList[pl].toInfect);
          if(infectedPlayer.infected === false) {
            infectedPlayer.infected = "new";
            console.log(infectedPlayer.name + " is infected");
            infectedAdded++;
            game.infectedNum++;
          }
        }
      }
      game.playerList[pl].toInfect = null;
    }
    return [infectedAdded,infectClosed];
  }
  game.moveToDay = function() {
    var infectResult = game.infectAttempt();
    game.round++;
    game.phase = 1;
    game.resetRound();
    Player.updateLobby("stopHost", game.playerList[game.hostId]);
    game.hostId = game.findNextLeader();
    Player.updateLobby("host", game.playerList[game.hostId]);
    if(2*game.infectedNum >= size(game.playerList)) {
      //Win state for infected
      game.win = "infect";
    }
    var infectedList = [];
    for(pl in game.playerList) {
      if(game.playerList[pl].infected) {
        infectedList.push(game.playerList[pl].name);
      }
    }

    for(pl in game.playerList) {
      var tempSocket = SOCKET_LIST[pl];
      if(tempSocket != null) {
        tempSocket.emit("moveToDay", game.hostId == pl, game.playerList[pl].infected, game.infectedNum);
        tempSocket.emit("nightResults", infectResult[0], infectResult[1], game.playerList[pl].infected == "new", game.win);
        if(game.playerList[pl].infected == "new") {
          game.playerList[pl].infected = true;
        }
        if(game.playerList[pl].infected) {
          tempSocket.emit("infectedList", infectedList);
        }
      }
    }
  }
  Game.list[id] = game;
  return game;
}
Game.list = {};
new Game(1);

var Player = function(id, name, bot = false) {
  var self = {
    x:250,
    y:250,
    id: id,
    name: name,
    online: true,
    infected: false,
    closed: false,
    agree: null,
    toInfect: null,
    gameId: 1,
    isBot: bot
  }
  self.getBotVote = function() {
    return (Math.random() < 0.8 ? true : false);
  }
  self.getBotInfect = function() {
    var curGame = Game.list[self.gameId];
    var potentialList = []
    for(pl in curGame.playerList) {
      if(curGame.playerList[pl].closed == self.closed && !curGame.playerList[pl].infected) {
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
Player.onConnect = function(socket, name, returningPlayer = false) {
  //Creating player
  if(returningPlayer) {
    var player = Player.list[socket.id];
  }
  else {
    var player = Player(socket.id, name);
  }
  var curGame = Game.list[player.gameId];

  socket.emit("joinGame", curGame.hostId != 0, curGame.round != 0);

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
    if(actionType == "moveToClosed" || actionType == "moveToOpen") {
      if(curGame.round != 0 && curGame.hostId == player.id && curGame.phase == 1) {
        var pl = Player.findPlayerId(name);
        pl.closed = (actionType == "moveToClosed" ? true : false);
        Player.updateLobby(actionType, pl);
      }
    }
  });

  socket.on("becomeHost", function(become) {
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
    if(curGame.hostId == player.id) {
      curGame.startGame();
    }
  });

  //Day
  socket.on("confirmQuarantine", function() {
    if(curGame.hostId == player.id && curGame.phase == 1) {
      socket.emit("removeHostDay");
      curGame.confirmQuarantine();
    }
  });

  socket.on("voteDecision", function(decision) {
    if(curGame.phase == 2 && player.agree === null) {
      player.agree = decision;
      console.log(player.name + " has voted");
      socket.emit("finishedVoting");
      curGame.checkVotes();
    }
  });

  socket.on("moveToNight", function() {
    if(curGame.hostId == player.id && curGame.phase == 2 && curGame.vote == true) {
      socket.emit("removeHostVote");
      curGame.moveToNight();
    }
  });
  socket.on("passLeadership", function() {
    if(curGame.hostId == player.id && curGame.phase == 2 && curGame.vote == false) {
      socket.emit("removeHostVote");
      curGame.passLeadership();
    }
  });

  //Night
  socket.on("infectPlayer", function(name) {
    if(curGame.phase == 3 && player.infected) {
      if(!name || (name != player.name && Player.findPlayerId(name).closed == player.closed)) {
        console.log("Infecting " + name);
        player.toInfect = name;
        socket.emit("hideInfect");
        curGame.checkNightFinished();
      }
    }
  });

  //End game
  socket.on("requestInfected", function() {
    if(player.infected || curGame.win != null) {
      var infectedList = [];
      for(pl in curGame.playerList) {
        if(curGame.playerList[pl].infected) {
          infectedList.push(curGame.playerList[pl].name);
        }
      }
      socket.emit("infectedList", infectedList);
    }
  });

  socket.on("endGameButton", function() {
    if(player.id == curGame.hostId && curGame.win != null) {
      socket.emit("endGame");
    }
  })

  socket.on("endGame", function() {
    die;
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
  var player = Player(Math.random(), name, true);
  Player.updateLobby("add", player);
}
Player.loadLobby = function(socket, showSelf) {
  for(var pl in Player.list) {
    if(pl != socket.id || showSelf) {
      var pack = {
        type: "add",
        name: Player.list[pl].name
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
        if(curGame.playerList[socket.id].infected && curGame.playerList[pl].infected) {
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
    name: player.name
  };
  for(var pl in Player.list) {
    if(type == "remove" && player.id == pl) {
      continue;
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
  socket.emit("moveToDay",curGame.hostId == player.id, player.infected, curGame.infectedNum);
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
    socket.emit("nightPhase", player.infected);
    if(player.toInfect !== null) {
      socket.emit("hideInfect");
    }
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
