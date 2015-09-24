var faker = require('faker');

var HighCard = {
    init: function(io, numSeats, minBuyIn, maxBuyIn, ante, smallBlind, bigBlind) {
        this.io = io;

        // players are always in seated order

        this.numSeats = numSeats;
        this.minBuyIn = minBuyIn;
        this.maxBuyIn = maxBuyIn;
        this.ante = ante;
        this.smallBlind = smallBlind;
        this.bigBlind = bigBlind;

        this.players = [];
        this.pot = 0;
        this.amount = 0;
        this.action = 0;
        this.button = 0;
        this.last = 0;

        this.io.sockets.on('connection', this.connection.bind(this));
    },
    connection: function(socket) {
        var self = this;
        socket.on('action', function (action) {
            if(action.type == 'buyIn')
                self.buyIn(socket, action);
        });

    },
    createPlayer: function(socket, name, buyIn) {
        var player = {};
        player.socket = socket;
        player.folded = true;
        player.stack = buyIn;
        player.inPot = 0;
        player.name = name;
        player.hand = [];
        return player;
    },
    putInPot: function(player, amount) {
        if(player.stack < amount) {
            amount = player.stack;
        }
        player.stack -= amount;
        player.inPot += amount;
        this.pot += amount;
    },
    buyIn: function(socket, action) {
        if(action.amount < this.minBuyIn || action.amount > this.maxBuyIn) {
            socket.emit('action', {
               type: 'error',
                msg: 'the buy in amount was not accepted'
            });
        }

        var player = this.createPlayer(socket, action.name, action.amount);

        if(!this.seatPlayer(player))
            return;
        this.sendPlayerListTo(player);
        this.broadcastPlayer(player);

        var self = this;
        socket.on('disconnect', function() {
            self.drop(player);
        });

        if(this.players.length == 2) {
            this.button = this.players[0].seat;
            this.game();
        }
    },
    drop: function(player) {
        var index = this.players.indexOf(player);
        this.players.splice(index, 1);
        this.io.sockets.emit('action', {
            type: 'quit',
            seat: player.seat
        });

        if(index == this.action) {
            this.requestNextAction();
        }
    },
    game: function() {
        this.pot = 0;
        this.amount = this.ante + this.bigBlind;

        for(var i = 0; i < this.players.length; i++) {
            this.players[i].folded = false;
        }

        this.button = (this.button + 1) % this.players.length;
        this.action = this.button;
        this.last = (this.button + this.players.length) % this.players.length;

        this.io.sockets.emit('action', {
            type: 'button',
            seat: this.players[this.button].seat,
            amount: this.amount
        });

        this.antes();
        this.blinds();
        this.deal();

        this.act(this.players[this.button]);

    },
    act: function(player) {
        var action = {
            type: 'act',
            amount: this.amount,
            seat: this.action
        };
        player.socket.emit('action', action);
    },
    deal: function() {
        for(var i = 0; i < this.players.length; i++) {
            var value = Math.floor(Math.random() * 10 + 1);
            this.players[i].hand[0] = 's' + value;
            this.players[i].socket.emit('action', {
                type: 'deal',
                seat: this.players[i].seat,
                card: this.players[i].hand[0]
            });

            for(var j = 0; j < this.players.length; j++) {
                if(i != j) {
                    this.players[j].socket.emit('action', {
                        type: 'deal',
                        seat: this.players[i].seat,
                        card: 'hidden'
                    });
                }
            }
        }

        for(i = 0; i < this.players.length; i++) {
            this.revealHand(this.players[i].seat);
        }
    },
    antes: function() {
        for(var i = 0; i < this.players.length; i++) {
            this.putInPot(this.players[i], this.ante);

            this.io.sockets.emit('action', {
                type: 'ante',
                amount: this.ante,
                seat: this.players[i].seat
            });
        }
    },
    blinds: function() {
        var bigPlayer = this.players[(this.button + this.players.length - 1) % this.players.length];
        var smallPlayer = this.players[(this.button + this.players.length - 2) % this.players.length];

        this.putInPot(bigPlayer, this.bigBlind);
        this.putInPot(smallPlayer, this.smallBlind);

        this.io.sockets.emit('action', {
            type: 'blind',
            amount: this.bigBlind,
            seat: bigPlayer.seat
        });

        this.io.sockets.emit('action', {
            type: 'blind',
            amount: this.smallBlind,
            seat: smallPlayer.seat
        });
    },
    seatPlayer: function(player) {
        var seat = this.getOpenSeat();

        if (seat === -1) {
            player.socket.emit('action', {
                type: 'error',
                msg: 'the table is full'
            });
            return false;
        }
        player.seat = seat;
        var self = this;
        player.socket.on('action', function(action) {
            self.handleAction(action, player);
        });

        // send the seat message
        player.socket.emit('action', {
            type: 'seat',
            name: player.name,
            seat: player.seat,
            stack: player.stack
        });

        this.players.push(player);
        // players are always in seated order
        this.players.sort(function(a, b) {
            return a.seat - b.seat;
        });

        return true;
    },
    sendPlayerListTo: function(player) {
        // send the list of players to the new player
        for (var i = 0; i < this.players.length; i++) {
            if(this.players[i] != player) {
                player.socket.emit('action', {
                    type: 'player',
                    name: this.players[i].name,
                    seat: this.players[i].seat,
                    stack: this.players[i].stack
                });
            }
        }
    },

    broadcastPlayer: function(player) {
        // send the new player to all the other players
        this.io.sockets.emit('action', {
            type: 'player',
            name: player.name,
            seat: player.seat,
            stack: player.stack
        });
    },

    getOpenSeat:function() {
        if(this.players.length === 0)
            return 0;
        var seats = [];
        for(var i = 0; i < this.numSeats; i++) {
            seats[i] = true;
        }

        for(var j = 0; j < this.players.length; j++) {
            seats[this.players[j].seat] = false;
        }

        for(i = 0; i < seats.length; i++) {
            if(seats[i])
                return i;
        }
        return -1;
    },

    nextSeatToAct: function() {
        var advance = true;
        var n = 0;
        var next = this.action;
        while(advance && n < this.players.length) {
            next = (next + 1) % this.players.length;
            if (!this.players[next].folded && this.players[next].stack !== 0) {
                advance = false;
            }
            n++;
        }
        if(n == this.players.length)
            return -1;

        return this.players[next].seat;
    },
    requestNextAction: function() {
        if(this.players.length == 0)
            return;

        var advance = true;

        while(advance) {
            this.action = (this.action + 1) % this.players.length;

            // back to the first player
            // if no one needs to act, showdown and end the hand
            if(this.action == this.button) {
                var done = true;
                for(var i = 0; i < this.players.length; i++) {
                    if(this.players[i].inPot < this.amount && // someone still needs to call more chips
                        !this.players[i].folded &&  // that hasn't folded
                        this.players[i].stack != 0) { // and still has chips to call or bet with
                        done = false;
                    }
                }
                if(done) { // we went around the table and no one needs to act
                    this.getWinners();
                    this.game();
                    return;
                }
            }
            // find the next player that can act
            if(!this.players[this.action].folded && this.players[this.action].stack !== 0) {
                advance = false;
            }
        }
        this.players[this.action].socket.emit('action', {
            type: 'act',
            amount: this.amount,
            seat: this.players[this.action].seat
        });

    },
    handleAction: function(action, player) {
        if(action.type == 'bet' || action.type == 'call' || action.type == 'fold') {
            var chips = 0;
            if(action.type == 'bet') {
                chips = action.amount - player.inPot;
                this.putInPot(player, chips);
                this.amount = action.amount;
            }
            if(action.type == 'call') {
                chips = this.amount - player.inPot;
                this.putInPot(player, chips);
            }
            if(action.type == 'fold') {
                player.folded = true;
            }

            this.io.sockets.emit('action', {
                type: action.type,
                seat: player.seat,
                next: this.nextSeatToAct(),
                amount: this.amount
            });

            this.requestNextAction();
        }
    },
    revealHand: function(seat) {
        for(var i = 0; i < this.players[seat].hand.length; i++)
            this.revealCard(seat, i, this.players[seat].hand[i]);
    },
    revealCard: function(seat, index, card) {
        this.io.sockets.emit('action', {
            type: 'reveal',
            seat: seat,
            card: card,
            index: index
        });
    },
    getWinners: function() {
        var winners = [0]; // holds the index and all the ties
        var winningHand = this.players[0].hand[0];
        this.revealHand(this.players[0].seat);
        for(var i = 1; i < this.players.length; i++) {
            if(!this.players[i].folded) {
                if (this.players[i].hand[0] > winningHand) {
                    winningHand = this.players[i].hand[0];
                    winners = [];
                    winners.push(i);
                }
                else if (this.players[i].hand[0] == winningHand) {
                    winners.push(i); // add a tie
                }
            }
        }

        for(var j = 0; j < winners.length; j++) {
            this.io.sockets.emit('action', {
                type: 'winner',
                seat: this.players[winners[j]].seat,
                amount: this.pot
            });
        }
    }
};

module.exports = HighCard;
