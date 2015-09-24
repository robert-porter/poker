var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io').listen(http);
var fs = require('fs');
var HighCard = require('./high_card');

app.use(express.static(__dirname + '/../../build'));
app.use(express.static(__dirname + '/public'));

app.get('/', function(req, res){
    console.log('requested page');
    fs.readFile(__dirname + '/../client/index.html', function(err,data) {
        if(err)
            console.log('file error' + err);
        res.writeHead(200, {"Content-Type": "text/html"});
        res.end(data);
    });
});



HighCard.init(io, 5, 20, 200, 1, 5, 10);

app.get('/game', function(req, res) {
    var numPlayers = HighCard.players.length;
    var ante = HighCard.ante;
    res.json({numSeats: 5, minBuyIn: 20, maxBuyIn: 200, ante: ante, numPlayers: numPlayers});
});

http.listen(3000, function(){
    console.log('listening on *:3000');
});


