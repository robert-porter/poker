var React = require('react/addons');
var HighCardStore = require('./../stores/high_card_store');
var Dispatcher = require('./../dispatcher/dispatcher');

var BettingPanel = React.createClass({
    getInitialState: function() {
        return {
            value: this.props.amount
        }
    },
    componentWillReceiveProps: function(props) {
        if(this.state.value < props.amount)
            this.setState({value: props.amount});
    },
    render: function() {
        if(this.state.value < this.props.amount)
            this.state.value = this.props.amount;

        return (
            <div>

            <input
                type="range"
                value={this.state.value}
                min={this.props.amount}
                max={this.props.stack}
                onInput={this.betChanged}
                disabled={!this.props.canAct}/>

            <button onClick={this.handleCall} disabled={!this.props.canAct} className="btn btn-default">
                Call({this.props.amount})
            </button>
            <button onClick={this.handleBet} disabled={!this.props.canAct} className="btn btn-default">
                Bet({this.state.value})
            </button>

            <button onClick={this.handleFold} disabled={!this.props.canAct} className="btn btn-default">Fold</button>
            </div>
        );
    },
    betChanged: function(event) {
        this.setState({
            value: event.target.value
        });
    },
    handleBet: function() {
        Dispatcher.dispatchViewAction({
            type: 'bet',
            amount: this.state.value
        });
    },
    handleCall: function() {
        Dispatcher.dispatchViewAction({
            type: 'call'
        });
    },
    handleFold: function() {
        Dispatcher.dispatchViewAction({
            type: 'fold'
        });
    }
});

module.exports = BettingPanel;