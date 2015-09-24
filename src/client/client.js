'use strict';

var HighCardStore = require('./stores/high_card_store');

var socket=io.connect();

HighCardStore.init(socket);

var animationQueue = [];
function addAnimation(f) {
    animationQueue.push(f);
    if(animationQueue.length == 1) {
        f();
    }
}

function animationFinished() {
    if(animationQueue.length != 0) {
        animationQueue.shift();
        if(animationQueue.length != 0)
            animationQueue[0]();
    }
}

function clearAnimations() {
    animationQueue = [];
}

var Positions = {
    hands: [],
    names: [],
    stacks: [],
    bets: [],
    pot: {},
    betting: {}
};

function initPositions() {
    for(var i = 0; i < 9; i++) {
        Positions.hands[i] = {x: i * 200, y: 0};
        Positions.names[i] = {x: i * 200, y: 100};
        Positions.stacks[i] = {x: i * 200, y: 100};
        Positions.bets[i] = {x: i * 200, y: 150};
        Positions.deck = {x: 200, y: 380 };
        Positions.pot = {x: 400, y: 500};
        Positions.betting = {x: 300, y: 650};
    }
}


function makeBet() {
    socket.emit('action', {
        type: 'bet',
        amount: BettingView.getValue()
    });
    View.$betting.hide();
}
function callCheck() {
    socket.emit('action', {
        type: 'call'
    });
    View.$betting.hide();
}
function fold() {
    socket.emit('action', {
        type: 'fold'
    });
    View.$betting.hide();
}


function Semaphore() {
    this.s = 0;
}

var BettingView = {
    init: function() {
        this.$call = $('#call');
        this.$bet = $('#bet');
        this.$fold = $('#fold');
        this.$range = $('#bet-range');
        var self = this;
        this.$range.on('input', function() {
            self.$bet.text('Bet(' + $(this).val() + ')');
        });

        this.$bet.on('click', makeBet);
        this.$call.on('click', callCheck);
        this.$fold.on('click', fold);
    },
    getValue: function() {
        return this.$range.val();
    },
    disable: function() {
    },
    activate: function(amount, stack) {
        this.$call.text('Call(' + amount + ')');
        this.$bet.text('Bet(' + amount + ')');
        this.$range.prop('min', amount);
        this.$range.prop('max', stack);
        this.$range.val(amount);
    }
};

function position($el, p) {
    $el.css('position', 'absolute');
    $el.css('left', p.x + 'px');
    $el.css('top', p.y + 'px');
}


var View = {
    $names: [],
    $hands: [],
    $stacks: [],
    $bets: [],
    $players: [],
    $pot: null,
    $betting: null,
    init: function() {
        this.createPot();
        this.createBetting();
        this.$betting.hide();
    },
    addPlayer: function(seat, name, stack) {
        if(this.$players[seat])
            this.$players[seat].detach();

        this.$players[seat] = $('<div></div>');
        this.createName(this.$players[seat], seat, name);
        this.createStack(this.$players[seat], seat, stack);
        this.createHand(this.$players[seat], seat);
        this.createBets(this.$players[seat], seat);
        $('#game').append(this.$players[seat]);
    },
    removePlayer: function(seat) {
        if(this.$players[seat])
            this.$players[seat].detach();
    },
    dealCard: function(seat, card) {
        var $img = null;
        if(card == 'hidden')
            $img = $('<img src="public/images/b1fv.png"/>');
        else {
            $img = $('<img src=public/images/' + card + '.png>');
        }
        this.$hands[seat].append($img);
    },
    revealCard: function(seat, index, card) {
        var $img = $('<img src=public/images/' + card + '.png>');
        this.$hands[seat].children().eq(index).replaceWith($img);
    },
    putBetsInPotAnimation: function() {
        addAnimation(function() {
            var s = 0;
            for(var i = 0; i < View.$bets.length; i++)
                if(!View.$bets[i].is(':empty')) {
                    s++;
                }
            var sem = new Semaphore();
            sem.s = s;
            for(i = 0; i < View.$bets.length; i++)
                if(!View.$bets[i].is(':empty')) {
                    View.moveChips(View.$bets[i], View.$pot, 0, 100, 100, sem);
                }
        });
    },
    bet: function(seat, stack, added, inPot) {
        this.moveChips(this.$stacks[seat], this.$bets[seat], stack, added, inPot);
    },
    createPutPotInStackAnimation: function(seat, pot, amount, stack) {
        this.moveChips(this.$pot, this.$stacks[seat], pot, amount, stack);
    },
    emptyHands: function() {
        for(var i = 0; i < this.$hands.length; i++) {
            if(this.$hands[i]) {
                this.$hands[i].empty();
            }
        }
    },
    emptyHand: function(seat) {
        this.$hands[seat].empty();
    },
    createBetting: function() {
        this.$betting = $('#betting');
        position(this.$betting, Positions.betting);
    },
    createAction: function(seat) {
        var self = this;
        var x = function () {
            self.$names[seat].animate({
                opacity: 0.5
            }, 1000, 'linear', y);
        };
        var y = function () {
            self.$names[seat].animate({
                opacity: 1.0
            }, 1000, 'linear', x);
        };

        x();
    },
    createName: function($parent, seat, name) {
        var $name = $('<div></div>');
        position($name, Positions.names[seat]);
        $name.css('border', 'solid');
        $name.append(document.createTextNode(name));
        $parent.append($name.get(0));
        this.$names[seat] = $name;
    },
    createHand: function($parent, seat) {
        var $hand = $('<div></div>');
        position($hand, Positions.hands[seat]);
        $parent.append($hand);
        this.$hands[seat] = $hand;
    },
    createStack($parent, seat, amount) {
        this.$stacks[seat] = this.createChips(Positions.stacks[seat], amount);
        $parent.append(this.$stacks[seat]);
    },
    createBets: function($parent, seat) {
        var $bet = $('<div></div>');
        position($bet, Positions.bets[seat]);
        this.$bets[seat] = $bet;
        $parent.append($bet);
    },
    createDeck: function() {
        var $deck = $('<div></div>');
        position($deck, Positions.deck);
        $('#game').append($deck.get(0));
        this.$deck = $deck;
        this.$deck.append($('<img src="public/images/b1fv.png"/>'));
    },
    createFlop: function(card) {
        var s = 'public/images/' + card + '.png';
        this.$deck.append($('<img src=' + s + '>'));
    },
    createChips(pos, amount) {
        var $chips = $('<div></div>');
        position($chips, pos);
        $('#game').append($chips.get(0));
        this.setChipsAmount($chips, amount);
        return $chips;
    },
    setChipsAmount($chips, amount) {
        $chips.empty();
        if(amount != 0) {
            $chips.append($('<img src="public/chips.png"/>'));
            $chips.append(document.createTextNode(amount));
        }
        return $chips;
    },
    createPot: function() {
        this.$pot = $('<div></div>');
        position(this.$pot, Positions.pot);
        $('#game').append(this.$pot.get(0));
    },
    moveChips: function($src, $dest, newSrcAmount, chipsAmount, newDestAmount, sem) {
        if(sem == undefined) {
            sem = new Semaphore();
            sem.s = 1;
        }

        var pos = {x: $src.css('left').replace("px", ""), y: $src.css('top').replace("px", "")};
        var $chips = this.createChips(pos, chipsAmount);

        this.setChipsAmount($src, newSrcAmount);

        var self = this;
        var finish = function () {
            $chips.detach();
            self.setChipsAmount($dest, newDestAmount);
            sem.s--;
            if(sem.s == 0)
                animationFinished();
        };

        $chips.animate({
            'top': $dest.css('top'),
            'left': $dest.css('left')
        }, 500, 'easeInOutQuart', finish);
    }
};


socket.on('action', function(action) {
    console.log(action);
    var chips = 0;
    if(action.type == 'player') {
        HighCardStore.seats[action.seat] = {};
        HighCardStore.seats[action.seat].name = action.name;
        HighCardStore.seats[action.seat].stack = action.stack;
        HighCardStore.seats[action.seat].inPot = 0;

        View.addPlayer(action.seat, action.name, action.stack);
    }
    else if(action.type == 'seat') {
        HighCardStore.clientSeat = action.seat;
    }
    else if(action.type == 'act') {
        HighCardStore.canAct = true;
        HighCardStore.amount = action.amount;

        addAnimation(function() {
            View.$betting.show();
            BettingView.activate(action.amount, HighCardStore.seats[HighCardStore.clientSeat].pot);
            animationFinished();
        });
    }
    else if(action.type == 'bet') {
        HighCardStore.action = action.next;
        chips = action.amount - HighCardStore.seats[action.seat].inPot;
        HighCardStore.seats[action.seat].stack -= chips;
        HighCardStore.seats[action.seat].inPot += chips;
        HighCardStore.pot += chips;
        HighCardStore.amount = action.amount;

        addAnimation(function() {
            View.bet(action.seat,
                HighCardStore.seats[action.seat].stack,
                chips,
                HighCardStore.seats[action.seat].inPot);
        });
    }
    else if(action.type == 'call') {
        HighCardStore.action = action.next;
        chips = action.amount - HighCardStore.seats[action.seat].inPot;
        HighCardStore.seats[action.seat].stack -= chips;
        HighCardStore.seats[action.seat].inPot += chips;
        HighCardStore.pot += chips;
        HighCardStore.amount = action.amount;

        addAnimation(function() {
            View.bet(action.seat,
                HighCardStore.seats[action.seat].stack,
                chips,
                HighCardStore.seats[action.seat].inPot);
        });
    }
    else if(action.type == 'fold') {
        HighCardStore.action = action.next;
        View.emptyHand(action.seat);
    }
    else if(action.type == 'ante') {
        HighCardStore.seats[action.seat].stack -= action.amount;
        HighCardStore.seats[action.seat].inPot += action.amount;
        HighCardStore.pot += action.amount;

        addAnimation(function() {
            View.bet(action.seat,
                HighCardStore.seats[action.seat].stack,
                action.amount,
                HighCardStore.seats[action.seat].inPot);
        });
    }
    else if(action.type == 'button') {
        HighCardStore.action = action.seat;
        HighCardStore.amount = action.amount;
        HighCardStore.pot = 0;
        for(var i = 0; i < HighCardStore.seats.length; i++) {
            if(HighCardStore.seats[i] != null) {
                HighCardStore.seats[i].inPot = 0;
                HighCardStore.seats[i].canAct = false;
                HighCardStore.seats[i].hand = [];
            }
        }

        View.createAction(action.seat);
        View.emptyHands();
        View.$betting.hide();
    }
    else if(action.type == 'deal') {
        addAnimation(function() {
            View.dealCard(action.seat, action.card);
            setTimeout(function() {
                animationFinished();
            }, 300);
        });
    }
    else if(action.type == 'blind') {
        HighCardStore.seats[action.seat].stack -= action.amount;
        HighCardStore.seats[action.seat].inPot += action.amount;
        HighCardStore.pot += action.amount;

        addAnimation(function() {
            View.bet(action.seat,
                HighCardStore.seats[action.seat].stack,
                action.amount,
                HighCardStore.seats[action.seat].inPot);
        });
    }
    else if(action.type == 'winner') {
        HighCardStore.seats[action.seat].stack += action.amount;
        for(var i = 0; i < HighCardStore.seats.length; i++) {
            if(HighCardStore.seats[i] != null)
                HighCardStore.seats[i].inPot = 0;
        }

        View.putBetsInPotAnimation();
        addAnimation(function() {
            View.createPutPotInStackAnimation(action.seat,
                0,
                action.amount,
                HighCardStore.seats[action.seat].stack);
        });
        addAnimation(function() {
            setTimeout(function() {
                animationFinished();
            }, 3000);
        });
    }
    else if(action.type == 'reveal') {
        HighCardStore.seats[action.seat].hand[action.index] = action.card;
        //addAnimation(function() {
        //    View.revealCard(action.seat, action.index, action.card);
        //});
    }
    else if(action.type == 'game') {
        HighCardStore.pot = 0;
        HighCardStore.amount = 0;
    }
    else if(action.type == 'busted' || action.type == 'quit') {
        HighCardStore.seats[action.seat] = null;
        View.removePlayer(action.seat);
    }
});


$(function() {
    initPositions();
    BettingView.init();
    View.init();




/*
    React.render(
        <HighCard />,
        document.getElementById('content')
    );
    */
});
