function FakeConfig(values) {
    this.config = values || {};
}

FakeConfig.prototype.getNow = function getNow(name) {
    return this.config.hasOwnProperty(name) ? this.config[name] : undefined;
};

FakeConfig.prototype.get = function get(name, cont) {
    cont(this.config.hasOwnProperty(name) ? this.config[name] : undefined);
};

FakeConfig.prototype.set = function set(name, value, cont) {
    this.config[name] = value;
    if (cont) cont();
};

extend = function(subClass, baseClass) {
    function inheritance() {}
    inheritance.prototype = baseClass.prototype;
    subClass.prototype = new inheritance();
    subClass.prototype.constructor = subClass;
}

function EventEmitter() {}

EventEmitter.prototype.emit = function() {
    var type = arguments[0];
    // If there is no 'error' event listener then throw.
    if (type === 'error') {
        if (!this._events || !this._events.error ||
        (isArray(this._events.error) && !this._events.error.length))
        {
            if (arguments[1] instanceof Error) {
                throw arguments[1];
                // Unhandled 'error' event
            } else {
                throw new Error("Uncaught, unspecified 'error' event.");
            }
            return false;
        }
    }

    if (!this._events) return false;
    var handler = this._events[type];
    if (!handler) return false;

    if (typeof handler == 'function') {
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
            var l = arguments.length;
            var args = [];
            for (var i = 1; i < l; i++) args[i - 1] = arguments[i];
            handler.apply(this, args);
        }
        return true;

    } else if (isArray(handler)) {
        var l = arguments.length;
        var args = [];
        for (var i = 1; i < l; i++) args[i - 1] = arguments[i];

        var listeners = handler.slice();
        for (var i = 0, l = listeners.length; i < l; i++) {
            listeners[i].apply(this, args);
        }
        return true;

    } else {
        return false;
    }
}

EventEmitter.prototype.addListener = function(type, listener) {
    if ('function' !== typeof listener) {
        throw new Error('addListener only takes instances of Function');
    }

    if (!this._events) this._events = {};

    // To avoid recursion in the case that type == "newListeners"! Before
    // adding it to the listeners, first emit "newListeners".
    this.emit('newListener', type, listener);

    if (!this._events[type]) {
        // Optimize the case of one listener. Don't need the extra array object.
        this._events[type] = listener;
    } else if (isArray(this._events[type])) {

        // If we've already got an array, just append.
        this._events[type].push(listener);

        // Check for listener leak
        if (!this._events[type].warned) {
            var m;
            if (this._events.maxListeners !== undefined) {
                m = this._events.maxListeners;
            } else {
                m = defaultMaxListeners;
            }

            if (m && m > 0 && this._events[type].length > m) {
                this._events[type].warned = true;
                log('(node) warning: possible EventEmitter memory ' +
                'leak detected. ' + this._events[type].length + ' listeners added. ' +
                'Use emitter.setMaxListeners() to increase limit.');
            }
        }
    } else {
        // Adding the second element, need to change to array.
        this._events[type] = [this._events[type], listener];
    }

    return this;
}

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

function isArray(ar) {
    return ar instanceof Array ||
    Array.isArray(ar) ||
    (ar && ar !== Object.prototype && isArray(ar.__proto__));
}


function isRegExp(re) {
    return re instanceof RegExp ||
    (typeof re === 'object' && Object.prototype.toString.call(re) === '[object RegExp]');
}


function isDate(d) {
    if (d instanceof Date) return true;
    if (typeof d !== 'object') return false;
    var properties = Date.prototype && Object.getOwnPropertyNames(Date.prototype);
    var proto = d.__proto__ && Object.getOwnPropertyNames(d.__proto__);
    return JSON.stringify(proto) === JSON.stringify(properties);
}


/**
 * Echos the value of a value. Trys to print the value out
 * in the best way possible given the different types.
 *
 * @param {Object} obj The object to print out.
 * @param {Boolean} showHidden Flag that shows hidden (not enumerable)
 *    properties of objects.
 * @param {Number} depth Depth in which to descend in object. Default is 2.
 * @param {Boolean} colors Flag to turn on ANSI escape codes to color the
 *    output. Default is false (no coloring).
 */
function inspect(obj, showHidden, depth, colors) {
  var seen = [];

  var stylize = function(str, styleType) { return str; };

  function format(value, recurseTimes) {
    // Provide a hook for user-specified inspect functions.
    // Check that value is an object with an inspect function on it
    if (value && typeof value.inspect === 'function' &&
        // Also filter out any prototype objects using the circular check.
        !(value.constructor && value.constructor.prototype === value)) {
      return value.inspect(recurseTimes);
    }

    // Primitive types cannot have properties
    switch (typeof value) {
      case 'undefined':
        return stylize('undefined', 'undefined');

      case 'string':
        var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                                 .replace(/'/g, "\\'")
                                                 .replace(/\\"/g, '"') + '\'';
        return stylize(simple, 'string');

      case 'number':
        return stylize('' + value, 'number');

      case 'boolean':
        return stylize('' + value, 'boolean');
    }
    // For some reason typeof null is "object", so special case here.
    if (value === null) {
      return stylize('null', 'null');
    }

    // Look up the keys of the object.
    var visible_keys = Object.keys(value);
    var keys = showHidden ? Object.getOwnPropertyNames(value) : visible_keys;

    // Functions without properties can be shortcutted.
    if (typeof value === 'function' && keys.length === 0) {
      var name = value.name ? ': ' + value.name : '';
      return stylize('[Function' + name + ']', 'special');
    }

    // RegExp without properties can be shortcutted
    if (isRegExp(value) && keys.length === 0) {
      return stylize('' + value, 'regexp');
    }

    // Dates without properties can be shortcutted
    if (isDate(value) && keys.length === 0) {
      return stylize(value.toUTCString(), 'date');
    }

    var base, type, braces;
    // Determine the object type
    if (isArray(value)) {
      type = 'Array';
      braces = ['[', ']'];
    } else {
      type = 'Object';
      braces = ['{', '}'];
    }

    // Make functions say that they are functions
    if (typeof value === 'function') {
      var n = value.name ? ': ' + value.name : '';
      base = ' [Function' + n + ']';
    } else {
      base = '';
    }

    // Make RegExps say that they are RegExps
    if (isRegExp(value)) {
      base = ' ' + value;
    }

    // Make dates with properties first say the date
    if (isDate(value)) {
      base = ' ' + value.toUTCString();
    }

    if (keys.length === 0) {
      return braces[0] + base + braces[1];
    }

    if (recurseTimes < 0) {
      if (isRegExp(value)) {
        return stylize('' + value, 'regexp');
      } else {
        return stylize('[Object]', 'special');
      }
    }

    seen.push(value);

    var output = keys.map(function(key) {
      var name, str;
      if (value.__lookupGetter__) {
        if (value.__lookupGetter__(key)) {
          if (value.__lookupSetter__(key)) {
            str = stylize('[Getter/Setter]', 'special');
          } else {
            str = stylize('[Getter]', 'special');
          }
        } else {
          if (value.__lookupSetter__(key)) {
            str = stylize('[Setter]', 'special');
          }
        }
      }
      if (visible_keys.indexOf(key) < 0) {
        name = '[' + key + ']';
      }
      if (!str) {
        if (seen.indexOf(value[key]) < 0) {
          if (recurseTimes === null) {
            str = format(value[key]);
          } else {
            str = format(value[key], recurseTimes - 1);
          }
          if (str.indexOf('\n') > -1) {
            if (isArray(value)) {
              str = str.split('\n').map(function(line) {
                return '  ' + line;
              }).join('\n').substr(2);
            } else {
              str = '\n' + str.split('\n').map(function(line) {
                return '   ' + line;
              }).join('\n');
            }
          }
        } else {
          str = stylize('[Circular]', 'special');
        }
      }
      if (typeof name === 'undefined') {
        if (type === 'Array' && key.match(/^\d+$/)) {
          return str;
        }
        name = JSON.stringify('' + key);
        if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
          name = name.substr(1, name.length - 2);
          name = stylize(name, 'name');
        } else {
          name = name.replace(/'/g, "\\'")
                     .replace(/\\"/g, '"')
                     .replace(/(^"|"$)/g, "'");
          name = stylize(name, 'string');
        }
      }

      return name + ': ' + str;
    });

    seen.pop();

    var numLinesEst = 0;
    var length = output.reduce(function(prev, cur) {
      numLinesEst++;
      if (cur.indexOf('\n') >= 0) numLinesEst++;
      return prev + cur.length + 1;
    }, 0);

    if (length > (require('readline').columns || 50)) {
      output = braces[0] +
               (base === '' ? '' : base + '\n ') +
               ' ' +
               output.join(',\n  ') +
               ' ' +
               braces[1];

    } else {
      output = braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
    }

    return output;
  }
  return format(obj, (typeof depth === 'undefined' ? 2 : depth));
}
