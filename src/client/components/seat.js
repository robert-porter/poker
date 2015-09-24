var React = require('react/addons');
var Hand = require('./hand');
var ActionButton = require('./action_button');

var Seat = React.createClass({
    getDefaultProps: function() {
        return {
            seat: {
                name: '',
                isClient: false,
                inPot: 0,
                stack: 0,
                action: true
            }
        };
    },
    render: function() {

        return (
        <div className="panel panel-default">
            <div className="panel-body">
                Name: {this.props.seat.name}<br/>
                Stack: {this.props.seat.stack}<br/>
                In pot: {this.props.seat.inPot}
                <Hand cards={this.props.seat.hand} />
                <ActionButton action={this.props.action}/>
                <br/>
                <br/>
            </div>
        </div>
        );
    }
});

module.exports = Seat;