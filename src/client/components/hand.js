var React = require('react/addons');

var Hand = React.createClass({
    getDefaultProps: function() {
        return {
            cards: []
        };
    },
    render: function() {
        return (
            <div>
                HAND: {this.props.cards.map(function(card) {
                    return card;
                })}
            </div>
        );
    }
});

module.exports = Hand;