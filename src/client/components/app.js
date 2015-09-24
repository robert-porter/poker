var React = require('react/addons');
var Seat = require('./seat');
var BettingPanel = require('./betting_panel');
var HighCardStore = require('./../stores/high_card_store');
var Pot = require('./pot');

function getState() {
    return {
        seats: HighCardStore.getSeats(),
        clientSeat: HighCardStore.getClientSeat(),
        pot: HighCardStore.pot,
        amount: HighCardStore.amount,
        canAct: HighCardStore.canAct,
        stack: HighCardStore.getStack(),
        action: HighCardStore.action
    };
}

var HighCard = React.createClass({

// Use getAppState method to set initial state
    getInitialState: function() {
        return getState();
    },

    // Listen for changes
    componentDidMount: function() {
        HighCardStore.addChangeListener(this._onChange);
    },

    // Unbind change listener
    componentWillUnmount: function() {
        HighCardStore.removeChangeListener(this._onChange);
    },

    // Update view state when change event is received
    _onChange: function() {
        this.setState(getState());
    },

    render: function() {

        var self = this;
        return (
            <div>
                {this.state.seats.map(function(seat, position) {
                    if(seat != null) {
                        console.log(self.state.action);
                        console.log(position);
                        return <Seat seat={seat} action={self.state.action == position}/>;
                    }
                })}

                <Pot pot={this.state.pot}/>

                <BettingPanel canAct={this.state.canAct} amount={this.state.amount} stack={this.state.stack} />
            </div>
        );
    }
});

module.exports = HighCard;