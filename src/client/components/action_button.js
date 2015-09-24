var React = require('react/addons');

var ActionButton = React.createClass({
    getDefaultProps: function() {
        return {action: false};
    },
    render: function() {
        if(this.props.action) {
            return (
                <div>
                    Action button
                </div>
            );
        }
        else return (<div></div>);
    }
});

module.exports = ActionButton;