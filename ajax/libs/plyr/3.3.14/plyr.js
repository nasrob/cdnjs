typeof navigator === "object" && (function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
    typeof define === 'function' && define.amd ? define('Plyr', factory) :
    (global.Plyr = factory());
}(this, (function () { 'use strict';

    // ==========================================================================
    // Type checking utils
    // ==========================================================================

    var getConstructor = function getConstructor(input) {
        return input !== null && typeof input !== 'undefined' ? input.constructor : null;
    };

    var instanceOf = function instanceOf(input, constructor) {
        return Boolean(input && constructor && input instanceof constructor);
    };

    var is = {
        object: function object(input) {
            return getConstructor(input) === Object;
        },
        number: function number(input) {
            return getConstructor(input) === Number && !Number.isNaN(input);
        },
        string: function string(input) {
            return getConstructor(input) === String;
        },
        boolean: function boolean(input) {
            return getConstructor(input) === Boolean;
        },
        function: function _function(input) {
            return getConstructor(input) === Function;
        },
        array: function array(input) {
            return !is.nullOrUndefined(input) && Array.isArray(input);
        },
        weakMap: function weakMap(input) {
            return instanceOf(input, WeakMap);
        },
        nodeList: function nodeList(input) {
            return instanceOf(input, NodeList);
        },
        element: function element(input) {
            return instanceOf(input, Element);
        },
        textNode: function textNode(input) {
            return getConstructor(input) === Text;
        },
        event: function event(input) {
            return instanceOf(input, Event);
        },
        cue: function cue(input) {
            return instanceOf(input, window.TextTrackCue) || instanceOf(input, window.VTTCue);
        },
        track: function track(input) {
            return instanceOf(input, TextTrack) || !is.nullOrUndefined(input) && is.string(input.kind);
        },
        url: function url(input) {
            return !is.nullOrUndefined(input) && /(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-/]))?/.test(input);
        },
        nullOrUndefined: function nullOrUndefined(input) {
            return input === null || typeof input === 'undefined';
        },
        empty: function empty(input) {
            return is.nullOrUndefined(input) || (is.string(input) || is.array(input) || is.nodeList(input)) && !input.length || is.object(input) && !Object.keys(input).length;
        }
    };

    // ==========================================================================

    // Check for passive event listener support
    // https://github.com/WICG/EventListenerOptions/blob/gh-pages/explainer.md
    // https://www.youtube.com/watch?v=NPM6172J22g
    var supportsPassiveListeners = function () {
        // Test via a getter in the options object to see if the passive property is accessed
        var supported = false;
        try {
            var options = Object.defineProperty({}, 'passive', {
                get: function get() {
                    supported = true;
                    return null;
                }
            });
            window.addEventListener('test', null, options);
            window.removeEventListener('test', null, options);
        } catch (e) {
            // Do nothing
        }

        return supported;
    }();

    // Toggle event listener
    function toggleListener(element, event, callback) {
        var toggle = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : false;

        var _this = this;

        var passive = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : true;
        var capture = arguments.length > 5 && arguments[5] !== undefined ? arguments[5] : false;

        // Bail if no element, event, or callback
        if (!element || !('addEventListener' in element) || is.empty(event) || !is.function(callback)) {
            return;
        }

        // Allow multiple events
        var events = event.split(' ');

        // Build options
        // Default to just the capture boolean for browsers with no passive listener support
        var options = capture;

        // If passive events listeners are supported
        if (supportsPassiveListeners) {
            options = {
                // Whether the listener can be passive (i.e. default never prevented)
                passive: passive,
                // Whether the listener is a capturing listener or not
                capture: capture
            };
        }

        // If a single node is passed, bind the event listener
        events.forEach(function (type) {
            if (_this && _this.eventListeners && toggle) {
                // Cache event listener
                _this.eventListeners.push({ element: element, type: type, callback: callback, options: options });
            }

            element[toggle ? 'addEventListener' : 'removeEventListener'](type, callback, options);
        });
    }

    // Bind event handler
    function on(element) {
        var events = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';
        var callback = arguments[2];
        var passive = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : true;
        var capture = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : false;

        toggleListener.call(this, element, events, callback, true, passive, capture);
    }

    // Unbind event handler
    function off(element) {
        var events = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';
        var callback = arguments[2];
        var passive = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : true;
        var capture = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : false;

        toggleListener.call(this, element, events, callback, false, passive, capture);
    }

    // Bind once-only event handler
    function once(element) {
        var events = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';
        var callback = arguments[2];
        var passive = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : true;
        var capture = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : false;

        function onceCallback() {
            off(element, events, onceCallback, passive, capture);

            for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
                args[_key] = arguments[_key];
            }

            callback.apply(this, args);
        }

        toggleListener.call(this, element, events, onceCallback, true, passive, capture);
    }

    // Trigger event
    function triggerEvent(element) {
        var type = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';
        var bubbles = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
        var detail = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};

        // Bail if no element
        if (!is.element(element) || is.empty(type)) {
            return;
        }

        // Create and dispatch the event
        var event = new CustomEvent(type, {
            bubbles: bubbles,
            detail: Object.assign({}, detail, {
                plyr: this
            })
        });

        // Dispatch the event
        element.dispatchEvent(event);
    }

    // Unbind all cached event listeners
    function unbindListeners() {
        if (this && this.eventListeners) {
            this.eventListeners.forEach(function (item) {
                var element = item.element,
                    type = item.type,
                    callback = item.callback,
                    options = item.options;

                element.removeEventListener(type, callback, options);
            });

            this.eventListeners = [];
        }
    }

    // Run method when / if player is ready
    function ready() {
        var _this2 = this;

        return new Promise(function (resolve) {
            return _this2.ready ? setTimeout(resolve, 0) : on.call(_this2, _this2.elements.container, 'ready', resolve);
        }).then(function () {});
    }

    var classCallCheck = function (instance, Constructor) {
      if (!(instance instanceof Constructor)) {
        throw new TypeError("Cannot call a class as a function");
      }
    };

    var createClass = function () {
      function defineProperties(target, props) {
        for (var i = 0; i < props.length; i++) {
          var descriptor = props[i];
          descriptor.enumerable = descriptor.enumerable || false;
          descriptor.configurable = true;
          if ("value" in descriptor) descriptor.writable = true;
          Object.defineProperty(target, descriptor.key, descriptor);
        }
      }

      return function (Constructor, protoProps, staticProps) {
        if (protoProps) defineProperties(Constructor.prototype, protoProps);
        if (staticProps) defineProperties(Constructor, staticProps);
        return Constructor;
      };
    }();

    var defineProperty = function (obj, key, value) {
      if (key in obj) {
        Object.defineProperty(obj, key, {
          value: value,
          enumerable: true,
          configurable: true,
          writable: true
        });
      } else {
        obj[key] = value;
      }

      return obj;
    };

    var slicedToArray = function () {
      function sliceIterator(arr, i) {
        var _arr = [];
        var _n = true;
        var _d = false;
        var _e = undefined;

        try {
          for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) {
            _arr.push(_s.value);

            if (i && _arr.length === i) break;
          }
        } catch (err) {
          _d = true;
          _e = err;
        } finally {
          try {
            if (!_n && _i["return"]) _i["return"]();
          } finally {
            if (_d) throw _e;
          }
        }

        return _arr;
      }

      return function (arr, i) {
        if (Array.isArray(arr)) {
          return arr;
        } else if (Symbol.iterator in Object(arr)) {
          return sliceIterator(arr, i);
        } else {
          throw new TypeError("Invalid attempt to destructure non-iterable instance");
        }
      };
    }();

    var toConsumableArray = function (arr) {
      if (Array.isArray(arr)) {
        for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) arr2[i] = arr[i];

        return arr2;
      } else {
        return Array.from(arr);
      }
    };

    // ==========================================================================

    // Wrap an element
    function wrap(elements, wrapper) {
        // Convert `elements` to an array, if necessary.
        var targets = elements.length ? elements : [elements];

        // Loops backwards to prevent having to clone the wrapper on the
        // first element (see `child` below).
        Array.from(targets).reverse().forEach(function (element, index) {
            var child = index > 0 ? wrapper.cloneNode(true) : wrapper;

            // Cache the current parent and sibling.
            var parent = element.parentNode;
            var sibling = element.nextSibling;

            // Wrap the element (is automatically removed from its current
            // parent).
            child.appendChild(element);

            // If the element had a sibling, insert the wrapper before
            // the sibling to maintain the HTML structure; otherwise, just
            // append it to the parent.
            if (sibling) {
                parent.insertBefore(child, sibling);
            } else {
                parent.appendChild(child);
            }
        });
    }

    // Set attributes
    function setAttributes(element, attributes) {
        if (!is.element(element) || is.empty(attributes)) {
            return;
        }

        // Assume null and undefined attributes should be left out,
        // Setting them would otherwise convert them to "null" and "undefined"
        Object.entries(attributes).filter(function (_ref) {
            var _ref2 = slicedToArray(_ref, 2),
                value = _ref2[1];

            return !is.nullOrUndefined(value);
        }).forEach(function (_ref3) {
            var _ref4 = slicedToArray(_ref3, 2),
                key = _ref4[0],
                value = _ref4[1];

            return element.setAttribute(key, value);
        });
    }

    // Create a DocumentFragment
    function createElement(type, attributes, text) {
        // Create a new <element>
        var element = document.createElement(type);

        // Set all passed attributes
        if (is.object(attributes)) {
            setAttributes(element, attributes);
        }

        // Add text node
        if (is.string(text)) {
            element.innerText = text;
        }

        // Return built element
        return element;
    }

    // Inaert an element after another
    function insertAfter(element, target) {
        target.parentNode.insertBefore(element, target.nextSibling);
    }

    // Insert a DocumentFragment
    function insertElement(type, parent, attributes, text) {
        // Inject the new <element>
        parent.appendChild(createElement(type, attributes, text));
    }

    // Remove element(s)
    function removeElement(element) {
        if (is.nodeList(element) || is.array(element)) {
            Array.from(element).forEach(removeElement);
            return;
        }

        if (!is.element(element) || !is.element(element.parentNode)) {
            return;
        }

        element.parentNode.removeChild(element);
    }

    // Remove all child elements
    function emptyElement(element) {
        var length = element.childNodes.length;


        while (length > 0) {
            element.removeChild(element.lastChild);
            length -= 1;
        }
    }

    // Replace element
    function replaceElement(newChild, oldChild) {
        if (!is.element(oldChild) || !is.element(oldChild.parentNode) || !is.element(newChild)) {
            return null;
        }

        oldChild.parentNode.replaceChild(newChild, oldChild);

        return newChild;
    }

    // Get an attribute object from a string selector
    function getAttributesFromSelector(sel, existingAttributes) {
        // For example:
        // '.test' to { class: 'test' }
        // '#test' to { id: 'test' }
        // '[data-test="test"]' to { 'data-test': 'test' }

        if (!is.string(sel) || is.empty(sel)) {
            return {};
        }

        var attributes = {};
        var existing = existingAttributes;

        sel.split(',').forEach(function (s) {
            // Remove whitespace
            var selector = s.trim();
            var className = selector.replace('.', '');
            var stripped = selector.replace(/[[\]]/g, '');

            // Get the parts and value
            var parts = stripped.split('=');
            var key = parts[0];
            var value = parts.length > 1 ? parts[1].replace(/["']/g, '') : '';

            // Get the first character
            var start = selector.charAt(0);

            switch (start) {
                case '.':
                    // Add to existing classname
                    if (is.object(existing) && is.string(existing.class)) {
                        existing.class += ' ' + className;
                    }

                    attributes.class = className;
                    break;

                case '#':
                    // ID selector
                    attributes.id = selector.replace('#', '');
                    break;

                case '[':
                    // Attribute selector
                    attributes[key] = value;

                    break;

                default:
                    break;
            }
        });

        return attributes;
    }

    // Toggle hidden
    function toggleHidden(element, hidden) {
        if (!is.element(element)) {
            return;
        }

        var hide = hidden;

        if (!is.boolean(hide)) {
            hide = !element.hasAttribute('hidden');
        }

        if (hide) {
            element.setAttribute('hidden', '');
        } else {
            element.removeAttribute('hidden');
        }
    }

    // Mirror Element.classList.toggle, with IE compatibility for "force" argument
    function toggleClass(element, className, force) {
        if (is.element(element)) {
            var method = 'toggle';
            if (typeof force !== 'undefined') {
                method = force ? 'add' : 'remove';
            }

            element.classList[method](className);
            return element.classList.contains(className);
        }

        return null;
    }

    // Has class name
    function hasClass(element, className) {
        return is.element(element) && element.classList.contains(className);
    }

    // Element matches selector
    function matches(element, selector) {
        var prototype = { Element: Element };

        function match() {
            return Array.from(document.querySelectorAll(selector)).includes(this);
        }

        var matches = prototype.matches || prototype.webkitMatchesSelector || prototype.mozMatchesSelector || prototype.msMatchesSelector || match;

        return matches.call(element, selector);
    }

    // Find all elements
    function getElements(selector) {
        return this.elements.container.querySelectorAll(selector);
    }

    // Find a single element
    function getElement(selector) {
        return this.elements.container.querySelector(selector);
    }

    // Get the focused element
    function getFocusElement() {
        var focused = document.activeElement;

        if (!focused || focused === document.body) {
            focused = null;
        } else {
            focused = document.querySelector(':focus');
        }

        return focused;
    }

    // Trap focus inside container
    function trapFocus() {
        var element = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
        var toggle = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;

        if (!is.element(element)) {
            return;
        }

        var focusable = getElements.call(this, 'button:not(:disabled), input:not(:disabled), [tabindex]');
        var first = focusable[0];
        var last = focusable[focusable.length - 1];

        var trap = function trap(event) {
            // Bail if not tab key or not fullscreen
            if (event.key !== 'Tab' || event.keyCode !== 9) {
                return;
            }

            // Get the current focused element
            var focused = getFocusElement();

            if (focused === last && !event.shiftKey) {
                // Move focus to first element that can be tabbed if Shift isn't used
                first.focus();
                event.preventDefault();
            } else if (focused === first && event.shiftKey) {
                // Move focus to last element that can be tabbed if Shift is used
                last.focus();
                event.preventDefault();
            }
        };

        toggleListener.call(this, this.elements.container, 'keydown', trap, toggle, false);
    }

    // ==========================================================================

    var transitionEndEvent = function () {
        var element = document.createElement('span');

        var events = {
            WebkitTransition: 'webkitTransitionEnd',
            MozTransition: 'transitionend',
            OTransition: 'oTransitionEnd otransitionend',
            transition: 'transitionend'
        };

        var type = Object.keys(events).find(function (event) {
            return element.style[event] !== undefined;
        });

        return is.string(type) ? events[type] : false;
    }();

    // Force repaint of element
    function repaint(element) {
        setTimeout(function () {
            toggleHidden(element, true);
            element.offsetHeight; // eslint-disable-line
            toggleHidden(element, false);
        }, 0);
    }

    // ==========================================================================
    // Browser sniffing
    // Unfortunately, due to mixed support, UA sniffing is required
    // ==========================================================================

    var browser = {
        isIE: /* @cc_on!@ */!!document.documentMode,
        isWebkit: 'WebkitAppearance' in document.documentElement.style && !/Edge/.test(navigator.userAgent),
        isIPhone: /(iPhone|iPod)/gi.test(navigator.platform),
        isIos: /(iPad|iPhone|iPod)/gi.test(navigator.platform)
    };

    // ==========================================================================

    // Default codecs for checking mimetype support
    var defaultCodecs = {
        'audio/ogg': 'vorbis',
        'audio/wav': '1',
        'video/webm': 'vp8, vorbis',
        'video/mp4': 'avc1.42E01E, mp4a.40.2',
        'video/ogg': 'theora'
    };

    // Check for feature support
    var support = {
        // Basic support
        audio: 'canPlayType' in document.createElement('audio'),
        video: 'canPlayType' in document.createElement('video'),

        // Check for support
        // Basic functionality vs full UI
        check: function check(type, provider, playsinline) {
            var canPlayInline = browser.isIPhone && playsinline && support.playsinline;
            var api = support[type] || provider !== 'html5';
            var ui = api && support.rangeInput && (type !== 'video' || !browser.isIPhone || canPlayInline);

            return {
                api: api,
                ui: ui
            };
        },


        // Picture-in-picture support
        // Safari only currently
        pip: function () {
            return !browser.isIPhone && is.function(createElement('video').webkitSetPresentationMode);
        }(),

        // Airplay support
        // Safari only currently
        airplay: is.function(window.WebKitPlaybackTargetAvailabilityEvent),

        // Inline playback support
        // https://webkit.org/blog/6784/new-video-policies-for-ios/
        playsinline: 'playsInline' in document.createElement('video'),

        // Check for mime type support against a player instance
        // Credits: http://diveintohtml5.info/everything.html
        // Related: http://www.leanbackplayer.com/test/h5mt.html
        mime: function mime(inputType) {
            var _inputType$split = inputType.split('/'),
                _inputType$split2 = slicedToArray(_inputType$split, 1),
                mediaType = _inputType$split2[0];

            if (!this.isHTML5 || mediaType !== this.type) {
                return false;
            }

            var type = void 0;
            if (inputType && inputType.includes('codecs=')) {
                // Use input directly
                type = inputType;
            } else if (inputType === 'audio/mpeg') {
                // Skip codec
                type = 'audio/mpeg;';
            } else if (inputType in defaultCodecs) {
                // Use codec
                type = inputType + '; codecs="' + defaultCodecs[inputType] + '"';
            }

            try {
                return Boolean(type && this.media.canPlayType(type).replace(/no/, ''));
            } catch (err) {
                return false;
            }
        },


        // Check for textTracks support
        textTracks: 'textTracks' in document.createElement('video'),

        // <input type="range"> Sliders
        rangeInput: function () {
            var range = document.createElement('input');
            range.type = 'range';
            return range.type === 'range';
        }(),

        // Touch
        // NOTE: Remember a device can be mouse + touch enabled so we check on first touch event
        touch: 'ontouchstart' in document.documentElement,

        // Detect transitions support
        transitions: transitionEndEvent !== false,

        // Reduced motion iOS & MacOS setting
        // https://webkit.org/blog/7551/responsive-design-for-motion/
        reducedMotion: 'matchMedia' in window && window.matchMedia('(prefers-reduced-motion)').matches
    };

    // ==========================================================================

    var html5 = {
        getSources: function getSources() {
            var _this = this;

            if (!this.isHTML5) {
                return [];
            }

            var sources = Array.from(this.media.querySelectorAll('source'));

            // Filter out unsupported sources
            return sources.filter(function (source) {
                return support.mime.call(_this, source.getAttribute('type'));
            });
        },


        // Get quality levels
        getQualityOptions: function getQualityOptions() {
            // Get sizes from <source> elements
            return html5.getSources.call(this).map(function (source) {
                return Number(source.getAttribute('size'));
            }).filter(Boolean);
        },
        extend: function extend() {
            if (!this.isHTML5) {
                return;
            }

            var player = this;

            // Quality
            Object.defineProperty(player.media, 'quality', {
                get: function get$$1() {
                    // Get sources
                    var sources = html5.getSources.call(player);

                    var _sources$filter = sources.filter(function (source) {
                        return source.getAttribute('src') === player.source;
                    }),
                        _sources$filter2 = slicedToArray(_sources$filter, 1),
                        source = _sources$filter2[0];

                    // Return size, if match is found


                    return source && Number(source.getAttribute('size'));
                },
                set: function set$$1(input) {
                    // Get sources
                    var sources = html5.getSources.call(player);

                    // Get first match for requested size
                    var source = sources.find(function (source) {
                        return Number(source.getAttribute('size')) === input;
                    });

                    // No matching source found
                    if (!source) {
                        return;
                    }

                    // Get current state
                    var currentTime = player.currentTime,
                        playing = player.playing;

                    // Set new source

                    player.media.src = source.getAttribute('src');

                    // Restore time
                    var onLoadedMetaData = function onLoadedMetaData() {
                        player.currentTime = currentTime;
                    };
                    player.once('loadedmetadata', onLoadedMetaData);

                    // Load new source
                    player.media.load();

                    // Resume playing
                    if (playing) {
                        player.play();
                    }

                    // Trigger change event
                    triggerEvent.call(player, player.media, 'qualitychange', false, {
                        quality: input
                    });
                }
            });
        },


        // Cancel current network requests
        // See https://github.com/sampotts/plyr/issues/174
        cancelRequests: function cancelRequests() {
            if (!this.isHTML5) {
                return;
            }

            // Remove child sources
            removeElement(html5.getSources.call(this));

            // Set blank video src attribute
            // This is to prevent a MEDIA_ERR_SRC_NOT_SUPPORTED error
            // Info: http://stackoverflow.com/questions/32231579/how-to-properly-dispose-of-an-html5-video-and-close-socket-or-connection
            this.media.setAttribute('src', this.config.blankVideo);

            // Load the new empty source
            // This will cancel existing requests
            // See https://github.com/sampotts/plyr/issues/174
            this.media.load();

            // Debugging
            this.debug.log('Cancelled network requests');
        }
    };

    // ==========================================================================

    // Clone nested objects
    function cloneDeep(object) {
        return JSON.parse(JSON.stringify(object));
    }

    // Get a nested value in an object
    function getDeep(object, path) {
        return path.split('.').reduce(function (obj, key) {
            return obj && obj[key];
        }, object);
    }

    // Deep extend destination object with N more objects
    function extend() {
        var target = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

        for (var _len = arguments.length, sources = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
            sources[_key - 1] = arguments[_key];
        }

        if (!sources.length) {
            return target;
        }

        var source = sources.shift();

        if (!is.object(source)) {
            return target;
        }

        Object.keys(source).forEach(function (key) {
            if (is.object(source[key])) {
                if (!Object.keys(target).includes(key)) {
                    Object.assign(target, defineProperty({}, key, {}));
                }

                extend(target[key], source[key]);
            } else {
                Object.assign(target, defineProperty({}, key, source[key]));
            }
        });

        return extend.apply(undefined, [target].concat(sources));
    }

    // ==========================================================================

    // Generate a random ID
    function generateId(prefix) {
        return prefix + '-' + Math.floor(Math.random() * 10000);
    }

    // Format string
    function format(input) {
        for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
            args[_key - 1] = arguments[_key];
        }

        if (is.empty(input)) {
            return input;
        }

        return input.toString().replace(/{(\d+)}/g, function (match, i) {
            return args[i].toString();
        });
    }

    // Get percentage
    function getPercentage(current, max) {
        if (current === 0 || max === 0 || Number.isNaN(current) || Number.isNaN(max)) {
            return 0;
        }

        return (current / max * 100).toFixed(2);
    }

    // Replace all occurances of a string in a string
    function replaceAll() {
        var input = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';
        var find = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';
        var replace = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : '';

        return input.replace(new RegExp(find.toString().replace(/([.*+?^=!:${}()|[\]/\\])/g, '\\$1'), 'g'), replace.toString());
    }

    // Convert to title case
    function toTitleCase() {
        var input = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';

        return input.toString().replace(/\w\S*/g, function (text) {
            return text.charAt(0).toUpperCase() + text.substr(1).toLowerCase();
        });
    }

    // Convert string to pascalCase
    function toPascalCase() {
        var input = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';

        var string = input.toString();

        // Convert kebab case
        string = replaceAll(string, '-', ' ');

        // Convert snake case
        string = replaceAll(string, '_', ' ');

        // Convert to title case
        string = toTitleCase(string);

        // Convert to pascal case
        return replaceAll(string, ' ', '');
    }

    // Convert string to pascalCase
    function toCamelCase() {
        var input = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';

        var string = input.toString();

        // Convert to pascal case
        string = toPascalCase(string);

        // Convert first character to lowercase
        return string.charAt(0).toLowerCase() + string.slice(1);
    }

    // Remove HTML from a string
    function stripHTML(source) {
        var fragment = document.createDocumentFragment();
        var element = document.createElement('div');
        fragment.appendChild(element);
        element.innerHTML = source;
        return fragment.firstChild.innerText;
    }

    // Like outerHTML, but also works for DocumentFragment
    function getHTML(element) {
        var wrapper = document.createElement('div');
        wrapper.appendChild(element);
        return wrapper.innerHTML;
    }

    // ==========================================================================

    var i18n = {
        get: function get$$1() {
            var key = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';
            var config = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

            if (is.empty(key) || is.empty(config)) {
                return '';
            }

            var string = getDeep(config.i18n, key);

            if (is.empty(string)) {
                return '';
            }

            var replace = {
                '{seektime}': config.seekTime,
                '{title}': config.title
            };

            Object.entries(replace).forEach(function (_ref) {
                var _ref2 = slicedToArray(_ref, 2),
                    key = _ref2[0],
                    value = _ref2[1];

                string = replaceAll(string, key, value);
            });

            return string;
        }
    };

    // ==========================================================================

    // Remove duplicates in an array
    function dedupe(array) {
        if (!is.array(array)) {
            return array;
        }

        return array.filter(function (item, index) {
            return array.indexOf(item) === index;
        });
    }

    // Get the closest value in an array
    function closest(array, value) {
        if (!is.array(array) || !array.length) {
            return null;
        }

        return array.reduce(function (prev, curr) {
            return Math.abs(curr - value) < Math.abs(prev - value) ? curr : prev;
        });
    }

    // ==========================================================================

    var Storage = function () {
        function Storage(player) {
            classCallCheck(this, Storage);

            this.enabled = player.config.storage.enabled;
            this.key = player.config.storage.key;
        }

        // Check for actual support (see if we can use it)


        createClass(Storage, [{
            key: 'get',
            value: function get$$1(key) {
                if (!Storage.supported || !this.enabled) {
                    return null;
                }

                var store = window.localStorage.getItem(this.key);

                if (is.empty(store)) {
                    return null;
                }

                var json = JSON.parse(store);

                return is.string(key) && key.length ? json[key] : json;
            }
        }, {
            key: 'set',
            value: function set$$1(object) {
                // Bail if we don't have localStorage support or it's disabled
                if (!Storage.supported || !this.enabled) {
                    return;
                }

                // Can only store objectst
                if (!is.object(object)) {
                    return;
                }

                // Get current storage
                var storage = this.get();

                // Default to empty object
                if (is.empty(storage)) {
                    storage = {};
                }

                // Update the working copy of the values
                extend(storage, object);

                // Update storage
                window.localStorage.setItem(this.key, JSON.stringify(storage));
            }
        }], [{
            key: 'supported',
            get: function get$$1() {
                try {
                    if (!('localStorage' in window)) {
                        return false;
                    }

                    var test = '___test';

                    // Try to use it (it might be disabled, e.g. user is in private mode)
                    // see: https://github.com/sampotts/plyr/issues/131
                    window.localStorage.setItem(test, test);
                    window.localStorage.removeItem(test);

                    return true;
                } catch (e) {
                    return false;
                }
            }
        }]);
        return Storage;
    }();

    // ==========================================================================
    // Fetch wrapper
    // Using XHR to avoid issues with older browsers
    // ==========================================================================

    function fetch(url) {
        var responseType = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'text';

        return new Promise(function (resolve, reject) {
            try {
                var request = new XMLHttpRequest();

                // Check for CORS support
                if (!('withCredentials' in request)) {
                    return;
                }

                request.addEventListener('load', function () {
                    if (responseType === 'text') {
                        try {
                            resolve(JSON.parse(request.responseText));
                        } catch (e) {
                            resolve(request.responseText);
                        }
                    } else {
                        resolve(request.response);
                    }
                });

                request.addEventListener('error', function () {
                    throw new Error(request.status);
                });

                request.open('GET', url, true);

                // Set the required response type
                request.responseType = responseType;

                request.send();
            } catch (e) {
                reject(e);
            }
        });
    }

    // ==========================================================================

    // Load an external SVG sprite
    function loadSprite(url, id) {
        if (!is.string(url)) {
            return;
        }

        var prefix = 'cache';
        var hasId = is.string(id);
        var isCached = false;

        var exists = function exists() {
            return document.getElementById(id) !== null;
        };

        var update = function update(container, data) {
            container.innerHTML = data;

            // Check again incase of race condition
            if (hasId && exists()) {
                return;
            }

            // Inject the SVG to the body
            document.body.insertAdjacentElement('afterbegin', container);
        };

        // Only load once if ID set
        if (!hasId || !exists()) {
            var useStorage = Storage.supported;

            // Create container
            var container = document.createElement('div');
            container.setAttribute('hidden', '');

            if (hasId) {
                container.setAttribute('id', id);
            }

            // Check in cache
            if (useStorage) {
                var cached = window.localStorage.getItem(prefix + '-' + id);
                isCached = cached !== null;

                if (isCached) {
                    var data = JSON.parse(cached);
                    update(container, data.content);
                }
            }

            // Get the sprite
            fetch(url).then(function (result) {
                if (is.empty(result)) {
                    return;
                }

                if (useStorage) {
                    window.localStorage.setItem(prefix + '-' + id, JSON.stringify({
                        content: result
                    }));
                }

                update(container, result);
            }).catch(function () {});
        }
    }

    // ==========================================================================

    // Time helpers
    var getHours = function getHours(value) {
        return parseInt(value / 60 / 60 % 60, 10);
    };
    var getMinutes = function getMinutes(value) {
        return parseInt(value / 60 % 60, 10);
    };
    var getSeconds = function getSeconds(value) {
        return parseInt(value % 60, 10);
    };

    // Format time to UI friendly string
    function formatTime() {
        var time = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;
        var displayHours = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
        var inverted = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;

        // Bail if the value isn't a number
        if (!is.number(time)) {
            return formatTime(null, displayHours, inverted);
        }

        // Format time component to add leading zero
        var format = function format(value) {
            return ('0' + value).slice(-2);
        };

        // Breakdown to hours, mins, secs
        var hours = getHours(time);
        var mins = getMinutes(time);
        var secs = getSeconds(time);

        // Do we need to display hours?
        if (displayHours || hours > 0) {
            hours = hours + ':';
        } else {
            hours = '';
        }

        // Render
        return '' + (inverted && time > 0 ? '-' : '') + hours + format(mins) + ':' + format(secs);
    }

    // ==========================================================================

    // TODO: Don't export a massive object - break down and create class
    var controls = {
        // Get icon URL
        getIconUrl: function getIconUrl() {
            var url = new URL(this.config.iconUrl, window.location);
            var cors = url.host !== window.location.host || browser.isIE && !window.svg4everybody;

            return {
                url: this.config.iconUrl,
                cors: cors
            };
        },


        // Find the UI controls
        findElements: function findElements() {
            try {
                this.elements.controls = getElement.call(this, this.config.selectors.controls.wrapper);

                // Buttons
                this.elements.buttons = {
                    play: getElements.call(this, this.config.selectors.buttons.play),
                    pause: getElement.call(this, this.config.selectors.buttons.pause),
                    restart: getElement.call(this, this.config.selectors.buttons.restart),
                    rewind: getElement.call(this, this.config.selectors.buttons.rewind),
                    fastForward: getElement.call(this, this.config.selectors.buttons.fastForward),
                    mute: getElement.call(this, this.config.selectors.buttons.mute),
                    pip: getElement.call(this, this.config.selectors.buttons.pip),
                    airplay: getElement.call(this, this.config.selectors.buttons.airplay),
                    settings: getElement.call(this, this.config.selectors.buttons.settings),
                    captions: getElement.call(this, this.config.selectors.buttons.captions),
                    fullscreen: getElement.call(this, this.config.selectors.buttons.fullscreen)
                };

                // Progress
                this.elements.progress = getElement.call(this, this.config.selectors.progress);

                // Inputs
                this.elements.inputs = {
                    seek: getElement.call(this, this.config.selectors.inputs.seek),
                    volume: getElement.call(this, this.config.selectors.inputs.volume)
                };

                // Display
                this.elements.display = {
                    buffer: getElement.call(this, this.config.selectors.display.buffer),
                    currentTime: getElement.call(this, this.config.selectors.display.currentTime),
                    duration: getElement.call(this, this.config.selectors.display.duration)
                };

                // Seek tooltip
                if (is.element(this.elements.progress)) {
                    this.elements.display.seekTooltip = this.elements.progress.querySelector('.' + this.config.classNames.tooltip);
                }

                return true;
            } catch (error) {
                // Log it
                this.debug.warn('It looks like there is a problem with your custom controls HTML', error);

                // Restore native video controls
                this.toggleNativeControls(true);

                return false;
            }
        },


        // Create <svg> icon
        createIcon: function createIcon(type, attributes) {
            var namespace = 'http://www.w3.org/2000/svg';
            var iconUrl = controls.getIconUrl.call(this);
            var iconPath = (!iconUrl.cors ? iconUrl.url : '') + '#' + this.config.iconPrefix;

            // Create <svg>
            var icon = document.createElementNS(namespace, 'svg');
            setAttributes(icon, extend(attributes, {
                role: 'presentation',
                focusable: 'false'
            }));

            // Create the <use> to reference sprite
            var use = document.createElementNS(namespace, 'use');
            var path = iconPath + '-' + type;

            // Set `href` attributes
            // https://github.com/sampotts/plyr/issues/460
            // https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/xlink:href
            if ('href' in use) {
                use.setAttributeNS('http://www.w3.org/1999/xlink', 'href', path);
            } else {
                use.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', path);
            }

            // Add <use> to <svg>
            icon.appendChild(use);

            return icon;
        },


        // Create hidden text label
        createLabel: function createLabel(type) {
            var attr = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

            // Skip i18n for abbreviations and brand names
            var universals = {
                pip: 'PIP',
                airplay: 'AirPlay'
            };
            var text = universals[type] || i18n.get(type, this.config);

            var attributes = Object.assign({}, attr, {
                class: [attr.class, this.config.classNames.hidden].filter(Boolean).join(' ')
            });
            return createElement('span', attributes, text);
        },


        // Create a badge
        createBadge: function createBadge(text) {
            if (is.empty(text)) {
                return null;
            }

            var badge = createElement('span', {
                class: this.config.classNames.menu.value
            });

            badge.appendChild(createElement('span', {
                class: this.config.classNames.menu.badge
            }, text));

            return badge;
        },


        // Create a <button>
        createButton: function createButton(buttonType, attr) {
            var button = createElement('button');
            var attributes = Object.assign({}, attr);
            var type = toCamelCase(buttonType);

            var toggle = false;
            var label = void 0;
            var icon = void 0;
            var labelPressed = void 0;
            var iconPressed = void 0;

            if (!('type' in attributes)) {
                attributes.type = 'button';
            }

            if ('class' in attributes) {
                if (attributes.class.includes(this.config.classNames.control)) {
                    attributes.class += ' ' + this.config.classNames.control;
                }
            } else {
                attributes.class = this.config.classNames.control;
            }

            // Large play button
            switch (buttonType) {
                case 'play':
                    toggle = true;
                    label = 'play';
                    labelPressed = 'pause';
                    icon = 'play';
                    iconPressed = 'pause';
                    break;

                case 'mute':
                    toggle = true;
                    label = 'mute';
                    labelPressed = 'unmute';
                    icon = 'volume';
                    iconPressed = 'muted';
                    break;

                case 'captions':
                    toggle = true;
                    label = 'enableCaptions';
                    labelPressed = 'disableCaptions';
                    icon = 'captions-off';
                    iconPressed = 'captions-on';
                    break;

                case 'fullscreen':
                    toggle = true;
                    label = 'enterFullscreen';
                    labelPressed = 'exitFullscreen';
                    icon = 'enter-fullscreen';
                    iconPressed = 'exit-fullscreen';
                    break;

                case 'play-large':
                    attributes.class += ' ' + this.config.classNames.control + '--overlaid';
                    type = 'play';
                    label = 'play';
                    icon = 'play';
                    break;

                default:
                    label = type;
                    icon = buttonType;
            }

            // Setup toggle icon and labels
            if (toggle) {
                // Icon
                button.appendChild(controls.createIcon.call(this, iconPressed, { class: 'icon--pressed' }));
                button.appendChild(controls.createIcon.call(this, icon, { class: 'icon--not-pressed' }));

                // Label/Tooltip
                button.appendChild(controls.createLabel.call(this, labelPressed, { class: 'label--pressed' }));
                button.appendChild(controls.createLabel.call(this, label, { class: 'label--not-pressed' }));
            } else {
                button.appendChild(controls.createIcon.call(this, icon));
                button.appendChild(controls.createLabel.call(this, label));
            }

            // Merge attributes
            extend(attributes, getAttributesFromSelector(this.config.selectors.buttons[type], attributes));

            setAttributes(button, attributes);

            // We have multiple play buttons
            if (type === 'play') {
                if (!is.array(this.elements.buttons[type])) {
                    this.elements.buttons[type] = [];
                }

                this.elements.buttons[type].push(button);
            } else {
                this.elements.buttons[type] = button;
            }

            // Toggle classname when pressed property is set
            var className = this.config.classNames.controlPressed;
            Object.defineProperty(button, 'pressed', {
                enumerable: true,
                get: function get$$1() {
                    return hasClass(button, className);
                },
                set: function set$$1() {
                    var pressed = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;

                    toggleClass(button, className, pressed);
                }
            });

            return button;
        },


        // Create an <input type='range'>
        createRange: function createRange(type, attributes) {
            // Seek input
            var input = createElement('input', extend(getAttributesFromSelector(this.config.selectors.inputs[type]), {
                type: 'range',
                min: 0,
                max: 100,
                step: 0.01,
                value: 0,
                autocomplete: 'off',
                // A11y fixes for https://github.com/sampotts/plyr/issues/905
                role: 'slider',
                'aria-label': i18n.get(type, this.config),
                'aria-valuemin': 0,
                'aria-valuemax': 100,
                'aria-valuenow': 0
            }, attributes));

            this.elements.inputs[type] = input;

            // Set the fill for webkit now
            controls.updateRangeFill.call(this, input);

            return input;
        },


        // Create a <progress>
        createProgress: function createProgress(type, attributes) {
            var progress = createElement('progress', extend(getAttributesFromSelector(this.config.selectors.display[type]), {
                min: 0,
                max: 100,
                value: 0,
                role: 'presentation',
                'aria-hidden': true
            }, attributes));

            // Create the label inside
            if (type !== 'volume') {
                progress.appendChild(createElement('span', null, '0'));

                var suffixKey = {
                    played: 'played',
                    buffer: 'buffered'
                }[type];
                var suffix = suffixKey ? i18n.get(suffixKey, this.config) : '';

                progress.innerText = '% ' + suffix.toLowerCase();
            }

            this.elements.display[type] = progress;

            return progress;
        },


        // Create time display
        createTime: function createTime(type) {
            var attributes = getAttributesFromSelector(this.config.selectors.display[type]);

            var container = createElement('div', extend(attributes, {
                class: 'plyr__time ' + attributes.class,
                'aria-label': i18n.get(type, this.config)
            }), '00:00');

            // Reference for updates
            this.elements.display[type] = container;

            return container;
        },


        // Create a settings menu item
        createMenuItem: function createMenuItem(_ref) {
            var value = _ref.value,
                list = _ref.list,
                type = _ref.type,
                title = _ref.title,
                _ref$badge = _ref.badge,
                badge = _ref$badge === undefined ? null : _ref$badge,
                _ref$checked = _ref.checked,
                checked = _ref$checked === undefined ? false : _ref$checked;

            var item = createElement('li');

            var label = createElement('label', {
                class: this.config.classNames.control
            });

            var radio = createElement('input', extend(getAttributesFromSelector(this.config.selectors.inputs[type]), {
                type: 'radio',
                name: 'plyr-' + type,
                value: value,
                checked: checked,
                class: 'plyr__sr-only'
            }));

            var faux = createElement('span', { hidden: '' });

            label.appendChild(radio);
            label.appendChild(faux);
            label.insertAdjacentHTML('beforeend', title);

            if (is.element(badge)) {
                label.appendChild(badge);
            }

            item.appendChild(label);
            list.appendChild(item);
        },


        // Format a time for display
        formatTime: function formatTime$$1() {
            var time = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;
            var inverted = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;

            // Bail if the value isn't a number
            if (!is.number(time)) {
                return time;
            }

            // Always display hours if duration is over an hour
            var forceHours = getHours(this.duration) > 0;

            return formatTime(time, forceHours, inverted);
        },


        // Update the displayed time
        updateTimeDisplay: function updateTimeDisplay() {
            var target = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
            var time = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
            var inverted = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;

            // Bail if there's no element to display or the value isn't a number
            if (!is.element(target) || !is.number(time)) {
                return;
            }

            // eslint-disable-next-line no-param-reassign
            target.innerText = controls.formatTime(time, inverted);
        },


        // Update volume UI and storage
        updateVolume: function updateVolume() {
            if (!this.supported.ui) {
                return;
            }

            // Update range
            if (is.element(this.elements.inputs.volume)) {
                controls.setRange.call(this, this.elements.inputs.volume, this.muted ? 0 : this.volume);
            }

            // Update mute state
            if (is.element(this.elements.buttons.mute)) {
                this.elements.buttons.mute.pressed = this.muted || this.volume === 0;
            }
        },


        // Update seek value and lower fill
        setRange: function setRange(target) {
            var value = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;

            if (!is.element(target)) {
                return;
            }

            // eslint-disable-next-line
            target.value = value;

            // Webkit range fill
            controls.updateRangeFill.call(this, target);
        },


        // Update <progress> elements
        updateProgress: function updateProgress(event) {
            var _this = this;

            if (!this.supported.ui || !is.event(event)) {
                return;
            }

            var value = 0;

            var setProgress = function setProgress(target, input) {
                var value = is.number(input) ? input : 0;
                var progress = is.element(target) ? target : _this.elements.display.buffer;

                // Update value and label
                if (is.element(progress)) {
                    progress.value = value;

                    // Update text label inside
                    var label = progress.getElementsByTagName('span')[0];
                    if (is.element(label)) {
                        label.childNodes[0].nodeValue = value;
                    }
                }
            };

            if (event) {
                switch (event.type) {
                    // Video playing
                    case 'timeupdate':
                    case 'seeking':
                    case 'seeked':
                        value = getPercentage(this.currentTime, this.duration);

                        // Set seek range value only if it's a 'natural' time event
                        if (event.type === 'timeupdate') {
                            controls.setRange.call(this, this.elements.inputs.seek, value);
                        }

                        break;

                    // Check buffer status
                    case 'playing':
                    case 'progress':
                        setProgress(this.elements.display.buffer, this.buffered * 100);

                        break;

                    default:
                        break;
                }
            }
        },


        // Webkit polyfill for lower fill range
        updateRangeFill: function updateRangeFill(target) {
            // Get range from event if event passed
            var range = is.event(target) ? target.target : target;

            // Needs to be a valid <input type='range'>
            if (!is.element(range) || range.getAttribute('type') !== 'range') {
                return;
            }

            // Set aria values for https://github.com/sampotts/plyr/issues/905
            if (matches(range, this.config.selectors.inputs.seek)) {
                range.setAttribute('aria-valuenow', this.currentTime);
                var currentTime = controls.formatTime(this.currentTime);
                var duration = controls.formatTime(this.duration);
                var format$$1 = i18n.get('seekLabel', this.config);
                range.setAttribute('aria-valuetext', format$$1.replace('{currentTime}', currentTime).replace('{duration}', duration));
            } else if (matches(range, this.config.selectors.inputs.volume)) {
                var percent = range.value * 100;
                range.setAttribute('aria-valuenow', percent);
                range.setAttribute('aria-valuetext', percent + '%');
            } else {
                range.setAttribute('aria-valuenow', range.value);
            }

            // WebKit only
            if (!browser.isWebkit) {
                return;
            }

            // Set CSS custom property
            range.style.setProperty('--value', range.value / range.max * 100 + '%');
        },


        // Update hover tooltip for seeking
        updateSeekTooltip: function updateSeekTooltip(event) {
            var _this2 = this;

            // Bail if setting not true
            if (!this.config.tooltips.seek || !is.element(this.elements.inputs.seek) || !is.element(this.elements.display.seekTooltip) || this.duration === 0) {
                return;
            }

            // Calculate percentage
            var percent = 0;
            var clientRect = this.elements.progress.getBoundingClientRect();
            var visible = this.config.classNames.tooltip + '--visible';

            var toggle = function toggle(_toggle) {
                toggleClass(_this2.elements.display.seekTooltip, visible, _toggle);
            };

            // Hide on touch
            if (this.touch) {
                toggle(false);
                return;
            }

            // Determine percentage, if already visible
            if (is.event(event)) {
                percent = 100 / clientRect.width * (event.pageX - clientRect.left);
            } else if (hasClass(this.elements.display.seekTooltip, visible)) {
                percent = parseFloat(this.elements.display.seekTooltip.style.left, 10);
            } else {
                return;
            }

            // Set bounds
            if (percent < 0) {
                percent = 0;
            } else if (percent > 100) {
                percent = 100;
            }

            // Display the time a click would seek to
            controls.updateTimeDisplay.call(this, this.elements.display.seekTooltip, this.duration / 100 * percent);

            // Set position
            this.elements.display.seekTooltip.style.left = percent + '%';

            // Show/hide the tooltip
            // If the event is a moues in/out and percentage is inside bounds
            if (is.event(event) && ['mouseenter', 'mouseleave'].includes(event.type)) {
                toggle(event.type === 'mouseenter');
            }
        },


        // Handle time change event
        timeUpdate: function timeUpdate(event) {
            // Only invert if only one time element is displayed and used for both duration and currentTime
            var invert = !is.element(this.elements.display.duration) && this.config.invertTime;

            // Duration
            controls.updateTimeDisplay.call(this, this.elements.display.currentTime, invert ? this.duration - this.currentTime : this.currentTime, invert);

            // Ignore updates while seeking
            if (event && event.type === 'timeupdate' && this.media.seeking) {
                return;
            }

            // Playing progress
            controls.updateProgress.call(this, event);
        },


        // Show the duration on metadataloaded or durationchange events
        durationUpdate: function durationUpdate() {
            // Bail if no UI or durationchange event triggered after playing/seek when invertTime is false
            if (!this.supported.ui || !this.config.invertTime && this.currentTime) {
                return;
            }

            // Update ARIA values
            if (is.element(this.elements.inputs.seek)) {
                this.elements.inputs.seek.setAttribute('aria-valuemax', this.duration);
            }

            // If there's a spot to display duration
            var hasDuration = is.element(this.elements.display.duration);

            // If there's only one time display, display duration there
            if (!hasDuration && this.config.displayDuration && this.paused) {
                controls.updateTimeDisplay.call(this, this.elements.display.currentTime, this.duration);
            }

            // If there's a duration element, update content
            if (hasDuration) {
                controls.updateTimeDisplay.call(this, this.elements.display.duration, this.duration);
            }

            // Update the tooltip (if visible)
            controls.updateSeekTooltip.call(this);
        },


        // Hide/show a tab
        toggleTab: function toggleTab(setting, toggle) {
            toggleHidden(this.elements.settings.tabs[setting], !toggle);
        },


        // Set the quality menu
        setQualityMenu: function setQualityMenu(options) {
            var _this3 = this;

            // Menu required
            if (!is.element(this.elements.settings.panes.quality)) {
                return;
            }

            var type = 'quality';
            var list = this.elements.settings.panes.quality.querySelector('ul');

            // Set options if passed and filter based on uniqueness and config
            if (is.array(options)) {
                this.options.quality = dedupe(options).filter(function (quality) {
                    return _this3.config.quality.options.includes(quality);
                });
            }

            // Toggle the pane and tab
            var toggle = !is.empty(this.options.quality) && this.options.quality.length > 1;
            controls.toggleTab.call(this, type, toggle);

            // Check if we need to toggle the parent
            controls.checkMenu.call(this);

            // If we're hiding, nothing more to do
            if (!toggle) {
                return;
            }

            // Empty the menu
            emptyElement(list);

            // Get the badge HTML for HD, 4K etc
            var getBadge = function getBadge(quality) {
                var label = i18n.get('qualityBadge.' + quality, _this3.config);

                if (!label.length) {
                    return null;
                }

                return controls.createBadge.call(_this3, label);
            };

            // Sort options by the config and then render options
            this.options.quality.sort(function (a, b) {
                var sorting = _this3.config.quality.options;
                return sorting.indexOf(a) > sorting.indexOf(b) ? 1 : -1;
            }).forEach(function (quality) {
                controls.createMenuItem.call(_this3, {
                    value: quality,
                    list: list,
                    type: type,
                    title: controls.getLabel.call(_this3, 'quality', quality),
                    badge: getBadge(quality)
                });
            });

            controls.updateSetting.call(this, type, list);
        },


        // Translate a value into a nice label
        getLabel: function getLabel(setting, value) {
            switch (setting) {
                case 'speed':
                    return value === 1 ? i18n.get('normal', this.config) : value + '&times;';

                case 'quality':
                    if (is.number(value)) {
                        var label = i18n.get('qualityLabel.' + value, this.config);

                        if (!label.length) {
                            return value + 'p';
                        }

                        return label;
                    }

                    return toTitleCase(value);

                case 'captions':
                    return captions.getLabel.call(this);

                default:
                    return null;
            }
        },


        // Update the selected setting
        updateSetting: function updateSetting(setting, container, input) {
            var pane = this.elements.settings.panes[setting];
            var value = null;
            var list = container;

            if (setting === 'captions') {
                value = this.currentTrack;
            } else {
                value = !is.empty(input) ? input : this[setting];

                // Get default
                if (is.empty(value)) {
                    value = this.config[setting].default;
                }

                // Unsupported value
                if (!is.empty(this.options[setting]) && !this.options[setting].includes(value)) {
                    this.debug.warn('Unsupported value of \'' + value + '\' for ' + setting);
                    return;
                }

                // Disabled value
                if (!this.config[setting].options.includes(value)) {
                    this.debug.warn('Disabled value of \'' + value + '\' for ' + setting);
                    return;
                }
            }

            // Get the list if we need to
            if (!is.element(list)) {
                list = pane && pane.querySelector('ul');
            }

            // If there's no list it means it's not been rendered...
            if (!is.element(list)) {
                return;
            }

            // Update the label
            var label = this.elements.settings.tabs[setting].querySelector('.' + this.config.classNames.menu.value);
            label.innerHTML = controls.getLabel.call(this, setting, value);

            // Find the radio option and check it
            var target = list && list.querySelector('input[value="' + value + '"]');

            if (is.element(target)) {
                target.checked = true;
            }
        },


        // Set the looping options
        /* setLoopMenu() {
            // Menu required
            if (!is.element(this.elements.settings.panes.loop)) {
                return;
            }
             const options = ['start', 'end', 'all', 'reset'];
            const list = this.elements.settings.panes.loop.querySelector('ul');
             // Show the pane and tab
            toggleHidden(this.elements.settings.tabs.loop, false);
            toggleHidden(this.elements.settings.panes.loop, false);
             // Toggle the pane and tab
            const toggle = !is.empty(this.loop.options);
            controls.toggleTab.call(this, 'loop', toggle);
             // Empty the menu
            emptyElement(list);
             options.forEach(option => {
                const item = createElement('li');
                 const button = createElement(
                    'button',
                    extend(getAttributesFromSelector(this.config.selectors.buttons.loop), {
                        type: 'button',
                        class: this.config.classNames.control,
                        'data-plyr-loop-action': option,
                    }),
                    i18n.get(option, this.config)
                );
                 if (['start', 'end'].includes(option)) {
                    const badge = controls.createBadge.call(this, '00:00');
                    button.appendChild(badge);
                }
                 item.appendChild(button);
                list.appendChild(item);
            });
        }, */

        // Get current selected caption language
        // TODO: rework this to user the getter in the API?

        // Set a list of available captions languages
        setCaptionsMenu: function setCaptionsMenu() {
            var _this4 = this;

            // TODO: Captions or language? Currently it's mixed
            var type = 'captions';
            var list = this.elements.settings.panes.captions.querySelector('ul');
            var tracks = captions.getTracks.call(this);

            // Toggle the pane and tab
            controls.toggleTab.call(this, type, tracks.length);

            // Empty the menu
            emptyElement(list);

            // Check if we need to toggle the parent
            controls.checkMenu.call(this);

            // If there's no captions, bail
            if (!tracks.length) {
                return;
            }

            // Generate options data
            var options = tracks.map(function (track, value) {
                return {
                    value: value,
                    checked: _this4.captions.toggled && _this4.currentTrack === value,
                    title: captions.getLabel.call(_this4, track),
                    badge: track.language && controls.createBadge.call(_this4, track.language.toUpperCase()),
                    list: list,
                    type: 'language'
                };
            });

            // Add the "Disabled" option to turn off captions
            options.unshift({
                value: -1,
                checked: !this.captions.toggled,
                title: i18n.get('disabled', this.config),
                list: list,
                type: 'language'
            });

            // Generate options
            options.forEach(controls.createMenuItem.bind(this));

            controls.updateSetting.call(this, type, list);
        },


        // Set a list of available captions languages
        setSpeedMenu: function setSpeedMenu(options) {
            var _this5 = this;

            // Do nothing if not selected
            if (!this.config.controls.includes('settings') || !this.config.settings.includes('speed')) {
                return;
            }

            // Menu required
            if (!is.element(this.elements.settings.panes.speed)) {
                return;
            }

            var type = 'speed';

            // Set the speed options
            if (is.array(options)) {
                this.options.speed = options;
            } else if (this.isHTML5 || this.isVimeo) {
                this.options.speed = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
            }

            // Set options if passed and filter based on config
            this.options.speed = this.options.speed.filter(function (speed) {
                return _this5.config.speed.options.includes(speed);
            });

            // Toggle the pane and tab
            var toggle = !is.empty(this.options.speed) && this.options.speed.length > 1;
            controls.toggleTab.call(this, type, toggle);

            // Check if we need to toggle the parent
            controls.checkMenu.call(this);

            // If we're hiding, nothing more to do
            if (!toggle) {
                return;
            }

            // Get the list to populate
            var list = this.elements.settings.panes.speed.querySelector('ul');

            // Empty the menu
            emptyElement(list);

            // Create items
            this.options.speed.forEach(function (speed) {
                controls.createMenuItem.call(_this5, {
                    value: speed,
                    list: list,
                    type: type,
                    title: controls.getLabel.call(_this5, 'speed', speed)
                });
            });

            controls.updateSetting.call(this, type, list);
        },


        // Check if we need to hide/show the settings menu
        checkMenu: function checkMenu() {
            var tabs = this.elements.settings.tabs;

            var visible = !is.empty(tabs) && Object.values(tabs).some(function (tab) {
                return !tab.hidden;
            });

            toggleHidden(this.elements.settings.menu, !visible);
        },


        // Show/hide menu
        toggleMenu: function toggleMenu(event) {
            var form = this.elements.settings.form;

            var button = this.elements.buttons.settings;

            // Menu and button are required
            if (!is.element(form) || !is.element(button)) {
                return;
            }

            var show = is.boolean(event) ? event : is.element(form) && form.hasAttribute('hidden');

            if (is.event(event)) {
                var isMenuItem = is.element(form) && form.contains(event.target);
                var isButton = event.target === this.elements.buttons.settings;

                // If the click was inside the form or if the click
                // wasn't the button or menu item and we're trying to
                // show the menu (a doc click shouldn't show the menu)
                if (isMenuItem || !isMenuItem && !isButton && show) {
                    return;
                }

                // Prevent the toggle being caught by the doc listener
                if (isButton) {
                    event.stopPropagation();
                }
            }

            // Set form and button attributes
            if (is.element(button)) {
                button.setAttribute('aria-expanded', show);
            }

            if (is.element(form)) {
                toggleHidden(form, !show);
                toggleClass(this.elements.container, this.config.classNames.menu.open, show);

                if (show) {
                    form.removeAttribute('tabindex');
                } else {
                    form.setAttribute('tabindex', -1);
                }
            }
        },


        // Get the natural size of a tab
        getTabSize: function getTabSize(tab) {
            var clone = tab.cloneNode(true);
            clone.style.position = 'absolute';
            clone.style.opacity = 0;
            clone.removeAttribute('hidden');

            // Prevent input's being unchecked due to the name being identical
            Array.from(clone.querySelectorAll('input[name]')).forEach(function (input) {
                var name = input.getAttribute('name');
                input.setAttribute('name', name + '-clone');
            });

            // Append to parent so we get the "real" size
            tab.parentNode.appendChild(clone);

            // Get the sizes before we remove
            var width = clone.scrollWidth;
            var height = clone.scrollHeight;

            // Remove from the DOM
            removeElement(clone);

            return {
                width: width,
                height: height
            };
        },


        // Toggle Menu
        showTab: function showTab() {
            var _this6 = this;

            var target = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';
            var menu = this.elements.settings.menu;

            var pane = document.getElementById(target);

            // Nothing to show, bail
            if (!is.element(pane)) {
                return;
            }

            // Are we targeting a tab? If not, bail
            var isTab = pane.getAttribute('role') === 'tabpanel';
            if (!isTab) {
                return;
            }

            // Hide all other tabs
            // Get other tabs
            var current = menu.querySelector('[role="tabpanel"]:not([hidden])');
            var container = current.parentNode;

            // Set other toggles to be expanded false
            Array.from(menu.querySelectorAll('[aria-controls="' + current.getAttribute('id') + '"]')).forEach(function (toggle) {
                toggle.setAttribute('aria-expanded', false);
            });

            // If we can do fancy animations, we'll animate the height/width
            if (support.transitions && !support.reducedMotion) {
                // Set the current width as a base
                container.style.width = current.scrollWidth + 'px';
                container.style.height = current.scrollHeight + 'px';

                // Get potential sizes
                var size = controls.getTabSize.call(this, pane);

                // Restore auto height/width
                var restore = function restore(e) {
                    // We're only bothered about height and width on the container
                    if (e.target !== container || !['width', 'height'].includes(e.propertyName)) {
                        return;
                    }

                    // Revert back to auto
                    container.style.width = '';
                    container.style.height = '';

                    // Only listen once
                    off.call(_this6, container, transitionEndEvent, restore);
                };

                // Listen for the transition finishing and restore auto height/width
                on.call(this, container, transitionEndEvent, restore);

                // Set dimensions to target
                container.style.width = size.width + 'px';
                container.style.height = size.height + 'px';
            }

            // Set attributes on current tab
            toggleHidden(current, true);
            current.setAttribute('tabindex', -1);

            // Set attributes on target
            toggleHidden(pane, false);

            var tabs = getElements.call(this, '[aria-controls="' + target + '"]');
            Array.from(tabs).forEach(function (tab) {
                tab.setAttribute('aria-expanded', true);
            });
            pane.removeAttribute('tabindex');

            // Focus the first item
            pane.querySelectorAll('button:not(:disabled), input:not(:disabled), [tabindex]')[0].focus();
        },


        // Build the default HTML
        // TODO: Set order based on order in the config.controls array?
        create: function create(data) {
            var _this7 = this;

            // Do nothing if we want no controls
            if (is.empty(this.config.controls)) {
                return null;
            }

            // Create the container
            var container = createElement('div', getAttributesFromSelector(this.config.selectors.controls.wrapper));

            // Restart button
            if (this.config.controls.includes('restart')) {
                container.appendChild(controls.createButton.call(this, 'restart'));
            }

            // Rewind button
            if (this.config.controls.includes('rewind')) {
                container.appendChild(controls.createButton.call(this, 'rewind'));
            }

            // Play/Pause button
            if (this.config.controls.includes('play')) {
                container.appendChild(controls.createButton.call(this, 'play'));
            }

            // Fast forward button
            if (this.config.controls.includes('fast-forward')) {
                container.appendChild(controls.createButton.call(this, 'fast-forward'));
            }

            // Progress
            if (this.config.controls.includes('progress')) {
                var progress = createElement('div', getAttributesFromSelector(this.config.selectors.progress));

                // Seek range slider
                progress.appendChild(controls.createRange.call(this, 'seek', {
                    id: 'plyr-seek-' + data.id
                }));

                // Buffer progress
                progress.appendChild(controls.createProgress.call(this, 'buffer'));

                // TODO: Add loop display indicator

                // Seek tooltip
                if (this.config.tooltips.seek) {
                    var tooltip = createElement('span', {
                        class: this.config.classNames.tooltip
                    }, '00:00');

                    progress.appendChild(tooltip);
                    this.elements.display.seekTooltip = tooltip;
                }

                this.elements.progress = progress;
                container.appendChild(this.elements.progress);
            }

            // Media current time display
            if (this.config.controls.includes('current-time')) {
                container.appendChild(controls.createTime.call(this, 'currentTime'));
            }

            // Media duration display
            if (this.config.controls.includes('duration')) {
                container.appendChild(controls.createTime.call(this, 'duration'));
            }

            // Toggle mute button
            if (this.config.controls.includes('mute')) {
                container.appendChild(controls.createButton.call(this, 'mute'));
            }

            // Volume range control
            if (this.config.controls.includes('volume')) {
                var volume = createElement('div', {
                    class: 'plyr__volume'
                });

                // Set the attributes
                var attributes = {
                    max: 1,
                    step: 0.05,
                    value: this.config.volume
                };

                // Create the volume range slider
                volume.appendChild(controls.createRange.call(this, 'volume', extend(attributes, {
                    id: 'plyr-volume-' + data.id
                })));

                this.elements.volume = volume;

                container.appendChild(volume);
            }

            // Toggle captions button
            if (this.config.controls.includes('captions')) {
                container.appendChild(controls.createButton.call(this, 'captions'));
            }

            // Settings button / menu
            if (this.config.controls.includes('settings') && !is.empty(this.config.settings)) {
                var menu = createElement('div', {
                    class: 'plyr__menu',
                    hidden: ''
                });

                menu.appendChild(controls.createButton.call(this, 'settings', {
                    id: 'plyr-settings-toggle-' + data.id,
                    'aria-haspopup': true,
                    'aria-controls': 'plyr-settings-' + data.id,
                    'aria-expanded': false
                }));

                var form = createElement('form', {
                    class: 'plyr__menu__container',
                    id: 'plyr-settings-' + data.id,
                    hidden: '',
                    'aria-labelled-by': 'plyr-settings-toggle-' + data.id,
                    role: 'tablist',
                    tabindex: -1
                });

                var inner = createElement('div');

                var home = createElement('div', {
                    id: 'plyr-settings-' + data.id + '-home',
                    'aria-labelled-by': 'plyr-settings-toggle-' + data.id,
                    role: 'tabpanel'
                });

                // Create the tab list
                var tabs = createElement('ul', {
                    role: 'tablist'
                });

                // Build the tabs
                this.config.settings.forEach(function (type) {
                    var tab = createElement('li', {
                        role: 'tab',
                        hidden: ''
                    });

                    var button = createElement('button', extend(getAttributesFromSelector(_this7.config.selectors.buttons.settings), {
                        type: 'button',
                        class: _this7.config.classNames.control + ' ' + _this7.config.classNames.control + '--forward',
                        id: 'plyr-settings-' + data.id + '-' + type + '-tab',
                        'aria-haspopup': true,
                        'aria-controls': 'plyr-settings-' + data.id + '-' + type,
                        'aria-expanded': false
                    }), i18n.get(type, _this7.config));

                    var value = createElement('span', {
                        class: _this7.config.classNames.menu.value
                    });

                    // Speed contains HTML entities
                    value.innerHTML = data[type];

                    button.appendChild(value);
                    tab.appendChild(button);
                    tabs.appendChild(tab);

                    _this7.elements.settings.tabs[type] = tab;
                });

                home.appendChild(tabs);
                inner.appendChild(home);

                // Build the panes
                this.config.settings.forEach(function (type) {
                    var pane = createElement('div', {
                        id: 'plyr-settings-' + data.id + '-' + type,
                        hidden: '',
                        'aria-labelled-by': 'plyr-settings-' + data.id + '-' + type + '-tab',
                        role: 'tabpanel',
                        tabindex: -1
                    });

                    var back = createElement('button', {
                        type: 'button',
                        class: _this7.config.classNames.control + ' ' + _this7.config.classNames.control + '--back',
                        'aria-haspopup': true,
                        'aria-controls': 'plyr-settings-' + data.id + '-home',
                        'aria-expanded': false
                    }, i18n.get(type, _this7.config));

                    pane.appendChild(back);

                    var options = createElement('ul');

                    pane.appendChild(options);
                    inner.appendChild(pane);

                    _this7.elements.settings.panes[type] = pane;
                });

                form.appendChild(inner);
                menu.appendChild(form);
                container.appendChild(menu);

                this.elements.settings.form = form;
                this.elements.settings.menu = menu;
            }

            // Picture in picture button
            if (this.config.controls.includes('pip') && support.pip) {
                container.appendChild(controls.createButton.call(this, 'pip'));
            }

            // Airplay button
            if (this.config.controls.includes('airplay') && support.airplay) {
                container.appendChild(controls.createButton.call(this, 'airplay'));
            }

            // Toggle fullscreen button
            if (this.config.controls.includes('fullscreen')) {
                container.appendChild(controls.createButton.call(this, 'fullscreen'));
            }

            // Larger overlaid play button
            if (this.config.controls.includes('play-large')) {
                this.elements.container.appendChild(controls.createButton.call(this, 'play-large'));
            }

            this.elements.controls = container;

            if (this.isHTML5) {
                controls.setQualityMenu.call(this, html5.getQualityOptions.call(this));
            }

            controls.setSpeedMenu.call(this);

            return container;
        },


        // Insert controls
        inject: function inject() {
            var _this8 = this;

            // Sprite
            if (this.config.loadSprite) {
                var icon = controls.getIconUrl.call(this);

                // Only load external sprite using AJAX
                if (icon.cors) {
                    loadSprite(icon.url, 'sprite-plyr');
                }
            }

            // Create a unique ID
            this.id = Math.floor(Math.random() * 10000);

            // Null by default
            var container = null;
            this.elements.controls = null;

            // Set template properties
            var props = {
                id: this.id,
                seektime: this.config.seekTime,
                title: this.config.title
            };
            var update = true;

            if (is.string(this.config.controls) || is.element(this.config.controls)) {
                // String or HTMLElement passed as the option
                container = this.config.controls;
            } else if (is.function(this.config.controls)) {
                // A custom function to build controls
                // The function can return a HTMLElement or String
                container = this.config.controls.call(this, props);
            } else {
                // Create controls
                container = controls.create.call(this, {
                    id: this.id,
                    seektime: this.config.seekTime,
                    speed: this.speed,
                    quality: this.quality,
                    captions: captions.getLabel.call(this)
                    // TODO: Looping
                    // loop: 'None',
                });
                update = false;
            }

            // Replace props with their value
            var replace = function replace(input) {
                var result = input;

                Object.entries(props).forEach(function (_ref2) {
                    var _ref3 = slicedToArray(_ref2, 2),
                        key = _ref3[0],
                        value = _ref3[1];

                    result = replaceAll(result, '{' + key + '}', value);
                });

                return result;
            };

            // Update markup
            if (update) {
                if (is.string(this.config.controls)) {
                    container = replace(container);
                } else if (is.element(container)) {
                    container.innerHTML = replace(container.innerHTML);
                }
            }

            // Controls container
            var target = void 0;

            // Inject to custom location
            if (is.string(this.config.selectors.controls.container)) {
                target = document.querySelector(this.config.selectors.controls.container);
            }

            // Inject into the container by default
            if (!is.element(target)) {
                target = this.elements.container;
            }

            // Inject controls HTML
            if (is.element(container)) {
                target.appendChild(container);
            } else if (container) {
                target.insertAdjacentHTML('beforeend', container);
            }

            // Find the elements if need be
            if (!is.element(this.elements.controls)) {
                controls.findElements.call(this);
            }

            // Edge sometimes doesn't finish the paint so force a redraw
            if (window.navigator.userAgent.includes('Edge')) {
                repaint(target);
            }

            // Setup tooltips
            if (this.config.tooltips.controls) {
                var _config = this.config,
                    classNames = _config.classNames,
                    selectors = _config.selectors;

                var selector = selectors.controls.wrapper + ' ' + selectors.labels + ' .' + classNames.hidden;
                var labels = getElements.call(this, selector);

                Array.from(labels).forEach(function (label) {
                    toggleClass(label, _this8.config.classNames.hidden, false);
                    toggleClass(label, _this8.config.classNames.tooltip, true);
                });
            }
        }
    };

    // ==========================================================================

    /**
     * Parse a string to a URL object
     * @param {string} input - the URL to be parsed
     * @param {boolean} safe - failsafe parsing
     */
    function parseUrl(input) {
        var safe = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : true;

        var url = input;

        if (safe) {
            var parser = document.createElement('a');
            parser.href = url;
            url = parser.href;
        }

        try {
            return new URL(url);
        } catch (e) {
            return null;
        }
    }

    // Convert object to URLSearchParams
    function buildUrlParams(input) {
        var params = new URLSearchParams();

        if (is.object(input)) {
            Object.entries(input).forEach(function (_ref) {
                var _ref2 = slicedToArray(_ref, 2),
                    key = _ref2[0],
                    value = _ref2[1];

                params.set(key, value);
            });
        }

        return params;
    }

    // ==========================================================================

    var captions = {
        // Setup captions
        setup: function setup() {
            // Requires UI support
            if (!this.supported.ui) {
                return;
            }

            // Only Vimeo and HTML5 video supported at this point
            if (!this.isVideo || this.isYouTube || this.isHTML5 && !support.textTracks) {
                // Clear menu and hide
                if (is.array(this.config.controls) && this.config.controls.includes('settings') && this.config.settings.includes('captions')) {
                    controls.setCaptionsMenu.call(this);
                }

                return;
            }

            // Inject the container
            if (!is.element(this.elements.captions)) {
                this.elements.captions = createElement('div', getAttributesFromSelector(this.config.selectors.captions));

                insertAfter(this.elements.captions, this.elements.wrapper);
            }

            // Fix IE captions if CORS is used
            // Fetch captions and inject as blobs instead (data URIs not supported!)
            if (browser.isIE && window.URL) {
                var elements = this.media.querySelectorAll('track');

                Array.from(elements).forEach(function (track) {
                    var src = track.getAttribute('src');
                    var url = parseUrl(src);

                    if (url !== null && url.hostname !== window.location.href.hostname && ['http:', 'https:'].includes(url.protocol)) {
                        fetch(src, 'blob').then(function (blob) {
                            track.setAttribute('src', window.URL.createObjectURL(blob));
                        }).catch(function () {
                            removeElement(track);
                        });
                    }
                });
            }

            // Get and set initial data
            // The "preferred" options are not realized unless / until the wanted language has a match
            // * languages: Array of user's browser languages.
            // * language:  The language preferred by user settings or config
            // * active:    The state preferred by user settings or config
            // * toggled:   The real captions state

            var languages = dedupe(Array.from(navigator.languages || navigator.userLanguage).map(function (language) {
                return language.split('-')[0];
            }));

            var language = (this.storage.get('language') || this.config.captions.language || 'auto').toLowerCase();

            // Use first browser language when language is 'auto'
            if (language === 'auto') {
                var _languages = slicedToArray(languages, 1);

                language = _languages[0];
            }

            var active = this.storage.get('captions');
            if (!is.boolean(active)) {
                active = this.config.captions.active;
            }

            Object.assign(this.captions, {
                toggled: false,
                active: active,
                language: language,
                languages: languages
            });

            // Watch changes to textTracks and update captions menu
            if (this.isHTML5) {
                var trackEvents = this.config.captions.update ? 'addtrack removetrack' : 'removetrack';
                on.call(this, this.media.textTracks, trackEvents, captions.update.bind(this));
            }

            // Update available languages in list next tick (the event must not be triggered before the listeners)
            setTimeout(captions.update.bind(this), 0);
        },


        // Update available language options in settings based on tracks
        update: function update() {
            var _this = this;

            var tracks = captions.getTracks.call(this, true);
            // Get the wanted language
            var _captions = this.captions,
                active = _captions.active,
                language = _captions.language,
                meta = _captions.meta,
                currentTrackNode = _captions.currentTrackNode;

            var languageExists = Boolean(tracks.find(function (track) {
                return track.language === language;
            }));

            // Handle tracks (add event listener and "pseudo"-default)
            if (this.isHTML5 && this.isVideo) {
                tracks.filter(function (track) {
                    return !meta.get(track);
                }).forEach(function (track) {
                    _this.debug.log('Track added', track);
                    // Attempt to store if the original dom element was "default"
                    meta.set(track, {
                        default: track.mode === 'showing'
                    });

                    // Turn off native caption rendering to avoid double captions
                    track.mode = 'hidden';

                    // Add event listener for cue changes
                    on.call(_this, track, 'cuechange', function () {
                        return captions.updateCues.call(_this);
                    });
                });
            }

            // Update language first time it matches, or if the previous matching track was removed
            if (languageExists && this.language !== language || !tracks.includes(currentTrackNode)) {
                captions.setLanguage.call(this, language);
                captions.toggle.call(this, active && languageExists);
            }

            // Enable or disable captions based on track length
            toggleClass(this.elements.container, this.config.classNames.captions.enabled, !is.empty(tracks));

            // Update available languages in list
            if ((this.config.controls || []).includes('settings') && this.config.settings.includes('captions')) {
                controls.setCaptionsMenu.call(this);
            }
        },


        // Toggle captions display
        // Used internally for the toggleCaptions method, with the passive option forced to false
        toggle: function toggle(input) {
            var passive = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : true;

            // If there's no full support
            if (!this.supported.ui) {
                return;
            }

            var toggled = this.captions.toggled; // Current state

            var activeClass = this.config.classNames.captions.active;

            // Get the next state
            // If the method is called without parameter, toggle based on current value
            var active = is.nullOrUndefined(input) ? !toggled : input;

            // Update state and trigger event
            if (active !== toggled) {
                // When passive, don't override user preferences
                if (!passive) {
                    this.captions.active = active;
                    this.storage.set({ captions: active });
                }

                // Force language if the call isn't passive and there is no matching language to toggle to
                if (!this.language && active && !passive) {
                    var tracks = captions.getTracks.call(this);
                    var track = captions.findTrack.call(this, [this.captions.language].concat(toConsumableArray(this.captions.languages)), true);

                    // Override user preferences to avoid switching languages if a matching track is added
                    this.captions.language = track.language;

                    // Set caption, but don't store in localStorage as user preference
                    captions.set.call(this, tracks.indexOf(track));
                    return;
                }

                // Toggle state
                this.elements.buttons.captions.pressed = active;

                // Add class hook
                toggleClass(this.elements.container, activeClass, active);

                this.captions.toggled = active;

                // Update settings menu
                controls.updateSetting.call(this, 'captions');

                // Trigger event (not used internally)
                triggerEvent.call(this, this.media, active ? 'captionsenabled' : 'captionsdisabled');
            }
        },


        // Set captions by track index
        // Used internally for the currentTrack setter with the passive option forced to false
        set: function set$$1(index) {
            var passive = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : true;

            var tracks = captions.getTracks.call(this);

            // Disable captions if setting to -1
            if (index === -1) {
                captions.toggle.call(this, false, passive);
                return;
            }

            if (!is.number(index)) {
                this.debug.warn('Invalid caption argument', index);
                return;
            }

            if (!(index in tracks)) {
                this.debug.warn('Track not found', index);
                return;
            }

            if (this.captions.currentTrack !== index) {
                this.captions.currentTrack = index;
                var track = tracks[index];

                var _ref = track || {},
                    language = _ref.language;

                // Store reference to node for invalidation on remove


                this.captions.currentTrackNode = track;

                // Update settings menu
                controls.updateSetting.call(this, 'captions');

                // When passive, don't override user preferences
                if (!passive) {
                    this.captions.language = language;
                    this.storage.set({ language: language });
                }

                // Handle Vimeo captions
                if (this.isVimeo) {
                    this.embed.enableTextTrack(language);
                }

                // Trigger event
                triggerEvent.call(this, this.media, 'languagechange');
            }

            // Show captions
            captions.toggle.call(this, true, passive);

            if (this.isHTML5 && this.isVideo) {
                // If we change the active track while a cue is already displayed we need to update it
                captions.updateCues.call(this);
            }
        },


        // Set captions by language
        // Used internally for the language setter with the passive option forced to false
        setLanguage: function setLanguage(input) {
            var passive = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : true;

            if (!is.string(input)) {
                this.debug.warn('Invalid language argument', input);
                return;
            }
            // Normalize
            var language = input.toLowerCase();
            this.captions.language = language;

            // Set currentTrack
            var tracks = captions.getTracks.call(this);
            var track = captions.findTrack.call(this, [language]);
            captions.set.call(this, tracks.indexOf(track), passive);
        },


        // Get current valid caption tracks
        // If update is false it will also ignore tracks without metadata
        // This is used to "freeze" the language options when captions.update is false
        getTracks: function getTracks() {
            var _this2 = this;

            var update = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;

            // Handle media or textTracks missing or null
            var tracks = Array.from((this.media || {}).textTracks || []);
            // For HTML5, use cache instead of current tracks when it exists (if captions.update is false)
            // Filter out removed tracks and tracks that aren't captions/subtitles (for example metadata)
            return tracks.filter(function (track) {
                return !_this2.isHTML5 || update || _this2.captions.meta.has(track);
            }).filter(function (track) {
                return ['captions', 'subtitles'].includes(track.kind);
            });
        },


        // Match tracks based on languages and get the first
        findTrack: function findTrack(languages) {
            var _this3 = this;

            var force = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;

            var tracks = captions.getTracks.call(this);
            var sortIsDefault = function sortIsDefault(track) {
                return Number((_this3.captions.meta.get(track) || {}).default);
            };
            var sorted = Array.from(tracks).sort(function (a, b) {
                return sortIsDefault(b) - sortIsDefault(a);
            });
            var track = void 0;
            languages.every(function (language) {
                track = sorted.find(function (track) {
                    return track.language === language;
                });
                return !track; // Break iteration if there is a match
            });
            // If no match is found but is required, get first
            return track || (force ? sorted[0] : undefined);
        },


        // Get the current track
        getCurrentTrack: function getCurrentTrack() {
            return captions.getTracks.call(this)[this.currentTrack];
        },


        // Get UI label for track
        getLabel: function getLabel(track) {
            var currentTrack = track;

            if (!is.track(currentTrack) && support.textTracks && this.captions.toggled) {
                currentTrack = captions.getCurrentTrack.call(this);
            }

            if (is.track(currentTrack)) {
                if (!is.empty(currentTrack.label)) {
                    return currentTrack.label;
                }

                if (!is.empty(currentTrack.language)) {
                    return track.language.toUpperCase();
                }

                return i18n.get('enabled', this.config);
            }

            return i18n.get('disabled', this.config);
        },


        // Update captions using current track's active cues
        // Also optional array argument in case there isn't any track (ex: vimeo)
        updateCues: function updateCues(input) {
            // Requires UI
            if (!this.supported.ui) {
                return;
            }

            if (!is.element(this.elements.captions)) {
                this.debug.warn('No captions element to render to');
                return;
            }

            // Only accept array or empty input
            if (!is.nullOrUndefined(input) && !Array.isArray(input)) {
                this.debug.warn('updateCues: Invalid input', input);
                return;
            }

            var cues = input;

            // Get cues from track
            if (!cues) {
                var track = captions.getCurrentTrack.call(this);
                cues = Array.from((track || {}).activeCues || []).map(function (cue) {
                    return cue.getCueAsHTML();
                }).map(getHTML);
            }

            // Set new caption text
            var content = cues.map(function (cueText) {
                return cueText.trim();
            }).join('\n');
            var changed = content !== this.elements.captions.innerHTML;

            if (changed) {
                // Empty the container and create a new child element
                emptyElement(this.elements.captions);
                var caption = createElement('span', getAttributesFromSelector(this.config.selectors.caption));
                caption.innerHTML = content;
                this.elements.captions.appendChild(caption);

                // Trigger event
                triggerEvent.call(this, this.media, 'cuechange');
            }
        }
    };

    // ==========================================================================
    // Plyr default config
    // ==========================================================================

    var defaults$1 = {
        // Disable
        enabled: true,

        // Custom media title
        title: '',

        // Logging to console
        debug: false,

        // Auto play (if supported)
        autoplay: false,

        // Only allow one media playing at once (vimeo only)
        autopause: true,

        // Allow inline playback on iOS (this effects YouTube/Vimeo - HTML5 requires the attribute present)
        // TODO: Remove iosNative fullscreen option in favour of this (logic needs work)
        playsinline: true,

        // Default time to skip when rewind/fast forward
        seekTime: 10,

        // Default volume
        volume: 1,
        muted: false,

        // Pass a custom duration
        duration: null,

        // Display the media duration on load in the current time position
        // If you have opted to display both duration and currentTime, this is ignored
        displayDuration: true,

        // Invert the current time to be a countdown
        invertTime: true,

        // Clicking the currentTime inverts it's value to show time left rather than elapsed
        toggleInvert: true,

        // Aspect ratio (for embeds)
        ratio: '16:9',

        // Click video container to play/pause
        clickToPlay: true,

        // Auto hide the controls
        hideControls: true,

        // Reset to start when playback ended
        resetOnEnd: false,

        // Disable the standard context menu
        disableContextMenu: true,

        // Sprite (for icons)
        loadSprite: true,
        iconPrefix: 'plyr',
        iconUrl: 'https://cdn.plyr.io/3.3.12/plyr.svg',

        // Blank video (used to prevent errors on source change)
        blankVideo: 'https://cdn.plyr.io/static/blank.mp4',

        // Quality default
        quality: {
            default: 576,
            options: [4320, 2880, 2160, 1440, 1080, 720, 576, 480, 360, 240, 'default']
        },

        // Set loops
        loop: {
            active: false
            // start: null,
            // end: null,
        },

        // Speed default and options to display
        speed: {
            selected: 1,
            options: [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]
        },

        // Keyboard shortcut settings
        keyboard: {
            focused: true,
            global: false
        },

        // Display tooltips
        tooltips: {
            controls: false,
            seek: true
        },

        // Captions settings
        captions: {
            active: false,
            language: 'auto',
            // Listen to new tracks added after Plyr is initialized.
            // This is needed for streaming captions, but may result in unselectable options
            update: false
        },

        // Fullscreen settings
        fullscreen: {
            enabled: true, // Allow fullscreen?
            fallback: true, // Fallback for vintage browsers
            iosNative: false // Use the native fullscreen in iOS (disables custom controls)
        },

        // Local storage
        storage: {
            enabled: true,
            key: 'plyr'
        },

        // Default controls
        controls: ['play-large',
        // 'restart',
        // 'rewind',
        'play',
        // 'fast-forward',
        'progress', 'current-time', 'mute', 'volume', 'captions', 'settings', 'pip', 'airplay', 'fullscreen'],
        settings: ['captions', 'quality', 'speed'],

        // Localisation
        i18n: {
            restart: 'Restart',
            rewind: 'Rewind {seektime}s',
            play: 'Play',
            pause: 'Pause',
            fastForward: 'Forward {seektime}s',
            seek: 'Seek',
            seekLabel: '{currentTime} of {duration}',
            played: 'Played',
            buffered: 'Buffered',
            currentTime: 'Current time',
            duration: 'Duration',
            volume: 'Volume',
            mute: 'Mute',
            unmute: 'Unmute',
            enableCaptions: 'Enable captions',
            disableCaptions: 'Disable captions',
            enterFullscreen: 'Enter fullscreen',
            exitFullscreen: 'Exit fullscreen',
            frameTitle: 'Player for {title}',
            captions: 'Captions',
            settings: 'Settings',
            menuBack: 'Go back to previous menu',
            speed: 'Speed',
            normal: 'Normal',
            quality: 'Quality',
            loop: 'Loop',
            start: 'Start',
            end: 'End',
            all: 'All',
            reset: 'Reset',
            disabled: 'Disabled',
            enabled: 'Enabled',
            advertisement: 'Ad',
            qualityBadge: {
                2160: '4K',
                1440: 'HD',
                1080: 'HD',
                720: 'HD',
                576: 'SD',
                480: 'SD'
            }
        },

        // URLs
        urls: {
            vimeo: {
                sdk: 'https://player.vimeo.com/api/player.js',
                iframe: 'https://player.vimeo.com/video/{0}?{1}',
                api: 'https://vimeo.com/api/v2/video/{0}.json'
            },
            youtube: {
                sdk: 'https://www.youtube.com/iframe_api',
                api: 'https://www.googleapis.com/youtube/v3/videos?id={0}&key={1}&fields=items(snippet(title))&part=snippet'
            },
            googleIMA: {
                sdk: 'https://imasdk.googleapis.com/js/sdkloader/ima3.js'
            }
        },

        // Custom control listeners
        listeners: {
            seek: null,
            play: null,
            pause: null,
            restart: null,
            rewind: null,
            fastForward: null,
            mute: null,
            volume: null,
            captions: null,
            fullscreen: null,
            pip: null,
            airplay: null,
            speed: null,
            quality: null,
            loop: null,
            language: null
        },

        // Events to watch and bubble
        events: [
        // Events to watch on HTML5 media elements and bubble
        // https://developer.mozilla.org/en/docs/Web/Guide/Events/Media_events
        'ended', 'progress', 'stalled', 'playing', 'waiting', 'canplay', 'canplaythrough', 'loadstart', 'loadeddata', 'loadedmetadata', 'timeupdate', 'volumechange', 'play', 'pause', 'error', 'seeking', 'seeked', 'emptied', 'ratechange', 'cuechange',

        // Custom events
        'enterfullscreen', 'exitfullscreen', 'captionsenabled', 'captionsdisabled', 'languagechange', 'controlshidden', 'controlsshown', 'ready',

        // YouTube
        'statechange', 'qualitychange', 'qualityrequested',

        // Ads
        'adsloaded', 'adscontentpause', 'adscontentresume', 'adstarted', 'adsmidpoint', 'adscomplete', 'adsallcomplete', 'adsimpression', 'adsclick'],

        // Selectors
        // Change these to match your template if using custom HTML
        selectors: {
            editable: 'input, textarea, select, [contenteditable]',
            container: '.plyr',
            controls: {
                container: null,
                wrapper: '.plyr__controls'
            },
            labels: '[data-plyr]',
            buttons: {
                play: '[data-plyr="play"]',
                pause: '[data-plyr="pause"]',
                restart: '[data-plyr="restart"]',
                rewind: '[data-plyr="rewind"]',
                fastForward: '[data-plyr="fast-forward"]',
                mute: '[data-plyr="mute"]',
                captions: '[data-plyr="captions"]',
                fullscreen: '[data-plyr="fullscreen"]',
                pip: '[data-plyr="pip"]',
                airplay: '[data-plyr="airplay"]',
                settings: '[data-plyr="settings"]',
                loop: '[data-plyr="loop"]'
            },
            inputs: {
                seek: '[data-plyr="seek"]',
                volume: '[data-plyr="volume"]',
                speed: '[data-plyr="speed"]',
                language: '[data-plyr="language"]',
                quality: '[data-plyr="quality"]'
            },
            display: {
                currentTime: '.plyr__time--current',
                duration: '.plyr__time--duration',
                buffer: '.plyr__progress__buffer',
                loop: '.plyr__progress__loop', // Used later
                volume: '.plyr__volume--display'
            },
            progress: '.plyr__progress',
            captions: '.plyr__captions',
            caption: '.plyr__caption',
            menu: {
                quality: '.js-plyr__menu__list--quality'
            }
        },

        // Class hooks added to the player in different states
        classNames: {
            type: 'plyr--{0}',
            provider: 'plyr--{0}',
            video: 'plyr__video-wrapper',
            embed: 'plyr__video-embed',
            embedContainer: 'plyr__video-embed__container',
            poster: 'plyr__poster',
            posterEnabled: 'plyr__poster-enabled',
            ads: 'plyr__ads',
            control: 'plyr__control',
            controlPressed: 'plyr__control--pressed',
            playing: 'plyr--playing',
            paused: 'plyr--paused',
            stopped: 'plyr--stopped',
            loading: 'plyr--loading',
            hover: 'plyr--hover',
            tooltip: 'plyr__tooltip',
            cues: 'plyr__cues',
            hidden: 'plyr__sr-only',
            hideControls: 'plyr--hide-controls',
            isIos: 'plyr--is-ios',
            isTouch: 'plyr--is-touch',
            uiSupported: 'plyr--full-ui',
            noTransition: 'plyr--no-transition',
            menu: {
                value: 'plyr__menu__value',
                badge: 'plyr__badge',
                open: 'plyr--menu-open'
            },
            captions: {
                enabled: 'plyr--captions-enabled',
                active: 'plyr--captions-active'
            },
            fullscreen: {
                enabled: 'plyr--fullscreen-enabled',
                fallback: 'plyr--fullscreen-fallback'
            },
            pip: {
                supported: 'plyr--pip-supported',
                active: 'plyr--pip-active'
            },
            airplay: {
                supported: 'plyr--airplay-supported',
                active: 'plyr--airplay-active'
            },
            tabFocus: 'plyr__tab-focus'
        },

        // Embed attributes
        attributes: {
            embed: {
                provider: 'data-plyr-provider',
                id: 'data-plyr-embed-id'
            }
        },

        // API keys
        keys: {
            google: null
        },

        // Advertisements plugin
        // Register for an account here: http://vi.ai/publisher-video-monetization/?aid=plyrio
        ads: {
            enabled: false,
            publisherId: ''
        }
    };

    // ==========================================================================
    // Plyr supported types and providers
    // ==========================================================================

    var providers = {
        html5: 'html5',
        youtube: 'youtube',
        vimeo: 'vimeo'
    };

    var types = {
        audio: 'audio',
        video: 'video'
    };

    /**
     * Get provider by URL
     * @param {string} url
     */
    function getProviderByUrl(url) {
        // YouTube
        if (/^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$/.test(url)) {
            return providers.youtube;
        }

        // Vimeo
        if (/^https?:\/\/player.vimeo.com\/video\/\d{0,9}(?=\b|\/)/.test(url)) {
            return providers.vimeo;
        }

        return null;
    }

    // ==========================================================================
    // Console wrapper
    // ==========================================================================

    var noop = function noop() {};

    var Console = function () {
        function Console() {
            var enabled = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;
            classCallCheck(this, Console);

            this.enabled = window.console && enabled;

            if (this.enabled) {
                this.log('Debugging enabled');
            }
        }

        createClass(Console, [{
            key: 'log',
            get: function get$$1() {
                // eslint-disable-next-line no-console
                return this.enabled ? Function.prototype.bind.call(console.log, console) : noop;
            }
        }, {
            key: 'warn',
            get: function get$$1() {
                // eslint-disable-next-line no-console
                return this.enabled ? Function.prototype.bind.call(console.warn, console) : noop;
            }
        }, {
            key: 'error',
            get: function get$$1() {
                // eslint-disable-next-line no-console
                return this.enabled ? Function.prototype.bind.call(console.error, console) : noop;
            }
        }]);
        return Console;
    }();

    // ==========================================================================

    function onChange() {
        if (!this.enabled) {
            return;
        }

        // Update toggle button
        var button = this.player.elements.buttons.fullscreen;
        if (is.element(button)) {
            button.pressed = this.active;
        }

        // Trigger an event
        triggerEvent.call(this.player, this.target, this.active ? 'enterfullscreen' : 'exitfullscreen', true);

        // Trap focus in container
        if (!browser.isIos) {
            trapFocus.call(this.player, this.target, this.active);
        }
    }

    function toggleFallback() {
        var toggle = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;

        // Store or restore scroll position
        if (toggle) {
            this.scrollPosition = {
                x: window.scrollX || 0,
                y: window.scrollY || 0
            };
        } else {
            window.scrollTo(this.scrollPosition.x, this.scrollPosition.y);
        }

        // Toggle scroll
        document.body.style.overflow = toggle ? 'hidden' : '';

        // Toggle class hook
        toggleClass(this.target, this.player.config.classNames.fullscreen.fallback, toggle);

        // Toggle button and fire events
        onChange.call(this);
    }

    var Fullscreen = function () {
        function Fullscreen(player) {
            var _this = this;

            classCallCheck(this, Fullscreen);

            // Keep reference to parent
            this.player = player;

            // Get prefix
            this.prefix = Fullscreen.prefix;
            this.property = Fullscreen.property;

            // Scroll position
            this.scrollPosition = { x: 0, y: 0 };

            // Register event listeners
            // Handle event (incase user presses escape etc)
            on.call(this.player, document, this.prefix === 'ms' ? 'MSFullscreenChange' : this.prefix + 'fullscreenchange', function () {
                // TODO: Filter for target??
                onChange.call(_this);
            });

            // Fullscreen toggle on double click
            on.call(this.player, this.player.elements.container, 'dblclick', function (event) {
                // Ignore double click in controls
                if (is.element(_this.player.elements.controls) && _this.player.elements.controls.contains(event.target)) {
                    return;
                }

                _this.toggle();
            });

            // Update the UI
            this.update();
        }

        // Determine if native supported


        createClass(Fullscreen, [{
            key: 'update',


            // Update UI
            value: function update() {
                if (this.enabled) {
                    this.player.debug.log((Fullscreen.native ? 'Native' : 'Fallback') + ' fullscreen enabled');
                } else {
                    this.player.debug.log('Fullscreen not supported and fallback disabled');
                }

                // Add styling hook to show button
                toggleClass(this.player.elements.container, this.player.config.classNames.fullscreen.enabled, this.enabled);
            }

            // Make an element fullscreen

        }, {
            key: 'enter',
            value: function enter() {
                if (!this.enabled) {
                    return;
                }

                // iOS native fullscreen doesn't need the request step
                if (browser.isIos && this.player.config.fullscreen.iosNative) {
                    if (this.player.playing) {
                        this.target.webkitEnterFullscreen();
                    }
                } else if (!Fullscreen.native) {
                    toggleFallback.call(this, true);
                } else if (!this.prefix) {
                    this.target.requestFullscreen();
                } else if (!is.empty(this.prefix)) {
                    this.target[this.prefix + 'Request' + this.property]();
                }
            }

            // Bail from fullscreen

        }, {
            key: 'exit',
            value: function exit() {
                if (!this.enabled) {
                    return;
                }

                // iOS native fullscreen
                if (browser.isIos && this.player.config.fullscreen.iosNative) {
                    this.target.webkitExitFullscreen();
                    this.player.play();
                } else if (!Fullscreen.native) {
                    toggleFallback.call(this, false);
                } else if (!this.prefix) {
                    (document.cancelFullScreen || document.exitFullscreen).call(document);
                } else if (!is.empty(this.prefix)) {
                    var action = this.prefix === 'moz' ? 'Cancel' : 'Exit';
                    document['' + this.prefix + action + this.property]();
                }
            }

            // Toggle state

        }, {
            key: 'toggle',
            value: function toggle() {
                if (!this.active) {
                    this.enter();
                } else {
                    this.exit();
                }
            }
        }, {
            key: 'enabled',


            // Determine if fullscreen is enabled
            get: function get$$1() {
                return (Fullscreen.native || this.player.config.fullscreen.fallback) && this.player.config.fullscreen.enabled && this.player.supported.ui && this.player.isVideo;
            }

            // Get active state

        }, {
            key: 'active',
            get: function get$$1() {
                if (!this.enabled) {
                    return false;
                }

                // Fallback using classname
                if (!Fullscreen.native) {
                    return hasClass(this.target, this.player.config.classNames.fullscreen.fallback);
                }

                var element = !this.prefix ? document.fullscreenElement : document['' + this.prefix + this.property + 'Element'];

                return element === this.target;
            }

            // Get target element

        }, {
            key: 'target',
            get: function get$$1() {
                return browser.isIos && this.player.config.fullscreen.iosNative ? this.player.media : this.player.elements.container;
            }
        }], [{
            key: 'native',
            get: function get$$1() {
                return !!(document.fullscreenEnabled || document.webkitFullscreenEnabled || document.mozFullScreenEnabled || document.msFullscreenEnabled);
            }

            // Get the prefix for handlers

        }, {
            key: 'prefix',
            get: function get$$1() {
                // No prefix
                if (is.function(document.exitFullscreen)) {
                    return '';
                }

                // Check for fullscreen support by vendor prefix
                var value = '';
                var prefixes = ['webkit', 'moz', 'ms'];

                prefixes.some(function (pre) {
                    if (is.function(document[pre + 'ExitFullscreen']) || is.function(document[pre + 'CancelFullScreen'])) {
                        value = pre;
                        return true;
                    }

                    return false;
                });

                return value;
            }
        }, {
            key: 'property',
            get: function get$$1() {
                return this.prefix === 'moz' ? 'FullScreen' : 'Fullscreen';
            }
        }]);
        return Fullscreen;
    }();

    // ==========================================================================
    // Load image avoiding xhr/fetch CORS issues
    // Server status can't be obtained this way unfortunately, so this uses "naturalWidth" to determine if the image has loaded
    // By default it checks if it is at least 1px, but you can add a second argument to change this
    // ==========================================================================

    function loadImage(src) {
        var minWidth = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;

        return new Promise(function (resolve, reject) {
            var image = new Image();

            var handler = function handler() {
                delete image.onload;
                delete image.onerror;
                (image.naturalWidth >= minWidth ? resolve : reject)(image);
            };

            Object.assign(image, { onload: handler, onerror: handler, src: src });
        });
    }

    // ==========================================================================

    var ui = {
        addStyleHook: function addStyleHook() {
            toggleClass(this.elements.container, this.config.selectors.container.replace('.', ''), true);
            toggleClass(this.elements.container, this.config.classNames.uiSupported, this.supported.ui);
        },


        // Toggle native HTML5 media controls
        toggleNativeControls: function toggleNativeControls() {
            var toggle = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;

            if (toggle && this.isHTML5) {
                this.media.setAttribute('controls', '');
            } else {
                this.media.removeAttribute('controls');
            }
        },


        // Setup the UI
        build: function build() {
            var _this = this;

            // Re-attach media element listeners
            // TODO: Use event bubbling?
            this.listeners.media();

            // Don't setup interface if no support
            if (!this.supported.ui) {
                this.debug.warn('Basic support only for ' + this.provider + ' ' + this.type);

                // Restore native controls
                ui.toggleNativeControls.call(this, true);

                // Bail
                return;
            }

            // Inject custom controls if not present
            if (!is.element(this.elements.controls)) {
                // Inject custom controls
                controls.inject.call(this);

                // Re-attach control listeners
                this.listeners.controls();
            }

            // Remove native controls
            ui.toggleNativeControls.call(this);

            // Setup captions for HTML5
            if (this.isHTML5) {
                captions.setup.call(this);
            }

            // Reset volume
            this.volume = null;

            // Reset mute state
            this.muted = null;

            // Reset speed
            this.speed = null;

            // Reset loop state
            this.loop = null;

            // Reset quality setting
            this.quality = null;

            // Reset volume display
            controls.updateVolume.call(this);

            // Reset time display
            controls.timeUpdate.call(this);

            // Update the UI
            ui.checkPlaying.call(this);

            // Check for picture-in-picture support
            toggleClass(this.elements.container, this.config.classNames.pip.supported, support.pip && this.isHTML5 && this.isVideo);

            // Check for airplay support
            toggleClass(this.elements.container, this.config.classNames.airplay.supported, support.airplay && this.isHTML5);

            // Add iOS class
            toggleClass(this.elements.container, this.config.classNames.isIos, browser.isIos);

            // Add touch class
            toggleClass(this.elements.container, this.config.classNames.isTouch, this.touch);

            // Ready for API calls
            this.ready = true;

            // Ready event at end of execution stack
            setTimeout(function () {
                triggerEvent.call(_this, _this.media, 'ready');
            }, 0);

            // Set the title
            ui.setTitle.call(this);

            // Assure the poster image is set, if the property was added before the element was created
            if (this.poster) {
                ui.setPoster.call(this, this.poster, false).catch(function () {});
            }

            // Manually set the duration if user has overridden it.
            // The event listeners for it doesn't get called if preload is disabled (#701)
            if (this.config.duration) {
                controls.durationUpdate.call(this);
            }
        },


        // Setup aria attribute for play and iframe title
        setTitle: function setTitle() {
            // Find the current text
            var label = i18n.get('play', this.config);

            // If there's a media title set, use that for the label
            if (is.string(this.config.title) && !is.empty(this.config.title)) {
                label += ', ' + this.config.title;
            }

            // If there's a play button, set label
            if (is.nodeList(this.elements.buttons.play)) {
                Array.from(this.elements.buttons.play).forEach(function (button) {
                    button.setAttribute('aria-label', label);
                });
            }

            // Set iframe title
            // https://github.com/sampotts/plyr/issues/124
            if (this.isEmbed) {
                var iframe = getElement.call(this, 'iframe');

                if (!is.element(iframe)) {
                    return;
                }

                // Default to media type
                var title = !is.empty(this.config.title) ? this.config.title : 'video';
                var format = i18n.get('frameTitle', this.config);

                iframe.setAttribute('title', format.replace('{title}', title));
            }
        },


        // Toggle poster
        togglePoster: function togglePoster(enable) {
            toggleClass(this.elements.container, this.config.classNames.posterEnabled, enable);
        },


        // Set the poster image (async)
        // Used internally for the poster setter, with the passive option forced to false
        setPoster: function setPoster(poster) {
            var _this2 = this;

            var passive = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : true;

            // Don't override if call is passive
            if (passive && this.poster) {
                return Promise.reject(new Error('Poster already set'));
            }

            // Set property synchronously to respect the call order
            this.media.setAttribute('poster', poster);

            // Wait until ui is ready
            return ready.call(this)
            // Load image
            .then(function () {
                return loadImage(poster);
            }).catch(function (err) {
                // Hide poster on error unless it's been set by another call
                if (poster === _this2.poster) {
                    ui.togglePoster.call(_this2, false);
                }
                // Rethrow
                throw err;
            }).then(function () {
                // Prevent race conditions
                if (poster !== _this2.poster) {
                    throw new Error('setPoster cancelled by later call to setPoster');
                }
            }).then(function () {
                Object.assign(_this2.elements.poster.style, {
                    backgroundImage: 'url(\'' + poster + '\')',
                    // Reset backgroundSize as well (since it can be set to "cover" for padded thumbnails for youtube)
                    backgroundSize: ''
                });
                ui.togglePoster.call(_this2, true);
                return poster;
            });
        },


        // Check playing state
        checkPlaying: function checkPlaying(event) {
            var _this3 = this;

            // Class hooks
            toggleClass(this.elements.container, this.config.classNames.playing, this.playing);
            toggleClass(this.elements.container, this.config.classNames.paused, this.paused);
            toggleClass(this.elements.container, this.config.classNames.stopped, this.stopped);

            // Set state
            Array.from(this.elements.buttons.play).forEach(function (target) {
                target.pressed = _this3.playing;
            });

            // Only update controls on non timeupdate events
            if (is.event(event) && event.type === 'timeupdate') {
                return;
            }

            // Toggle controls
            ui.toggleControls.call(this);
        },


        // Check if media is loading
        checkLoading: function checkLoading(event) {
            var _this4 = this;

            this.loading = ['stalled', 'waiting'].includes(event.type);

            // Clear timer
            clearTimeout(this.timers.loading);

            // Timer to prevent flicker when seeking
            this.timers.loading = setTimeout(function () {
                // Update progress bar loading class state
                toggleClass(_this4.elements.container, _this4.config.classNames.loading, _this4.loading);

                // Update controls visibility
                ui.toggleControls.call(_this4);
            }, this.loading ? 250 : 0);
        },


        // Toggle controls based on state and `force` argument
        toggleControls: function toggleControls(force) {
            var controls$$1 = this.elements.controls;


            if (controls$$1 && this.config.hideControls) {
                // Show controls if force, loading, paused, or button interaction, otherwise hide
                this.toggleControls(Boolean(force || this.loading || this.paused || controls$$1.pressed || controls$$1.hover));
            }
        }
    };

    // ==========================================================================

    var Listeners = function () {
        function Listeners(player) {
            classCallCheck(this, Listeners);

            this.player = player;
            this.lastKey = null;

            this.handleKey = this.handleKey.bind(this);
            this.toggleMenu = this.toggleMenu.bind(this);
            this.firstTouch = this.firstTouch.bind(this);
        }

        // Handle key presses


        createClass(Listeners, [{
            key: 'handleKey',
            value: function handleKey(event) {
                var _this = this;

                var code = event.keyCode ? event.keyCode : event.which;
                var pressed = event.type === 'keydown';
                var repeat = pressed && code === this.lastKey;

                // Bail if a modifier key is set
                if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
                    return;
                }

                // If the event is bubbled from the media element
                // Firefox doesn't get the keycode for whatever reason
                if (!is.number(code)) {
                    return;
                }

                // Seek by the number keys
                var seekByKey = function seekByKey() {
                    // Divide the max duration into 10th's and times by the number value
                    _this.player.currentTime = _this.player.duration / 10 * (code - 48);
                };

                // Handle the key on keydown
                // Reset on keyup
                if (pressed) {
                    // Which keycodes should we prevent default
                    var preventDefault = [32, 37, 38, 39, 40, 48, 49, 50, 51, 52, 53, 54, 56, 57, 67, 70, 73, 75, 76, 77, 79];

                    // Check focused element
                    // and if the focused element is not editable (e.g. text input)
                    // and any that accept key input http://webaim.org/techniques/keyboard/
                    var focused = getFocusElement();
                    if (is.element(focused) && focused !== this.player.elements.inputs.seek && matches(focused, this.player.config.selectors.editable)) {
                        return;
                    }

                    // If the code is found prevent default (e.g. prevent scrolling for arrows)
                    if (preventDefault.includes(code)) {
                        event.preventDefault();
                        event.stopPropagation();
                    }

                    switch (code) {
                        case 48:
                        case 49:
                        case 50:
                        case 51:
                        case 52:
                        case 53:
                        case 54:
                        case 55:
                        case 56:
                        case 57:
                            // 0-9
                            if (!repeat) {
                                seekByKey();
                            }
                            break;

                        case 32:
                        case 75:
                            // Space and K key
                            if (!repeat) {
                                this.player.togglePlay();
                            }
                            break;

                        case 38:
                            // Arrow up
                            this.player.increaseVolume(0.1);
                            break;

                        case 40:
                            // Arrow down
                            this.player.decreaseVolume(0.1);
                            break;

                        case 77:
                            // M key
                            if (!repeat) {
                                this.player.muted = !this.player.muted;
                            }
                            break;

                        case 39:
                            // Arrow forward
                            this.player.forward();
                            break;

                        case 37:
                            // Arrow back
                            this.player.rewind();
                            break;

                        case 70:
                            // F key
                            this.player.fullscreen.toggle();
                            break;

                        case 67:
                            // C key
                            if (!repeat) {
                                this.player.toggleCaptions();
                            }
                            break;

                        case 76:
                            // L key
                            this.player.loop = !this.player.loop;
                            break;

                        /* case 73:
                            this.setLoop('start');
                            break;
                         case 76:
                            this.setLoop();
                            break;
                         case 79:
                            this.setLoop('end');
                            break; */

                        default:
                            break;
                    }

                    // Escape is handle natively when in full screen
                    // So we only need to worry about non native
                    if (!this.player.fullscreen.enabled && this.player.fullscreen.active && code === 27) {
                        this.player.fullscreen.toggle();
                    }

                    // Store last code for next cycle
                    this.lastKey = code;
                } else {
                    this.lastKey = null;
                }
            }

            // Toggle menu

        }, {
            key: 'toggleMenu',
            value: function toggleMenu(event) {
                controls.toggleMenu.call(this.player, event);
            }

            // Device is touch enabled

        }, {
            key: 'firstTouch',
            value: function firstTouch() {
                this.player.touch = true;

                // Add touch class
                toggleClass(this.player.elements.container, this.player.config.classNames.isTouch, true);
            }

            // Global window & document listeners

        }, {
            key: 'global',
            value: function global() {
                var toggle = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : true;

                // Keyboard shortcuts
                if (this.player.config.keyboard.global) {
                    toggleListener.call(this.player, window, 'keydown keyup', this.handleKey, toggle, false);
                }

                // Click anywhere closes menu
                toggleListener.call(this.player, document.body, 'click', this.toggleMenu, toggle);

                // Detect touch by events
                once.call(this.player, document.body, 'touchstart', this.firstTouch);
            }

            // Container listeners

        }, {
            key: 'container',
            value: function container() {
                var _this2 = this;

                // Keyboard shortcuts
                if (!this.player.config.keyboard.global && this.player.config.keyboard.focused) {
                    on.call(this.player, this.player.elements.container, 'keydown keyup', this.handleKey, false);
                }

                // Detect tab focus
                // Remove class on blur/focusout
                on.call(this.player, this.player.elements.container, 'focusout', function (event) {
                    toggleClass(event.target, _this2.player.config.classNames.tabFocus, false);
                });
                // Add classname to tabbed elements
                on.call(this.player, this.player.elements.container, 'keydown', function (event) {
                    if (event.keyCode !== 9) {
                        return;
                    }

                    // Delay the adding of classname until the focus has changed
                    // This event fires before the focusin event
                    setTimeout(function () {
                        toggleClass(getFocusElement(), _this2.player.config.classNames.tabFocus, true);
                    }, 0);
                });

                // Toggle controls on mouse events and entering fullscreen
                on.call(this.player, this.player.elements.container, 'mousemove mouseleave touchstart touchmove enterfullscreen exitfullscreen', function (event) {
                    var controls$$1 = _this2.player.elements.controls;

                    // Remove button states for fullscreen

                    if (event.type === 'enterfullscreen') {
                        controls$$1.pressed = false;
                        controls$$1.hover = false;
                    }

                    // Show, then hide after a timeout unless another control event occurs
                    var show = ['touchstart', 'touchmove', 'mousemove'].includes(event.type);

                    var delay = 0;

                    if (show) {
                        ui.toggleControls.call(_this2.player, true);
                        // Use longer timeout for touch devices
                        delay = _this2.player.touch ? 3000 : 2000;
                    }

                    // Clear timer
                    clearTimeout(_this2.player.timers.controls);
                    // Timer to prevent flicker when seeking
                    _this2.player.timers.controls = setTimeout(function () {
                        return ui.toggleControls.call(_this2.player, false);
                    }, delay);
                });
            }

            // Listen for media events

        }, {
            key: 'media',
            value: function media() {
                var _this3 = this;

                // Time change on media
                on.call(this.player, this.player.media, 'timeupdate seeking seeked', function (event) {
                    return controls.timeUpdate.call(_this3.player, event);
                });

                // Display duration
                on.call(this.player, this.player.media, 'durationchange loadeddata loadedmetadata', function (event) {
                    return controls.durationUpdate.call(_this3.player, event);
                });

                // Check for audio tracks on load
                // We can't use `loadedmetadata` as it doesn't seem to have audio tracks at that point
                on.call(this.player, this.player.media, 'canplay', function () {
                    toggleHidden(_this3.player.elements.volume, !_this3.player.hasAudio);
                    toggleHidden(_this3.player.elements.buttons.mute, !_this3.player.hasAudio);
                });

                // Handle the media finishing
                on.call(this.player, this.player.media, 'ended', function () {
                    // Show poster on end
                    if (_this3.player.isHTML5 && _this3.player.isVideo && _this3.player.config.resetOnEnd) {
                        // Restart
                        _this3.player.restart();
                    }
                });

                // Check for buffer progress
                on.call(this.player, this.player.media, 'progress playing seeking seeked', function (event) {
                    return controls.updateProgress.call(_this3.player, event);
                });

                // Handle volume changes
                on.call(this.player, this.player.media, 'volumechange', function (event) {
                    return controls.updateVolume.call(_this3.player, event);
                });

                // Handle play/pause
                on.call(this.player, this.player.media, 'playing play pause ended emptied timeupdate', function (event) {
                    return ui.checkPlaying.call(_this3.player, event);
                });

                // Loading state
                on.call(this.player, this.player.media, 'waiting canplay seeked playing', function (event) {
                    return ui.checkLoading.call(_this3.player, event);
                });

                // If autoplay, then load advertisement if required
                // TODO: Show some sort of loading state while the ad manager loads else there's a delay before ad shows
                on.call(this.player, this.player.media, 'playing', function () {
                    if (!_this3.player.ads) {
                        return;
                    }

                    // If ads are enabled, wait for them first
                    if (_this3.player.ads.enabled && !_this3.player.ads.initialized) {
                        // Wait for manager response
                        _this3.player.ads.managerPromise.then(function () {
                            return _this3.player.ads.play();
                        }).catch(function () {
                            return _this3.player.play();
                        });
                    }
                });

                // Click video
                if (this.player.supported.ui && this.player.config.clickToPlay && !this.player.isAudio) {
                    // Re-fetch the wrapper
                    var wrapper = getElement.call(this.player, '.' + this.player.config.classNames.video);

                    // Bail if there's no wrapper (this should never happen)
                    if (!is.element(wrapper)) {
                        return;
                    }

                    // On click play, pause ore restart
                    on.call(this.player, wrapper, 'click', function () {
                        // Touch devices will just show controls (if we're hiding controls)
                        if (_this3.player.config.hideControls && _this3.player.touch && !_this3.player.paused) {
                            return;
                        }

                        if (_this3.player.paused) {
                            _this3.player.play();
                        } else if (_this3.player.ended) {
                            _this3.player.restart();
                            _this3.player.play();
                        } else {
                            _this3.player.pause();
                        }
                    });
                }

                // Disable right click
                if (this.player.supported.ui && this.player.config.disableContextMenu) {
                    on.call(this.player, this.player.elements.wrapper, 'contextmenu', function (event) {
                        event.preventDefault();
                    }, false);
                }

                // Volume change
                on.call(this.player, this.player.media, 'volumechange', function () {
                    // Save to storage
                    _this3.player.storage.set({ volume: _this3.player.volume, muted: _this3.player.muted });
                });

                // Speed change
                on.call(this.player, this.player.media, 'ratechange', function () {
                    // Update UI
                    controls.updateSetting.call(_this3.player, 'speed');

                    // Save to storage
                    _this3.player.storage.set({ speed: _this3.player.speed });
                });

                // Quality request
                on.call(this.player, this.player.media, 'qualityrequested', function (event) {
                    // Save to storage
                    _this3.player.storage.set({ quality: event.detail.quality });
                });

                // Quality change
                on.call(this.player, this.player.media, 'qualitychange', function (event) {
                    // Update UI
                    controls.updateSetting.call(_this3.player, 'quality', null, event.detail.quality);
                });

                // Proxy events to container
                // Bubble up key events for Edge
                var proxyEvents = this.player.config.events.concat(['keyup', 'keydown']).join(' ');
                on.call(this.player, this.player.media, proxyEvents, function (event) {
                    var _event$detail = event.detail,
                        detail = _event$detail === undefined ? {} : _event$detail;

                    // Get error details from media

                    if (event.type === 'error') {
                        detail = _this3.player.media.error;
                    }

                    triggerEvent.call(_this3.player, _this3.player.elements.container, event.type, true, detail);
                });
            }

            // Listen for control events

        }, {
            key: 'controls',
            value: function controls$$1() {
                var _this4 = this;

                // IE doesn't support input event, so we fallback to change
                var inputEvent = browser.isIE ? 'change' : 'input';

                // Run default and custom handlers
                var proxy = function proxy(event, defaultHandler, customHandlerKey) {
                    var customHandler = _this4.player.config.listeners[customHandlerKey];
                    var hasCustomHandler = is.function(customHandler);
                    var returned = true;

                    // Execute custom handler
                    if (hasCustomHandler) {
                        returned = customHandler.call(_this4.player, event);
                    }

                    // Only call default handler if not prevented in custom handler
                    if (returned && is.function(defaultHandler)) {
                        defaultHandler.call(_this4.player, event);
                    }
                };

                // Trigger custom and default handlers
                var bind = function bind(element, type, defaultHandler, customHandlerKey) {
                    var passive = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : true;

                    var customHandler = _this4.player.config.listeners[customHandlerKey];
                    var hasCustomHandler = is.function(customHandler);

                    on.call(_this4.player, element, type, function (event) {
                        return proxy(event, defaultHandler, customHandlerKey);
                    }, passive && !hasCustomHandler);
                };

                // Play/pause toggle
                Array.from(this.player.elements.buttons.play).forEach(function (button) {
                    bind(button, 'click', _this4.player.togglePlay, 'play');
                });

                // Pause
                bind(this.player.elements.buttons.restart, 'click', this.player.restart, 'restart');

                // Rewind
                bind(this.player.elements.buttons.rewind, 'click', this.player.rewind, 'rewind');

                // Rewind
                bind(this.player.elements.buttons.fastForward, 'click', this.player.forward, 'fastForward');

                // Mute toggle
                bind(this.player.elements.buttons.mute, 'click', function () {
                    _this4.player.muted = !_this4.player.muted;
                }, 'mute');

                // Captions toggle
                bind(this.player.elements.buttons.captions, 'click', function () {
                    return _this4.player.toggleCaptions();
                });

                // Fullscreen toggle
                bind(this.player.elements.buttons.fullscreen, 'click', function () {
                    _this4.player.fullscreen.toggle();
                }, 'fullscreen');

                // Picture-in-Picture
                bind(this.player.elements.buttons.pip, 'click', function () {
                    _this4.player.pip = 'toggle';
                }, 'pip');

                // Airplay
                bind(this.player.elements.buttons.airplay, 'click', this.player.airplay, 'airplay');

                // Settings menu
                bind(this.player.elements.buttons.settings, 'click', function (event) {
                    controls.toggleMenu.call(_this4.player, event);
                });

                // Settings menu
                bind(this.player.elements.settings.form, 'click', function (event) {
                    event.stopPropagation();

                    // Go back to home tab on click
                    var showHomeTab = function showHomeTab() {
                        var id = 'plyr-settings-' + _this4.player.id + '-home';
                        controls.showTab.call(_this4.player, id);
                    };

                    // Settings menu items - use event delegation as items are added/removed
                    if (matches(event.target, _this4.player.config.selectors.inputs.language)) {
                        proxy(event, function () {
                            _this4.player.currentTrack = Number(event.target.value);
                            showHomeTab();
                        }, 'language');
                    } else if (matches(event.target, _this4.player.config.selectors.inputs.quality)) {
                        proxy(event, function () {
                            _this4.player.quality = event.target.value;
                            showHomeTab();
                        }, 'quality');
                    } else if (matches(event.target, _this4.player.config.selectors.inputs.speed)) {
                        proxy(event, function () {
                            _this4.player.speed = parseFloat(event.target.value);
                            showHomeTab();
                        }, 'speed');
                    } else {
                        var tab = event.target;
                        controls.showTab.call(_this4.player, tab.getAttribute('aria-controls'));
                    }
                });

                // Set range input alternative "value", which matches the tooltip time (#954)
                bind(this.player.elements.inputs.seek, 'mousedown mousemove', function (event) {
                    var clientRect = _this4.player.elements.progress.getBoundingClientRect();
                    var percent = 100 / clientRect.width * (event.pageX - clientRect.left);
                    event.currentTarget.setAttribute('seek-value', percent);
                });

                // Pause while seeking
                bind(this.player.elements.inputs.seek, 'mousedown mouseup keydown keyup touchstart touchend', function (event) {
                    var seek = event.currentTarget;

                    var code = event.keyCode ? event.keyCode : event.which;
                    var eventType = event.type;

                    if ((eventType === 'keydown' || eventType === 'keyup') && code !== 39 && code !== 37) {
                        return;
                    }
                    // Was playing before?
                    var play = seek.hasAttribute('play-on-seeked');

                    // Done seeking
                    var done = ['mouseup', 'touchend', 'keyup'].includes(event.type);

                    // If we're done seeking and it was playing, resume playback
                    if (play && done) {
                        seek.removeAttribute('play-on-seeked');
                        _this4.player.play();
                    } else if (!done && _this4.player.playing) {
                        seek.setAttribute('play-on-seeked', '');
                        _this4.player.pause();
                    }
                });

                // Seek
                bind(this.player.elements.inputs.seek, inputEvent, function (event) {
                    var seek = event.currentTarget;

                    // If it exists, use seek-value instead of "value" for consistency with tooltip time (#954)
                    var seekTo = seek.getAttribute('seek-value');

                    if (is.empty(seekTo)) {
                        seekTo = seek.value;
                    }

                    seek.removeAttribute('seek-value');

                    _this4.player.currentTime = seekTo / seek.max * _this4.player.duration;
                }, 'seek');

                // Current time invert
                // Only if one time element is used for both currentTime and duration
                if (this.player.config.toggleInvert && !is.element(this.player.elements.display.duration)) {
                    bind(this.player.elements.display.currentTime, 'click', function () {
                        // Do nothing if we're at the start
                        if (_this4.player.currentTime === 0) {
                            return;
                        }

                        _this4.player.config.invertTime = !_this4.player.config.invertTime;

                        controls.timeUpdate.call(_this4.player);
                    });
                }

                // Volume
                bind(this.player.elements.inputs.volume, inputEvent, function (event) {
                    _this4.player.volume = event.target.value;
                }, 'volume');

                // Polyfill for lower fill in <input type="range"> for webkit
                if (browser.isWebkit) {
                    Array.from(getElements.call(this.player, 'input[type="range"]')).forEach(function (element) {
                        bind(element, 'input', function (event) {
                            return controls.updateRangeFill.call(_this4.player, event.target);
                        });
                    });
                }

                // Seek tooltip
                bind(this.player.elements.progress, 'mouseenter mouseleave mousemove', function (event) {
                    return controls.updateSeekTooltip.call(_this4.player, event);
                });

                // Update controls.hover state (used for ui.toggleControls to avoid hiding when interacting)
                bind(this.player.elements.controls, 'mouseenter mouseleave', function (event) {
                    _this4.player.elements.controls.hover = !_this4.player.touch && event.type === 'mouseenter';
                });

                // Update controls.pressed state (used for ui.toggleControls to avoid hiding when interacting)
                bind(this.player.elements.controls, 'mousedown mouseup touchstart touchend touchcancel', function (event) {
                    _this4.player.elements.controls.pressed = ['mousedown', 'touchstart'].includes(event.type);
                });

                // Focus in/out on controls
                bind(this.player.elements.controls, 'focusin focusout', function (event) {
                    var _player = _this4.player,
                        config = _player.config,
                        elements = _player.elements,
                        timers = _player.timers;

                    // Skip transition to prevent focus from scrolling the parent element

                    toggleClass(elements.controls, config.classNames.noTransition, event.type === 'focusin');

                    // Toggle
                    ui.toggleControls.call(_this4.player, event.type === 'focusin');

                    // If focusin, hide again after delay
                    if (event.type === 'focusin') {
                        // Restore transition
                        setTimeout(function () {
                            toggleClass(elements.controls, config.classNames.noTransition, false);
                        }, 0);

                        // Delay a little more for keyboard users
                        var delay = _this4.touch ? 3000 : 4000;

                        // Clear timer
                        clearTimeout(timers.controls);
                        // Hide
                        timers.controls = setTimeout(function () {
                            return ui.toggleControls.call(_this4.player, false);
                        }, delay);
                    }
                });

                // Mouse wheel for volume
                bind(this.player.elements.inputs.volume, 'wheel', function (event) {
                    // Detect "natural" scroll - suppored on OS X Safari only
                    // Other browsers on OS X will be inverted until support improves
                    var inverted = event.webkitDirectionInvertedFromDevice;
                    var step = 1 / 50;
                    var direction = 0;

                    // Scroll down (or up on natural) to decrease
                    if (event.deltaY < 0 || event.deltaX > 0) {
                        if (inverted) {
                            _this4.player.decreaseVolume(step);
                            direction = -1;
                        } else {
                            _this4.player.increaseVolume(step);
                            direction = 1;
                        }
                    }

                    // Scroll up (or down on natural) to increase
                    if (event.deltaY > 0 || event.deltaX < 0) {
                        if (inverted) {
                            _this4.player.increaseVolume(step);
                            direction = 1;
                        } else {
                            _this4.player.decreaseVolume(step);
                            direction = -1;
                        }
                    }

                    // Don't break page scrolling at max and min
                    if (direction === 1 && _this4.player.media.volume < 1 || direction === -1 && _this4.player.media.volume > 0) {
                        event.preventDefault();
                    }
                }, 'volume', false);
            }
        }]);
        return Listeners;
    }();

    var commonjsGlobal = typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

    function createCommonjsModule(fn, module) {
    	return module = { exports: {} }, fn(module, module.exports), module.exports;
    }

    var loadjs_umd = createCommonjsModule(function (module, exports) {
    (function(root, factory) {
      if (typeof undefined === 'function' && undefined.amd) {
        undefined([], factory);
      } else {
        module.exports = factory();
      }
    }(commonjsGlobal, function() {
    /**
     * Global dependencies.
     * @global {Object} document - DOM
     */

    var devnull = function() {},
        bundleIdCache = {},
        bundleResultCache = {},
        bundleCallbackQueue = {};


    /**
     * Subscribe to bundle load event.
     * @param {string[]} bundleIds - Bundle ids
     * @param {Function} callbackFn - The callback function
     */
    function subscribe(bundleIds, callbackFn) {
      // listify
      bundleIds = bundleIds.push ? bundleIds : [bundleIds];

      var depsNotFound = [],
          i = bundleIds.length,
          numWaiting = i,
          fn,
          bundleId,
          r,
          q;

      // define callback function
      fn = function (bundleId, pathsNotFound) {
        if (pathsNotFound.length) depsNotFound.push(bundleId);

        numWaiting--;
        if (!numWaiting) callbackFn(depsNotFound);
      };

      // register callback
      while (i--) {
        bundleId = bundleIds[i];

        // execute callback if in result cache
        r = bundleResultCache[bundleId];
        if (r) {
          fn(bundleId, r);
          continue;
        }

        // add to callback queue
        q = bundleCallbackQueue[bundleId] = bundleCallbackQueue[bundleId] || [];
        q.push(fn);
      }
    }


    /**
     * Publish bundle load event.
     * @param {string} bundleId - Bundle id
     * @param {string[]} pathsNotFound - List of files not found
     */
    function publish(bundleId, pathsNotFound) {
      // exit if id isn't defined
      if (!bundleId) return;

      var q = bundleCallbackQueue[bundleId];

      // cache result
      bundleResultCache[bundleId] = pathsNotFound;

      // exit if queue is empty
      if (!q) return;

      // empty callback queue
      while (q.length) {
        q[0](bundleId, pathsNotFound);
        q.splice(0, 1);
      }
    }


    /**
     * Execute callbacks.
     * @param {Object or Function} args - The callback args
     * @param {string[]} depsNotFound - List of dependencies not found
     */
    function executeCallbacks(args, depsNotFound) {
      // accept function as argument
      if (args.call) args = {success: args};

      // success and error callbacks
      if (depsNotFound.length) (args.error || devnull)(depsNotFound);
      else (args.success || devnull)(args);
    }


    /**
     * Load individual file.
     * @param {string} path - The file path
     * @param {Function} callbackFn - The callback function
     */
    function loadFile(path, callbackFn, args, numTries) {
      var doc = document,
          async = args.async,
          maxTries = (args.numRetries || 0) + 1,
          beforeCallbackFn = args.before || devnull,
          pathStripped = path.replace(/^(css|img)!/, ''),
          isCss,
          e;

      numTries = numTries || 0;

      if (/(^css!|\.css$)/.test(path)) {
        isCss = true;

        // css
        e = doc.createElement('link');
        e.rel = 'stylesheet';
        e.href = pathStripped; //.replace(/^css!/, '');  // remove "css!" prefix
      } else if (/(^img!|\.(png|gif|jpg|svg)$)/.test(path)) {
        // image
        e = doc.createElement('img');
        e.src = pathStripped;    
      } else {
        // javascript
        e = doc.createElement('script');
        e.src = path;
        e.async = async === undefined ? true : async;
      }

      e.onload = e.onerror = e.onbeforeload = function (ev) {
        var result = ev.type[0];

        // Note: The following code isolates IE using `hideFocus` and treats empty
        // stylesheets as failures to get around lack of onerror support
        if (isCss && 'hideFocus' in e) {
          try {
            if (!e.sheet.cssText.length) result = 'e';
          } catch (x) {
            // sheets objects created from load errors don't allow access to
            // `cssText`
            result = 'e';
          }
        }

        // handle retries in case of load failure
        if (result == 'e') {
          // increment counter
          numTries += 1;

          // exit function and try again
          if (numTries < maxTries) {
            return loadFile(path, callbackFn, args, numTries);
          }
        }

        // execute callback
        callbackFn(path, result, ev.defaultPrevented);
      };

      // add to document (unless callback returns `false`)
      if (beforeCallbackFn(path, e) !== false) doc.head.appendChild(e);
    }


    /**
     * Load multiple files.
     * @param {string[]} paths - The file paths
     * @param {Function} callbackFn - The callback function
     */
    function loadFiles(paths, callbackFn, args) {
      // listify paths
      paths = paths.push ? paths : [paths];

      var numWaiting = paths.length,
          x = numWaiting,
          pathsNotFound = [],
          fn,
          i;

      // define callback function
      fn = function(path, result, defaultPrevented) {
        // handle error
        if (result == 'e') pathsNotFound.push(path);

        // handle beforeload event. If defaultPrevented then that means the load
        // will be blocked (ex. Ghostery/ABP on Safari)
        if (result == 'b') {
          if (defaultPrevented) pathsNotFound.push(path);
          else return;
        }

        numWaiting--;
        if (!numWaiting) callbackFn(pathsNotFound);
      };

      // load scripts
      for (i=0; i < x; i++) loadFile(paths[i], fn, args);
    }


    /**
     * Initiate script load and register bundle.
     * @param {(string|string[])} paths - The file paths
     * @param {(string|Function)} [arg1] - The bundleId or success callback
     * @param {Function} [arg2] - The success or error callback
     * @param {Function} [arg3] - The error callback
     */
    function loadjs(paths, arg1, arg2) {
      var bundleId,
          args;

      // bundleId (if string)
      if (arg1 && arg1.trim) bundleId = arg1;

      // args (default is {})
      args = (bundleId ? arg2 : arg1) || {};

      // throw error if bundle is already defined
      if (bundleId) {
        if (bundleId in bundleIdCache) {
          throw "LoadJS";
        } else {
          bundleIdCache[bundleId] = true;
        }
      }

      // load scripts
      loadFiles(paths, function (pathsNotFound) {
        // execute callbacks
        executeCallbacks(args, pathsNotFound);

        // publish bundle load event
        publish(bundleId, pathsNotFound);
      }, args);
    }


    /**
     * Execute callbacks when dependencies have been satisfied.
     * @param {(string|string[])} deps - List of bundle ids
     * @param {Object} args - success/error arguments
     */
    loadjs.ready = function ready(deps, args) {
      // subscribe to bundle load event
      subscribe(deps, function (depsNotFound) {
        // execute callbacks
        executeCallbacks(args, depsNotFound);
      });

      return loadjs;
    };


    /**
     * Manually satisfy bundle dependencies.
     * @param {string} bundleId - The bundle id
     */
    loadjs.done = function done(bundleId) {
      publish(bundleId, []);
    };


    /**
     * Reset loadjs dependencies statuses
     */
    loadjs.reset = function reset() {
      bundleIdCache = {};
      bundleResultCache = {};
      bundleCallbackQueue = {};
    };


    /**
     * Determine if bundle has already been defined
     * @param String} bundleId - The bundle id
     */
    loadjs.isDefined = function isDefined(bundleId) {
      return bundleId in bundleIdCache;
    };


    // export
    return loadjs;

    }));
    });

    // ==========================================================================

    function loadScript(url) {
        return new Promise(function (resolve, reject) {
            loadjs_umd(url, {
                success: resolve,
                error: reject
            });
        });
    }

    // ==========================================================================

    // Parse Vimeo ID from URL
    function parseId(url) {
        if (is.empty(url)) {
            return null;
        }

        if (is.number(Number(url))) {
            return url;
        }

        var regex = /^.*(vimeo.com\/|video\/)(\d+).*/;
        return url.match(regex) ? RegExp.$2 : url;
    }

    // Get aspect ratio for dimensions
    function getAspectRatio(width, height) {
        var getRatio = function getRatio(w, h) {
            return h === 0 ? w : getRatio(h, w % h);
        };
        var ratio = getRatio(width, height);
        return width / ratio + ':' + height / ratio;
    }

    // Set playback state and trigger change (only on actual change)
    function assurePlaybackState(play) {
        if (play && !this.embed.hasPlayed) {
            this.embed.hasPlayed = true;
        }
        if (this.media.paused === play) {
            this.media.paused = !play;
            triggerEvent.call(this, this.media, play ? 'play' : 'pause');
        }
    }

    var vimeo = {
        setup: function setup() {
            var _this = this;

            // Add embed class for responsive
            toggleClass(this.elements.wrapper, this.config.classNames.embed, true);

            // Set intial ratio
            vimeo.setAspectRatio.call(this);

            // Load the API if not already
            if (!is.object(window.Vimeo)) {
                loadScript(this.config.urls.vimeo.sdk).then(function () {
                    vimeo.ready.call(_this);
                }).catch(function (error) {
                    _this.debug.warn('Vimeo API failed to load', error);
                });
            } else {
                vimeo.ready.call(this);
            }
        },


        // Set aspect ratio
        // For Vimeo we have an extra 300% height <div> to hide the standard controls and UI
        setAspectRatio: function setAspectRatio(input) {
            var _split = (is.string(input) ? input : this.config.ratio).split(':'),
                _split2 = slicedToArray(_split, 2),
                x = _split2[0],
                y = _split2[1];

            var padding = 100 / x * y;
            this.elements.wrapper.style.paddingBottom = padding + '%';

            if (this.supported.ui) {
                var height = 240;
                var offset = (height - padding) / (height / 50);

                this.media.style.transform = 'translateY(-' + offset + '%)';
            }
        },


        // API Ready
        ready: function ready$$1() {
            var _this2 = this;

            var player = this;

            // Get Vimeo params for the iframe
            var options = {
                loop: player.config.loop.active,
                autoplay: player.autoplay,
                // muted: player.muted,
                byline: false,
                portrait: false,
                title: false,
                speed: true,
                transparent: 0,
                gesture: 'media',
                playsinline: !this.config.fullscreen.iosNative
            };
            var params = buildUrlParams(options);

            // Get the source URL or ID
            var source = player.media.getAttribute('src');

            // Get from <div> if needed
            if (is.empty(source)) {
                source = player.media.getAttribute(player.config.attributes.embed.id);
            }

            var id = parseId(source);

            // Build an iframe
            var iframe = createElement('iframe');
            var src = format(player.config.urls.vimeo.iframe, id, params);
            iframe.setAttribute('src', src);
            iframe.setAttribute('allowfullscreen', '');
            iframe.setAttribute('allowtransparency', '');
            iframe.setAttribute('allow', 'autoplay');

            // Get poster, if already set
            var poster = player.poster;

            // Inject the package

            var wrapper = createElement('div', { poster: poster, class: player.config.classNames.embedContainer });
            wrapper.appendChild(iframe);
            player.media = replaceElement(wrapper, player.media);

            // Get poster image
            fetch(format(player.config.urls.vimeo.api, id), 'json').then(function (response) {
                if (is.empty(response)) {
                    return;
                }

                // Get the URL for thumbnail
                var url = new URL(response[0].thumbnail_large);

                // Get original image
                url.pathname = url.pathname.split('_')[0] + '.jpg';

                // Set and show poster
                ui.setPoster.call(player, url.href).catch(function () {});
            });

            // Setup instance
            // https://github.com/vimeo/player.js
            player.embed = new window.Vimeo.Player(iframe, {
                autopause: player.config.autopause,
                muted: player.muted
            });

            player.media.paused = true;
            player.media.currentTime = 0;

            // Disable native text track rendering
            if (player.supported.ui) {
                player.embed.disableTextTrack();
            }

            // Create a faux HTML5 API using the Vimeo API
            player.media.play = function () {
                assurePlaybackState.call(player, true);
                return player.embed.play();
            };

            player.media.pause = function () {
                assurePlaybackState.call(player, false);
                return player.embed.pause();
            };

            player.media.stop = function () {
                player.pause();
                player.currentTime = 0;
            };

            // Seeking
            var currentTime = player.media.currentTime;

            Object.defineProperty(player.media, 'currentTime', {
                get: function get$$1() {
                    return currentTime;
                },
                set: function set$$1(time) {
                    // Vimeo will automatically play on seek if the video hasn't been played before

                    // Get current paused state and volume etc
                    var embed = player.embed,
                        media = player.media,
                        paused = player.paused,
                        volume = player.volume;

                    var restorePause = paused && !embed.hasPlayed;

                    // Set seeking state and trigger event
                    media.seeking = true;
                    triggerEvent.call(player, media, 'seeking');

                    // If paused, mute until seek is complete
                    Promise.resolve(restorePause && embed.setVolume(0))
                    // Seek
                    .then(function () {
                        return embed.setCurrentTime(time);
                    })
                    // Restore paused
                    .then(function () {
                        return restorePause && embed.pause();
                    })
                    // Restore volume
                    .then(function () {
                        return restorePause && embed.setVolume(volume);
                    }).catch(function () {
                        // Do nothing
                    });
                }
            });

            // Playback speed
            var speed = player.config.speed.selected;
            Object.defineProperty(player.media, 'playbackRate', {
                get: function get$$1() {
                    return speed;
                },
                set: function set$$1(input) {
                    player.embed.setPlaybackRate(input).then(function () {
                        speed = input;
                        triggerEvent.call(player, player.media, 'ratechange');
                    }).catch(function (error) {
                        // Hide menu item (and menu if empty)
                        if (error.name === 'Error') {
                            controls.setSpeedMenu.call(player, []);
                        }
                    });
                }
            });

            // Volume
            var volume = player.config.volume;

            Object.defineProperty(player.media, 'volume', {
                get: function get$$1() {
                    return volume;
                },
                set: function set$$1(input) {
                    player.embed.setVolume(input).then(function () {
                        volume = input;
                        triggerEvent.call(player, player.media, 'volumechange');
                    });
                }
            });

            // Muted
            var muted = player.config.muted;

            Object.defineProperty(player.media, 'muted', {
                get: function get$$1() {
                    return muted;
                },
                set: function set$$1(input) {
                    var toggle = is.boolean(input) ? input : false;

                    player.embed.setVolume(toggle ? 0 : player.config.volume).then(function () {
                        muted = toggle;
                        triggerEvent.call(player, player.media, 'volumechange');
                    });
                }
            });

            // Loop
            var loop = player.config.loop;

            Object.defineProperty(player.media, 'loop', {
                get: function get$$1() {
                    return loop;
                },
                set: function set$$1(input) {
                    var toggle = is.boolean(input) ? input : player.config.loop.active;

                    player.embed.setLoop(toggle).then(function () {
                        loop = toggle;
                    });
                }
            });

            // Source
            var currentSrc = void 0;
            player.embed.getVideoUrl().then(function (value) {
                currentSrc = value;
            }).catch(function (error) {
                _this2.debug.warn(error);
            });

            Object.defineProperty(player.media, 'currentSrc', {
                get: function get$$1() {
                    return currentSrc;
                }
            });

            // Ended
            Object.defineProperty(player.media, 'ended', {
                get: function get$$1() {
                    return player.currentTime === player.duration;
                }
            });

            // Set aspect ratio based on video size
            Promise.all([player.embed.getVideoWidth(), player.embed.getVideoHeight()]).then(function (dimensions) {
                var ratio = getAspectRatio(dimensions[0], dimensions[1]);
                vimeo.setAspectRatio.call(_this2, ratio);
            });

            // Set autopause
            player.embed.setAutopause(player.config.autopause).then(function (state) {
                player.config.autopause = state;
            });

            // Get title
            player.embed.getVideoTitle().then(function (title) {
                player.config.title = title;
                ui.setTitle.call(_this2);
            });

            // Get current time
            player.embed.getCurrentTime().then(function (value) {
                currentTime = value;
                triggerEvent.call(player, player.media, 'timeupdate');
            });

            // Get duration
            player.embed.getDuration().then(function (value) {
                player.media.duration = value;
                triggerEvent.call(player, player.media, 'durationchange');
            });

            // Get captions
            player.embed.getTextTracks().then(function (tracks) {
                player.media.textTracks = tracks;
                captions.setup.call(player);
            });

            player.embed.on('cuechange', function (_ref) {
                var _ref$cues = _ref.cues,
                    cues = _ref$cues === undefined ? [] : _ref$cues;

                var strippedCues = cues.map(function (cue) {
                    return stripHTML(cue.text);
                });
                captions.updateCues.call(player, strippedCues);
            });

            player.embed.on('loaded', function () {
                // Assure state and events are updated on autoplay
                player.embed.getPaused().then(function (paused) {
                    assurePlaybackState.call(player, !paused);
                    if (!paused) {
                        triggerEvent.call(player, player.media, 'playing');
                    }
                });

                if (is.element(player.embed.element) && player.supported.ui) {
                    var frame = player.embed.element;

                    // Fix keyboard focus issues
                    // https://github.com/sampotts/plyr/issues/317
                    frame.setAttribute('tabindex', -1);
                }
            });

            player.embed.on('play', function () {
                assurePlaybackState.call(player, true);
                triggerEvent.call(player, player.media, 'playing');
            });

            player.embed.on('pause', function () {
                assurePlaybackState.call(player, false);
            });

            player.embed.on('timeupdate', function (data) {
                player.media.seeking = false;
                currentTime = data.seconds;
                triggerEvent.call(player, player.media, 'timeupdate');
            });

            player.embed.on('progress', function (data) {
                player.media.buffered = data.percent;
                triggerEvent.call(player, player.media, 'progress');

                // Check all loaded
                if (parseInt(data.percent, 10) === 1) {
                    triggerEvent.call(player, player.media, 'canplaythrough');
                }

                // Get duration as if we do it before load, it gives an incorrect value
                // https://github.com/sampotts/plyr/issues/891
                player.embed.getDuration().then(function (value) {
                    if (value !== player.media.duration) {
                        player.media.duration = value;
                        triggerEvent.call(player, player.media, 'durationchange');
                    }
                });
            });

            player.embed.on('seeked', function () {
                player.media.seeking = false;
                triggerEvent.call(player, player.media, 'seeked');
            });

            player.embed.on('ended', function () {
                player.media.paused = true;
                triggerEvent.call(player, player.media, 'ended');
            });

            player.embed.on('error', function (detail) {
                player.media.error = detail;
                triggerEvent.call(player, player.media, 'error');
            });

            // Rebuild UI
            setTimeout(function () {
                return ui.build.call(player);
            }, 0);
        }
    };

    // ==========================================================================

    // Parse YouTube ID from URL
    function parseId$1(url) {
        if (is.empty(url)) {
            return null;
        }

        var regex = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        return url.match(regex) ? RegExp.$2 : url;
    }

    // Standardise YouTube quality unit
    function mapQualityUnit(input) {
        var qualities = {
            hd2160: 2160,
            hd1440: 1440,
            hd1080: 1080,
            hd720: 720,
            large: 480,
            medium: 360,
            small: 240,
            tiny: 144
        };

        var entry = Object.entries(qualities).find(function (entry) {
            return entry.includes(input);
        });

        if (entry) {
            // Get the match corresponding to the input
            return entry.find(function (value) {
                return value !== input;
            });
        }

        return 'default';
    }

    function mapQualityUnits(levels) {
        if (is.empty(levels)) {
            return levels;
        }

        return dedupe(levels.map(function (level) {
            return mapQualityUnit(level);
        }));
    }

    // Set playback state and trigger change (only on actual change)
    function assurePlaybackState$1(play) {
        if (play && !this.embed.hasPlayed) {
            this.embed.hasPlayed = true;
        }
        if (this.media.paused === play) {
            this.media.paused = !play;
            triggerEvent.call(this, this.media, play ? 'play' : 'pause');
        }
    }

    var youtube = {
        setup: function setup() {
            var _this = this;

            // Add embed class for responsive
            toggleClass(this.elements.wrapper, this.config.classNames.embed, true);

            // Set aspect ratio
            youtube.setAspectRatio.call(this);

            // Setup API
            if (is.object(window.YT) && is.function(window.YT.Player)) {
                youtube.ready.call(this);
            } else {
                // Load the API
                loadScript(this.config.urls.youtube.sdk).catch(function (error) {
                    _this.debug.warn('YouTube API failed to load', error);
                });

                // Setup callback for the API
                // YouTube has it's own system of course...
                window.onYouTubeReadyCallbacks = window.onYouTubeReadyCallbacks || [];

                // Add to queue
                window.onYouTubeReadyCallbacks.push(function () {
                    youtube.ready.call(_this);
                });

                // Set callback to process queue
                window.onYouTubeIframeAPIReady = function () {
                    window.onYouTubeReadyCallbacks.forEach(function (callback) {
                        callback();
                    });
                };
            }
        },


        // Get the media title
        getTitle: function getTitle(videoId) {
            var _this2 = this;

            // Try via undocumented API method first
            // This method disappears now and then though...
            // https://github.com/sampotts/plyr/issues/709
            if (is.function(this.embed.getVideoData)) {
                var _embed$getVideoData = this.embed.getVideoData(),
                    title = _embed$getVideoData.title;

                if (is.empty(title)) {
                    this.config.title = title;
                    ui.setTitle.call(this);
                    return;
                }
            }

            // Or via Google API
            var key = this.config.keys.google;
            if (is.string(key) && !is.empty(key)) {
                var url = format(this.config.urls.youtube.api, videoId, key);

                fetch(url).then(function (result) {
                    if (is.object(result)) {
                        _this2.config.title = result.items[0].snippet.title;
                        ui.setTitle.call(_this2);
                    }
                }).catch(function () {});
            }
        },


        // Set aspect ratio
        setAspectRatio: function setAspectRatio() {
            var ratio = this.config.ratio.split(':');
            this.elements.wrapper.style.paddingBottom = 100 / ratio[0] * ratio[1] + '%';
        },


        // API ready
        ready: function ready$$1() {
            var player = this;

            // Ignore already setup (race condition)
            var currentId = player.media.getAttribute('id');
            if (!is.empty(currentId) && currentId.startsWith('youtube-')) {
                return;
            }

            // Get the source URL or ID
            var source = player.media.getAttribute('src');

            // Get from <div> if needed
            if (is.empty(source)) {
                source = player.media.getAttribute(this.config.attributes.embed.id);
            }

            // Replace the <iframe> with a <div> due to YouTube API issues
            var videoId = parseId$1(source);
            var id = generateId(player.provider);

            // Get poster, if already set
            var poster = player.poster;

            // Replace media element

            var container = createElement('div', { id: id, poster: poster });
            player.media = replaceElement(container, player.media);

            // Id to poster wrapper
            var posterSrc = function posterSrc(format$$1) {
                return 'https://img.youtube.com/vi/' + videoId + '/' + format$$1 + 'default.jpg';
            };

            // Check thumbnail images in order of quality, but reject fallback thumbnails (120px wide)
            loadImage(posterSrc('maxres'), 121) // Higest quality and unpadded
            .catch(function () {
                return loadImage(posterSrc('sd'), 121);
            }) // 480p padded 4:3
            .catch(function () {
                return loadImage(posterSrc('hq'));
            }) // 360p padded 4:3. Always exists
            .then(function (image) {
                return ui.setPoster.call(player, image.src);
            }).then(function (posterSrc) {
                // If the image is padded, use background-size "cover" instead (like youtube does too with their posters)
                if (!posterSrc.includes('maxres')) {
                    player.elements.poster.style.backgroundSize = 'cover';
                }
            }).catch(function () {});

            // Setup instance
            // https://developers.google.com/youtube/iframe_api_reference
            player.embed = new window.YT.Player(id, {
                videoId: videoId,
                playerVars: {
                    autoplay: player.config.autoplay ? 1 : 0, // Autoplay
                    controls: player.supported.ui ? 0 : 1, // Only show controls if not fully supported
                    rel: 0, // No related vids
                    showinfo: 0, // Hide info
                    iv_load_policy: 3, // Hide annotations
                    modestbranding: 1, // Hide logos as much as possible (they still show one in the corner when paused)
                    disablekb: 1, // Disable keyboard as we handle it
                    playsinline: 1, // Allow iOS inline playback

                    // Tracking for stats
                    // origin: window ? `${window.location.protocol}//${window.location.host}` : null,
                    widget_referrer: window ? window.location.href : null,

                    // Captions are flaky on YouTube
                    cc_load_policy: player.captions.active ? 1 : 0,
                    cc_lang_pref: player.config.captions.language
                },
                events: {
                    onError: function onError(event) {
                        // YouTube may fire onError twice, so only handle it once
                        if (!player.media.error) {
                            var code = event.data;
                            // Messages copied from https://developers.google.com/youtube/iframe_api_reference#onError
                            var message = {
                                2: 'The request contains an invalid parameter value. For example, this error occurs if you specify a video ID that does not have 11 characters, or if the video ID contains invalid characters, such as exclamation points or asterisks.',
                                5: 'The requested content cannot be played in an HTML5 player or another error related to the HTML5 player has occurred.',
                                100: 'The video requested was not found. This error occurs when a video has been removed (for any reason) or has been marked as private.',
                                101: 'The owner of the requested video does not allow it to be played in embedded players.',
                                150: 'The owner of the requested video does not allow it to be played in embedded players.'
                            }[code] || 'An unknown error occured';

                            player.media.error = { code: code, message: message };

                            triggerEvent.call(player, player.media, 'error');
                        }
                    },
                    onPlaybackQualityChange: function onPlaybackQualityChange() {
                        triggerEvent.call(player, player.media, 'qualitychange', false, {
                            quality: player.media.quality
                        });
                    },
                    onPlaybackRateChange: function onPlaybackRateChange(event) {
                        // Get the instance
                        var instance = event.target;

                        // Get current speed
                        player.media.playbackRate = instance.getPlaybackRate();

                        triggerEvent.call(player, player.media, 'ratechange');
                    },
                    onReady: function onReady(event) {
                        // Get the instance
                        var instance = event.target;

                        // Get the title
                        youtube.getTitle.call(player, videoId);

                        // Create a faux HTML5 API using the YouTube API
                        player.media.play = function () {
                            assurePlaybackState$1.call(player, true);
                            instance.playVideo();
                        };

                        player.media.pause = function () {
                            assurePlaybackState$1.call(player, false);
                            instance.pauseVideo();
                        };

                        player.media.stop = function () {
                            instance.stopVideo();
                        };

                        player.media.duration = instance.getDuration();
                        player.media.paused = true;

                        // Seeking
                        player.media.currentTime = 0;
                        Object.defineProperty(player.media, 'currentTime', {
                            get: function get() {
                                return Number(instance.getCurrentTime());
                            },
                            set: function set(time) {
                                // If paused, mute audio preventively (YouTube starts playing on seek if the video hasn't been played yet).
                                if (player.paused) {
                                    player.embed.mute();
                                }

                                // Set seeking state and trigger event
                                player.media.seeking = true;
                                triggerEvent.call(player, player.media, 'seeking');

                                // Seek after events sent
                                instance.seekTo(time);
                            }
                        });

                        // Playback speed
                        Object.defineProperty(player.media, 'playbackRate', {
                            get: function get() {
                                return instance.getPlaybackRate();
                            },
                            set: function set(input) {
                                instance.setPlaybackRate(input);
                            }
                        });

                        // Quality
                        Object.defineProperty(player.media, 'quality', {
                            get: function get() {
                                return mapQualityUnit(instance.getPlaybackQuality());
                            },
                            set: function set(input) {
                                instance.setPlaybackQuality(mapQualityUnit(input));
                            }
                        });

                        // Volume
                        var volume = player.config.volume;

                        Object.defineProperty(player.media, 'volume', {
                            get: function get() {
                                return volume;
                            },
                            set: function set(input) {
                                volume = input;
                                instance.setVolume(volume * 100);
                                triggerEvent.call(player, player.media, 'volumechange');
                            }
                        });

                        // Muted
                        var muted = player.config.muted;

                        Object.defineProperty(player.media, 'muted', {
                            get: function get() {
                                return muted;
                            },
                            set: function set(input) {
                                var toggle = is.boolean(input) ? input : muted;
                                muted = toggle;
                                instance[toggle ? 'mute' : 'unMute']();
                                triggerEvent.call(player, player.media, 'volumechange');
                            }
                        });

                        // Source
                        Object.defineProperty(player.media, 'currentSrc', {
                            get: function get() {
                                return instance.getVideoUrl();
                            }
                        });

                        // Ended
                        Object.defineProperty(player.media, 'ended', {
                            get: function get() {
                                return player.currentTime === player.duration;
                            }
                        });

                        // Get available speeds
                        player.options.speed = instance.getAvailablePlaybackRates();

                        // Set the tabindex to avoid focus entering iframe
                        if (player.supported.ui) {
                            player.media.setAttribute('tabindex', -1);
                        }

                        triggerEvent.call(player, player.media, 'timeupdate');
                        triggerEvent.call(player, player.media, 'durationchange');

                        // Reset timer
                        clearInterval(player.timers.buffering);

                        // Setup buffering
                        player.timers.buffering = setInterval(function () {
                            // Get loaded % from YouTube
                            player.media.buffered = instance.getVideoLoadedFraction();

                            // Trigger progress only when we actually buffer something
                            if (player.media.lastBuffered === null || player.media.lastBuffered < player.media.buffered) {
                                triggerEvent.call(player, player.media, 'progress');
                            }

                            // Set last buffer point
                            player.media.lastBuffered = player.media.buffered;

                            // Bail if we're at 100%
                            if (player.media.buffered === 1) {
                                clearInterval(player.timers.buffering);

                                // Trigger event
                                triggerEvent.call(player, player.media, 'canplaythrough');
                            }
                        }, 200);

                        // Rebuild UI
                        setTimeout(function () {
                            return ui.build.call(player);
                        }, 50);
                    },
                    onStateChange: function onStateChange(event) {
                        // Get the instance
                        var instance = event.target;

                        // Reset timer
                        clearInterval(player.timers.playing);

                        var seeked = player.media.seeking && [1, 2].includes(event.data);

                        if (seeked) {
                            // Unset seeking and fire seeked event
                            player.media.seeking = false;
                            triggerEvent.call(player, player.media, 'seeked');
                        }

                        // Handle events
                        // -1   Unstarted
                        // 0    Ended
                        // 1    Playing
                        // 2    Paused
                        // 3    Buffering
                        // 5    Video cued
                        switch (event.data) {
                            case -1:
                                // Update scrubber
                                triggerEvent.call(player, player.media, 'timeupdate');

                                // Get loaded % from YouTube
                                player.media.buffered = instance.getVideoLoadedFraction();
                                triggerEvent.call(player, player.media, 'progress');

                                break;

                            case 0:
                                assurePlaybackState$1.call(player, false);

                                // YouTube doesn't support loop for a single video, so mimick it.
                                if (player.media.loop) {
                                    // YouTube needs a call to `stopVideo` before playing again
                                    instance.stopVideo();
                                    instance.playVideo();
                                } else {
                                    triggerEvent.call(player, player.media, 'ended');
                                }

                                break;

                            case 1:
                                // Restore paused state (YouTube starts playing on seek if the video hasn't been played yet)
                                if (player.media.paused && !player.embed.hasPlayed) {
                                    player.media.pause();
                                } else {
                                    assurePlaybackState$1.call(player, true);

                                    triggerEvent.call(player, player.media, 'playing');

                                    // Poll to get playback progress
                                    player.timers.playing = setInterval(function () {
                                        triggerEvent.call(player, player.media, 'timeupdate');
                                    }, 50);

                                    // Check duration again due to YouTube bug
                                    // https://github.com/sampotts/plyr/issues/374
                                    // https://code.google.com/p/gdata-issues/issues/detail?id=8690
                                    if (player.media.duration !== instance.getDuration()) {
                                        player.media.duration = instance.getDuration();
                                        triggerEvent.call(player, player.media, 'durationchange');
                                    }

                                    // Get quality
                                    controls.setQualityMenu.call(player, mapQualityUnits(instance.getAvailableQualityLevels()));
                                }

                                break;

                            case 2:
                                // Restore audio (YouTube starts playing on seek if the video hasn't been played yet)
                                if (!player.muted) {
                                    player.embed.unMute();
                                }
                                assurePlaybackState$1.call(player, false);

                                break;

                            default:
                                break;
                        }

                        triggerEvent.call(player, player.elements.container, 'statechange', false, {
                            code: event.data
                        });
                    }
                }
            });
        }
    };

    // ==========================================================================

    var media = {
        // Setup media
        setup: function setup() {
            // If there's no media, bail
            if (!this.media) {
                this.debug.warn('No media element found!');
                return;
            }

            // Add type class
            toggleClass(this.elements.container, this.config.classNames.type.replace('{0}', this.type), true);

            // Add provider class
            toggleClass(this.elements.container, this.config.classNames.provider.replace('{0}', this.provider), true);

            // Add video class for embeds
            // This will require changes if audio embeds are added
            if (this.isEmbed) {
                toggleClass(this.elements.container, this.config.classNames.type.replace('{0}', 'video'), true);
            }

            // Inject the player wrapper
            if (this.isVideo) {
                // Create the wrapper div
                this.elements.wrapper = createElement('div', {
                    class: this.config.classNames.video
                });

                // Wrap the video in a container
                wrap(this.media, this.elements.wrapper);

                // Faux poster container
                this.elements.poster = createElement('div', {
                    class: this.config.classNames.poster
                });

                this.elements.wrapper.appendChild(this.elements.poster);
            }

            if (this.isHTML5) {
                html5.extend.call(this);
            } else if (this.isYouTube) {
                youtube.setup.call(this);
            } else if (this.isVimeo) {
                vimeo.setup.call(this);
            }
        }
    };

    // ==========================================================================

    var Ads = function () {
        /**
         * Ads constructor.
         * @param {object} player
         * @return {Ads}
         */
        function Ads(player) {
            var _this = this;

            classCallCheck(this, Ads);

            this.player = player;
            this.publisherId = player.config.ads.publisherId;
            this.playing = false;
            this.initialized = false;
            this.elements = {
                container: null,
                displayContainer: null
            };
            this.manager = null;
            this.loader = null;
            this.cuePoints = null;
            this.events = {};
            this.safetyTimer = null;
            this.countdownTimer = null;

            // Setup a promise to resolve when the IMA manager is ready
            this.managerPromise = new Promise(function (resolve, reject) {
                // The ad is loaded and ready
                _this.on('loaded', resolve);

                // Ads failed
                _this.on('error', reject);
            });

            this.load();
        }

        createClass(Ads, [{
            key: 'load',


            /**
             * Load the IMA SDK
             */
            value: function load() {
                var _this2 = this;

                if (this.enabled) {
                    // Check if the Google IMA3 SDK is loaded or load it ourselves
                    if (!is.object(window.google) || !is.object(window.google.ima)) {
                        loadScript(this.player.config.urls.googleIMA.sdk).then(function () {
                            _this2.ready();
                        }).catch(function () {
                            // Script failed to load or is blocked
                            _this2.trigger('error', new Error('Google IMA SDK failed to load'));
                        });
                    } else {
                        this.ready();
                    }
                }
            }

            /**
             * Get the ads instance ready
             */

        }, {
            key: 'ready',
            value: function ready$$1() {
                var _this3 = this;

                // Start ticking our safety timer. If the whole advertisement
                // thing doesn't resolve within our set time; we bail
                this.startSafetyTimer(12000, 'ready()');

                // Clear the safety timer
                this.managerPromise.then(function () {
                    _this3.clearSafetyTimer('onAdsManagerLoaded()');
                });

                // Set listeners on the Plyr instance
                this.listeners();

                // Setup the IMA SDK
                this.setupIMA();
            }

            // Build the default tag URL

        }, {
            key: 'setupIMA',


            /**
             * In order for the SDK to display ads for our video, we need to tell it where to put them,
             * so here we define our ad container. This div is set up to render on top of the video player.
             * Using the code below, we tell the SDK to render ads within that div. We also provide a
             * handle to the content video player - the SDK will poll the current time of our player to
             * properly place mid-rolls. After we create the ad display container, we initialize it. On
             * mobile devices, this initialization is done as the result of a user action.
             */
            value: function setupIMA() {
                // Create the container for our advertisements
                this.elements.container = createElement('div', {
                    class: this.player.config.classNames.ads
                });
                this.player.elements.container.appendChild(this.elements.container);

                // So we can run VPAID2
                google.ima.settings.setVpaidMode(google.ima.ImaSdkSettings.VpaidMode.ENABLED);

                // Set language
                google.ima.settings.setLocale(this.player.config.ads.language);

                // We assume the adContainer is the video container of the plyr element
                // that will house the ads
                this.elements.displayContainer = new google.ima.AdDisplayContainer(this.elements.container);

                // Request video ads to be pre-loaded
                this.requestAds();
            }

            /**
             * Request advertisements
             */

        }, {
            key: 'requestAds',
            value: function requestAds() {
                var _this4 = this;

                var container = this.player.elements.container;


                try {
                    // Create ads loader
                    this.loader = new google.ima.AdsLoader(this.elements.displayContainer);

                    // Listen and respond to ads loaded and error events
                    this.loader.addEventListener(google.ima.AdsManagerLoadedEvent.Type.ADS_MANAGER_LOADED, function (event) {
                        return _this4.onAdsManagerLoaded(event);
                    }, false);
                    this.loader.addEventListener(google.ima.AdErrorEvent.Type.AD_ERROR, function (error) {
                        return _this4.onAdError(error);
                    }, false);

                    // Request video ads
                    var request = new google.ima.AdsRequest();
                    request.adTagUrl = this.tagUrl;

                    // Specify the linear and nonlinear slot sizes. This helps the SDK
                    // to select the correct creative if multiple are returned
                    request.linearAdSlotWidth = container.offsetWidth;
                    request.linearAdSlotHeight = container.offsetHeight;
                    request.nonLinearAdSlotWidth = container.offsetWidth;
                    request.nonLinearAdSlotHeight = container.offsetHeight;

                    // We only overlay ads as we only support video.
                    request.forceNonLinearFullSlot = false;

                    // Mute based on current state
                    request.setAdWillPlayMuted(!this.player.muted);

                    this.loader.requestAds(request);
                } catch (e) {
                    this.onAdError(e);
                }
            }

            /**
             * Update the ad countdown
             * @param {boolean} start
             */

        }, {
            key: 'pollCountdown',
            value: function pollCountdown() {
                var _this5 = this;

                var start = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;

                if (!start) {
                    clearInterval(this.countdownTimer);
                    this.elements.container.removeAttribute('data-badge-text');
                    return;
                }

                var update = function update() {
                    var time = formatTime(Math.max(_this5.manager.getRemainingTime(), 0));
                    var label = i18n.get('advertisement', _this5.player.config) + ' - ' + time;
                    _this5.elements.container.setAttribute('data-badge-text', label);
                };

                this.countdownTimer = setInterval(update, 100);
            }

            /**
             * This method is called whenever the ads are ready inside the AdDisplayContainer
             * @param {Event} adsManagerLoadedEvent
             */

        }, {
            key: 'onAdsManagerLoaded',
            value: function onAdsManagerLoaded(event) {
                var _this6 = this;

                // Get the ads manager
                var settings = new google.ima.AdsRenderingSettings();

                // Tell the SDK to save and restore content video state on our behalf
                settings.restoreCustomPlaybackStateOnAdBreakComplete = true;
                settings.enablePreloading = true;

                // The SDK is polling currentTime on the contentPlayback. And needs a duration
                // so it can determine when to start the mid- and post-roll
                this.manager = event.getAdsManager(this.player, settings);

                // Get the cue points for any mid-rolls by filtering out the pre- and post-roll
                this.cuePoints = this.manager.getCuePoints();

                // Add advertisement cue's within the time line if available
                if (!is.empty(this.cuePoints)) {
                    this.cuePoints.forEach(function (cuePoint) {
                        if (cuePoint !== 0 && cuePoint !== -1 && cuePoint < _this6.player.duration) {
                            var seekElement = _this6.player.elements.progress;

                            if (is.element(seekElement)) {
                                var cuePercentage = 100 / _this6.player.duration * cuePoint;
                                var cue = createElement('span', {
                                    class: _this6.player.config.classNames.cues
                                });

                                cue.style.left = cuePercentage.toString() + '%';
                                seekElement.appendChild(cue);
                            }
                        }
                    });
                }

                // Get skippable state
                // TODO: Skip button
                // this.player.debug.warn(this.manager.getAdSkippableState());

                // Set volume to match player
                this.manager.setVolume(this.player.volume);

                // Add listeners to the required events
                // Advertisement error events
                this.manager.addEventListener(google.ima.AdErrorEvent.Type.AD_ERROR, function (error) {
                    return _this6.onAdError(error);
                });

                // Advertisement regular events
                Object.keys(google.ima.AdEvent.Type).forEach(function (type) {
                    _this6.manager.addEventListener(google.ima.AdEvent.Type[type], function (event) {
                        return _this6.onAdEvent(event);
                    });
                });

                // Resolve our adsManager
                this.trigger('loaded');
            }

            /**
             * This is where all the event handling takes place. Retrieve the ad from the event. Some
             * events (e.g. ALL_ADS_COMPLETED) don't have the ad object associated
             * https://developers.google.com/interactive-media-ads/docs/sdks/html5/v3/apis#ima.AdEvent.Type
             * @param {Event} event
             */

        }, {
            key: 'onAdEvent',
            value: function onAdEvent(event) {
                var _this7 = this;

                var container = this.player.elements.container;

                // Retrieve the ad from the event. Some events (e.g. ALL_ADS_COMPLETED)
                // don't have ad object associated

                var ad = event.getAd();

                // Proxy event
                var dispatchEvent = function dispatchEvent(type) {
                    var event = 'ads' + type.replace(/_/g, '').toLowerCase();
                    triggerEvent.call(_this7.player, _this7.player.media, event);
                };

                switch (event.type) {
                    case google.ima.AdEvent.Type.LOADED:
                        // This is the first event sent for an ad - it is possible to determine whether the
                        // ad is a video ad or an overlay
                        this.trigger('loaded');

                        // Bubble event
                        dispatchEvent(event.type);

                        // Start countdown
                        this.pollCountdown(true);

                        if (!ad.isLinear()) {
                            // Position AdDisplayContainer correctly for overlay
                            ad.width = container.offsetWidth;
                            ad.height = container.offsetHeight;
                        }

                        // console.info('Ad type: ' + event.getAd().getAdPodInfo().getPodIndex());
                        // console.info('Ad time: ' + event.getAd().getAdPodInfo().getTimeOffset());
                        break;

                    case google.ima.AdEvent.Type.ALL_ADS_COMPLETED:
                        // All ads for the current videos are done. We can now request new advertisements
                        // in case the video is re-played

                        // Fire event
                        dispatchEvent(event.type);

                        // TODO: Example for what happens when a next video in a playlist would be loaded.
                        // So here we load a new video when all ads are done.
                        // Then we load new ads within a new adsManager. When the video
                        // Is started - after - the ads are loaded, then we get ads.
                        // You can also easily test cancelling and reloading by running
                        // player.ads.cancel() and player.ads.play from the console I guess.
                        // this.player.source = {
                        //     type: 'video',
                        //     title: 'View From A Blue Moon',
                        //     sources: [{
                        //         src:
                        // 'https://cdn.plyr.io/static/demo/View_From_A_Blue_Moon_Trailer-HD.mp4', type:
                        // 'video/mp4', }], poster:
                        // 'https://cdn.plyr.io/static/demo/View_From_A_Blue_Moon_Trailer-HD.jpg', tracks:
                        // [ { kind: 'captions', label: 'English', srclang: 'en', src:
                        // 'https://cdn.plyr.io/static/demo/View_From_A_Blue_Moon_Trailer-HD.en.vtt',
                        // default: true, }, { kind: 'captions', label: 'French', srclang: 'fr', src:
                        // 'https://cdn.plyr.io/static/demo/View_From_A_Blue_Moon_Trailer-HD.fr.vtt', }, ],
                        // };

                        // TODO: So there is still this thing where a video should only be allowed to start
                        // playing when the IMA SDK is ready or has failed

                        this.loadAds();
                        break;

                    case google.ima.AdEvent.Type.CONTENT_PAUSE_REQUESTED:
                        // This event indicates the ad has started - the video player can adjust the UI,
                        // for example display a pause button and remaining time. Fired when content should
                        // be paused. This usually happens right before an ad is about to cover the content

                        dispatchEvent(event.type);

                        this.pauseContent();

                        break;

                    case google.ima.AdEvent.Type.CONTENT_RESUME_REQUESTED:
                        // This event indicates the ad has finished - the video player can perform
                        // appropriate UI actions, such as removing the timer for remaining time detection.
                        // Fired when content should be resumed. This usually happens when an ad finishes
                        // or collapses

                        dispatchEvent(event.type);

                        this.pollCountdown();

                        this.resumeContent();

                        break;

                    case google.ima.AdEvent.Type.STARTED:
                    case google.ima.AdEvent.Type.MIDPOINT:
                    case google.ima.AdEvent.Type.COMPLETE:
                    case google.ima.AdEvent.Type.IMPRESSION:
                    case google.ima.AdEvent.Type.CLICK:
                        dispatchEvent(event.type);
                        break;

                    default:
                        break;
                }
            }

            /**
             * Any ad error handling comes through here
             * @param {Event} event
             */

        }, {
            key: 'onAdError',
            value: function onAdError(event) {
                this.cancel();
                this.player.debug.warn('Ads error', event);
            }

            /**
             * Setup hooks for Plyr and window events. This ensures
             * the mid- and post-roll launch at the correct time. And
             * resize the advertisement when the player resizes
             */

        }, {
            key: 'listeners',
            value: function listeners() {
                var _this8 = this;

                var container = this.player.elements.container;

                var time = void 0;

                // Add listeners to the required events
                this.player.on('ended', function () {
                    _this8.loader.contentComplete();
                });

                this.player.on('seeking', function () {
                    time = _this8.player.currentTime;
                    return time;
                });

                this.player.on('seeked', function () {
                    var seekedTime = _this8.player.currentTime;

                    if (is.empty(_this8.cuePoints)) {
                        return;
                    }

                    _this8.cuePoints.forEach(function (cuePoint, index) {
                        if (time < cuePoint && cuePoint < seekedTime) {
                            _this8.manager.discardAdBreak();
                            _this8.cuePoints.splice(index, 1);
                        }
                    });
                });

                // Listen to the resizing of the window. And resize ad accordingly
                // TODO: eventually implement ResizeObserver
                window.addEventListener('resize', function () {
                    if (_this8.manager) {
                        _this8.manager.resize(container.offsetWidth, container.offsetHeight, google.ima.ViewMode.NORMAL);
                    }
                });
            }

            /**
             * Initialize the adsManager and start playing advertisements
             */

        }, {
            key: 'play',
            value: function play() {
                var _this9 = this;

                var container = this.player.elements.container;


                if (!this.managerPromise) {
                    this.resumeContent();
                }

                // Play the requested advertisement whenever the adsManager is ready
                this.managerPromise.then(function () {
                    // Initialize the container. Must be done via a user action on mobile devices
                    _this9.elements.displayContainer.initialize();

                    try {
                        if (!_this9.initialized) {
                            // Initialize the ads manager. Ad rules playlist will start at this time
                            _this9.manager.init(container.offsetWidth, container.offsetHeight, google.ima.ViewMode.NORMAL);

                            // Call play to start showing the ad. Single video and overlay ads will
                            // start at this time; the call will be ignored for ad rules
                            _this9.manager.start();
                        }

                        _this9.initialized = true;
                    } catch (adError) {
                        // An error may be thrown if there was a problem with the
                        // VAST response
                        _this9.onAdError(adError);
                    }
                }).catch(function () {});
            }

            /**
             * Resume our video
             */

        }, {
            key: 'resumeContent',
            value: function resumeContent() {
                // Hide the advertisement container
                this.elements.container.style.zIndex = '';

                // Ad is stopped
                this.playing = false;

                // Play our video
                if (this.player.currentTime < this.player.duration) {
                    this.player.play();
                }
            }

            /**
             * Pause our video
             */

        }, {
            key: 'pauseContent',
            value: function pauseContent() {
                // Show the advertisement container
                this.elements.container.style.zIndex = 3;

                // Ad is playing.
                this.playing = true;

                // Pause our video.
                this.player.pause();
            }

            /**
             * Destroy the adsManager so we can grab new ads after this. If we don't then we're not
             * allowed to call new ads based on google policies, as they interpret this as an accidental
             * video requests. https://developers.google.com/interactive-
             * media-ads/docs/sdks/android/faq#8
             */

        }, {
            key: 'cancel',
            value: function cancel() {
                // Pause our video
                if (this.initialized) {
                    this.resumeContent();
                }

                // Tell our instance that we're done for now
                this.trigger('error');

                // Re-create our adsManager
                this.loadAds();
            }

            /**
             * Re-create our adsManager
             */

        }, {
            key: 'loadAds',
            value: function loadAds() {
                var _this10 = this;

                // Tell our adsManager to go bye bye
                this.managerPromise.then(function () {
                    // Destroy our adsManager
                    if (_this10.manager) {
                        _this10.manager.destroy();
                    }

                    // Re-set our adsManager promises
                    _this10.managerPromise = new Promise(function (resolve) {
                        _this10.on('loaded', resolve);
                        _this10.player.debug.log(_this10.manager);
                    });

                    // Now request some new advertisements
                    _this10.requestAds();
                }).catch(function () {});
            }

            /**
             * Handles callbacks after an ad event was invoked
             * @param {string} event - Event type
             */

        }, {
            key: 'trigger',
            value: function trigger(event) {
                var _this11 = this;

                for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
                    args[_key - 1] = arguments[_key];
                }

                var handlers = this.events[event];

                if (is.array(handlers)) {
                    handlers.forEach(function (handler) {
                        if (is.function(handler)) {
                            handler.apply(_this11, args);
                        }
                    });
                }
            }

            /**
             * Add event listeners
             * @param {string} event - Event type
             * @param {function} callback - Callback for when event occurs
             * @return {Ads}
             */

        }, {
            key: 'on',
            value: function on$$1(event, callback) {
                if (!is.array(this.events[event])) {
                    this.events[event] = [];
                }

                this.events[event].push(callback);

                return this;
            }

            /**
             * Setup a safety timer for when the ad network doesn't respond for whatever reason.
             * The advertisement has 12 seconds to get its things together. We stop this timer when the
             * advertisement is playing, or when a user action is required to start, then we clear the
             * timer on ad ready
             * @param {number} time
             * @param {string} from
             */

        }, {
            key: 'startSafetyTimer',
            value: function startSafetyTimer(time, from) {
                var _this12 = this;

                this.player.debug.log('Safety timer invoked from: ' + from);

                this.safetyTimer = setTimeout(function () {
                    _this12.cancel();
                    _this12.clearSafetyTimer('startSafetyTimer()');
                }, time);
            }

            /**
             * Clear our safety timer(s)
             * @param {string} from
             */

        }, {
            key: 'clearSafetyTimer',
            value: function clearSafetyTimer(from) {
                if (!is.nullOrUndefined(this.safetyTimer)) {
                    this.player.debug.log('Safety timer cleared from: ' + from);

                    clearTimeout(this.safetyTimer);
                    this.safetyTimer = null;
                }
            }
        }, {
            key: 'enabled',
            get: function get$$1() {
                return this.player.isVideo && this.player.config.ads.enabled && !is.empty(this.publisherId);
            }
        }, {
            key: 'tagUrl',
            get: function get$$1() {
                var params = {
                    AV_PUBLISHERID: '58c25bb0073ef448b1087ad6',
                    AV_CHANNELID: '5a0458dc28a06145e4519d21',
                    AV_URL: location.hostname,
                    cb: Date.now(),
                    AV_WIDTH: 640,
                    AV_HEIGHT: 480,
                    AV_CDIM2: this.publisherId
                };

                var base = 'https://go.aniview.com/api/adserver6/vast/';

                return base + '?' + buildUrlParams(params);
            }
        }]);
        return Ads;
    }();

    // ==========================================================================

    var source = {
        // Add elements to HTML5 media (source, tracks, etc)
        insertElements: function insertElements(type, attributes) {
            var _this = this;

            if (is.string(attributes)) {
                insertElement(type, this.media, {
                    src: attributes
                });
            } else if (is.array(attributes)) {
                attributes.forEach(function (attribute) {
                    insertElement(type, _this.media, attribute);
                });
            }
        },


        // Update source
        // Sources are not checked for support so be careful
        change: function change(input) {
            var _this2 = this;

            if (!getDeep(input, 'sources.length')) {
                this.debug.warn('Invalid source format');
                return;
            }

            // Cancel current network requests
            html5.cancelRequests.call(this);

            // Destroy instance and re-setup
            this.destroy.call(this, function () {
                // Reset quality options
                _this2.options.quality = [];

                // Remove elements
                removeElement(_this2.media);
                _this2.media = null;

                // Reset class name
                if (is.element(_this2.elements.container)) {
                    _this2.elements.container.removeAttribute('class');
                }

                // Set the type and provider
                var sources = input.sources,
                    type = input.type;

                var _sources = slicedToArray(sources, 1),
                    _sources$ = _sources[0],
                    _sources$$provider = _sources$.provider,
                    provider = _sources$$provider === undefined ? providers.html5 : _sources$$provider,
                    src = _sources$.src;

                var tagName = provider === 'html5' ? type : 'div';
                var attributes = provider === 'html5' ? {} : { src: src };

                Object.assign(_this2, {
                    provider: provider,
                    type: type,
                    // Check for support
                    supported: support.check(type, provider, _this2.config.playsinline),
                    // Create new element
                    media: createElement(tagName, attributes)
                });

                // Inject the new element
                _this2.elements.container.appendChild(_this2.media);

                // Autoplay the new source?
                if (is.boolean(input.autoplay)) {
                    _this2.config.autoplay = input.autoplay;
                }

                // Set attributes for audio and video
                if (_this2.isHTML5) {
                    if (_this2.config.crossorigin) {
                        _this2.media.setAttribute('crossorigin', '');
                    }
                    if (_this2.config.autoplay) {
                        _this2.media.setAttribute('autoplay', '');
                    }
                    if (!is.empty(input.poster)) {
                        _this2.poster = input.poster;
                    }
                    if (_this2.config.loop.active) {
                        _this2.media.setAttribute('loop', '');
                    }
                    if (_this2.config.muted) {
                        _this2.media.setAttribute('muted', '');
                    }
                    if (_this2.config.playsinline) {
                        _this2.media.setAttribute('playsinline', '');
                    }
                }

                // Restore class hook
                ui.addStyleHook.call(_this2);

                // Set new sources for html5
                if (_this2.isHTML5) {
                    source.insertElements.call(_this2, 'source', sources);
                }

                // Set video title
                _this2.config.title = input.title;

                // Set up from scratch
                media.setup.call(_this2);

                // HTML5 stuff
                if (_this2.isHTML5) {
                    // Setup captions
                    if ('tracks' in input) {
                        source.insertElements.call(_this2, 'track', input.tracks);
                    }

                    // Load HTML5 sources
                    _this2.media.load();
                }

                // If HTML5 or embed but not fully supported, setupInterface and call ready now
                if (_this2.isHTML5 || _this2.isEmbed && !_this2.supported.ui) {
                    // Setup interface
                    ui.build.call(_this2);
                }

                // Update the fullscreen support
                _this2.fullscreen.update();
            }, true);
        }
    };

    // ==========================================================================

    // Private properties
    // TODO: Use a WeakMap for private globals
    // const globals = new WeakMap();

    // Plyr instance

    var Plyr = function () {
        function Plyr(target, options) {
            var _this = this;

            classCallCheck(this, Plyr);

            this.timers = {};

            // State
            this.ready = false;
            this.loading = false;
            this.failed = false;

            // Touch device
            this.touch = support.touch;

            // Set the media element
            this.media = target;

            // String selector passed
            if (is.string(this.media)) {
                this.media = document.querySelectorAll(this.media);
            }

            // jQuery, NodeList or Array passed, use first element
            if (window.jQuery && this.media instanceof jQuery || is.nodeList(this.media) || is.array(this.media)) {
                // eslint-disable-next-line
                this.media = this.media[0];
            }

            // Set config
            this.config = extend({}, defaults$1, Plyr.defaults, options || {}, function () {
                try {
                    return JSON.parse(_this.media.getAttribute('data-plyr-config'));
                } catch (e) {
                    return {};
                }
            }());

            // Elements cache
            this.elements = {
                container: null,
                buttons: {},
                display: {},
                progress: {},
                inputs: {},
                settings: {
                    menu: null,
                    panes: {},
                    tabs: {}
                },
                captions: null
            };

            // Captions
            this.captions = {
                active: null,
                currentTrack: -1,
                meta: new WeakMap()
            };

            // Fullscreen
            this.fullscreen = {
                active: false
            };

            // Options
            this.options = {
                speed: [],
                quality: []
            };

            // Debugging
            // TODO: move to globals
            this.debug = new Console(this.config.debug);

            // Log config options and support
            this.debug.log('Config', this.config);
            this.debug.log('Support', support);

            // We need an element to setup
            if (is.nullOrUndefined(this.media) || !is.element(this.media)) {
                this.debug.error('Setup failed: no suitable element passed');
                return;
            }

            // Bail if the element is initialized
            if (this.media.plyr) {
                this.debug.warn('Target already setup');
                return;
            }

            // Bail if not enabled
            if (!this.config.enabled) {
                this.debug.error('Setup failed: disabled by config');
                return;
            }

            // Bail if disabled or no basic support
            // You may want to disable certain UAs etc
            if (!support.check().api) {
                this.debug.error('Setup failed: no support');
                return;
            }

            // Cache original element state for .destroy()
            var clone = this.media.cloneNode(true);
            clone.autoplay = false;
            this.elements.original = clone;

            // Set media type based on tag or data attribute
            // Supported: video, audio, vimeo, youtube
            var type = this.media.tagName.toLowerCase();

            // Embed properties
            var iframe = null;
            var url = null;

            // Different setup based on type
            switch (type) {
                case 'div':
                    // Find the frame
                    iframe = this.media.querySelector('iframe');

                    // <iframe> type
                    if (is.element(iframe)) {
                        // Detect provider
                        url = parseUrl(iframe.getAttribute('src'));
                        this.provider = getProviderByUrl(url.toString());

                        // Rework elements
                        this.elements.container = this.media;
                        this.media = iframe;

                        // Reset classname
                        this.elements.container.className = '';

                        // Get attributes from URL and set config
                        if (url.searchParams.length) {
                            var truthy = ['1', 'true'];

                            if (truthy.includes(url.searchParams.get('autoplay'))) {
                                this.config.autoplay = true;
                            }
                            if (truthy.includes(url.searchParams.get('loop'))) {
                                this.config.loop.active = true;
                            }

                            // TODO: replace fullscreen.iosNative with this playsinline config option
                            // YouTube requires the playsinline in the URL
                            if (this.isYouTube) {
                                this.config.playsinline = truthy.includes(url.searchParams.get('playsinline'));
                            } else {
                                this.config.playsinline = true;
                            }
                        }
                    } else {
                        // <div> with attributes
                        this.provider = this.media.getAttribute(this.config.attributes.embed.provider);

                        // Remove attribute
                        this.media.removeAttribute(this.config.attributes.embed.provider);
                    }

                    // Unsupported or missing provider
                    if (is.empty(this.provider) || !Object.keys(providers).includes(this.provider)) {
                        this.debug.error('Setup failed: Invalid provider');
                        return;
                    }

                    // Audio will come later for external providers
                    this.type = types.video;

                    break;

                case 'video':
                case 'audio':
                    this.type = type;
                    this.provider = providers.html5;

                    // Get config from attributes
                    if (this.media.hasAttribute('crossorigin')) {
                        this.config.crossorigin = true;
                    }
                    if (this.media.hasAttribute('autoplay')) {
                        this.config.autoplay = true;
                    }
                    if (this.media.hasAttribute('playsinline')) {
                        this.config.playsinline = true;
                    }
                    if (this.media.hasAttribute('muted')) {
                        this.config.muted = true;
                    }
                    if (this.media.hasAttribute('loop')) {
                        this.config.loop.active = true;
                    }

                    break;

                default:
                    this.debug.error('Setup failed: unsupported type');
                    return;
            }

            // Check for support again but with type
            this.supported = support.check(this.type, this.provider, this.config.playsinline);

            // If no support for even API, bail
            if (!this.supported.api) {
                this.debug.error('Setup failed: no support');
                return;
            }

            this.eventListeners = [];

            // Create listeners
            this.listeners = new Listeners(this);

            // Setup local storage for user settings
            this.storage = new Storage(this);

            // Store reference
            this.media.plyr = this;

            // Wrap media
            if (!is.element(this.elements.container)) {
                this.elements.container = createElement('div');
                wrap(this.media, this.elements.container);
            }

            // Add style hook
            ui.addStyleHook.call(this);

            // Setup media
            media.setup.call(this);

            // Listen for events if debugging
            if (this.config.debug) {
                on.call(this, this.elements.container, this.config.events.join(' '), function (event) {
                    _this.debug.log('event: ' + event.type);
                });
            }

            // Setup interface
            // If embed but not fully supported, build interface now to avoid flash of controls
            if (this.isHTML5 || this.isEmbed && !this.supported.ui) {
                ui.build.call(this);
            }

            // Container listeners
            this.listeners.container();

            // Global listeners
            this.listeners.global();

            // Setup fullscreen
            this.fullscreen = new Fullscreen(this);

            // Setup ads if provided
            this.ads = new Ads(this);

            // Autoplay if required
            if (this.config.autoplay) {
                this.play();
            }
        }

        // ---------------------------------------
        // API
        // ---------------------------------------

        /**
         * Types and provider helpers
         */


        createClass(Plyr, [{
            key: 'play',


            /**
             * Play the media, or play the advertisement (if they are not blocked)
             */
            value: function play() {
                if (!is.function(this.media.play)) {
                    return null;
                }

                // Return the promise (for HTML5)
                return this.media.play();
            }

            /**
             * Pause the media
             */

        }, {
            key: 'pause',
            value: function pause() {
                if (!this.playing || !is.function(this.media.pause)) {
                    return;
                }

                this.media.pause();
            }

            /**
             * Get playing state
             */

        }, {
            key: 'togglePlay',


            /**
             * Toggle playback based on current status
             * @param {boolean} input
             */
            value: function togglePlay(input) {
                // Toggle based on current state if nothing passed
                var toggle = is.boolean(input) ? input : !this.playing;

                if (toggle) {
                    this.play();
                } else {
                    this.pause();
                }
            }

            /**
             * Stop playback
             */

        }, {
            key: 'stop',
            value: function stop() {
                if (this.isHTML5) {
                    this.pause();
                    this.restart();
                } else if (is.function(this.media.stop)) {
                    this.media.stop();
                }
            }

            /**
             * Restart playback
             */

        }, {
            key: 'restart',
            value: function restart() {
                this.currentTime = 0;
            }

            /**
             * Rewind
             * @param {number} seekTime - how far to rewind in seconds. Defaults to the config.seekTime
             */

        }, {
            key: 'rewind',
            value: function rewind(seekTime) {
                this.currentTime = this.currentTime - (is.number(seekTime) ? seekTime : this.config.seekTime);
            }

            /**
             * Fast forward
             * @param {number} seekTime - how far to fast forward in seconds. Defaults to the config.seekTime
             */

        }, {
            key: 'forward',
            value: function forward(seekTime) {
                this.currentTime = this.currentTime + (is.number(seekTime) ? seekTime : this.config.seekTime);
            }

            /**
             * Seek to a time
             * @param {number} input - where to seek to in seconds. Defaults to 0 (the start)
             */

        }, {
            key: 'increaseVolume',


            /**
             * Increase volume
             * @param {boolean} step - How much to decrease by (between 0 and 1)
             */
            value: function increaseVolume(step) {
                var volume = this.media.muted ? 0 : this.volume;
                this.volume = volume + (is.number(step) ? step : 1);
            }

            /**
             * Decrease volume
             * @param {boolean} step - How much to decrease by (between 0 and 1)
             */

        }, {
            key: 'decreaseVolume',
            value: function decreaseVolume(step) {
                var volume = this.media.muted ? 0 : this.volume;
                this.volume = volume - (is.number(step) ? step : 1);
            }

            /**
             * Set muted state
             * @param {boolean} mute
             */

        }, {
            key: 'toggleCaptions',


            /**
             * Toggle captions
             * @param {boolean} input - Whether to enable captions
             */
            value: function toggleCaptions(input) {
                captions.toggle.call(this, input, false);
            }

            /**
             * Set the caption track by index
             * @param {number} - Caption index
             */

        }, {
            key: 'airplay',


            /**
             * Trigger the airplay dialog
             * TODO: update player with state, support, enabled
             */
            value: function airplay() {
                // Show dialog if supported
                if (support.airplay) {
                    this.media.webkitShowPlaybackTargetPicker();
                }
            }

            /**
             * Toggle the player controls
             * @param {boolean} [toggle] - Whether to show the controls
             */

        }, {
            key: 'toggleControls',
            value: function toggleControls(toggle) {
                // Don't toggle if missing UI support or if it's audio
                if (this.supported.ui && !this.isAudio) {
                    // Get state before change
                    var isHidden = hasClass(this.elements.container, this.config.classNames.hideControls);

                    // Negate the argument if not undefined since adding the class to hides the controls
                    var force = typeof toggle === 'undefined' ? undefined : !toggle;

                    // Apply and get updated state
                    var hiding = toggleClass(this.elements.container, this.config.classNames.hideControls, force);

                    // Close menu
                    if (hiding && this.config.controls.includes('settings') && !is.empty(this.config.settings)) {
                        controls.toggleMenu.call(this, false);
                    }
                    // Trigger event on change
                    if (hiding !== isHidden) {
                        var eventName = hiding ? 'controlshidden' : 'controlsshown';
                        triggerEvent.call(this, this.media, eventName);
                    }
                    return !hiding;
                }
                return false;
            }

            /**
             * Add event listeners
             * @param {string} event - Event type
             * @param {function} callback - Callback for when event occurs
             */

        }, {
            key: 'on',
            value: function on$$1(event, callback) {
                on.call(this, this.elements.container, event, callback);
            }
            /**
             * Add event listeners once
             * @param {string} event - Event type
             * @param {function} callback - Callback for when event occurs
             */

        }, {
            key: 'once',
            value: function once$$1(event, callback) {
                once.call(this, this.elements.container, event, callback);
            }
            /**
             * Remove event listeners
             * @param {string} event - Event type
             * @param {function} callback - Callback for when event occurs
             */

        }, {
            key: 'off',
            value: function off$$1(event, callback) {
                off(this.elements.container, event, callback);
            }

            /**
             * Destroy an instance
             * Event listeners are removed when elements are removed
             * http://stackoverflow.com/questions/12528049/if-a-dom-element-is-removed-are-its-listeners-also-removed-from-memory
             * @param {function} callback - Callback for when destroy is complete
             * @param {boolean} soft - Whether it's a soft destroy (for source changes etc)
             */

        }, {
            key: 'destroy',
            value: function destroy(callback) {
                var _this2 = this;

                var soft = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;

                if (!this.ready) {
                    return;
                }

                var done = function done() {
                    // Reset overflow (incase destroyed while in fullscreen)
                    document.body.style.overflow = '';

                    // GC for embed
                    _this2.embed = null;

                    // If it's a soft destroy, make minimal changes
                    if (soft) {
                        if (Object.keys(_this2.elements).length) {
                            // Remove elements
                            removeElement(_this2.elements.buttons.play);
                            removeElement(_this2.elements.captions);
                            removeElement(_this2.elements.controls);
                            removeElement(_this2.elements.wrapper);

                            // Clear for GC
                            _this2.elements.buttons.play = null;
                            _this2.elements.captions = null;
                            _this2.elements.controls = null;
                            _this2.elements.wrapper = null;
                        }

                        // Callback
                        if (is.function(callback)) {
                            callback();
                        }
                    } else {
                        // Unbind listeners
                        unbindListeners.call(_this2);

                        // Replace the container with the original element provided
                        replaceElement(_this2.elements.original, _this2.elements.container);

                        // Event
                        triggerEvent.call(_this2, _this2.elements.original, 'destroyed', true);

                        // Callback
                        if (is.function(callback)) {
                            callback.call(_this2.elements.original);
                        }

                        // Reset state
                        _this2.ready = false;

                        // Clear for garbage collection
                        setTimeout(function () {
                            _this2.elements = null;
                            _this2.media = null;
                        }, 200);
                    }
                };

                // Stop playback
                this.stop();

                // Provider specific stuff
                if (this.isHTML5) {
                    // Clear timeout
                    clearTimeout(this.timers.loading);

                    // Restore native video controls
                    ui.toggleNativeControls.call(this, true);

                    // Clean up
                    done();
                } else if (this.isYouTube) {
                    // Clear timers
                    clearInterval(this.timers.buffering);
                    clearInterval(this.timers.playing);

                    // Destroy YouTube API
                    if (this.embed !== null && is.function(this.embed.destroy)) {
                        this.embed.destroy();
                    }

                    // Clean up
                    done();
                } else if (this.isVimeo) {
                    // Destroy Vimeo API
                    // then clean up (wait, to prevent postmessage errors)
                    if (this.embed !== null) {
                        this.embed.unload().then(done);
                    }

                    // Vimeo does not always return
                    setTimeout(done, 200);
                }
            }

            /**
             * Check for support for a mime type (HTML5 only)
             * @param {string} type - Mime type
             */

        }, {
            key: 'supports',
            value: function supports(type) {
                return support.mime.call(this, type);
            }

            /**
             * Check for support
             * @param {string} type - Player type (audio/video)
             * @param {string} provider - Provider (html5/youtube/vimeo)
             * @param {bool} inline - Where player has `playsinline` sttribute
             */

        }, {
            key: 'isHTML5',
            get: function get$$1() {
                return Boolean(this.provider === providers.html5);
            }
        }, {
            key: 'isEmbed',
            get: function get$$1() {
                return Boolean(this.isYouTube || this.isVimeo);
            }
        }, {
            key: 'isYouTube',
            get: function get$$1() {
                return Boolean(this.provider === providers.youtube);
            }
        }, {
            key: 'isVimeo',
            get: function get$$1() {
                return Boolean(this.provider === providers.vimeo);
            }
        }, {
            key: 'isVideo',
            get: function get$$1() {
                return Boolean(this.type === types.video);
            }
        }, {
            key: 'isAudio',
            get: function get$$1() {
                return Boolean(this.type === types.audio);
            }
        }, {
            key: 'playing',
            get: function get$$1() {
                return Boolean(this.ready && !this.paused && !this.ended);
            }

            /**
             * Get paused state
             */

        }, {
            key: 'paused',
            get: function get$$1() {
                return Boolean(this.media.paused);
            }

            /**
             * Get stopped state
             */

        }, {
            key: 'stopped',
            get: function get$$1() {
                return Boolean(this.paused && this.currentTime === 0);
            }

            /**
             * Get ended state
             */

        }, {
            key: 'ended',
            get: function get$$1() {
                return Boolean(this.media.ended);
            }
        }, {
            key: 'currentTime',
            set: function set$$1(input) {
                // Bail if media duration isn't available yet
                if (!this.duration) {
                    return;
                }

                // Validate input
                var inputIsValid = is.number(input) && input > 0;

                // Set
                this.media.currentTime = inputIsValid ? Math.min(input, this.duration) : 0;

                // Logging
                this.debug.log('Seeking to ' + this.currentTime + ' seconds');
            }

            /**
             * Get current time
             */
            ,
            get: function get$$1() {
                return Number(this.media.currentTime);
            }

            /**
             * Get buffered
             */

        }, {
            key: 'buffered',
            get: function get$$1() {
                var buffered = this.media.buffered;

                // YouTube / Vimeo return a float between 0-1

                if (is.number(buffered)) {
                    return buffered;
                }

                // HTML5
                // TODO: Handle buffered chunks of the media
                // (i.e. seek to another section buffers only that section)
                if (buffered && buffered.length && this.duration > 0) {
                    return buffered.end(0) / this.duration;
                }

                return 0;
            }

            /**
             * Get seeking status
             */

        }, {
            key: 'seeking',
            get: function get$$1() {
                return Boolean(this.media.seeking);
            }

            /**
             * Get the duration of the current media
             */

        }, {
            key: 'duration',
            get: function get$$1() {
                // Faux duration set via config
                var fauxDuration = parseFloat(this.config.duration);

                // Media duration can be NaN before the media has loaded
                var duration = (this.media || {}).duration || 0;

                // If config duration is funky, use regular duration
                return fauxDuration || duration;
            }

            /**
             * Set the player volume
             * @param {number} value - must be between 0 and 1. Defaults to the value from local storage and config.volume if not set in storage
             */

        }, {
            key: 'volume',
            set: function set$$1(value) {
                var volume = value;
                var max = 1;
                var min = 0;

                if (is.string(volume)) {
                    volume = Number(volume);
                }

                // Load volume from storage if no value specified
                if (!is.number(volume)) {
                    volume = this.storage.get('volume');
                }

                // Use config if all else fails
                if (!is.number(volume)) {
                    volume = this.config.volume;
                }

                // Maximum is volumeMax
                if (volume > max) {
                    volume = max;
                }
                // Minimum is volumeMin
                if (volume < min) {
                    volume = min;
                }

                // Update config
                this.config.volume = volume;

                // Set the player volume
                this.media.volume = volume;

                // If muted, and we're increasing volume manually, reset muted state
                if (!is.empty(value) && this.muted && volume > 0) {
                    this.muted = false;
                }
            }

            /**
             * Get the current player volume
             */
            ,
            get: function get$$1() {
                return Number(this.media.volume);
            }
        }, {
            key: 'muted',
            set: function set$$1(mute) {
                var toggle = mute;

                // Load muted state from storage
                if (!is.boolean(toggle)) {
                    toggle = this.storage.get('muted');
                }

                // Use config if all else fails
                if (!is.boolean(toggle)) {
                    toggle = this.config.muted;
                }

                // Update config
                this.config.muted = toggle;

                // Set mute on the player
                this.media.muted = toggle;
            }

            /**
             * Get current muted state
             */
            ,
            get: function get$$1() {
                return Boolean(this.media.muted);
            }

            /**
             * Check if the media has audio
             */

        }, {
            key: 'hasAudio',
            get: function get$$1() {
                // Assume yes for all non HTML5 (as we can't tell...)
                if (!this.isHTML5) {
                    return true;
                }

                if (this.isAudio) {
                    return true;
                }

                // Get audio tracks
                return Boolean(this.media.mozHasAudio) || Boolean(this.media.webkitAudioDecodedByteCount) || Boolean(this.media.audioTracks && this.media.audioTracks.length);
            }

            /**
             * Set playback speed
             * @param {number} speed - the speed of playback (0.5-2.0)
             */

        }, {
            key: 'speed',
            set: function set$$1(input) {
                var speed = null;

                if (is.number(input)) {
                    speed = input;
                }

                if (!is.number(speed)) {
                    speed = this.storage.get('speed');
                }

                if (!is.number(speed)) {
                    speed = this.config.speed.selected;
                }

                // Set min/max
                if (speed < 0.1) {
                    speed = 0.1;
                }
                if (speed > 2.0) {
                    speed = 2.0;
                }

                if (!this.config.speed.options.includes(speed)) {
                    this.debug.warn('Unsupported speed (' + speed + ')');
                    return;
                }

                // Update config
                this.config.speed.selected = speed;

                // Set media speed
                this.media.playbackRate = speed;
            }

            /**
             * Get current playback speed
             */
            ,
            get: function get$$1() {
                return Number(this.media.playbackRate);
            }

            /**
             * Set playback quality
             * Currently HTML5 & YouTube only
             * @param {number} input - Quality level
             */

        }, {
            key: 'quality',
            set: function set$$1(input) {
                var config = this.config.quality;
                var options = this.options.quality;

                if (!options.length) {
                    return;
                }

                var quality = [!is.empty(input) && Number(input), this.storage.get('quality'), config.selected, config.default].find(is.number);

                if (!options.includes(quality)) {
                    var value = closest(options, quality);
                    this.debug.warn('Unsupported quality option: ' + quality + ', using ' + value + ' instead');
                    quality = value;
                }

                // Trigger request event
                triggerEvent.call(this, this.media, 'qualityrequested', false, { quality: quality });

                // Update config
                config.selected = quality;

                // Set quality
                this.media.quality = quality;
            }

            /**
             * Get current quality level
             */
            ,
            get: function get$$1() {
                return this.media.quality;
            }

            /**
             * Toggle loop
             * TODO: Finish fancy new logic. Set the indicator on load as user may pass loop as config
             * @param {boolean} input - Whether to loop or not
             */

        }, {
            key: 'loop',
            set: function set$$1(input) {
                var toggle = is.boolean(input) ? input : this.config.loop.active;
                this.config.loop.active = toggle;
                this.media.loop = toggle;

                // Set default to be a true toggle
                /* const type = ['start', 'end', 'all', 'none', 'toggle'].includes(input) ? input : 'toggle';
                 switch (type) {
                    case 'start':
                        if (this.config.loop.end && this.config.loop.end <= this.currentTime) {
                            this.config.loop.end = null;
                        }
                        this.config.loop.start = this.currentTime;
                        // this.config.loop.indicator.start = this.elements.display.played.value;
                        break;
                     case 'end':
                        if (this.config.loop.start >= this.currentTime) {
                            return this;
                        }
                        this.config.loop.end = this.currentTime;
                        // this.config.loop.indicator.end = this.elements.display.played.value;
                        break;
                     case 'all':
                        this.config.loop.start = 0;
                        this.config.loop.end = this.duration - 2;
                        this.config.loop.indicator.start = 0;
                        this.config.loop.indicator.end = 100;
                        break;
                     case 'toggle':
                        if (this.config.loop.active) {
                            this.config.loop.start = 0;
                            this.config.loop.end = null;
                        } else {
                            this.config.loop.start = 0;
                            this.config.loop.end = this.duration - 2;
                        }
                        break;
                     default:
                        this.config.loop.start = 0;
                        this.config.loop.end = null;
                        break;
                } */
            }

            /**
             * Get current loop state
             */
            ,
            get: function get$$1() {
                return Boolean(this.media.loop);
            }

            /**
             * Set new media source
             * @param {object} input - The new source object (see docs)
             */

        }, {
            key: 'source',
            set: function set$$1(input) {
                source.change.call(this, input);
            }

            /**
             * Get current source
             */
            ,
            get: function get$$1() {
                return this.media.currentSrc;
            }

            /**
             * Set the poster image for a video
             * @param {input} - the URL for the new poster image
             */

        }, {
            key: 'poster',
            set: function set$$1(input) {
                if (!this.isVideo) {
                    this.debug.warn('Poster can only be set for video');
                    return;
                }

                ui.setPoster.call(this, input, false).catch(function () {});
            }

            /**
             * Get the current poster image
             */
            ,
            get: function get$$1() {
                if (!this.isVideo) {
                    return null;
                }

                return this.media.getAttribute('poster');
            }

            /**
             * Set the autoplay state
             * @param {boolean} input - Whether to autoplay or not
             */

        }, {
            key: 'autoplay',
            set: function set$$1(input) {
                var toggle = is.boolean(input) ? input : this.config.autoplay;
                this.config.autoplay = toggle;
            }

            /**
             * Get the current autoplay state
             */
            ,
            get: function get$$1() {
                return Boolean(this.config.autoplay);
            }
        }, {
            key: 'currentTrack',
            set: function set$$1(input) {
                captions.set.call(this, input, false);
            }

            /**
             * Get the current caption track index (-1 if disabled)
             */
            ,
            get: function get$$1() {
                var _captions = this.captions,
                    toggled = _captions.toggled,
                    currentTrack = _captions.currentTrack;

                return toggled ? currentTrack : -1;
            }

            /**
             * Set the wanted language for captions
             * Since tracks can be added later it won't update the actual caption track until there is a matching track
             * @param {string} - Two character ISO language code (e.g. EN, FR, PT, etc)
             */

        }, {
            key: 'language',
            set: function set$$1(input) {
                captions.setLanguage.call(this, input, false);
            }

            /**
             * Get the current track's language
             */
            ,
            get: function get$$1() {
                return (captions.getCurrentTrack.call(this) || {}).language;
            }

            /**
             * Toggle picture-in-picture playback on WebKit/MacOS
             * TODO: update player with state, support, enabled
             * TODO: detect outside changes
             */

        }, {
            key: 'pip',
            set: function set$$1(input) {
                var states = {
                    pip: 'picture-in-picture',
                    inline: 'inline'
                };

                // Bail if no support
                if (!support.pip) {
                    return;
                }

                // Toggle based on current state if not passed
                var toggle = is.boolean(input) ? input : this.pip === states.inline;

                // Toggle based on current state
                this.media.webkitSetPresentationMode(toggle ? states.pip : states.inline);
            }

            /**
             * Get the current picture-in-picture state
             */
            ,
            get: function get$$1() {
                if (!support.pip) {
                    return null;
                }

                return this.media.webkitPresentationMode;
            }
        }], [{
            key: 'supported',
            value: function supported(type, provider, inline) {
                return support.check(type, provider, inline);
            }

            /**
             * Load an SVG sprite into the page
             * @param {string} url - URL for the SVG sprite
             * @param {string} [id] - Unique ID
             */

        }, {
            key: 'loadSprite',
            value: function loadSprite$$1(url, id) {
                return loadSprite(url, id);
            }

            /**
             * Setup multiple instances
             * @param {*} selector
             * @param {object} options
             */

        }, {
            key: 'setup',
            value: function setup(selector) {
                var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

                var targets = null;

                if (is.string(selector)) {
                    targets = Array.from(document.querySelectorAll(selector));
                } else if (is.nodeList(selector)) {
                    targets = Array.from(selector);
                } else if (is.array(selector)) {
                    targets = selector.filter(is.element);
                }

                if (is.empty(targets)) {
                    return null;
                }

                return targets.map(function (t) {
                    return new Plyr(t, options);
                });
            }
        }]);
        return Plyr;
    }();

    Plyr.defaults = cloneDeep(defaults$1);

    return Plyr;

})));

//# sourceMappingURL=plyr.js.map
