
var Dispatcher = require('../dispatcher/dispatcher');
var EventEmitter = require('events').EventEmitter;
var assign = require('object-assign');


HighCardStore = assign({}, EventEmitter.prototype, {
    seats: [],
    numSeats: 5,
    playing: false,
    socket: null,
    action: 0,
    clientSeat: 0,
    pot: 0,
    amount: 0,
    canAct: false,

    getStack: function() {
        if(this.seats[this.clientSeat] !== null)
            return this.seats[this.clientSeat].stack;
        else
            return 0;
    },

    getSeats: function () {
        return this.seats;
    },
    getClientSeat :function() {
        return this.clientSeat;
    },
    init: function (socket) {
        this.socket = socket;
        for(var i = 0; i < this.numSeats; i++) {
            this.seats.push(null);
        }
        socket.emit('action', {
            type: 'buyIn',
            amount: 100,
            name: "Robert"
        });
    },
    emitChange: function () {
        this.emit('change');
    },

    addChangeListener: function (callback) {
        this.on('change', callback);
    },

    removeChangeListener: function (callback) {
        this.removeListener('change', callback);
    }
});

Dispatcher.register(function(action) {

    console.log(action);
    var chips = 0;
    if(action.source == 'view') {
        if(action.type == 'bet' || action.type == 'call' || action.type == 'fold') {
            HighCardStore.canAct = false;
        }
        HighCardStore.socket.emit('action', action);
        HighCardStore.emitChange();
        return;
    }
    if(action.type == 'player') {
        HighCardStore.seats[action.seat] = {};
        HighCardStore.seats[action.seat].name = action.name;
        HighCardStore.seats[action.seat].stack = action.stack;
        HighCardStore.seats[action.seat].inPot = 0;
    }
    else if(action.type == 'seat') {
        HighCardStore.clientSeat = action.seat;
    }
    else if(action.type == 'act') {
        HighCardStore.canAct = true;
        HighCardStore.amount = action.amount;
    }
    else if(action.type == 'bet') {
        HighCardStore.action = action.next;
        chips = action.amount - HighCardStore.seats[action.seat].inPot;
        HighCardStore.seats[action.seat].stack -= chips;
        HighCardStore.seats[action.seat].inPot += chips;
        HighCardStore.pot += chips;
        HighCardStore.amount = action.amount;
    }
    else if(action.type == 'call') {
        HighCardStore.action = action.next;
        chips = action.amount - HighCardStore.seats[action.seat].inPot;
        HighCardStore.seats[action.seat].stack -= chips;
        HighCardStore.seats[action.seat].inPot += chips;
        HighCardStore.pot += chips;
        HighCardStore.amount = action.amount;
    }
    else if(action.type == 'fold') {
        HighCardStore.action = action.next;
    }
    else if(action.type == 'ante') {
        HighCardStore.seats[action.seat].stack -= action.amount;
        HighCardStore.seats[action.seat].inPot += action.amount;
        HighCardStore.pot += action.amount;
    }
    else if(action.type == 'button') {
        HighCardStore.action = action.seat;
        HighCardStore.amount = action.amount;
        HighCardStore.seats[action.seat].hand = action.cards;
        HighCardStore.pot = 0;
        for(var i = 0; i < HighCardStore.seats.length; i++) {
            if(HighCardStore.seats[i] != null) {
                HighCardStore.seats[i].inPot = 0;
                HighCardStore.seats[i].canAct = false;
            }
        }
    }
    else if(action.type == 'blind') {
        HighCardStore.seats[action.seat].stack -= action.amount;
        HighCardStore.seats[action.seat].inPot += action.amount;
        HighCardStore.pot += action.amount;
    }
    else if(action.type == 'winner') {
        HighCardStore.seats[action.seat].stack += action.amount;
        for(var i = 0; i < HighCardStore.seats.length; i++) {
            if(HighCardStore.seats[i] != null)
                HighCardStore.seats[i].inPot = 0;
        }
    }
    else if(action.type == 'game') {
        HighCardStore.pot = 0;
        HighCardStore.amount = 0;
    }
    else if(action.type == 'busted' || action.type == 'quit') {
        HighCardStore.seats[action.seat] = null;
    }

    HighCardStore.emitChange();
});

module.exports = HighCardStore;