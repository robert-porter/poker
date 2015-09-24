var Dispatcher = require('flux').Dispatcher;
var AppDispatcher = new Dispatcher();

AppDispatcher.dispatchViewAction = function(action) {
    action.source = 'view';
    this.dispatch(action);
};

AppDispatcher.dispatchServerAction = function(action) {
    action.source = 'server';
    this.dispatch(action);
};

module.exports = AppDispatcher;