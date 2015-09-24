var chai = require('chai');
var HighCard = require('./../server/high_card');
var expect = chai.expect;
var should = chai.should();
var assert = chai.assert;
var faker = require('faker');
var request = require('request');

var io = require('socket.io-client');
var socketURL = 'http://0.0.0.0:3000';
var options ={
    transports: ['websocket'],
    'force new connection': true
};

function todo() {
    assert(false, "not yet implemented");
}

class Tester {
    constructor() {
        this.players = [];
        this.asserts = {};
        this.responses = {};
    }
    addPlayer(name, buyIn) {
        this.players.push({
            name: name,
            buyIn: buyIn,
            socket: null
        });
    }
    assertAction(player, callback) {
        if(!this.asserts[player])
            this.asserts[player] = [];
        this.asserts[player].push(callback);
    }
    respond(player, callback) {
        if(!this.responses[player])
            this.responses[player] = [];
        this.responses[player].push(callback);
    }

    run() {

    }
    runAux(player) {
        var socket = io.connect(socketURL, options);
        this.players[player].socket = socket;

        socket.on('connect', function() {
            socket.emit('action', {
                type: 'buyIn',
                amount: this.players[player].buyIn,
                name: this.players[player].name
            });
            socket.on('action', function() {

            });
            if(player + 1 >= this.players.length) {

            }
            else {
                runAux(player + 1);
            }
        });

    }
}

describe("HighCard", function() {

    it("/game should describe the game and show open seats", function(done) {
        request("http://localhost:3000/game", function(err, resp, body) {
            assert(!err, err);
            resp.statusCode.should.equal(200);
            body = JSON.parse(body);
            body.numSeats.should.be.a('number');
            body.minBuyIn.should.be.a('number');
            body.maxBuyIn.should.be.a('number');
            body.ante.should.be.a('number');
            body.numPlayers.should.be.a('number');
            done();
        });
    });

    it('should notify players of buy ins', function(done) {

        var buyIns = [100, 100];
        var names = [faker.name.firstName(), faker.name.firstName()];

        var tester = new Tester();
        tester.addPlayer(names[0], buyIns[0]);
        tester.addPlayer(names[1], buyIns[1]);

        tester.assertAction(0, function(action) {
            action.type.should.equal('seat');
            action.name.should.equal(names[0]);
            action.stack.should.equal(buyIns[0]);
            action.seat.should.equal(0);
        });

        tester.run();

        var client1 = io.connect(socketURL, options);



        client1.on('connect', function(){
            client1.emit('action', {
               type: 'buyIn',
               amount: amount,
               name: name
            });
            var client2 = io.connect(socketURL, options);

            client2.on('action', function(action){
                action.type.should.equal('player');
                action.name.should.equal(name);
                action.stack.should.equal(amount);
                done();
                client1.disconnect();
                client2.disconnect();
            });

        });
    });

    it('should send a seat message to the player when they buy in', function(done) {
        var client = io.connect(socketURL, options);

        var amount = 100;
        var name = faker.name.firstName();

        client.on('connect', function(){
            client.emit('action', {
                type: 'buyIn',
                amount: amount,
                name: name
            });
            client.on('action', function(action) {
                action.type.should.equal('seat');
                action.name.should.equal(name);
                action.stack.should.equal(amount);
                action.seat.should.be.a('number');
                client.disconnect();
                done();
            });
        });
    });

    it('should should send the seated players to the player when they buy in', function(done) {
        var client1 = io.connect(socketURL, options);

        var amount1 = 100;
        var name1 = faker.name.firstName();

        var amount2 = 100;
        var name2 = faker.name.firstName();

        client1.on('connect', function(){
            client1.emit('action', {
                type: 'buyIn',
                amount: amount1,
                name: name1
            });
            var client2 = io.connect(socketURL, options);
            client2.emit('action', {
                type: 'buyIn',
                amount: amount1,
                name: name2
            });

            client2.on('action', function (action) {
                if(action.type == 'player' && action.name == name1 && action.stack == amount1) {
                    done();
                    client1.disconnect();
                    client2.disconnect();
                }
            });

        });
    });

    it('should send an error if all the seats are filled', function(done) {
        request("http://localhost:3000/game", function(err, resp, body) {
            var amount = 100;
            var clients = [];
            assert(!err);
            resp.statusCode.should.equal(200);
            body = JSON.parse(body);
            (function addPlayer(numClients) {
                var client = io.connect(socketURL, options);
                clients.push(client);
                client.on('connect', function(){
                    client.emit('action', {
                        type: 'buyIn',
                        amount: amount,
                        name: faker.name.firstName()
                    });
                    if(numClients > body.numSeats) {
                        client.on('action', function (action) {
                            action.type.should.equal('error');
                            for(var i = 0; i < clients.length; i++)
                                clients[i].disconnect();
                            done();
                        });
                    }
                    else {
                        addPlayer(numClients + 1);
                    }
                });
            })(0);
        });
    });

    it('should send an error if the buy in is invalid', function(done) {
        request("http://localhost:3000/game", function(err, resp, body) {
            var clients = [];
            function check(amount, continuation) {

                var client = io.connect(socketURL, options);
                clients.push(client);
                client.on('connect', function () {
                    var name = faker.name.firstName();
                    client.emit('action', {
                        type: 'buyIn',
                        amount: amount,
                        name: name
                    });
                    client.on('action', function (action) {
                        if(action.type == 'quit')
                            return; // we're still an observer, so let the first client quit
                        action.type.should.equal('error');
                        client.disconnect();
                        if(continuation)
                            continuation();
                        else {
                            for(var i = 0; i < clients.length; i++)
                                clients[i].disconnect();
                            done();
                        }
                    });
                });
            }

            check(body.minBuyIn - 1, function() {return check(body.maxBuyIn + 1, null); });

        });
    });

    it('should not start the game until there are at least 2 players', function() {
        todo();
    });

    it('should collect antes when a game starts', function(done) {
        request("http://localhost:3000/game", function(err, resp, body) {
            body = JSON.parse(body);
            var client1 = io.connect(socketURL, options);
            var amount = 100;

            client1.on('connect', function () {

                client1.emit('action', {
                    type: 'buyIn',
                    amount: amount,
                    name: faker.name.firstName()
                });

                var ante1 = false, ante2 = false;

                client1.on('action', function (action) {
                    if(action.type == 'seat') {
                        client1.seat = action.seat;
                    }
                    if (action.type == 'ante') {
                        action.amount.should.equal(body.ante);
                        if(action.seat == client1.seat)
                            ante1 = true;
                        if (ante2) {
                            done();
                            client1.disconnect();
                            client2.disconnect();
                        }
                    }
                });

                var client2 = io.connect(socketURL, options);
                client2.on('connect', function () {
                    client2.emit('action', {
                        type: 'buyIn',
                        amount: amount,
                        name: faker.name.firstName()
                    });

                    client2.on('action', function (action) {
                        if(action.type == 'seat') {
                            client2.seat = action.seat;
                        }
                        if (action.type == 'ante') {
                            action.amount.should.equal(body.ante);
                            if(action.seat == client2.seat)
                                ante2 = true;
                            if (ante1) {
                                done();
                                client1.disconnect();
                                client2.disconnect();
                            }
                        }
                    });
                });
            });
        });
    });

    it('should send a button position when a game starts', function(done) {
        var client1 = io.connect(socketURL, options);

        var amount = 100;
        var name = faker.name.firstName();

        client1.on('connect', function(){
            client1.emit('action', {
                type: 'buyIn',
                amount: amount,
                name: name
            });
            var client2 = io.connect(socketURL, options);
            var client1Button = false, client2Button = false;

            client2.on('connect', function () {
                client2.emit('action', {
                    type: 'buyIn',
                    amount: amount,
                    name: faker.name.firstName()
                });

            });

            client1.on('action', function(action) {
                if(action.type == 'button') {
                    client1Button = true;
                    if (client2Button) {
                        done();
                    }
                }
            });
            client2.on('action', function(action) {
                if(action.type == 'button') {
                    client2Button = true;
                    if (client1Button) {
                        done();
                    }
                }
            });

        });
    });

    it('should collect blinds from the players behind the button', function() {
        var client1 = io.connect(socketURL, options);

        var amount = 100;
        var name = faker.name.firstName();
        var button;

        client1.on('connect', function(){
            client1.emit('action', {
                type: 'buyIn',
                amount: amount,
                name: name
            });
            var client2 = io.connect(socketURL, options);

            client2.on('connect', function () {
                client2.emit('action', {
                    type: 'buyIn',
                    amount: amount,
                    name: faker.name.firstName()
                });

            });

            client1.on('action', function(action) {
                if(action.type == 'button') {
                    button = action.seat;
                }
                if(action.type == 'blind') {

                }
            });

        });
    });

    it('should request actions from each player in seated order', function() {
        todo();
    });

    it('should return an error and re-request the action if the player put more than his stack in the pot', function() {
        todo();
    });

    it('should return an error and re-request the action if the first bet is less then the big blind', function() {

    });

    it('should return an error and re-request the action if the bet is less then the last bet', function() {

    });

    it('should subtract the players bets from their stack and add them to the stack', function() {

    });

    it('should have a showdown if all bets have been matched and the last player has acted', function() {
        todo();
    });

    it('should not not allow bets after the maximum amount of bets have been made', function() {
        todo();
    });

    it('should go around the table again if all bets have not been called', function() {
        todo();
    });

    it('should not request actions from a player that has folded', function() {
        todo();
    });

    it('should bust any player that loses all their money', function() {

    });

    it('should advance the button each game', function() {

    });

});