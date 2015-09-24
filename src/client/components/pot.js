var React = require('react/addons');

var Pot = React.createClass({
    getDefaultProps: function() {
        return {
            amountToCall: 0,
            pot: 0
        };
    },
    render: function() {
        return (
            <div>
                POT: {this.props.pot}
            </div>
        );
    }
});

module.exports = Pot;