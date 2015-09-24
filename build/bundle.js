(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({"/home/robert/projects/highcard/node_modules/browserify/node_modules/events/events.js":[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      }
      throw TypeError('Uncaught, unspecified "error" event.');
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        len = arguments.length;
        args = new Array(len - 1);
        for (i = 1; i < len; i++)
          args[i - 1] = arguments[i];
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    len = arguments.length;
    args = new Array(len - 1);
    for (i = 1; i < len; i++)
      args[i - 1] = arguments[i];

    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    var m;
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.listenerCount = function(emitter, type) {
  var ret;
  if (!emitter._events || !emitter._events[type])
    ret = 0;
  else if (isFunction(emitter._events[type]))
    ret = 1;
  else
    ret = emitter._events[type].length;
  return ret;
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}],"/home/robert/projects/highcard/node_modules/browserify/node_modules/process/browser.js":[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = setTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            currentQueue[queueIndex].run();
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    clearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        setTimeout(drainQueue, 0);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],"/home/robert/projects/highcard/node_modules/flux/index.js":[function(require,module,exports){
/**
 * Copyright (c) 2014-2015, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

module.exports.Dispatcher = require('./lib/Dispatcher');

},{"./lib/Dispatcher":"/home/robert/projects/highcard/node_modules/flux/lib/Dispatcher.js"}],"/home/robert/projects/highcard/node_modules/flux/lib/Dispatcher.js":[function(require,module,exports){
(function (process){
/**
 * Copyright (c) 2014-2015, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule Dispatcher
 * 
 * @preventMunge
 */

'use strict';

exports.__esModule = true;

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var invariant = require('fbjs/lib/invariant');

var _prefix = 'ID_';

/**
 * Dispatcher is used to broadcast payloads to registered callbacks. This is
 * different from generic pub-sub systems in two ways:
 *
 *   1) Callbacks are not subscribed to particular events. Every payload is
 *      dispatched to every registered callback.
 *   2) Callbacks can be deferred in whole or part until other callbacks have
 *      been executed.
 *
 * For example, consider this hypothetical flight destination form, which
 * selects a default city when a country is selected:
 *
 *   var flightDispatcher = new Dispatcher();
 *
 *   // Keeps track of which country is selected
 *   var CountryStore = {country: null};
 *
 *   // Keeps track of which city is selected
 *   var CityStore = {city: null};
 *
 *   // Keeps track of the base flight price of the selected city
 *   var FlightPriceStore = {price: null}
 *
 * When a user changes the selected city, we dispatch the payload:
 *
 *   flightDispatcher.dispatch({
 *     actionType: 'city-update',
 *     selectedCity: 'paris'
 *   });
 *
 * This payload is digested by `CityStore`:
 *
 *   flightDispatcher.register(function(payload) {
 *     if (payload.actionType === 'city-update') {
 *       CityStore.city = payload.selectedCity;
 *     }
 *   });
 *
 * When the user selects a country, we dispatch the payload:
 *
 *   flightDispatcher.dispatch({
 *     actionType: 'country-update',
 *     selectedCountry: 'australia'
 *   });
 *
 * This payload is digested by both stores:
 *
 *   CountryStore.dispatchToken = flightDispatcher.register(function(payload) {
 *     if (payload.actionType === 'country-update') {
 *       CountryStore.country = payload.selectedCountry;
 *     }
 *   });
 *
 * When the callback to update `CountryStore` is registered, we save a reference
 * to the returned token. Using this token with `waitFor()`, we can guarantee
 * that `CountryStore` is updated before the callback that updates `CityStore`
 * needs to query its data.
 *
 *   CityStore.dispatchToken = flightDispatcher.register(function(payload) {
 *     if (payload.actionType === 'country-update') {
 *       // `CountryStore.country` may not be updated.
 *       flightDispatcher.waitFor([CountryStore.dispatchToken]);
 *       // `CountryStore.country` is now guaranteed to be updated.
 *
 *       // Select the default city for the new country
 *       CityStore.city = getDefaultCityForCountry(CountryStore.country);
 *     }
 *   });
 *
 * The usage of `waitFor()` can be chained, for example:
 *
 *   FlightPriceStore.dispatchToken =
 *     flightDispatcher.register(function(payload) {
 *       switch (payload.actionType) {
 *         case 'country-update':
 *         case 'city-update':
 *           flightDispatcher.waitFor([CityStore.dispatchToken]);
 *           FlightPriceStore.price =
 *             getFlightPriceStore(CountryStore.country, CityStore.city);
 *           break;
 *     }
 *   });
 *
 * The `country-update` payload will be guaranteed to invoke the stores'
 * registered callbacks in order: `CountryStore`, `CityStore`, then
 * `FlightPriceStore`.
 */

var Dispatcher = (function () {
  function Dispatcher() {
    _classCallCheck(this, Dispatcher);

    this._callbacks = {};
    this._isDispatching = false;
    this._isHandled = {};
    this._isPending = {};
    this._lastID = 1;
  }

  /**
   * Registers a callback to be invoked with every dispatched payload. Returns
   * a token that can be used with `waitFor()`.
   */

  Dispatcher.prototype.register = function register(callback) {
    var id = _prefix + this._lastID++;
    this._callbacks[id] = callback;
    return id;
  };

  /**
   * Removes a callback based on its token.
   */

  Dispatcher.prototype.unregister = function unregister(id) {
    !this._callbacks[id] ? process.env.NODE_ENV !== 'production' ? invariant(false, 'Dispatcher.unregister(...): `%s` does not map to a registered callback.', id) : invariant(false) : undefined;
    delete this._callbacks[id];
  };

  /**
   * Waits for the callbacks specified to be invoked before continuing execution
   * of the current callback. This method should only be used by a callback in
   * response to a dispatched payload.
   */

  Dispatcher.prototype.waitFor = function waitFor(ids) {
    !this._isDispatching ? process.env.NODE_ENV !== 'production' ? invariant(false, 'Dispatcher.waitFor(...): Must be invoked while dispatching.') : invariant(false) : undefined;
    for (var ii = 0; ii < ids.length; ii++) {
      var id = ids[ii];
      if (this._isPending[id]) {
        !this._isHandled[id] ? process.env.NODE_ENV !== 'production' ? invariant(false, 'Dispatcher.waitFor(...): Circular dependency detected while ' + 'waiting for `%s`.', id) : invariant(false) : undefined;
        continue;
      }
      !this._callbacks[id] ? process.env.NODE_ENV !== 'production' ? invariant(false, 'Dispatcher.waitFor(...): `%s` does not map to a registered callback.', id) : invariant(false) : undefined;
      this._invokeCallback(id);
    }
  };

  /**
   * Dispatches a payload to all registered callbacks.
   */

  Dispatcher.prototype.dispatch = function dispatch(payload) {
    !!this._isDispatching ? process.env.NODE_ENV !== 'production' ? invariant(false, 'Dispatch.dispatch(...): Cannot dispatch in the middle of a dispatch.') : invariant(false) : undefined;
    this._startDispatching(payload);
    try {
      for (var id in this._callbacks) {
        if (this._isPending[id]) {
          continue;
        }
        this._invokeCallback(id);
      }
    } finally {
      this._stopDispatching();
    }
  };

  /**
   * Is this Dispatcher currently dispatching.
   */

  Dispatcher.prototype.isDispatching = function isDispatching() {
    return this._isDispatching;
  };

  /**
   * Call the callback stored with the given id. Also do some internal
   * bookkeeping.
   *
   * @internal
   */

  Dispatcher.prototype._invokeCallback = function _invokeCallback(id) {
    this._isPending[id] = true;
    this._callbacks[id](this._pendingPayload);
    this._isHandled[id] = true;
  };

  /**
   * Set up bookkeeping needed when dispatching.
   *
   * @internal
   */

  Dispatcher.prototype._startDispatching = function _startDispatching(payload) {
    for (var id in this._callbacks) {
      this._isPending[id] = false;
      this._isHandled[id] = false;
    }
    this._pendingPayload = payload;
    this._isDispatching = true;
  };

  /**
   * Clear bookkeeping used for dispatching.
   *
   * @internal
   */

  Dispatcher.prototype._stopDispatching = function _stopDispatching() {
    delete this._pendingPayload;
    this._isDispatching = false;
  };

  return Dispatcher;
})();

module.exports = Dispatcher;
}).call(this,require('_process'))

},{"_process":"/home/robert/projects/highcard/node_modules/browserify/node_modules/process/browser.js","fbjs/lib/invariant":"/home/robert/projects/highcard/node_modules/flux/node_modules/fbjs/lib/invariant.js"}],"/home/robert/projects/highcard/node_modules/flux/node_modules/fbjs/lib/invariant.js":[function(require,module,exports){
(function (process){
/**
 * Copyright 2013-2015, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule invariant
 */

"use strict";

/**
 * Use invariant() to assert state which your program assumes to be true.
 *
 * Provide sprintf-style format (only %s is supported) and arguments
 * to provide information about what broke and what you were
 * expecting.
 *
 * The invariant message will be stripped in production, but the invariant
 * will remain to ensure logic does not differ in production.
 */

var invariant = function (condition, format, a, b, c, d, e, f) {
  if (process.env.NODE_ENV !== 'production') {
    if (format === undefined) {
      throw new Error('invariant requires an error message argument');
    }
  }

  if (!condition) {
    var error;
    if (format === undefined) {
      error = new Error('Minified exception occurred; use the non-minified dev environment ' + 'for the full error message and additional helpful warnings.');
    } else {
      var args = [a, b, c, d, e, f];
      var argIndex = 0;
      error = new Error('Invariant Violation: ' + format.replace(/%s/g, function () {
        return args[argIndex++];
      }));
    }

    error.framesToPop = 1; // we don't care about invariant's own frame
    throw error;
  }
};

module.exports = invariant;
}).call(this,require('_process'))

},{"_process":"/home/robert/projects/highcard/node_modules/browserify/node_modules/process/browser.js"}],"/home/robert/projects/highcard/node_modules/object-assign/index.js":[function(require,module,exports){
/* eslint-disable no-unused-vars */
'use strict';
var hasOwnProperty = Object.prototype.hasOwnProperty;
var propIsEnumerable = Object.prototype.propertyIsEnumerable;

function toObject(val) {
	if (val === null || val === undefined) {
		throw new TypeError('Object.assign cannot be called with null or undefined');
	}

	return Object(val);
}

module.exports = Object.assign || function (target, source) {
	var from;
	var to = toObject(target);
	var symbols;

	for (var s = 1; s < arguments.length; s++) {
		from = Object(arguments[s]);

		for (var key in from) {
			if (hasOwnProperty.call(from, key)) {
				to[key] = from[key];
			}
		}

		if (Object.getOwnPropertySymbols) {
			symbols = Object.getOwnPropertySymbols(from);
			for (var i = 0; i < symbols.length; i++) {
				if (propIsEnumerable.call(from, symbols[i])) {
					to[symbols[i]] = from[symbols[i]];
				}
			}
		}
	}

	return to;
};

},{}],"/home/robert/projects/highcard/src/client/client.js":[function(require,module,exports){
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

},{"./stores/high_card_store":"/home/robert/projects/highcard/src/client/stores/high_card_store.js"}],"/home/robert/projects/highcard/src/client/dispatcher/dispatcher.js":[function(require,module,exports){
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

},{"flux":"/home/robert/projects/highcard/node_modules/flux/index.js"}],"/home/robert/projects/highcard/src/client/stores/high_card_store.js":[function(require,module,exports){

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

},{"../dispatcher/dispatcher":"/home/robert/projects/highcard/src/client/dispatcher/dispatcher.js","events":"/home/robert/projects/highcard/node_modules/browserify/node_modules/events/events.js","object-assign":"/home/robert/projects/highcard/node_modules/object-assign/index.js"}]},{},["/home/robert/projects/highcard/src/client/client.js"])
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvZXZlbnRzL2V2ZW50cy5qcyIsIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9wcm9jZXNzL2Jyb3dzZXIuanMiLCJub2RlX21vZHVsZXMvZmx1eC9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9mbHV4L2xpYi9EaXNwYXRjaGVyLmpzIiwibm9kZV9tb2R1bGVzL2ZsdXgvbm9kZV9tb2R1bGVzL2ZianMvbGliL2ludmFyaWFudC5qcyIsIm5vZGVfbW9kdWxlcy9vYmplY3QtYXNzaWduL2luZGV4LmpzIiwiL2hvbWUvcm9iZXJ0L3Byb2plY3RzL2hpZ2hjYXJkL3NyYy9jbGllbnQvY2xpZW50LmpzIiwiL2hvbWUvcm9iZXJ0L3Byb2plY3RzL2hpZ2hjYXJkL3NyYy9jbGllbnQvZGlzcGF0Y2hlci9kaXNwYXRjaGVyLmpzIiwiL2hvbWUvcm9iZXJ0L3Byb2plY3RzL2hpZ2hjYXJkL3NyYy9jbGllbnQvc3RvcmVzL2hpZ2hfY2FyZF9zdG9yZS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN1NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUNWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7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WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8vIENvcHlyaWdodCBKb3llbnQsIEluYy4gYW5kIG90aGVyIE5vZGUgY29udHJpYnV0b3JzLlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhXG4vLyBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlXG4vLyBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmdcbi8vIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCxcbi8vIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXRcbi8vIHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZVxuLy8gZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4vL1xuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWRcbi8vIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy9cbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1Ncbi8vIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0Zcbi8vIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU5cbi8vIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLFxuLy8gREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SXG4vLyBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFXG4vLyBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuXG5mdW5jdGlvbiBFdmVudEVtaXR0ZXIoKSB7XG4gIHRoaXMuX2V2ZW50cyA9IHRoaXMuX2V2ZW50cyB8fCB7fTtcbiAgdGhpcy5fbWF4TGlzdGVuZXJzID0gdGhpcy5fbWF4TGlzdGVuZXJzIHx8IHVuZGVmaW5lZDtcbn1cbm1vZHVsZS5leHBvcnRzID0gRXZlbnRFbWl0dGVyO1xuXG4vLyBCYWNrd2FyZHMtY29tcGF0IHdpdGggbm9kZSAwLjEwLnhcbkV2ZW50RW1pdHRlci5FdmVudEVtaXR0ZXIgPSBFdmVudEVtaXR0ZXI7XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuX2V2ZW50cyA9IHVuZGVmaW5lZDtcbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuX21heExpc3RlbmVycyA9IHVuZGVmaW5lZDtcblxuLy8gQnkgZGVmYXVsdCBFdmVudEVtaXR0ZXJzIHdpbGwgcHJpbnQgYSB3YXJuaW5nIGlmIG1vcmUgdGhhbiAxMCBsaXN0ZW5lcnMgYXJlXG4vLyBhZGRlZCB0byBpdC4gVGhpcyBpcyBhIHVzZWZ1bCBkZWZhdWx0IHdoaWNoIGhlbHBzIGZpbmRpbmcgbWVtb3J5IGxlYWtzLlxuRXZlbnRFbWl0dGVyLmRlZmF1bHRNYXhMaXN0ZW5lcnMgPSAxMDtcblxuLy8gT2J2aW91c2x5IG5vdCBhbGwgRW1pdHRlcnMgc2hvdWxkIGJlIGxpbWl0ZWQgdG8gMTAuIFRoaXMgZnVuY3Rpb24gYWxsb3dzXG4vLyB0aGF0IHRvIGJlIGluY3JlYXNlZC4gU2V0IHRvIHplcm8gZm9yIHVubGltaXRlZC5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuc2V0TWF4TGlzdGVuZXJzID0gZnVuY3Rpb24obikge1xuICBpZiAoIWlzTnVtYmVyKG4pIHx8IG4gPCAwIHx8IGlzTmFOKG4pKVxuICAgIHRocm93IFR5cGVFcnJvcignbiBtdXN0IGJlIGEgcG9zaXRpdmUgbnVtYmVyJyk7XG4gIHRoaXMuX21heExpc3RlbmVycyA9IG47XG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5lbWl0ID0gZnVuY3Rpb24odHlwZSkge1xuICB2YXIgZXIsIGhhbmRsZXIsIGxlbiwgYXJncywgaSwgbGlzdGVuZXJzO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuXG4gIC8vIElmIHRoZXJlIGlzIG5vICdlcnJvcicgZXZlbnQgbGlzdGVuZXIgdGhlbiB0aHJvdy5cbiAgaWYgKHR5cGUgPT09ICdlcnJvcicpIHtcbiAgICBpZiAoIXRoaXMuX2V2ZW50cy5lcnJvciB8fFxuICAgICAgICAoaXNPYmplY3QodGhpcy5fZXZlbnRzLmVycm9yKSAmJiAhdGhpcy5fZXZlbnRzLmVycm9yLmxlbmd0aCkpIHtcbiAgICAgIGVyID0gYXJndW1lbnRzWzFdO1xuICAgICAgaWYgKGVyIGluc3RhbmNlb2YgRXJyb3IpIHtcbiAgICAgICAgdGhyb3cgZXI7IC8vIFVuaGFuZGxlZCAnZXJyb3InIGV2ZW50XG4gICAgICB9XG4gICAgICB0aHJvdyBUeXBlRXJyb3IoJ1VuY2F1Z2h0LCB1bnNwZWNpZmllZCBcImVycm9yXCIgZXZlbnQuJyk7XG4gICAgfVxuICB9XG5cbiAgaGFuZGxlciA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuICBpZiAoaXNVbmRlZmluZWQoaGFuZGxlcikpXG4gICAgcmV0dXJuIGZhbHNlO1xuXG4gIGlmIChpc0Z1bmN0aW9uKGhhbmRsZXIpKSB7XG4gICAgc3dpdGNoIChhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICAvLyBmYXN0IGNhc2VzXG4gICAgICBjYXNlIDE6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDI6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0pO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMzpcbiAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMsIGFyZ3VtZW50c1sxXSwgYXJndW1lbnRzWzJdKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICAvLyBzbG93ZXJcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGxlbiA9IGFyZ3VtZW50cy5sZW5ndGg7XG4gICAgICAgIGFyZ3MgPSBuZXcgQXJyYXkobGVuIC0gMSk7XG4gICAgICAgIGZvciAoaSA9IDE7IGkgPCBsZW47IGkrKylcbiAgICAgICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcbiAgICAgICAgaGFuZGxlci5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICB9XG4gIH0gZWxzZSBpZiAoaXNPYmplY3QoaGFuZGxlcikpIHtcbiAgICBsZW4gPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgIGFyZ3MgPSBuZXcgQXJyYXkobGVuIC0gMSk7XG4gICAgZm9yIChpID0gMTsgaSA8IGxlbjsgaSsrKVxuICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG5cbiAgICBsaXN0ZW5lcnMgPSBoYW5kbGVyLnNsaWNlKCk7XG4gICAgbGVuID0gbGlzdGVuZXJzLmxlbmd0aDtcbiAgICBmb3IgKGkgPSAwOyBpIDwgbGVuOyBpKyspXG4gICAgICBsaXN0ZW5lcnNbaV0uYXBwbHkodGhpcywgYXJncyk7XG4gIH1cblxuICByZXR1cm4gdHJ1ZTtcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuYWRkTGlzdGVuZXIgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICB2YXIgbTtcblxuICBpZiAoIWlzRnVuY3Rpb24obGlzdGVuZXIpKVxuICAgIHRocm93IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMpXG4gICAgdGhpcy5fZXZlbnRzID0ge307XG5cbiAgLy8gVG8gYXZvaWQgcmVjdXJzaW9uIGluIHRoZSBjYXNlIHRoYXQgdHlwZSA9PT0gXCJuZXdMaXN0ZW5lclwiISBCZWZvcmVcbiAgLy8gYWRkaW5nIGl0IHRvIHRoZSBsaXN0ZW5lcnMsIGZpcnN0IGVtaXQgXCJuZXdMaXN0ZW5lclwiLlxuICBpZiAodGhpcy5fZXZlbnRzLm5ld0xpc3RlbmVyKVxuICAgIHRoaXMuZW1pdCgnbmV3TGlzdGVuZXInLCB0eXBlLFxuICAgICAgICAgICAgICBpc0Z1bmN0aW9uKGxpc3RlbmVyLmxpc3RlbmVyKSA/XG4gICAgICAgICAgICAgIGxpc3RlbmVyLmxpc3RlbmVyIDogbGlzdGVuZXIpO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgIC8vIE9wdGltaXplIHRoZSBjYXNlIG9mIG9uZSBsaXN0ZW5lci4gRG9uJ3QgbmVlZCB0aGUgZXh0cmEgYXJyYXkgb2JqZWN0LlxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXSA9IGxpc3RlbmVyO1xuICBlbHNlIGlmIChpc09iamVjdCh0aGlzLl9ldmVudHNbdHlwZV0pKVxuICAgIC8vIElmIHdlJ3ZlIGFscmVhZHkgZ290IGFuIGFycmF5LCBqdXN0IGFwcGVuZC5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0ucHVzaChsaXN0ZW5lcik7XG4gIGVsc2VcbiAgICAvLyBBZGRpbmcgdGhlIHNlY29uZCBlbGVtZW50LCBuZWVkIHRvIGNoYW5nZSB0byBhcnJheS5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0gPSBbdGhpcy5fZXZlbnRzW3R5cGVdLCBsaXN0ZW5lcl07XG5cbiAgLy8gQ2hlY2sgZm9yIGxpc3RlbmVyIGxlYWtcbiAgaWYgKGlzT2JqZWN0KHRoaXMuX2V2ZW50c1t0eXBlXSkgJiYgIXRoaXMuX2V2ZW50c1t0eXBlXS53YXJuZWQpIHtcbiAgICB2YXIgbTtcbiAgICBpZiAoIWlzVW5kZWZpbmVkKHRoaXMuX21heExpc3RlbmVycykpIHtcbiAgICAgIG0gPSB0aGlzLl9tYXhMaXN0ZW5lcnM7XG4gICAgfSBlbHNlIHtcbiAgICAgIG0gPSBFdmVudEVtaXR0ZXIuZGVmYXVsdE1heExpc3RlbmVycztcbiAgICB9XG5cbiAgICBpZiAobSAmJiBtID4gMCAmJiB0aGlzLl9ldmVudHNbdHlwZV0ubGVuZ3RoID4gbSkge1xuICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdLndhcm5lZCA9IHRydWU7XG4gICAgICBjb25zb2xlLmVycm9yKCcobm9kZSkgd2FybmluZzogcG9zc2libGUgRXZlbnRFbWl0dGVyIG1lbW9yeSAnICtcbiAgICAgICAgICAgICAgICAgICAgJ2xlYWsgZGV0ZWN0ZWQuICVkIGxpc3RlbmVycyBhZGRlZC4gJyArXG4gICAgICAgICAgICAgICAgICAgICdVc2UgZW1pdHRlci5zZXRNYXhMaXN0ZW5lcnMoKSB0byBpbmNyZWFzZSBsaW1pdC4nLFxuICAgICAgICAgICAgICAgICAgICB0aGlzLl9ldmVudHNbdHlwZV0ubGVuZ3RoKTtcbiAgICAgIGlmICh0eXBlb2YgY29uc29sZS50cmFjZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAvLyBub3Qgc3VwcG9ydGVkIGluIElFIDEwXG4gICAgICAgIGNvbnNvbGUudHJhY2UoKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUub24gPSBFdmVudEVtaXR0ZXIucHJvdG90eXBlLmFkZExpc3RlbmVyO1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uY2UgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICBpZiAoIWlzRnVuY3Rpb24obGlzdGVuZXIpKVxuICAgIHRocm93IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgdmFyIGZpcmVkID0gZmFsc2U7XG5cbiAgZnVuY3Rpb24gZygpIHtcbiAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGcpO1xuXG4gICAgaWYgKCFmaXJlZCkge1xuICAgICAgZmlyZWQgPSB0cnVlO1xuICAgICAgbGlzdGVuZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gIH1cblxuICBnLmxpc3RlbmVyID0gbGlzdGVuZXI7XG4gIHRoaXMub24odHlwZSwgZyk7XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vLyBlbWl0cyBhICdyZW1vdmVMaXN0ZW5lcicgZXZlbnQgaWZmIHRoZSBsaXN0ZW5lciB3YXMgcmVtb3ZlZFxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVMaXN0ZW5lciA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gIHZhciBsaXN0LCBwb3NpdGlvbiwgbGVuZ3RoLCBpO1xuXG4gIGlmICghaXNGdW5jdGlvbihsaXN0ZW5lcikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCdsaXN0ZW5lciBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcblxuICBpZiAoIXRoaXMuX2V2ZW50cyB8fCAhdGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgIHJldHVybiB0aGlzO1xuXG4gIGxpc3QgPSB0aGlzLl9ldmVudHNbdHlwZV07XG4gIGxlbmd0aCA9IGxpc3QubGVuZ3RoO1xuICBwb3NpdGlvbiA9IC0xO1xuXG4gIGlmIChsaXN0ID09PSBsaXN0ZW5lciB8fFxuICAgICAgKGlzRnVuY3Rpb24obGlzdC5saXN0ZW5lcikgJiYgbGlzdC5saXN0ZW5lciA9PT0gbGlzdGVuZXIpKSB7XG4gICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICBpZiAodGhpcy5fZXZlbnRzLnJlbW92ZUxpc3RlbmVyKVxuICAgICAgdGhpcy5lbWl0KCdyZW1vdmVMaXN0ZW5lcicsIHR5cGUsIGxpc3RlbmVyKTtcblxuICB9IGVsc2UgaWYgKGlzT2JqZWN0KGxpc3QpKSB7XG4gICAgZm9yIChpID0gbGVuZ3RoOyBpLS0gPiAwOykge1xuICAgICAgaWYgKGxpc3RbaV0gPT09IGxpc3RlbmVyIHx8XG4gICAgICAgICAgKGxpc3RbaV0ubGlzdGVuZXIgJiYgbGlzdFtpXS5saXN0ZW5lciA9PT0gbGlzdGVuZXIpKSB7XG4gICAgICAgIHBvc2l0aW9uID0gaTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHBvc2l0aW9uIDwgMClcbiAgICAgIHJldHVybiB0aGlzO1xuXG4gICAgaWYgKGxpc3QubGVuZ3RoID09PSAxKSB7XG4gICAgICBsaXN0Lmxlbmd0aCA9IDA7XG4gICAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgIH0gZWxzZSB7XG4gICAgICBsaXN0LnNwbGljZShwb3NpdGlvbiwgMSk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcilcbiAgICAgIHRoaXMuZW1pdCgncmVtb3ZlTGlzdGVuZXInLCB0eXBlLCBsaXN0ZW5lcik7XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlQWxsTGlzdGVuZXJzID0gZnVuY3Rpb24odHlwZSkge1xuICB2YXIga2V5LCBsaXN0ZW5lcnM7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMpXG4gICAgcmV0dXJuIHRoaXM7XG5cbiAgLy8gbm90IGxpc3RlbmluZyBmb3IgcmVtb3ZlTGlzdGVuZXIsIG5vIG5lZWQgdG8gZW1pdFxuICBpZiAoIXRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcikge1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKVxuICAgICAgdGhpcy5fZXZlbnRzID0ge307XG4gICAgZWxzZSBpZiAodGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8vIGVtaXQgcmVtb3ZlTGlzdGVuZXIgZm9yIGFsbCBsaXN0ZW5lcnMgb24gYWxsIGV2ZW50c1xuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgIGZvciAoa2V5IGluIHRoaXMuX2V2ZW50cykge1xuICAgICAgaWYgKGtleSA9PT0gJ3JlbW92ZUxpc3RlbmVyJykgY29udGludWU7XG4gICAgICB0aGlzLnJlbW92ZUFsbExpc3RlbmVycyhrZXkpO1xuICAgIH1cbiAgICB0aGlzLnJlbW92ZUFsbExpc3RlbmVycygncmVtb3ZlTGlzdGVuZXInKTtcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIGxpc3RlbmVycyA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuICBpZiAoaXNGdW5jdGlvbihsaXN0ZW5lcnMpKSB7XG4gICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lcnMpO1xuICB9IGVsc2Uge1xuICAgIC8vIExJRk8gb3JkZXJcbiAgICB3aGlsZSAobGlzdGVuZXJzLmxlbmd0aClcbiAgICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSwgbGlzdGVuZXJzW2xpc3RlbmVycy5sZW5ndGggLSAxXSk7XG4gIH1cbiAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUubGlzdGVuZXJzID0gZnVuY3Rpb24odHlwZSkge1xuICB2YXIgcmV0O1xuICBpZiAoIXRoaXMuX2V2ZW50cyB8fCAhdGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgIHJldCA9IFtdO1xuICBlbHNlIGlmIChpc0Z1bmN0aW9uKHRoaXMuX2V2ZW50c1t0eXBlXSkpXG4gICAgcmV0ID0gW3RoaXMuX2V2ZW50c1t0eXBlXV07XG4gIGVsc2VcbiAgICByZXQgPSB0aGlzLl9ldmVudHNbdHlwZV0uc2xpY2UoKTtcbiAgcmV0dXJuIHJldDtcbn07XG5cbkV2ZW50RW1pdHRlci5saXN0ZW5lckNvdW50ID0gZnVuY3Rpb24oZW1pdHRlciwgdHlwZSkge1xuICB2YXIgcmV0O1xuICBpZiAoIWVtaXR0ZXIuX2V2ZW50cyB8fCAhZW1pdHRlci5fZXZlbnRzW3R5cGVdKVxuICAgIHJldCA9IDA7XG4gIGVsc2UgaWYgKGlzRnVuY3Rpb24oZW1pdHRlci5fZXZlbnRzW3R5cGVdKSlcbiAgICByZXQgPSAxO1xuICBlbHNlXG4gICAgcmV0ID0gZW1pdHRlci5fZXZlbnRzW3R5cGVdLmxlbmd0aDtcbiAgcmV0dXJuIHJldDtcbn07XG5cbmZ1bmN0aW9uIGlzRnVuY3Rpb24oYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnZnVuY3Rpb24nO1xufVxuXG5mdW5jdGlvbiBpc051bWJlcihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdudW1iZXInO1xufVxuXG5mdW5jdGlvbiBpc09iamVjdChhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdvYmplY3QnICYmIGFyZyAhPT0gbnVsbDtcbn1cblxuZnVuY3Rpb24gaXNVbmRlZmluZWQoYXJnKSB7XG4gIHJldHVybiBhcmcgPT09IHZvaWQgMDtcbn1cbiIsIi8vIHNoaW0gZm9yIHVzaW5nIHByb2Nlc3MgaW4gYnJvd3NlclxuXG52YXIgcHJvY2VzcyA9IG1vZHVsZS5leHBvcnRzID0ge307XG52YXIgcXVldWUgPSBbXTtcbnZhciBkcmFpbmluZyA9IGZhbHNlO1xudmFyIGN1cnJlbnRRdWV1ZTtcbnZhciBxdWV1ZUluZGV4ID0gLTE7XG5cbmZ1bmN0aW9uIGNsZWFuVXBOZXh0VGljaygpIHtcbiAgICBkcmFpbmluZyA9IGZhbHNlO1xuICAgIGlmIChjdXJyZW50UXVldWUubGVuZ3RoKSB7XG4gICAgICAgIHF1ZXVlID0gY3VycmVudFF1ZXVlLmNvbmNhdChxdWV1ZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcXVldWVJbmRleCA9IC0xO1xuICAgIH1cbiAgICBpZiAocXVldWUubGVuZ3RoKSB7XG4gICAgICAgIGRyYWluUXVldWUoKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGRyYWluUXVldWUoKSB7XG4gICAgaWYgKGRyYWluaW5nKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIHRpbWVvdXQgPSBzZXRUaW1lb3V0KGNsZWFuVXBOZXh0VGljayk7XG4gICAgZHJhaW5pbmcgPSB0cnVlO1xuXG4gICAgdmFyIGxlbiA9IHF1ZXVlLmxlbmd0aDtcbiAgICB3aGlsZShsZW4pIHtcbiAgICAgICAgY3VycmVudFF1ZXVlID0gcXVldWU7XG4gICAgICAgIHF1ZXVlID0gW107XG4gICAgICAgIHdoaWxlICgrK3F1ZXVlSW5kZXggPCBsZW4pIHtcbiAgICAgICAgICAgIGN1cnJlbnRRdWV1ZVtxdWV1ZUluZGV4XS5ydW4oKTtcbiAgICAgICAgfVxuICAgICAgICBxdWV1ZUluZGV4ID0gLTE7XG4gICAgICAgIGxlbiA9IHF1ZXVlLmxlbmd0aDtcbiAgICB9XG4gICAgY3VycmVudFF1ZXVlID0gbnVsbDtcbiAgICBkcmFpbmluZyA9IGZhbHNlO1xuICAgIGNsZWFyVGltZW91dCh0aW1lb3V0KTtcbn1cblxucHJvY2Vzcy5uZXh0VGljayA9IGZ1bmN0aW9uIChmdW4pIHtcbiAgICB2YXIgYXJncyA9IG5ldyBBcnJheShhcmd1bWVudHMubGVuZ3RoIC0gMSk7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAxKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBxdWV1ZS5wdXNoKG5ldyBJdGVtKGZ1biwgYXJncykpO1xuICAgIGlmIChxdWV1ZS5sZW5ndGggPT09IDEgJiYgIWRyYWluaW5nKSB7XG4gICAgICAgIHNldFRpbWVvdXQoZHJhaW5RdWV1ZSwgMCk7XG4gICAgfVxufTtcblxuLy8gdjggbGlrZXMgcHJlZGljdGlibGUgb2JqZWN0c1xuZnVuY3Rpb24gSXRlbShmdW4sIGFycmF5KSB7XG4gICAgdGhpcy5mdW4gPSBmdW47XG4gICAgdGhpcy5hcnJheSA9IGFycmF5O1xufVxuSXRlbS5wcm90b3R5cGUucnVuID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuZnVuLmFwcGx5KG51bGwsIHRoaXMuYXJyYXkpO1xufTtcbnByb2Nlc3MudGl0bGUgPSAnYnJvd3Nlcic7XG5wcm9jZXNzLmJyb3dzZXIgPSB0cnVlO1xucHJvY2Vzcy5lbnYgPSB7fTtcbnByb2Nlc3MuYXJndiA9IFtdO1xucHJvY2Vzcy52ZXJzaW9uID0gJyc7IC8vIGVtcHR5IHN0cmluZyB0byBhdm9pZCByZWdleHAgaXNzdWVzXG5wcm9jZXNzLnZlcnNpb25zID0ge307XG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuXG5wcm9jZXNzLm9uID0gbm9vcDtcbnByb2Nlc3MuYWRkTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5vbmNlID0gbm9vcDtcbnByb2Nlc3Mub2ZmID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBub29wO1xucHJvY2Vzcy5lbWl0ID0gbm9vcDtcblxucHJvY2Vzcy5iaW5kaW5nID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuYmluZGluZyBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xuXG4vLyBUT0RPKHNodHlsbWFuKVxucHJvY2Vzcy5jd2QgPSBmdW5jdGlvbiAoKSB7IHJldHVybiAnLycgfTtcbnByb2Nlc3MuY2hkaXIgPSBmdW5jdGlvbiAoZGlyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmNoZGlyIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5wcm9jZXNzLnVtYXNrID0gZnVuY3Rpb24oKSB7IHJldHVybiAwOyB9O1xuIiwiLyoqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTQtMjAxNSwgRmFjZWJvb2ssIEluYy5cbiAqIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4gKlxuICogVGhpcyBzb3VyY2UgY29kZSBpcyBsaWNlbnNlZCB1bmRlciB0aGUgQlNELXN0eWxlIGxpY2Vuc2UgZm91bmQgaW4gdGhlXG4gKiBMSUNFTlNFIGZpbGUgaW4gdGhlIHJvb3QgZGlyZWN0b3J5IG9mIHRoaXMgc291cmNlIHRyZWUuIEFuIGFkZGl0aW9uYWwgZ3JhbnRcbiAqIG9mIHBhdGVudCByaWdodHMgY2FuIGJlIGZvdW5kIGluIHRoZSBQQVRFTlRTIGZpbGUgaW4gdGhlIHNhbWUgZGlyZWN0b3J5LlxuICovXG5cbm1vZHVsZS5leHBvcnRzLkRpc3BhdGNoZXIgPSByZXF1aXJlKCcuL2xpYi9EaXNwYXRjaGVyJyk7XG4iLCIvKipcbiAqIENvcHlyaWdodCAoYykgMjAxNC0yMDE1LCBGYWNlYm9vaywgSW5jLlxuICogQWxsIHJpZ2h0cyByZXNlcnZlZC5cbiAqXG4gKiBUaGlzIHNvdXJjZSBjb2RlIGlzIGxpY2Vuc2VkIHVuZGVyIHRoZSBCU0Qtc3R5bGUgbGljZW5zZSBmb3VuZCBpbiB0aGVcbiAqIExJQ0VOU0UgZmlsZSBpbiB0aGUgcm9vdCBkaXJlY3Rvcnkgb2YgdGhpcyBzb3VyY2UgdHJlZS4gQW4gYWRkaXRpb25hbCBncmFudFxuICogb2YgcGF0ZW50IHJpZ2h0cyBjYW4gYmUgZm91bmQgaW4gdGhlIFBBVEVOVFMgZmlsZSBpbiB0aGUgc2FtZSBkaXJlY3RvcnkuXG4gKlxuICogQHByb3ZpZGVzTW9kdWxlIERpc3BhdGNoZXJcbiAqIFxuICogQHByZXZlbnRNdW5nZVxuICovXG5cbid1c2Ugc3RyaWN0JztcblxuZXhwb3J0cy5fX2VzTW9kdWxlID0gdHJ1ZTtcblxuZnVuY3Rpb24gX2NsYXNzQ2FsbENoZWNrKGluc3RhbmNlLCBDb25zdHJ1Y3RvcikgeyBpZiAoIShpbnN0YW5jZSBpbnN0YW5jZW9mIENvbnN0cnVjdG9yKSkgeyB0aHJvdyBuZXcgVHlwZUVycm9yKCdDYW5ub3QgY2FsbCBhIGNsYXNzIGFzIGEgZnVuY3Rpb24nKTsgfSB9XG5cbnZhciBpbnZhcmlhbnQgPSByZXF1aXJlKCdmYmpzL2xpYi9pbnZhcmlhbnQnKTtcblxudmFyIF9wcmVmaXggPSAnSURfJztcblxuLyoqXG4gKiBEaXNwYXRjaGVyIGlzIHVzZWQgdG8gYnJvYWRjYXN0IHBheWxvYWRzIHRvIHJlZ2lzdGVyZWQgY2FsbGJhY2tzLiBUaGlzIGlzXG4gKiBkaWZmZXJlbnQgZnJvbSBnZW5lcmljIHB1Yi1zdWIgc3lzdGVtcyBpbiB0d28gd2F5czpcbiAqXG4gKiAgIDEpIENhbGxiYWNrcyBhcmUgbm90IHN1YnNjcmliZWQgdG8gcGFydGljdWxhciBldmVudHMuIEV2ZXJ5IHBheWxvYWQgaXNcbiAqICAgICAgZGlzcGF0Y2hlZCB0byBldmVyeSByZWdpc3RlcmVkIGNhbGxiYWNrLlxuICogICAyKSBDYWxsYmFja3MgY2FuIGJlIGRlZmVycmVkIGluIHdob2xlIG9yIHBhcnQgdW50aWwgb3RoZXIgY2FsbGJhY2tzIGhhdmVcbiAqICAgICAgYmVlbiBleGVjdXRlZC5cbiAqXG4gKiBGb3IgZXhhbXBsZSwgY29uc2lkZXIgdGhpcyBoeXBvdGhldGljYWwgZmxpZ2h0IGRlc3RpbmF0aW9uIGZvcm0sIHdoaWNoXG4gKiBzZWxlY3RzIGEgZGVmYXVsdCBjaXR5IHdoZW4gYSBjb3VudHJ5IGlzIHNlbGVjdGVkOlxuICpcbiAqICAgdmFyIGZsaWdodERpc3BhdGNoZXIgPSBuZXcgRGlzcGF0Y2hlcigpO1xuICpcbiAqICAgLy8gS2VlcHMgdHJhY2sgb2Ygd2hpY2ggY291bnRyeSBpcyBzZWxlY3RlZFxuICogICB2YXIgQ291bnRyeVN0b3JlID0ge2NvdW50cnk6IG51bGx9O1xuICpcbiAqICAgLy8gS2VlcHMgdHJhY2sgb2Ygd2hpY2ggY2l0eSBpcyBzZWxlY3RlZFxuICogICB2YXIgQ2l0eVN0b3JlID0ge2NpdHk6IG51bGx9O1xuICpcbiAqICAgLy8gS2VlcHMgdHJhY2sgb2YgdGhlIGJhc2UgZmxpZ2h0IHByaWNlIG9mIHRoZSBzZWxlY3RlZCBjaXR5XG4gKiAgIHZhciBGbGlnaHRQcmljZVN0b3JlID0ge3ByaWNlOiBudWxsfVxuICpcbiAqIFdoZW4gYSB1c2VyIGNoYW5nZXMgdGhlIHNlbGVjdGVkIGNpdHksIHdlIGRpc3BhdGNoIHRoZSBwYXlsb2FkOlxuICpcbiAqICAgZmxpZ2h0RGlzcGF0Y2hlci5kaXNwYXRjaCh7XG4gKiAgICAgYWN0aW9uVHlwZTogJ2NpdHktdXBkYXRlJyxcbiAqICAgICBzZWxlY3RlZENpdHk6ICdwYXJpcydcbiAqICAgfSk7XG4gKlxuICogVGhpcyBwYXlsb2FkIGlzIGRpZ2VzdGVkIGJ5IGBDaXR5U3RvcmVgOlxuICpcbiAqICAgZmxpZ2h0RGlzcGF0Y2hlci5yZWdpc3RlcihmdW5jdGlvbihwYXlsb2FkKSB7XG4gKiAgICAgaWYgKHBheWxvYWQuYWN0aW9uVHlwZSA9PT0gJ2NpdHktdXBkYXRlJykge1xuICogICAgICAgQ2l0eVN0b3JlLmNpdHkgPSBwYXlsb2FkLnNlbGVjdGVkQ2l0eTtcbiAqICAgICB9XG4gKiAgIH0pO1xuICpcbiAqIFdoZW4gdGhlIHVzZXIgc2VsZWN0cyBhIGNvdW50cnksIHdlIGRpc3BhdGNoIHRoZSBwYXlsb2FkOlxuICpcbiAqICAgZmxpZ2h0RGlzcGF0Y2hlci5kaXNwYXRjaCh7XG4gKiAgICAgYWN0aW9uVHlwZTogJ2NvdW50cnktdXBkYXRlJyxcbiAqICAgICBzZWxlY3RlZENvdW50cnk6ICdhdXN0cmFsaWEnXG4gKiAgIH0pO1xuICpcbiAqIFRoaXMgcGF5bG9hZCBpcyBkaWdlc3RlZCBieSBib3RoIHN0b3JlczpcbiAqXG4gKiAgIENvdW50cnlTdG9yZS5kaXNwYXRjaFRva2VuID0gZmxpZ2h0RGlzcGF0Y2hlci5yZWdpc3RlcihmdW5jdGlvbihwYXlsb2FkKSB7XG4gKiAgICAgaWYgKHBheWxvYWQuYWN0aW9uVHlwZSA9PT0gJ2NvdW50cnktdXBkYXRlJykge1xuICogICAgICAgQ291bnRyeVN0b3JlLmNvdW50cnkgPSBwYXlsb2FkLnNlbGVjdGVkQ291bnRyeTtcbiAqICAgICB9XG4gKiAgIH0pO1xuICpcbiAqIFdoZW4gdGhlIGNhbGxiYWNrIHRvIHVwZGF0ZSBgQ291bnRyeVN0b3JlYCBpcyByZWdpc3RlcmVkLCB3ZSBzYXZlIGEgcmVmZXJlbmNlXG4gKiB0byB0aGUgcmV0dXJuZWQgdG9rZW4uIFVzaW5nIHRoaXMgdG9rZW4gd2l0aCBgd2FpdEZvcigpYCwgd2UgY2FuIGd1YXJhbnRlZVxuICogdGhhdCBgQ291bnRyeVN0b3JlYCBpcyB1cGRhdGVkIGJlZm9yZSB0aGUgY2FsbGJhY2sgdGhhdCB1cGRhdGVzIGBDaXR5U3RvcmVgXG4gKiBuZWVkcyB0byBxdWVyeSBpdHMgZGF0YS5cbiAqXG4gKiAgIENpdHlTdG9yZS5kaXNwYXRjaFRva2VuID0gZmxpZ2h0RGlzcGF0Y2hlci5yZWdpc3RlcihmdW5jdGlvbihwYXlsb2FkKSB7XG4gKiAgICAgaWYgKHBheWxvYWQuYWN0aW9uVHlwZSA9PT0gJ2NvdW50cnktdXBkYXRlJykge1xuICogICAgICAgLy8gYENvdW50cnlTdG9yZS5jb3VudHJ5YCBtYXkgbm90IGJlIHVwZGF0ZWQuXG4gKiAgICAgICBmbGlnaHREaXNwYXRjaGVyLndhaXRGb3IoW0NvdW50cnlTdG9yZS5kaXNwYXRjaFRva2VuXSk7XG4gKiAgICAgICAvLyBgQ291bnRyeVN0b3JlLmNvdW50cnlgIGlzIG5vdyBndWFyYW50ZWVkIHRvIGJlIHVwZGF0ZWQuXG4gKlxuICogICAgICAgLy8gU2VsZWN0IHRoZSBkZWZhdWx0IGNpdHkgZm9yIHRoZSBuZXcgY291bnRyeVxuICogICAgICAgQ2l0eVN0b3JlLmNpdHkgPSBnZXREZWZhdWx0Q2l0eUZvckNvdW50cnkoQ291bnRyeVN0b3JlLmNvdW50cnkpO1xuICogICAgIH1cbiAqICAgfSk7XG4gKlxuICogVGhlIHVzYWdlIG9mIGB3YWl0Rm9yKClgIGNhbiBiZSBjaGFpbmVkLCBmb3IgZXhhbXBsZTpcbiAqXG4gKiAgIEZsaWdodFByaWNlU3RvcmUuZGlzcGF0Y2hUb2tlbiA9XG4gKiAgICAgZmxpZ2h0RGlzcGF0Y2hlci5yZWdpc3RlcihmdW5jdGlvbihwYXlsb2FkKSB7XG4gKiAgICAgICBzd2l0Y2ggKHBheWxvYWQuYWN0aW9uVHlwZSkge1xuICogICAgICAgICBjYXNlICdjb3VudHJ5LXVwZGF0ZSc6XG4gKiAgICAgICAgIGNhc2UgJ2NpdHktdXBkYXRlJzpcbiAqICAgICAgICAgICBmbGlnaHREaXNwYXRjaGVyLndhaXRGb3IoW0NpdHlTdG9yZS5kaXNwYXRjaFRva2VuXSk7XG4gKiAgICAgICAgICAgRmxpZ2h0UHJpY2VTdG9yZS5wcmljZSA9XG4gKiAgICAgICAgICAgICBnZXRGbGlnaHRQcmljZVN0b3JlKENvdW50cnlTdG9yZS5jb3VudHJ5LCBDaXR5U3RvcmUuY2l0eSk7XG4gKiAgICAgICAgICAgYnJlYWs7XG4gKiAgICAgfVxuICogICB9KTtcbiAqXG4gKiBUaGUgYGNvdW50cnktdXBkYXRlYCBwYXlsb2FkIHdpbGwgYmUgZ3VhcmFudGVlZCB0byBpbnZva2UgdGhlIHN0b3JlcydcbiAqIHJlZ2lzdGVyZWQgY2FsbGJhY2tzIGluIG9yZGVyOiBgQ291bnRyeVN0b3JlYCwgYENpdHlTdG9yZWAsIHRoZW5cbiAqIGBGbGlnaHRQcmljZVN0b3JlYC5cbiAqL1xuXG52YXIgRGlzcGF0Y2hlciA9IChmdW5jdGlvbiAoKSB7XG4gIGZ1bmN0aW9uIERpc3BhdGNoZXIoKSB7XG4gICAgX2NsYXNzQ2FsbENoZWNrKHRoaXMsIERpc3BhdGNoZXIpO1xuXG4gICAgdGhpcy5fY2FsbGJhY2tzID0ge307XG4gICAgdGhpcy5faXNEaXNwYXRjaGluZyA9IGZhbHNlO1xuICAgIHRoaXMuX2lzSGFuZGxlZCA9IHt9O1xuICAgIHRoaXMuX2lzUGVuZGluZyA9IHt9O1xuICAgIHRoaXMuX2xhc3RJRCA9IDE7XG4gIH1cblxuICAvKipcbiAgICogUmVnaXN0ZXJzIGEgY2FsbGJhY2sgdG8gYmUgaW52b2tlZCB3aXRoIGV2ZXJ5IGRpc3BhdGNoZWQgcGF5bG9hZC4gUmV0dXJuc1xuICAgKiBhIHRva2VuIHRoYXQgY2FuIGJlIHVzZWQgd2l0aCBgd2FpdEZvcigpYC5cbiAgICovXG5cbiAgRGlzcGF0Y2hlci5wcm90b3R5cGUucmVnaXN0ZXIgPSBmdW5jdGlvbiByZWdpc3RlcihjYWxsYmFjaykge1xuICAgIHZhciBpZCA9IF9wcmVmaXggKyB0aGlzLl9sYXN0SUQrKztcbiAgICB0aGlzLl9jYWxsYmFja3NbaWRdID0gY2FsbGJhY2s7XG4gICAgcmV0dXJuIGlkO1xuICB9O1xuXG4gIC8qKlxuICAgKiBSZW1vdmVzIGEgY2FsbGJhY2sgYmFzZWQgb24gaXRzIHRva2VuLlxuICAgKi9cblxuICBEaXNwYXRjaGVyLnByb3RvdHlwZS51bnJlZ2lzdGVyID0gZnVuY3Rpb24gdW5yZWdpc3RlcihpZCkge1xuICAgICF0aGlzLl9jYWxsYmFja3NbaWRdID8gcHJvY2Vzcy5lbnYuTk9ERV9FTlYgIT09ICdwcm9kdWN0aW9uJyA/IGludmFyaWFudChmYWxzZSwgJ0Rpc3BhdGNoZXIudW5yZWdpc3RlciguLi4pOiBgJXNgIGRvZXMgbm90IG1hcCB0byBhIHJlZ2lzdGVyZWQgY2FsbGJhY2suJywgaWQpIDogaW52YXJpYW50KGZhbHNlKSA6IHVuZGVmaW5lZDtcbiAgICBkZWxldGUgdGhpcy5fY2FsbGJhY2tzW2lkXTtcbiAgfTtcblxuICAvKipcbiAgICogV2FpdHMgZm9yIHRoZSBjYWxsYmFja3Mgc3BlY2lmaWVkIHRvIGJlIGludm9rZWQgYmVmb3JlIGNvbnRpbnVpbmcgZXhlY3V0aW9uXG4gICAqIG9mIHRoZSBjdXJyZW50IGNhbGxiYWNrLiBUaGlzIG1ldGhvZCBzaG91bGQgb25seSBiZSB1c2VkIGJ5IGEgY2FsbGJhY2sgaW5cbiAgICogcmVzcG9uc2UgdG8gYSBkaXNwYXRjaGVkIHBheWxvYWQuXG4gICAqL1xuXG4gIERpc3BhdGNoZXIucHJvdG90eXBlLndhaXRGb3IgPSBmdW5jdGlvbiB3YWl0Rm9yKGlkcykge1xuICAgICF0aGlzLl9pc0Rpc3BhdGNoaW5nID8gcHJvY2Vzcy5lbnYuTk9ERV9FTlYgIT09ICdwcm9kdWN0aW9uJyA/IGludmFyaWFudChmYWxzZSwgJ0Rpc3BhdGNoZXIud2FpdEZvciguLi4pOiBNdXN0IGJlIGludm9rZWQgd2hpbGUgZGlzcGF0Y2hpbmcuJykgOiBpbnZhcmlhbnQoZmFsc2UpIDogdW5kZWZpbmVkO1xuICAgIGZvciAodmFyIGlpID0gMDsgaWkgPCBpZHMubGVuZ3RoOyBpaSsrKSB7XG4gICAgICB2YXIgaWQgPSBpZHNbaWldO1xuICAgICAgaWYgKHRoaXMuX2lzUGVuZGluZ1tpZF0pIHtcbiAgICAgICAgIXRoaXMuX2lzSGFuZGxlZFtpZF0gPyBwcm9jZXNzLmVudi5OT0RFX0VOViAhPT0gJ3Byb2R1Y3Rpb24nID8gaW52YXJpYW50KGZhbHNlLCAnRGlzcGF0Y2hlci53YWl0Rm9yKC4uLik6IENpcmN1bGFyIGRlcGVuZGVuY3kgZGV0ZWN0ZWQgd2hpbGUgJyArICd3YWl0aW5nIGZvciBgJXNgLicsIGlkKSA6IGludmFyaWFudChmYWxzZSkgOiB1bmRlZmluZWQ7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgIXRoaXMuX2NhbGxiYWNrc1tpZF0gPyBwcm9jZXNzLmVudi5OT0RFX0VOViAhPT0gJ3Byb2R1Y3Rpb24nID8gaW52YXJpYW50KGZhbHNlLCAnRGlzcGF0Y2hlci53YWl0Rm9yKC4uLik6IGAlc2AgZG9lcyBub3QgbWFwIHRvIGEgcmVnaXN0ZXJlZCBjYWxsYmFjay4nLCBpZCkgOiBpbnZhcmlhbnQoZmFsc2UpIDogdW5kZWZpbmVkO1xuICAgICAgdGhpcy5faW52b2tlQ2FsbGJhY2soaWQpO1xuICAgIH1cbiAgfTtcblxuICAvKipcbiAgICogRGlzcGF0Y2hlcyBhIHBheWxvYWQgdG8gYWxsIHJlZ2lzdGVyZWQgY2FsbGJhY2tzLlxuICAgKi9cblxuICBEaXNwYXRjaGVyLnByb3RvdHlwZS5kaXNwYXRjaCA9IGZ1bmN0aW9uIGRpc3BhdGNoKHBheWxvYWQpIHtcbiAgICAhIXRoaXMuX2lzRGlzcGF0Y2hpbmcgPyBwcm9jZXNzLmVudi5OT0RFX0VOViAhPT0gJ3Byb2R1Y3Rpb24nID8gaW52YXJpYW50KGZhbHNlLCAnRGlzcGF0Y2guZGlzcGF0Y2goLi4uKTogQ2Fubm90IGRpc3BhdGNoIGluIHRoZSBtaWRkbGUgb2YgYSBkaXNwYXRjaC4nKSA6IGludmFyaWFudChmYWxzZSkgOiB1bmRlZmluZWQ7XG4gICAgdGhpcy5fc3RhcnREaXNwYXRjaGluZyhwYXlsb2FkKTtcbiAgICB0cnkge1xuICAgICAgZm9yICh2YXIgaWQgaW4gdGhpcy5fY2FsbGJhY2tzKSB7XG4gICAgICAgIGlmICh0aGlzLl9pc1BlbmRpbmdbaWRdKSB7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5faW52b2tlQ2FsbGJhY2soaWQpO1xuICAgICAgfVxuICAgIH0gZmluYWxseSB7XG4gICAgICB0aGlzLl9zdG9wRGlzcGF0Y2hpbmcoKTtcbiAgICB9XG4gIH07XG5cbiAgLyoqXG4gICAqIElzIHRoaXMgRGlzcGF0Y2hlciBjdXJyZW50bHkgZGlzcGF0Y2hpbmcuXG4gICAqL1xuXG4gIERpc3BhdGNoZXIucHJvdG90eXBlLmlzRGlzcGF0Y2hpbmcgPSBmdW5jdGlvbiBpc0Rpc3BhdGNoaW5nKCkge1xuICAgIHJldHVybiB0aGlzLl9pc0Rpc3BhdGNoaW5nO1xuICB9O1xuXG4gIC8qKlxuICAgKiBDYWxsIHRoZSBjYWxsYmFjayBzdG9yZWQgd2l0aCB0aGUgZ2l2ZW4gaWQuIEFsc28gZG8gc29tZSBpbnRlcm5hbFxuICAgKiBib29ra2VlcGluZy5cbiAgICpcbiAgICogQGludGVybmFsXG4gICAqL1xuXG4gIERpc3BhdGNoZXIucHJvdG90eXBlLl9pbnZva2VDYWxsYmFjayA9IGZ1bmN0aW9uIF9pbnZva2VDYWxsYmFjayhpZCkge1xuICAgIHRoaXMuX2lzUGVuZGluZ1tpZF0gPSB0cnVlO1xuICAgIHRoaXMuX2NhbGxiYWNrc1tpZF0odGhpcy5fcGVuZGluZ1BheWxvYWQpO1xuICAgIHRoaXMuX2lzSGFuZGxlZFtpZF0gPSB0cnVlO1xuICB9O1xuXG4gIC8qKlxuICAgKiBTZXQgdXAgYm9va2tlZXBpbmcgbmVlZGVkIHdoZW4gZGlzcGF0Y2hpbmcuXG4gICAqXG4gICAqIEBpbnRlcm5hbFxuICAgKi9cblxuICBEaXNwYXRjaGVyLnByb3RvdHlwZS5fc3RhcnREaXNwYXRjaGluZyA9IGZ1bmN0aW9uIF9zdGFydERpc3BhdGNoaW5nKHBheWxvYWQpIHtcbiAgICBmb3IgKHZhciBpZCBpbiB0aGlzLl9jYWxsYmFja3MpIHtcbiAgICAgIHRoaXMuX2lzUGVuZGluZ1tpZF0gPSBmYWxzZTtcbiAgICAgIHRoaXMuX2lzSGFuZGxlZFtpZF0gPSBmYWxzZTtcbiAgICB9XG4gICAgdGhpcy5fcGVuZGluZ1BheWxvYWQgPSBwYXlsb2FkO1xuICAgIHRoaXMuX2lzRGlzcGF0Y2hpbmcgPSB0cnVlO1xuICB9O1xuXG4gIC8qKlxuICAgKiBDbGVhciBib29ra2VlcGluZyB1c2VkIGZvciBkaXNwYXRjaGluZy5cbiAgICpcbiAgICogQGludGVybmFsXG4gICAqL1xuXG4gIERpc3BhdGNoZXIucHJvdG90eXBlLl9zdG9wRGlzcGF0Y2hpbmcgPSBmdW5jdGlvbiBfc3RvcERpc3BhdGNoaW5nKCkge1xuICAgIGRlbGV0ZSB0aGlzLl9wZW5kaW5nUGF5bG9hZDtcbiAgICB0aGlzLl9pc0Rpc3BhdGNoaW5nID0gZmFsc2U7XG4gIH07XG5cbiAgcmV0dXJuIERpc3BhdGNoZXI7XG59KSgpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IERpc3BhdGNoZXI7IiwiLyoqXG4gKiBDb3B5cmlnaHQgMjAxMy0yMDE1LCBGYWNlYm9vaywgSW5jLlxuICogQWxsIHJpZ2h0cyByZXNlcnZlZC5cbiAqXG4gKiBUaGlzIHNvdXJjZSBjb2RlIGlzIGxpY2Vuc2VkIHVuZGVyIHRoZSBCU0Qtc3R5bGUgbGljZW5zZSBmb3VuZCBpbiB0aGVcbiAqIExJQ0VOU0UgZmlsZSBpbiB0aGUgcm9vdCBkaXJlY3Rvcnkgb2YgdGhpcyBzb3VyY2UgdHJlZS4gQW4gYWRkaXRpb25hbCBncmFudFxuICogb2YgcGF0ZW50IHJpZ2h0cyBjYW4gYmUgZm91bmQgaW4gdGhlIFBBVEVOVFMgZmlsZSBpbiB0aGUgc2FtZSBkaXJlY3RvcnkuXG4gKlxuICogQHByb3ZpZGVzTW9kdWxlIGludmFyaWFudFxuICovXG5cblwidXNlIHN0cmljdFwiO1xuXG4vKipcbiAqIFVzZSBpbnZhcmlhbnQoKSB0byBhc3NlcnQgc3RhdGUgd2hpY2ggeW91ciBwcm9ncmFtIGFzc3VtZXMgdG8gYmUgdHJ1ZS5cbiAqXG4gKiBQcm92aWRlIHNwcmludGYtc3R5bGUgZm9ybWF0IChvbmx5ICVzIGlzIHN1cHBvcnRlZCkgYW5kIGFyZ3VtZW50c1xuICogdG8gcHJvdmlkZSBpbmZvcm1hdGlvbiBhYm91dCB3aGF0IGJyb2tlIGFuZCB3aGF0IHlvdSB3ZXJlXG4gKiBleHBlY3RpbmcuXG4gKlxuICogVGhlIGludmFyaWFudCBtZXNzYWdlIHdpbGwgYmUgc3RyaXBwZWQgaW4gcHJvZHVjdGlvbiwgYnV0IHRoZSBpbnZhcmlhbnRcbiAqIHdpbGwgcmVtYWluIHRvIGVuc3VyZSBsb2dpYyBkb2VzIG5vdCBkaWZmZXIgaW4gcHJvZHVjdGlvbi5cbiAqL1xuXG52YXIgaW52YXJpYW50ID0gZnVuY3Rpb24gKGNvbmRpdGlvbiwgZm9ybWF0LCBhLCBiLCBjLCBkLCBlLCBmKSB7XG4gIGlmIChwcm9jZXNzLmVudi5OT0RFX0VOViAhPT0gJ3Byb2R1Y3Rpb24nKSB7XG4gICAgaWYgKGZvcm1hdCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ2ludmFyaWFudCByZXF1aXJlcyBhbiBlcnJvciBtZXNzYWdlIGFyZ3VtZW50Jyk7XG4gICAgfVxuICB9XG5cbiAgaWYgKCFjb25kaXRpb24pIHtcbiAgICB2YXIgZXJyb3I7XG4gICAgaWYgKGZvcm1hdCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICBlcnJvciA9IG5ldyBFcnJvcignTWluaWZpZWQgZXhjZXB0aW9uIG9jY3VycmVkOyB1c2UgdGhlIG5vbi1taW5pZmllZCBkZXYgZW52aXJvbm1lbnQgJyArICdmb3IgdGhlIGZ1bGwgZXJyb3IgbWVzc2FnZSBhbmQgYWRkaXRpb25hbCBoZWxwZnVsIHdhcm5pbmdzLicpO1xuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgYXJncyA9IFthLCBiLCBjLCBkLCBlLCBmXTtcbiAgICAgIHZhciBhcmdJbmRleCA9IDA7XG4gICAgICBlcnJvciA9IG5ldyBFcnJvcignSW52YXJpYW50IFZpb2xhdGlvbjogJyArIGZvcm1hdC5yZXBsYWNlKC8lcy9nLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBhcmdzW2FyZ0luZGV4KytdO1xuICAgICAgfSkpO1xuICAgIH1cblxuICAgIGVycm9yLmZyYW1lc1RvUG9wID0gMTsgLy8gd2UgZG9uJ3QgY2FyZSBhYm91dCBpbnZhcmlhbnQncyBvd24gZnJhbWVcbiAgICB0aHJvdyBlcnJvcjtcbiAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBpbnZhcmlhbnQ7IiwiLyogZXNsaW50LWRpc2FibGUgbm8tdW51c2VkLXZhcnMgKi9cbid1c2Ugc3RyaWN0JztcbnZhciBoYXNPd25Qcm9wZXJ0eSA9IE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHk7XG52YXIgcHJvcElzRW51bWVyYWJsZSA9IE9iamVjdC5wcm90b3R5cGUucHJvcGVydHlJc0VudW1lcmFibGU7XG5cbmZ1bmN0aW9uIHRvT2JqZWN0KHZhbCkge1xuXHRpZiAodmFsID09PSBudWxsIHx8IHZhbCA9PT0gdW5kZWZpbmVkKSB7XG5cdFx0dGhyb3cgbmV3IFR5cGVFcnJvcignT2JqZWN0LmFzc2lnbiBjYW5ub3QgYmUgY2FsbGVkIHdpdGggbnVsbCBvciB1bmRlZmluZWQnKTtcblx0fVxuXG5cdHJldHVybiBPYmplY3QodmFsKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBPYmplY3QuYXNzaWduIHx8IGZ1bmN0aW9uICh0YXJnZXQsIHNvdXJjZSkge1xuXHR2YXIgZnJvbTtcblx0dmFyIHRvID0gdG9PYmplY3QodGFyZ2V0KTtcblx0dmFyIHN5bWJvbHM7XG5cblx0Zm9yICh2YXIgcyA9IDE7IHMgPCBhcmd1bWVudHMubGVuZ3RoOyBzKyspIHtcblx0XHRmcm9tID0gT2JqZWN0KGFyZ3VtZW50c1tzXSk7XG5cblx0XHRmb3IgKHZhciBrZXkgaW4gZnJvbSkge1xuXHRcdFx0aWYgKGhhc093blByb3BlcnR5LmNhbGwoZnJvbSwga2V5KSkge1xuXHRcdFx0XHR0b1trZXldID0gZnJvbVtrZXldO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGlmIChPYmplY3QuZ2V0T3duUHJvcGVydHlTeW1ib2xzKSB7XG5cdFx0XHRzeW1ib2xzID0gT2JqZWN0LmdldE93blByb3BlcnR5U3ltYm9scyhmcm9tKTtcblx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgc3ltYm9scy5sZW5ndGg7IGkrKykge1xuXHRcdFx0XHRpZiAocHJvcElzRW51bWVyYWJsZS5jYWxsKGZyb20sIHN5bWJvbHNbaV0pKSB7XG5cdFx0XHRcdFx0dG9bc3ltYm9sc1tpXV0gPSBmcm9tW3N5bWJvbHNbaV1dO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0cmV0dXJuIHRvO1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIEhpZ2hDYXJkU3RvcmUgPSByZXF1aXJlKCcuL3N0b3Jlcy9oaWdoX2NhcmRfc3RvcmUnKTtcblxudmFyIHNvY2tldD1pby5jb25uZWN0KCk7XG5cbkhpZ2hDYXJkU3RvcmUuaW5pdChzb2NrZXQpO1xuXG52YXIgYW5pbWF0aW9uUXVldWUgPSBbXTtcbmZ1bmN0aW9uIGFkZEFuaW1hdGlvbihmKSB7XG4gICAgYW5pbWF0aW9uUXVldWUucHVzaChmKTtcbiAgICBpZihhbmltYXRpb25RdWV1ZS5sZW5ndGggPT0gMSkge1xuICAgICAgICBmKCk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBhbmltYXRpb25GaW5pc2hlZCgpIHtcbiAgICBpZihhbmltYXRpb25RdWV1ZS5sZW5ndGggIT0gMCkge1xuICAgICAgICBhbmltYXRpb25RdWV1ZS5zaGlmdCgpO1xuICAgICAgICBpZihhbmltYXRpb25RdWV1ZS5sZW5ndGggIT0gMClcbiAgICAgICAgICAgIGFuaW1hdGlvblF1ZXVlWzBdKCk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBjbGVhckFuaW1hdGlvbnMoKSB7XG4gICAgYW5pbWF0aW9uUXVldWUgPSBbXTtcbn1cblxudmFyIFBvc2l0aW9ucyA9IHtcbiAgICBoYW5kczogW10sXG4gICAgbmFtZXM6IFtdLFxuICAgIHN0YWNrczogW10sXG4gICAgYmV0czogW10sXG4gICAgcG90OiB7fSxcbiAgICBiZXR0aW5nOiB7fVxufTtcblxuZnVuY3Rpb24gaW5pdFBvc2l0aW9ucygpIHtcbiAgICBmb3IodmFyIGkgPSAwOyBpIDwgOTsgaSsrKSB7XG4gICAgICAgIFBvc2l0aW9ucy5oYW5kc1tpXSA9IHt4OiBpICogMjAwLCB5OiAwfTtcbiAgICAgICAgUG9zaXRpb25zLm5hbWVzW2ldID0ge3g6IGkgKiAyMDAsIHk6IDEwMH07XG4gICAgICAgIFBvc2l0aW9ucy5zdGFja3NbaV0gPSB7eDogaSAqIDIwMCwgeTogMTAwfTtcbiAgICAgICAgUG9zaXRpb25zLmJldHNbaV0gPSB7eDogaSAqIDIwMCwgeTogMTUwfTtcbiAgICAgICAgUG9zaXRpb25zLmRlY2sgPSB7eDogMjAwLCB5OiAzODAgfTtcbiAgICAgICAgUG9zaXRpb25zLnBvdCA9IHt4OiA0MDAsIHk6IDUwMH07XG4gICAgICAgIFBvc2l0aW9ucy5iZXR0aW5nID0ge3g6IDMwMCwgeTogNjUwfTtcbiAgICB9XG59XG5cblxuZnVuY3Rpb24gbWFrZUJldCgpIHtcbiAgICBzb2NrZXQuZW1pdCgnYWN0aW9uJywge1xuICAgICAgICB0eXBlOiAnYmV0JyxcbiAgICAgICAgYW1vdW50OiBCZXR0aW5nVmlldy5nZXRWYWx1ZSgpXG4gICAgfSk7XG4gICAgVmlldy4kYmV0dGluZy5oaWRlKCk7XG59XG5mdW5jdGlvbiBjYWxsQ2hlY2soKSB7XG4gICAgc29ja2V0LmVtaXQoJ2FjdGlvbicsIHtcbiAgICAgICAgdHlwZTogJ2NhbGwnXG4gICAgfSk7XG4gICAgVmlldy4kYmV0dGluZy5oaWRlKCk7XG59XG5mdW5jdGlvbiBmb2xkKCkge1xuICAgIHNvY2tldC5lbWl0KCdhY3Rpb24nLCB7XG4gICAgICAgIHR5cGU6ICdmb2xkJ1xuICAgIH0pO1xuICAgIFZpZXcuJGJldHRpbmcuaGlkZSgpO1xufVxuXG5cbmZ1bmN0aW9uIFNlbWFwaG9yZSgpIHtcbiAgICB0aGlzLnMgPSAwO1xufVxuXG52YXIgQmV0dGluZ1ZpZXcgPSB7XG4gICAgaW5pdDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHRoaXMuJGNhbGwgPSAkKCcjY2FsbCcpO1xuICAgICAgICB0aGlzLiRiZXQgPSAkKCcjYmV0Jyk7XG4gICAgICAgIHRoaXMuJGZvbGQgPSAkKCcjZm9sZCcpO1xuICAgICAgICB0aGlzLiRyYW5nZSA9ICQoJyNiZXQtcmFuZ2UnKTtcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICB0aGlzLiRyYW5nZS5vbignaW5wdXQnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHNlbGYuJGJldC50ZXh0KCdCZXQoJyArICQodGhpcykudmFsKCkgKyAnKScpO1xuICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLiRiZXQub24oJ2NsaWNrJywgbWFrZUJldCk7XG4gICAgICAgIHRoaXMuJGNhbGwub24oJ2NsaWNrJywgY2FsbENoZWNrKTtcbiAgICAgICAgdGhpcy4kZm9sZC5vbignY2xpY2snLCBmb2xkKTtcbiAgICB9LFxuICAgIGdldFZhbHVlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuJHJhbmdlLnZhbCgpO1xuICAgIH0sXG4gICAgZGlzYWJsZTogZnVuY3Rpb24oKSB7XG4gICAgfSxcbiAgICBhY3RpdmF0ZTogZnVuY3Rpb24oYW1vdW50LCBzdGFjaykge1xuICAgICAgICB0aGlzLiRjYWxsLnRleHQoJ0NhbGwoJyArIGFtb3VudCArICcpJyk7XG4gICAgICAgIHRoaXMuJGJldC50ZXh0KCdCZXQoJyArIGFtb3VudCArICcpJyk7XG4gICAgICAgIHRoaXMuJHJhbmdlLnByb3AoJ21pbicsIGFtb3VudCk7XG4gICAgICAgIHRoaXMuJHJhbmdlLnByb3AoJ21heCcsIHN0YWNrKTtcbiAgICAgICAgdGhpcy4kcmFuZ2UudmFsKGFtb3VudCk7XG4gICAgfVxufTtcblxuZnVuY3Rpb24gcG9zaXRpb24oJGVsLCBwKSB7XG4gICAgJGVsLmNzcygncG9zaXRpb24nLCAnYWJzb2x1dGUnKTtcbiAgICAkZWwuY3NzKCdsZWZ0JywgcC54ICsgJ3B4Jyk7XG4gICAgJGVsLmNzcygndG9wJywgcC55ICsgJ3B4Jyk7XG59XG5cblxudmFyIFZpZXcgPSB7XG4gICAgJG5hbWVzOiBbXSxcbiAgICAkaGFuZHM6IFtdLFxuICAgICRzdGFja3M6IFtdLFxuICAgICRiZXRzOiBbXSxcbiAgICAkcGxheWVyczogW10sXG4gICAgJHBvdDogbnVsbCxcbiAgICAkYmV0dGluZzogbnVsbCxcbiAgICBpbml0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgdGhpcy5jcmVhdGVQb3QoKTtcbiAgICAgICAgdGhpcy5jcmVhdGVCZXR0aW5nKCk7XG4gICAgICAgIHRoaXMuJGJldHRpbmcuaGlkZSgpO1xuICAgIH0sXG4gICAgYWRkUGxheWVyOiBmdW5jdGlvbihzZWF0LCBuYW1lLCBzdGFjaykge1xuICAgICAgICBpZih0aGlzLiRwbGF5ZXJzW3NlYXRdKVxuICAgICAgICAgICAgdGhpcy4kcGxheWVyc1tzZWF0XS5kZXRhY2goKTtcblxuICAgICAgICB0aGlzLiRwbGF5ZXJzW3NlYXRdID0gJCgnPGRpdj48L2Rpdj4nKTtcbiAgICAgICAgdGhpcy5jcmVhdGVOYW1lKHRoaXMuJHBsYXllcnNbc2VhdF0sIHNlYXQsIG5hbWUpO1xuICAgICAgICB0aGlzLmNyZWF0ZVN0YWNrKHRoaXMuJHBsYXllcnNbc2VhdF0sIHNlYXQsIHN0YWNrKTtcbiAgICAgICAgdGhpcy5jcmVhdGVIYW5kKHRoaXMuJHBsYXllcnNbc2VhdF0sIHNlYXQpO1xuICAgICAgICB0aGlzLmNyZWF0ZUJldHModGhpcy4kcGxheWVyc1tzZWF0XSwgc2VhdCk7XG4gICAgICAgICQoJyNnYW1lJykuYXBwZW5kKHRoaXMuJHBsYXllcnNbc2VhdF0pO1xuICAgIH0sXG4gICAgcmVtb3ZlUGxheWVyOiBmdW5jdGlvbihzZWF0KSB7XG4gICAgICAgIGlmKHRoaXMuJHBsYXllcnNbc2VhdF0pXG4gICAgICAgICAgICB0aGlzLiRwbGF5ZXJzW3NlYXRdLmRldGFjaCgpO1xuICAgIH0sXG4gICAgZGVhbENhcmQ6IGZ1bmN0aW9uKHNlYXQsIGNhcmQpIHtcbiAgICAgICAgdmFyICRpbWcgPSBudWxsO1xuICAgICAgICBpZihjYXJkID09ICdoaWRkZW4nKVxuICAgICAgICAgICAgJGltZyA9ICQoJzxpbWcgc3JjPVwicHVibGljL2ltYWdlcy9iMWZ2LnBuZ1wiLz4nKTtcbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAkaW1nID0gJCgnPGltZyBzcmM9cHVibGljL2ltYWdlcy8nICsgY2FyZCArICcucG5nPicpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuJGhhbmRzW3NlYXRdLmFwcGVuZCgkaW1nKTtcbiAgICB9LFxuICAgIHJldmVhbENhcmQ6IGZ1bmN0aW9uKHNlYXQsIGluZGV4LCBjYXJkKSB7XG4gICAgICAgIHZhciAkaW1nID0gJCgnPGltZyBzcmM9cHVibGljL2ltYWdlcy8nICsgY2FyZCArICcucG5nPicpO1xuICAgICAgICB0aGlzLiRoYW5kc1tzZWF0XS5jaGlsZHJlbigpLmVxKGluZGV4KS5yZXBsYWNlV2l0aCgkaW1nKTtcbiAgICB9LFxuICAgIHB1dEJldHNJblBvdEFuaW1hdGlvbjogZnVuY3Rpb24oKSB7XG4gICAgICAgIGFkZEFuaW1hdGlvbihmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHZhciBzID0gMDtcbiAgICAgICAgICAgIGZvcih2YXIgaSA9IDA7IGkgPCBWaWV3LiRiZXRzLmxlbmd0aDsgaSsrKVxuICAgICAgICAgICAgICAgIGlmKCFWaWV3LiRiZXRzW2ldLmlzKCc6ZW1wdHknKSkge1xuICAgICAgICAgICAgICAgICAgICBzKys7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIHNlbSA9IG5ldyBTZW1hcGhvcmUoKTtcbiAgICAgICAgICAgIHNlbS5zID0gcztcbiAgICAgICAgICAgIGZvcihpID0gMDsgaSA8IFZpZXcuJGJldHMubGVuZ3RoOyBpKyspXG4gICAgICAgICAgICAgICAgaWYoIVZpZXcuJGJldHNbaV0uaXMoJzplbXB0eScpKSB7XG4gICAgICAgICAgICAgICAgICAgIFZpZXcubW92ZUNoaXBzKFZpZXcuJGJldHNbaV0sIFZpZXcuJHBvdCwgMCwgMTAwLCAxMDAsIHNlbSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIGJldDogZnVuY3Rpb24oc2VhdCwgc3RhY2ssIGFkZGVkLCBpblBvdCkge1xuICAgICAgICB0aGlzLm1vdmVDaGlwcyh0aGlzLiRzdGFja3Nbc2VhdF0sIHRoaXMuJGJldHNbc2VhdF0sIHN0YWNrLCBhZGRlZCwgaW5Qb3QpO1xuICAgIH0sXG4gICAgY3JlYXRlUHV0UG90SW5TdGFja0FuaW1hdGlvbjogZnVuY3Rpb24oc2VhdCwgcG90LCBhbW91bnQsIHN0YWNrKSB7XG4gICAgICAgIHRoaXMubW92ZUNoaXBzKHRoaXMuJHBvdCwgdGhpcy4kc3RhY2tzW3NlYXRdLCBwb3QsIGFtb3VudCwgc3RhY2spO1xuICAgIH0sXG4gICAgZW1wdHlIYW5kczogZnVuY3Rpb24oKSB7XG4gICAgICAgIGZvcih2YXIgaSA9IDA7IGkgPCB0aGlzLiRoYW5kcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgaWYodGhpcy4kaGFuZHNbaV0pIHtcbiAgICAgICAgICAgICAgICB0aGlzLiRoYW5kc1tpXS5lbXB0eSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcbiAgICBlbXB0eUhhbmQ6IGZ1bmN0aW9uKHNlYXQpIHtcbiAgICAgICAgdGhpcy4kaGFuZHNbc2VhdF0uZW1wdHkoKTtcbiAgICB9LFxuICAgIGNyZWF0ZUJldHRpbmc6IGZ1bmN0aW9uKCkge1xuICAgICAgICB0aGlzLiRiZXR0aW5nID0gJCgnI2JldHRpbmcnKTtcbiAgICAgICAgcG9zaXRpb24odGhpcy4kYmV0dGluZywgUG9zaXRpb25zLmJldHRpbmcpO1xuICAgIH0sXG4gICAgY3JlYXRlQWN0aW9uOiBmdW5jdGlvbihzZWF0KSB7XG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgdmFyIHggPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBzZWxmLiRuYW1lc1tzZWF0XS5hbmltYXRlKHtcbiAgICAgICAgICAgICAgICBvcGFjaXR5OiAwLjVcbiAgICAgICAgICAgIH0sIDEwMDAsICdsaW5lYXInLCB5KTtcbiAgICAgICAgfTtcbiAgICAgICAgdmFyIHkgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBzZWxmLiRuYW1lc1tzZWF0XS5hbmltYXRlKHtcbiAgICAgICAgICAgICAgICBvcGFjaXR5OiAxLjBcbiAgICAgICAgICAgIH0sIDEwMDAsICdsaW5lYXInLCB4KTtcbiAgICAgICAgfTtcblxuICAgICAgICB4KCk7XG4gICAgfSxcbiAgICBjcmVhdGVOYW1lOiBmdW5jdGlvbigkcGFyZW50LCBzZWF0LCBuYW1lKSB7XG4gICAgICAgIHZhciAkbmFtZSA9ICQoJzxkaXY+PC9kaXY+Jyk7XG4gICAgICAgIHBvc2l0aW9uKCRuYW1lLCBQb3NpdGlvbnMubmFtZXNbc2VhdF0pO1xuICAgICAgICAkbmFtZS5jc3MoJ2JvcmRlcicsICdzb2xpZCcpO1xuICAgICAgICAkbmFtZS5hcHBlbmQoZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUobmFtZSkpO1xuICAgICAgICAkcGFyZW50LmFwcGVuZCgkbmFtZS5nZXQoMCkpO1xuICAgICAgICB0aGlzLiRuYW1lc1tzZWF0XSA9ICRuYW1lO1xuICAgIH0sXG4gICAgY3JlYXRlSGFuZDogZnVuY3Rpb24oJHBhcmVudCwgc2VhdCkge1xuICAgICAgICB2YXIgJGhhbmQgPSAkKCc8ZGl2PjwvZGl2PicpO1xuICAgICAgICBwb3NpdGlvbigkaGFuZCwgUG9zaXRpb25zLmhhbmRzW3NlYXRdKTtcbiAgICAgICAgJHBhcmVudC5hcHBlbmQoJGhhbmQpO1xuICAgICAgICB0aGlzLiRoYW5kc1tzZWF0XSA9ICRoYW5kO1xuICAgIH0sXG4gICAgY3JlYXRlU3RhY2soJHBhcmVudCwgc2VhdCwgYW1vdW50KSB7XG4gICAgICAgIHRoaXMuJHN0YWNrc1tzZWF0XSA9IHRoaXMuY3JlYXRlQ2hpcHMoUG9zaXRpb25zLnN0YWNrc1tzZWF0XSwgYW1vdW50KTtcbiAgICAgICAgJHBhcmVudC5hcHBlbmQodGhpcy4kc3RhY2tzW3NlYXRdKTtcbiAgICB9LFxuICAgIGNyZWF0ZUJldHM6IGZ1bmN0aW9uKCRwYXJlbnQsIHNlYXQpIHtcbiAgICAgICAgdmFyICRiZXQgPSAkKCc8ZGl2PjwvZGl2PicpO1xuICAgICAgICBwb3NpdGlvbigkYmV0LCBQb3NpdGlvbnMuYmV0c1tzZWF0XSk7XG4gICAgICAgIHRoaXMuJGJldHNbc2VhdF0gPSAkYmV0O1xuICAgICAgICAkcGFyZW50LmFwcGVuZCgkYmV0KTtcbiAgICB9LFxuICAgIGNyZWF0ZURlY2s6IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgJGRlY2sgPSAkKCc8ZGl2PjwvZGl2PicpO1xuICAgICAgICBwb3NpdGlvbigkZGVjaywgUG9zaXRpb25zLmRlY2spO1xuICAgICAgICAkKCcjZ2FtZScpLmFwcGVuZCgkZGVjay5nZXQoMCkpO1xuICAgICAgICB0aGlzLiRkZWNrID0gJGRlY2s7XG4gICAgICAgIHRoaXMuJGRlY2suYXBwZW5kKCQoJzxpbWcgc3JjPVwicHVibGljL2ltYWdlcy9iMWZ2LnBuZ1wiLz4nKSk7XG4gICAgfSxcbiAgICBjcmVhdGVGbG9wOiBmdW5jdGlvbihjYXJkKSB7XG4gICAgICAgIHZhciBzID0gJ3B1YmxpYy9pbWFnZXMvJyArIGNhcmQgKyAnLnBuZyc7XG4gICAgICAgIHRoaXMuJGRlY2suYXBwZW5kKCQoJzxpbWcgc3JjPScgKyBzICsgJz4nKSk7XG4gICAgfSxcbiAgICBjcmVhdGVDaGlwcyhwb3MsIGFtb3VudCkge1xuICAgICAgICB2YXIgJGNoaXBzID0gJCgnPGRpdj48L2Rpdj4nKTtcbiAgICAgICAgcG9zaXRpb24oJGNoaXBzLCBwb3MpO1xuICAgICAgICAkKCcjZ2FtZScpLmFwcGVuZCgkY2hpcHMuZ2V0KDApKTtcbiAgICAgICAgdGhpcy5zZXRDaGlwc0Ftb3VudCgkY2hpcHMsIGFtb3VudCk7XG4gICAgICAgIHJldHVybiAkY2hpcHM7XG4gICAgfSxcbiAgICBzZXRDaGlwc0Ftb3VudCgkY2hpcHMsIGFtb3VudCkge1xuICAgICAgICAkY2hpcHMuZW1wdHkoKTtcbiAgICAgICAgaWYoYW1vdW50ICE9IDApIHtcbiAgICAgICAgICAgICRjaGlwcy5hcHBlbmQoJCgnPGltZyBzcmM9XCJwdWJsaWMvY2hpcHMucG5nXCIvPicpKTtcbiAgICAgICAgICAgICRjaGlwcy5hcHBlbmQoZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoYW1vdW50KSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuICRjaGlwcztcbiAgICB9LFxuICAgIGNyZWF0ZVBvdDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHRoaXMuJHBvdCA9ICQoJzxkaXY+PC9kaXY+Jyk7XG4gICAgICAgIHBvc2l0aW9uKHRoaXMuJHBvdCwgUG9zaXRpb25zLnBvdCk7XG4gICAgICAgICQoJyNnYW1lJykuYXBwZW5kKHRoaXMuJHBvdC5nZXQoMCkpO1xuICAgIH0sXG4gICAgbW92ZUNoaXBzOiBmdW5jdGlvbigkc3JjLCAkZGVzdCwgbmV3U3JjQW1vdW50LCBjaGlwc0Ftb3VudCwgbmV3RGVzdEFtb3VudCwgc2VtKSB7XG4gICAgICAgIGlmKHNlbSA9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHNlbSA9IG5ldyBTZW1hcGhvcmUoKTtcbiAgICAgICAgICAgIHNlbS5zID0gMTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBwb3MgPSB7eDogJHNyYy5jc3MoJ2xlZnQnKS5yZXBsYWNlKFwicHhcIiwgXCJcIiksIHk6ICRzcmMuY3NzKCd0b3AnKS5yZXBsYWNlKFwicHhcIiwgXCJcIil9O1xuICAgICAgICB2YXIgJGNoaXBzID0gdGhpcy5jcmVhdGVDaGlwcyhwb3MsIGNoaXBzQW1vdW50KTtcblxuICAgICAgICB0aGlzLnNldENoaXBzQW1vdW50KCRzcmMsIG5ld1NyY0Ftb3VudCk7XG5cbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICB2YXIgZmluaXNoID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgJGNoaXBzLmRldGFjaCgpO1xuICAgICAgICAgICAgc2VsZi5zZXRDaGlwc0Ftb3VudCgkZGVzdCwgbmV3RGVzdEFtb3VudCk7XG4gICAgICAgICAgICBzZW0ucy0tO1xuICAgICAgICAgICAgaWYoc2VtLnMgPT0gMClcbiAgICAgICAgICAgICAgICBhbmltYXRpb25GaW5pc2hlZCgpO1xuICAgICAgICB9O1xuXG4gICAgICAgICRjaGlwcy5hbmltYXRlKHtcbiAgICAgICAgICAgICd0b3AnOiAkZGVzdC5jc3MoJ3RvcCcpLFxuICAgICAgICAgICAgJ2xlZnQnOiAkZGVzdC5jc3MoJ2xlZnQnKVxuICAgICAgICB9LCA1MDAsICdlYXNlSW5PdXRRdWFydCcsIGZpbmlzaCk7XG4gICAgfVxufTtcblxuXG5zb2NrZXQub24oJ2FjdGlvbicsIGZ1bmN0aW9uKGFjdGlvbikge1xuICAgIGNvbnNvbGUubG9nKGFjdGlvbik7XG4gICAgdmFyIGNoaXBzID0gMDtcbiAgICBpZihhY3Rpb24udHlwZSA9PSAncGxheWVyJykge1xuICAgICAgICBIaWdoQ2FyZFN0b3JlLnNlYXRzW2FjdGlvbi5zZWF0XSA9IHt9O1xuICAgICAgICBIaWdoQ2FyZFN0b3JlLnNlYXRzW2FjdGlvbi5zZWF0XS5uYW1lID0gYWN0aW9uLm5hbWU7XG4gICAgICAgIEhpZ2hDYXJkU3RvcmUuc2VhdHNbYWN0aW9uLnNlYXRdLnN0YWNrID0gYWN0aW9uLnN0YWNrO1xuICAgICAgICBIaWdoQ2FyZFN0b3JlLnNlYXRzW2FjdGlvbi5zZWF0XS5pblBvdCA9IDA7XG5cbiAgICAgICAgVmlldy5hZGRQbGF5ZXIoYWN0aW9uLnNlYXQsIGFjdGlvbi5uYW1lLCBhY3Rpb24uc3RhY2spO1xuICAgIH1cbiAgICBlbHNlIGlmKGFjdGlvbi50eXBlID09ICdzZWF0Jykge1xuICAgICAgICBIaWdoQ2FyZFN0b3JlLmNsaWVudFNlYXQgPSBhY3Rpb24uc2VhdDtcbiAgICB9XG4gICAgZWxzZSBpZihhY3Rpb24udHlwZSA9PSAnYWN0Jykge1xuICAgICAgICBIaWdoQ2FyZFN0b3JlLmNhbkFjdCA9IHRydWU7XG4gICAgICAgIEhpZ2hDYXJkU3RvcmUuYW1vdW50ID0gYWN0aW9uLmFtb3VudDtcblxuICAgICAgICBhZGRBbmltYXRpb24oZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBWaWV3LiRiZXR0aW5nLnNob3coKTtcbiAgICAgICAgICAgIEJldHRpbmdWaWV3LmFjdGl2YXRlKGFjdGlvbi5hbW91bnQsIEhpZ2hDYXJkU3RvcmUuc2VhdHNbSGlnaENhcmRTdG9yZS5jbGllbnRTZWF0XS5wb3QpO1xuICAgICAgICAgICAgYW5pbWF0aW9uRmluaXNoZWQoKTtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIGVsc2UgaWYoYWN0aW9uLnR5cGUgPT0gJ2JldCcpIHtcbiAgICAgICAgSGlnaENhcmRTdG9yZS5hY3Rpb24gPSBhY3Rpb24ubmV4dDtcbiAgICAgICAgY2hpcHMgPSBhY3Rpb24uYW1vdW50IC0gSGlnaENhcmRTdG9yZS5zZWF0c1thY3Rpb24uc2VhdF0uaW5Qb3Q7XG4gICAgICAgIEhpZ2hDYXJkU3RvcmUuc2VhdHNbYWN0aW9uLnNlYXRdLnN0YWNrIC09IGNoaXBzO1xuICAgICAgICBIaWdoQ2FyZFN0b3JlLnNlYXRzW2FjdGlvbi5zZWF0XS5pblBvdCArPSBjaGlwcztcbiAgICAgICAgSGlnaENhcmRTdG9yZS5wb3QgKz0gY2hpcHM7XG4gICAgICAgIEhpZ2hDYXJkU3RvcmUuYW1vdW50ID0gYWN0aW9uLmFtb3VudDtcblxuICAgICAgICBhZGRBbmltYXRpb24oZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBWaWV3LmJldChhY3Rpb24uc2VhdCxcbiAgICAgICAgICAgICAgICBIaWdoQ2FyZFN0b3JlLnNlYXRzW2FjdGlvbi5zZWF0XS5zdGFjayxcbiAgICAgICAgICAgICAgICBjaGlwcyxcbiAgICAgICAgICAgICAgICBIaWdoQ2FyZFN0b3JlLnNlYXRzW2FjdGlvbi5zZWF0XS5pblBvdCk7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBlbHNlIGlmKGFjdGlvbi50eXBlID09ICdjYWxsJykge1xuICAgICAgICBIaWdoQ2FyZFN0b3JlLmFjdGlvbiA9IGFjdGlvbi5uZXh0O1xuICAgICAgICBjaGlwcyA9IGFjdGlvbi5hbW91bnQgLSBIaWdoQ2FyZFN0b3JlLnNlYXRzW2FjdGlvbi5zZWF0XS5pblBvdDtcbiAgICAgICAgSGlnaENhcmRTdG9yZS5zZWF0c1thY3Rpb24uc2VhdF0uc3RhY2sgLT0gY2hpcHM7XG4gICAgICAgIEhpZ2hDYXJkU3RvcmUuc2VhdHNbYWN0aW9uLnNlYXRdLmluUG90ICs9IGNoaXBzO1xuICAgICAgICBIaWdoQ2FyZFN0b3JlLnBvdCArPSBjaGlwcztcbiAgICAgICAgSGlnaENhcmRTdG9yZS5hbW91bnQgPSBhY3Rpb24uYW1vdW50O1xuXG4gICAgICAgIGFkZEFuaW1hdGlvbihmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIFZpZXcuYmV0KGFjdGlvbi5zZWF0LFxuICAgICAgICAgICAgICAgIEhpZ2hDYXJkU3RvcmUuc2VhdHNbYWN0aW9uLnNlYXRdLnN0YWNrLFxuICAgICAgICAgICAgICAgIGNoaXBzLFxuICAgICAgICAgICAgICAgIEhpZ2hDYXJkU3RvcmUuc2VhdHNbYWN0aW9uLnNlYXRdLmluUG90KTtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIGVsc2UgaWYoYWN0aW9uLnR5cGUgPT0gJ2ZvbGQnKSB7XG4gICAgICAgIEhpZ2hDYXJkU3RvcmUuYWN0aW9uID0gYWN0aW9uLm5leHQ7XG4gICAgICAgIFZpZXcuZW1wdHlIYW5kKGFjdGlvbi5zZWF0KTtcbiAgICB9XG4gICAgZWxzZSBpZihhY3Rpb24udHlwZSA9PSAnYW50ZScpIHtcbiAgICAgICAgSGlnaENhcmRTdG9yZS5zZWF0c1thY3Rpb24uc2VhdF0uc3RhY2sgLT0gYWN0aW9uLmFtb3VudDtcbiAgICAgICAgSGlnaENhcmRTdG9yZS5zZWF0c1thY3Rpb24uc2VhdF0uaW5Qb3QgKz0gYWN0aW9uLmFtb3VudDtcbiAgICAgICAgSGlnaENhcmRTdG9yZS5wb3QgKz0gYWN0aW9uLmFtb3VudDtcblxuICAgICAgICBhZGRBbmltYXRpb24oZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBWaWV3LmJldChhY3Rpb24uc2VhdCxcbiAgICAgICAgICAgICAgICBIaWdoQ2FyZFN0b3JlLnNlYXRzW2FjdGlvbi5zZWF0XS5zdGFjayxcbiAgICAgICAgICAgICAgICBhY3Rpb24uYW1vdW50LFxuICAgICAgICAgICAgICAgIEhpZ2hDYXJkU3RvcmUuc2VhdHNbYWN0aW9uLnNlYXRdLmluUG90KTtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIGVsc2UgaWYoYWN0aW9uLnR5cGUgPT0gJ2J1dHRvbicpIHtcbiAgICAgICAgSGlnaENhcmRTdG9yZS5hY3Rpb24gPSBhY3Rpb24uc2VhdDtcbiAgICAgICAgSGlnaENhcmRTdG9yZS5hbW91bnQgPSBhY3Rpb24uYW1vdW50O1xuICAgICAgICBIaWdoQ2FyZFN0b3JlLnBvdCA9IDA7XG4gICAgICAgIGZvcih2YXIgaSA9IDA7IGkgPCBIaWdoQ2FyZFN0b3JlLnNlYXRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBpZihIaWdoQ2FyZFN0b3JlLnNlYXRzW2ldICE9IG51bGwpIHtcbiAgICAgICAgICAgICAgICBIaWdoQ2FyZFN0b3JlLnNlYXRzW2ldLmluUG90ID0gMDtcbiAgICAgICAgICAgICAgICBIaWdoQ2FyZFN0b3JlLnNlYXRzW2ldLmNhbkFjdCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIEhpZ2hDYXJkU3RvcmUuc2VhdHNbaV0uaGFuZCA9IFtdO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgVmlldy5jcmVhdGVBY3Rpb24oYWN0aW9uLnNlYXQpO1xuICAgICAgICBWaWV3LmVtcHR5SGFuZHMoKTtcbiAgICAgICAgVmlldy4kYmV0dGluZy5oaWRlKCk7XG4gICAgfVxuICAgIGVsc2UgaWYoYWN0aW9uLnR5cGUgPT0gJ2RlYWwnKSB7XG4gICAgICAgIGFkZEFuaW1hdGlvbihmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIFZpZXcuZGVhbENhcmQoYWN0aW9uLnNlYXQsIGFjdGlvbi5jYXJkKTtcbiAgICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgYW5pbWF0aW9uRmluaXNoZWQoKTtcbiAgICAgICAgICAgIH0sIDMwMCk7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBlbHNlIGlmKGFjdGlvbi50eXBlID09ICdibGluZCcpIHtcbiAgICAgICAgSGlnaENhcmRTdG9yZS5zZWF0c1thY3Rpb24uc2VhdF0uc3RhY2sgLT0gYWN0aW9uLmFtb3VudDtcbiAgICAgICAgSGlnaENhcmRTdG9yZS5zZWF0c1thY3Rpb24uc2VhdF0uaW5Qb3QgKz0gYWN0aW9uLmFtb3VudDtcbiAgICAgICAgSGlnaENhcmRTdG9yZS5wb3QgKz0gYWN0aW9uLmFtb3VudDtcblxuICAgICAgICBhZGRBbmltYXRpb24oZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBWaWV3LmJldChhY3Rpb24uc2VhdCxcbiAgICAgICAgICAgICAgICBIaWdoQ2FyZFN0b3JlLnNlYXRzW2FjdGlvbi5zZWF0XS5zdGFjayxcbiAgICAgICAgICAgICAgICBhY3Rpb24uYW1vdW50LFxuICAgICAgICAgICAgICAgIEhpZ2hDYXJkU3RvcmUuc2VhdHNbYWN0aW9uLnNlYXRdLmluUG90KTtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIGVsc2UgaWYoYWN0aW9uLnR5cGUgPT0gJ3dpbm5lcicpIHtcbiAgICAgICAgSGlnaENhcmRTdG9yZS5zZWF0c1thY3Rpb24uc2VhdF0uc3RhY2sgKz0gYWN0aW9uLmFtb3VudDtcbiAgICAgICAgZm9yKHZhciBpID0gMDsgaSA8IEhpZ2hDYXJkU3RvcmUuc2VhdHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGlmKEhpZ2hDYXJkU3RvcmUuc2VhdHNbaV0gIT0gbnVsbClcbiAgICAgICAgICAgICAgICBIaWdoQ2FyZFN0b3JlLnNlYXRzW2ldLmluUG90ID0gMDtcbiAgICAgICAgfVxuXG4gICAgICAgIFZpZXcucHV0QmV0c0luUG90QW5pbWF0aW9uKCk7XG4gICAgICAgIGFkZEFuaW1hdGlvbihmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIFZpZXcuY3JlYXRlUHV0UG90SW5TdGFja0FuaW1hdGlvbihhY3Rpb24uc2VhdCxcbiAgICAgICAgICAgICAgICAwLFxuICAgICAgICAgICAgICAgIGFjdGlvbi5hbW91bnQsXG4gICAgICAgICAgICAgICAgSGlnaENhcmRTdG9yZS5zZWF0c1thY3Rpb24uc2VhdF0uc3RhY2spO1xuICAgICAgICB9KTtcbiAgICAgICAgYWRkQW5pbWF0aW9uKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBhbmltYXRpb25GaW5pc2hlZCgpO1xuICAgICAgICAgICAgfSwgMzAwMCk7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBlbHNlIGlmKGFjdGlvbi50eXBlID09ICdyZXZlYWwnKSB7XG4gICAgICAgIEhpZ2hDYXJkU3RvcmUuc2VhdHNbYWN0aW9uLnNlYXRdLmhhbmRbYWN0aW9uLmluZGV4XSA9IGFjdGlvbi5jYXJkO1xuICAgICAgICAvL2FkZEFuaW1hdGlvbihmdW5jdGlvbigpIHtcbiAgICAgICAgLy8gICAgVmlldy5yZXZlYWxDYXJkKGFjdGlvbi5zZWF0LCBhY3Rpb24uaW5kZXgsIGFjdGlvbi5jYXJkKTtcbiAgICAgICAgLy99KTtcbiAgICB9XG4gICAgZWxzZSBpZihhY3Rpb24udHlwZSA9PSAnZ2FtZScpIHtcbiAgICAgICAgSGlnaENhcmRTdG9yZS5wb3QgPSAwO1xuICAgICAgICBIaWdoQ2FyZFN0b3JlLmFtb3VudCA9IDA7XG4gICAgfVxuICAgIGVsc2UgaWYoYWN0aW9uLnR5cGUgPT0gJ2J1c3RlZCcgfHwgYWN0aW9uLnR5cGUgPT0gJ3F1aXQnKSB7XG4gICAgICAgIEhpZ2hDYXJkU3RvcmUuc2VhdHNbYWN0aW9uLnNlYXRdID0gbnVsbDtcbiAgICAgICAgVmlldy5yZW1vdmVQbGF5ZXIoYWN0aW9uLnNlYXQpO1xuICAgIH1cbn0pO1xuXG5cbiQoZnVuY3Rpb24oKSB7XG4gICAgaW5pdFBvc2l0aW9ucygpO1xuICAgIEJldHRpbmdWaWV3LmluaXQoKTtcbiAgICBWaWV3LmluaXQoKTtcblxuXG5cblxuLypcbiAgICBSZWFjdC5yZW5kZXIoXG4gICAgICAgIDxIaWdoQ2FyZCAvPixcbiAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2NvbnRlbnQnKVxuICAgICk7XG4gICAgKi9cbn0pO1xuIiwidmFyIERpc3BhdGNoZXIgPSByZXF1aXJlKCdmbHV4JykuRGlzcGF0Y2hlcjtcbnZhciBBcHBEaXNwYXRjaGVyID0gbmV3IERpc3BhdGNoZXIoKTtcblxuQXBwRGlzcGF0Y2hlci5kaXNwYXRjaFZpZXdBY3Rpb24gPSBmdW5jdGlvbihhY3Rpb24pIHtcbiAgICBhY3Rpb24uc291cmNlID0gJ3ZpZXcnO1xuICAgIHRoaXMuZGlzcGF0Y2goYWN0aW9uKTtcbn07XG5cbkFwcERpc3BhdGNoZXIuZGlzcGF0Y2hTZXJ2ZXJBY3Rpb24gPSBmdW5jdGlvbihhY3Rpb24pIHtcbiAgICBhY3Rpb24uc291cmNlID0gJ3NlcnZlcic7XG4gICAgdGhpcy5kaXNwYXRjaChhY3Rpb24pO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBBcHBEaXNwYXRjaGVyOyIsIlxudmFyIERpc3BhdGNoZXIgPSByZXF1aXJlKCcuLi9kaXNwYXRjaGVyL2Rpc3BhdGNoZXInKTtcbnZhciBFdmVudEVtaXR0ZXIgPSByZXF1aXJlKCdldmVudHMnKS5FdmVudEVtaXR0ZXI7XG52YXIgYXNzaWduID0gcmVxdWlyZSgnb2JqZWN0LWFzc2lnbicpO1xuXG5cbkhpZ2hDYXJkU3RvcmUgPSBhc3NpZ24oe30sIEV2ZW50RW1pdHRlci5wcm90b3R5cGUsIHtcbiAgICBzZWF0czogW10sXG4gICAgbnVtU2VhdHM6IDUsXG4gICAgcGxheWluZzogZmFsc2UsXG4gICAgc29ja2V0OiBudWxsLFxuICAgIGFjdGlvbjogMCxcbiAgICBjbGllbnRTZWF0OiAwLFxuICAgIHBvdDogMCxcbiAgICBhbW91bnQ6IDAsXG4gICAgY2FuQWN0OiBmYWxzZSxcblxuICAgIGdldFN0YWNrOiBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYodGhpcy5zZWF0c1t0aGlzLmNsaWVudFNlYXRdICE9PSBudWxsKVxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuc2VhdHNbdGhpcy5jbGllbnRTZWF0XS5zdGFjaztcbiAgICAgICAgZWxzZVxuICAgICAgICAgICAgcmV0dXJuIDA7XG4gICAgfSxcblxuICAgIGdldFNlYXRzOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnNlYXRzO1xuICAgIH0sXG4gICAgZ2V0Q2xpZW50U2VhdCA6ZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmNsaWVudFNlYXQ7XG4gICAgfSxcbiAgICBpbml0OiBmdW5jdGlvbiAoc29ja2V0KSB7XG4gICAgICAgIHRoaXMuc29ja2V0ID0gc29ja2V0O1xuICAgICAgICBmb3IodmFyIGkgPSAwOyBpIDwgdGhpcy5udW1TZWF0czsgaSsrKSB7XG4gICAgICAgICAgICB0aGlzLnNlYXRzLnB1c2gobnVsbCk7XG4gICAgICAgIH1cbiAgICAgICAgc29ja2V0LmVtaXQoJ2FjdGlvbicsIHtcbiAgICAgICAgICAgIHR5cGU6ICdidXlJbicsXG4gICAgICAgICAgICBhbW91bnQ6IDEwMCxcbiAgICAgICAgICAgIG5hbWU6IFwiUm9iZXJ0XCJcbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBlbWl0Q2hhbmdlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuZW1pdCgnY2hhbmdlJyk7XG4gICAgfSxcblxuICAgIGFkZENoYW5nZUxpc3RlbmVyOiBmdW5jdGlvbiAoY2FsbGJhY2spIHtcbiAgICAgICAgdGhpcy5vbignY2hhbmdlJywgY2FsbGJhY2spO1xuICAgIH0sXG5cbiAgICByZW1vdmVDaGFuZ2VMaXN0ZW5lcjogZnVuY3Rpb24gKGNhbGxiYWNrKSB7XG4gICAgICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIoJ2NoYW5nZScsIGNhbGxiYWNrKTtcbiAgICB9XG59KTtcblxuRGlzcGF0Y2hlci5yZWdpc3RlcihmdW5jdGlvbihhY3Rpb24pIHtcblxuICAgIGNvbnNvbGUubG9nKGFjdGlvbik7XG4gICAgdmFyIGNoaXBzID0gMDtcbiAgICBpZihhY3Rpb24uc291cmNlID09ICd2aWV3Jykge1xuICAgICAgICBpZihhY3Rpb24udHlwZSA9PSAnYmV0JyB8fCBhY3Rpb24udHlwZSA9PSAnY2FsbCcgfHwgYWN0aW9uLnR5cGUgPT0gJ2ZvbGQnKSB7XG4gICAgICAgICAgICBIaWdoQ2FyZFN0b3JlLmNhbkFjdCA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIEhpZ2hDYXJkU3RvcmUuc29ja2V0LmVtaXQoJ2FjdGlvbicsIGFjdGlvbik7XG4gICAgICAgIEhpZ2hDYXJkU3RvcmUuZW1pdENoYW5nZSgpO1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIGlmKGFjdGlvbi50eXBlID09ICdwbGF5ZXInKSB7XG4gICAgICAgIEhpZ2hDYXJkU3RvcmUuc2VhdHNbYWN0aW9uLnNlYXRdID0ge307XG4gICAgICAgIEhpZ2hDYXJkU3RvcmUuc2VhdHNbYWN0aW9uLnNlYXRdLm5hbWUgPSBhY3Rpb24ubmFtZTtcbiAgICAgICAgSGlnaENhcmRTdG9yZS5zZWF0c1thY3Rpb24uc2VhdF0uc3RhY2sgPSBhY3Rpb24uc3RhY2s7XG4gICAgICAgIEhpZ2hDYXJkU3RvcmUuc2VhdHNbYWN0aW9uLnNlYXRdLmluUG90ID0gMDtcbiAgICB9XG4gICAgZWxzZSBpZihhY3Rpb24udHlwZSA9PSAnc2VhdCcpIHtcbiAgICAgICAgSGlnaENhcmRTdG9yZS5jbGllbnRTZWF0ID0gYWN0aW9uLnNlYXQ7XG4gICAgfVxuICAgIGVsc2UgaWYoYWN0aW9uLnR5cGUgPT0gJ2FjdCcpIHtcbiAgICAgICAgSGlnaENhcmRTdG9yZS5jYW5BY3QgPSB0cnVlO1xuICAgICAgICBIaWdoQ2FyZFN0b3JlLmFtb3VudCA9IGFjdGlvbi5hbW91bnQ7XG4gICAgfVxuICAgIGVsc2UgaWYoYWN0aW9uLnR5cGUgPT0gJ2JldCcpIHtcbiAgICAgICAgSGlnaENhcmRTdG9yZS5hY3Rpb24gPSBhY3Rpb24ubmV4dDtcbiAgICAgICAgY2hpcHMgPSBhY3Rpb24uYW1vdW50IC0gSGlnaENhcmRTdG9yZS5zZWF0c1thY3Rpb24uc2VhdF0uaW5Qb3Q7XG4gICAgICAgIEhpZ2hDYXJkU3RvcmUuc2VhdHNbYWN0aW9uLnNlYXRdLnN0YWNrIC09IGNoaXBzO1xuICAgICAgICBIaWdoQ2FyZFN0b3JlLnNlYXRzW2FjdGlvbi5zZWF0XS5pblBvdCArPSBjaGlwcztcbiAgICAgICAgSGlnaENhcmRTdG9yZS5wb3QgKz0gY2hpcHM7XG4gICAgICAgIEhpZ2hDYXJkU3RvcmUuYW1vdW50ID0gYWN0aW9uLmFtb3VudDtcbiAgICB9XG4gICAgZWxzZSBpZihhY3Rpb24udHlwZSA9PSAnY2FsbCcpIHtcbiAgICAgICAgSGlnaENhcmRTdG9yZS5hY3Rpb24gPSBhY3Rpb24ubmV4dDtcbiAgICAgICAgY2hpcHMgPSBhY3Rpb24uYW1vdW50IC0gSGlnaENhcmRTdG9yZS5zZWF0c1thY3Rpb24uc2VhdF0uaW5Qb3Q7XG4gICAgICAgIEhpZ2hDYXJkU3RvcmUuc2VhdHNbYWN0aW9uLnNlYXRdLnN0YWNrIC09IGNoaXBzO1xuICAgICAgICBIaWdoQ2FyZFN0b3JlLnNlYXRzW2FjdGlvbi5zZWF0XS5pblBvdCArPSBjaGlwcztcbiAgICAgICAgSGlnaENhcmRTdG9yZS5wb3QgKz0gY2hpcHM7XG4gICAgICAgIEhpZ2hDYXJkU3RvcmUuYW1vdW50ID0gYWN0aW9uLmFtb3VudDtcbiAgICB9XG4gICAgZWxzZSBpZihhY3Rpb24udHlwZSA9PSAnZm9sZCcpIHtcbiAgICAgICAgSGlnaENhcmRTdG9yZS5hY3Rpb24gPSBhY3Rpb24ubmV4dDtcbiAgICB9XG4gICAgZWxzZSBpZihhY3Rpb24udHlwZSA9PSAnYW50ZScpIHtcbiAgICAgICAgSGlnaENhcmRTdG9yZS5zZWF0c1thY3Rpb24uc2VhdF0uc3RhY2sgLT0gYWN0aW9uLmFtb3VudDtcbiAgICAgICAgSGlnaENhcmRTdG9yZS5zZWF0c1thY3Rpb24uc2VhdF0uaW5Qb3QgKz0gYWN0aW9uLmFtb3VudDtcbiAgICAgICAgSGlnaENhcmRTdG9yZS5wb3QgKz0gYWN0aW9uLmFtb3VudDtcbiAgICB9XG4gICAgZWxzZSBpZihhY3Rpb24udHlwZSA9PSAnYnV0dG9uJykge1xuICAgICAgICBIaWdoQ2FyZFN0b3JlLmFjdGlvbiA9IGFjdGlvbi5zZWF0O1xuICAgICAgICBIaWdoQ2FyZFN0b3JlLmFtb3VudCA9IGFjdGlvbi5hbW91bnQ7XG4gICAgICAgIEhpZ2hDYXJkU3RvcmUuc2VhdHNbYWN0aW9uLnNlYXRdLmhhbmQgPSBhY3Rpb24uY2FyZHM7XG4gICAgICAgIEhpZ2hDYXJkU3RvcmUucG90ID0gMDtcbiAgICAgICAgZm9yKHZhciBpID0gMDsgaSA8IEhpZ2hDYXJkU3RvcmUuc2VhdHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGlmKEhpZ2hDYXJkU3RvcmUuc2VhdHNbaV0gIT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIEhpZ2hDYXJkU3RvcmUuc2VhdHNbaV0uaW5Qb3QgPSAwO1xuICAgICAgICAgICAgICAgIEhpZ2hDYXJkU3RvcmUuc2VhdHNbaV0uY2FuQWN0ID0gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgZWxzZSBpZihhY3Rpb24udHlwZSA9PSAnYmxpbmQnKSB7XG4gICAgICAgIEhpZ2hDYXJkU3RvcmUuc2VhdHNbYWN0aW9uLnNlYXRdLnN0YWNrIC09IGFjdGlvbi5hbW91bnQ7XG4gICAgICAgIEhpZ2hDYXJkU3RvcmUuc2VhdHNbYWN0aW9uLnNlYXRdLmluUG90ICs9IGFjdGlvbi5hbW91bnQ7XG4gICAgICAgIEhpZ2hDYXJkU3RvcmUucG90ICs9IGFjdGlvbi5hbW91bnQ7XG4gICAgfVxuICAgIGVsc2UgaWYoYWN0aW9uLnR5cGUgPT0gJ3dpbm5lcicpIHtcbiAgICAgICAgSGlnaENhcmRTdG9yZS5zZWF0c1thY3Rpb24uc2VhdF0uc3RhY2sgKz0gYWN0aW9uLmFtb3VudDtcbiAgICAgICAgZm9yKHZhciBpID0gMDsgaSA8IEhpZ2hDYXJkU3RvcmUuc2VhdHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGlmKEhpZ2hDYXJkU3RvcmUuc2VhdHNbaV0gIT0gbnVsbClcbiAgICAgICAgICAgICAgICBIaWdoQ2FyZFN0b3JlLnNlYXRzW2ldLmluUG90ID0gMDtcbiAgICAgICAgfVxuICAgIH1cbiAgICBlbHNlIGlmKGFjdGlvbi50eXBlID09ICdnYW1lJykge1xuICAgICAgICBIaWdoQ2FyZFN0b3JlLnBvdCA9IDA7XG4gICAgICAgIEhpZ2hDYXJkU3RvcmUuYW1vdW50ID0gMDtcbiAgICB9XG4gICAgZWxzZSBpZihhY3Rpb24udHlwZSA9PSAnYnVzdGVkJyB8fCBhY3Rpb24udHlwZSA9PSAncXVpdCcpIHtcbiAgICAgICAgSGlnaENhcmRTdG9yZS5zZWF0c1thY3Rpb24uc2VhdF0gPSBudWxsO1xuICAgIH1cblxuICAgIEhpZ2hDYXJkU3RvcmUuZW1pdENoYW5nZSgpO1xufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gSGlnaENhcmRTdG9yZTsiXX0=
