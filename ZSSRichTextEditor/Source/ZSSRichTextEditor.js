window.zss_editor        = {};
var NBSP_CHAR            = String.fromCharCode(160);
var ZERO_WIDTH_NBSP_CHAR = '\ufeff';

(function () {

    "use strict";
    var EditableCaret, InputCaret, Mirror, Utils, discoveryIframeOf, methods, oDocument, oFrame, oWindow, pluginName, setContextBy;

    pluginName = 'caret';

    EditableCaret = (function () {
        function EditableCaret ( $inputor ) {
            this.$inputor   = $inputor;
            this.domInputor = this.$inputor[ 0 ];
        }

        EditableCaret.prototype.setPos = function ( pos ) {
            var fn, found, offset, sel;
            if ( sel = oWindow.getSelection() ) {
                offset = 0;
                found  = false;
                (fn = function ( pos, parent ) {
                    var node, range, _i, _len, _ref, _results;
                    _ref     = parent.childNodes;
                    _results = [];
                    for ( _i = 0, _len = _ref.length; _i < _len; _i++ ) {
                        node = _ref[ _i ];
                        if ( found ) {
                            break;
                        }
                        if ( node.nodeType === 3 ) {
                            if ( offset + node.length >= pos ) {
                                found = true;
                                range = oDocument.createRange();
                                range.setStart(node, pos - offset);
                                sel.removeAllRanges();
                                sel.addRange(range);
                                break;
                            } else {
                                _results.push(offset += node.length);
                            }
                        } else {
                            _results.push(fn(pos, node));
                        }
                    }
                    return _results;
                })(pos, this.domInputor);
            }
            return this.domInputor;
        };

        EditableCaret.prototype.getIEPosition = function () {
            return this.getPosition();
        };

        EditableCaret.prototype.getPosition = function () {
            var inputor_offset, offset;
            offset         = this.getOffset();
            inputor_offset = this.$inputor.offset();
            offset.left -= inputor_offset.left;
            offset.top -= inputor_offset.top;
            return offset;
        };

        EditableCaret.prototype.getOldIEPos = function () {
            var preCaretTextRange, textRange;
            textRange         = oDocument.selection.createRange();
            preCaretTextRange = oDocument.body.createTextRange();
            preCaretTextRange.moveToElementText(this.domInputor);
            preCaretTextRange.setEndPoint("EndToEnd", textRange);
            return preCaretTextRange.text.length;
        };

        EditableCaret.prototype.getPos = function () {
            var clonedRange, pos, range;
            if ( range = this.range() ) {
                clonedRange = range.cloneRange();
                clonedRange.selectNodeContents(this.domInputor);
                clonedRange.setEnd(range.endContainer, range.endOffset);
                pos = clonedRange.toString().length;
                clonedRange.detach();
                return pos;
            } else if ( oDocument.selection ) {
                return this.getOldIEPos();
            }
        };

        EditableCaret.prototype.getOldIEOffset = function () {
            var range, rect;
            range = oDocument.selection.createRange().duplicate();
            range.moveStart("character", -1);
            rect = range.getBoundingClientRect();
            return {
                height: rect.bottom - rect.top,
                left  : rect.left,
                top   : rect.top
            };
        };

        EditableCaret.prototype.getOffset = function ( pos ) {
            var clonedRange, offset, range, rect, shadowCaret;
            if ( oWindow.getSelection && (range = this.range()) ) {
                if ( range.endOffset - 1 > 0 && range.endContainer === !this.domInputor ) {
                    clonedRange = range.cloneRange();
                    clonedRange.setStart(range.endContainer, range.endOffset - 1);
                    clonedRange.setEnd(range.endContainer, range.endOffset);
                    rect   = clonedRange.getBoundingClientRect();
                    offset = {
                        height: rect.height,
                        left  : rect.left + rect.width,
                        top   : rect.top
                    };
                    clonedRange.detach();
                }
                if ( !offset || (offset != null ? offset.height : void 0) === 0 ) {
                    clonedRange = range.cloneRange();
                    shadowCaret = $(oDocument.createTextNode("|"));
                    clonedRange.insertNode(shadowCaret[ 0 ]);
                    clonedRange.selectNode(shadowCaret[ 0 ]);
                    rect   = clonedRange.getBoundingClientRect();
                    offset = {
                        height: rect.height,
                        left  : rect.left,
                        top   : rect.top
                    };
                    shadowCaret.remove();
                    clonedRange.detach();
                }
            } else if ( oDocument.selection ) {
                offset = this.getOldIEOffset();
            }
            if ( offset ) {
                offset.top += $(oWindow).scrollTop();
                offset.left += $(oWindow).scrollLeft();
            }
            return offset;
        };

        EditableCaret.prototype.range = function () {
            var sel;
            if ( !oWindow.getSelection ) {
                return;
            }
            sel = oWindow.getSelection();
            if ( sel.rangeCount > 0 ) {
                return sel.getRangeAt(0);
            } else {
                return null;
            }
        };

        return EditableCaret;

    })();

    InputCaret = (function () {
        function InputCaret ( $inputor ) {
            this.$inputor   = $inputor;
            this.domInputor = this.$inputor[ 0 ];
        }

        InputCaret.prototype.getIEPos = function () {
            var endRange, inputor, len, normalizedValue, pos, range, textInputRange;
            inputor = this.domInputor;
            range   = oDocument.selection.createRange();
            pos     = 0;
            if ( range && range.parentElement() === inputor ) {
                normalizedValue = inputor.value.replace(/\r\n/g, "\n");
                len             = normalizedValue.length;
                textInputRange  = inputor.createTextRange();
                textInputRange.moveToBookmark(range.getBookmark());
                endRange = inputor.createTextRange();
                endRange.collapse(false);
                if ( textInputRange.compareEndPoints("StartToEnd", endRange) > -1 ) {
                    pos = len;
                } else {
                    pos = -textInputRange.moveStart("character", -len);
                }
            }
            return pos;
        };

        InputCaret.prototype.getPos = function () {
            if ( oDocument.selection ) {
                return this.getIEPos();
            } else {
                return this.domInputor.selectionStart;
            }
        };

        InputCaret.prototype.setPos = function ( pos ) {
            var inputor, range;
            inputor = this.domInputor;
            if ( oDocument.selection ) {
                range = inputor.createTextRange();
                range.move("character", pos);
                range.select();
            } else if ( inputor.setSelectionRange ) {
                inputor.setSelectionRange(pos, pos);
            }
            return inputor;
        };

        InputCaret.prototype.getIEOffset = function ( pos ) {
            var h, textRange, x, y;
            textRange = this.domInputor.createTextRange();
            pos || (pos = this.getPos());
            textRange.move('character', pos);
            x = textRange.boundingLeft;
            y = textRange.boundingTop;
            h = textRange.boundingHeight;
            return {
                left  : x,
                top   : y,
                height: h
            };
        };

        InputCaret.prototype.getOffset = function ( pos ) {
            var $inputor, offset, position;
            $inputor = this.$inputor;
            if ( oDocument.selection ) {
                offset = this.getIEOffset(pos);
                offset.top += $(oWindow).scrollTop() + $inputor.scrollTop();
                offset.left += $(oWindow).scrollLeft() + $inputor.scrollLeft();
                return offset;
            } else {
                offset   = $inputor.offset();
                position = this.getPosition(pos);
                return offset = {
                    left  : offset.left + position.left - $inputor.scrollLeft(),
                    top   : offset.top + position.top - $inputor.scrollTop(),
                    height: position.height
                };
            }
        };

        InputCaret.prototype.getPosition = function ( pos ) {
            var $inputor, at_rect, end_range, format, html, mirror, start_range;
            $inputor = this.$inputor;
            format   = function ( value ) {
                value = value.replace(/<|>|`|"|&/g, '?').replace(/\r\n|\r|\n/g, "<br/>");
                if ( /firefox/i.test(navigator.userAgent) ) {
                    value = value.replace(/\s/g, '&nbsp;');
                }
                return value;
            };
            if ( pos === void 0 ) {
                pos = this.getPos();
            }
            start_range = $inputor.val().slice(0, pos);
            end_range   = $inputor.val().slice(pos);
            html        = "<span style='position: relative; display: inline;'>" + format(start_range) + "</span>";
            html += "<span id='caret' style='position: relative; display: inline;'>|</span>";
            html += "<span style='position: relative; display: inline;'>" + format(end_range) + "</span>";
            mirror      = new Mirror($inputor);
            return at_rect = mirror.create(html).rect();
        };

        InputCaret.prototype.getIEPosition = function ( pos ) {
            var h, inputorOffset, offset, x, y;
            offset        = this.getIEOffset(pos);
            inputorOffset = this.$inputor.offset();
            x             = offset.left - inputorOffset.left;
            y             = offset.top - inputorOffset.top;
            h             = offset.height;
            return {
                left  : x,
                top   : y,
                height: h
            };
        };

        return InputCaret;

    })();

    Mirror = (function () {
        Mirror.prototype.css_attr = [ "borderBottomWidth", "borderLeftWidth", "borderRightWidth", "borderTopStyle", "borderRightStyle", "borderBottomStyle", "borderLeftStyle", "borderTopWidth", "boxSizing", "fontFamily", "fontSize", "fontWeight", "height", "letterSpacing", "lineHeight", "marginBottom", "marginLeft", "marginRight", "marginTop", "outlineWidth", "overflow", "overflowX", "overflowY", "paddingBottom", "paddingLeft", "paddingRight", "paddingTop", "textAlign", "textOverflow", "textTransform", "whiteSpace", "wordBreak", "wordWrap" ];

        function Mirror ( $inputor ) {
            this.$inputor = $inputor;
        }

        Mirror.prototype.mirrorCss = function () {
            var css,
                _this = this;
            css       = {
                position: 'absolute',
                left    : -9999,
                top     : 0,
                zIndex  : -20000
            };
            if ( this.$inputor.prop('tagName') === 'TEXTAREA' ) {
                this.css_attr.push('width');
            }
            $.each(this.css_attr, function ( i, p ) {
                return css[ p ] = _this.$inputor.css(p);
            });
            return css;
        };

        Mirror.prototype.create = function ( html ) {
            this.$mirror = $('<div></div>');
            this.$mirror.css(this.mirrorCss());
            this.$mirror.html(html);
            this.$inputor.after(this.$mirror);
            return this;
        };

        Mirror.prototype.rect = function () {
            var $flag, pos, rect;
            $flag = this.$mirror.find("#caret");
            pos   = $flag.position();
            rect  = {
                left  : pos.left,
                top   : pos.top,
                height: $flag.height()
            };
            this.$mirror.remove();
            return rect;
        };

        return Mirror;

    })();

    Utils = {
        contentEditable: function ( $inputor ) {
            return !!($inputor[ 0 ].contentEditable && $inputor[ 0 ].contentEditable === 'true');
        }
    };

    methods = {
        pos     : function ( pos ) {
            if ( pos || pos === 0 ) {
                return this.setPos(pos);
            } else {
                return this.getPos();
            }
        },
        position: function ( pos ) {
            if ( oDocument.selection ) {
                return this.getIEPosition(pos);
            } else {
                return this.getPosition(pos);
            }
        },
        offset  : function ( pos ) {
            var offset;
            offset = this.getOffset(pos);
            return offset;
        }
    };

    oDocument = null;

    oWindow = null;

    oFrame = null;

    setContextBy = function ( settings ) {
        var iframe;
        if ( iframe = settings != null ? settings.iframe : void 0 ) {
            oFrame  = iframe;
            oWindow = iframe.contentWindow;
            return oDocument = iframe.contentDocument || oWindow.document;
        } else {
            oFrame  = void 0;
            oWindow = window;
            return oDocument = document;
        }
    };


    $.fn.caret = function ( method, value, settings ) {
        var caret;
        if ( methods[ method ] ) {
            if ( $.isPlainObject(value) ) {
                setContextBy(value);
                value = void 0;
            } else {
                setContextBy(settings);
            }
            caret = Utils.contentEditable(this) ? new EditableCaret(this) : new InputCaret(this);
            return methods[ method ].apply(caret, [ value ]);
        } else {
            return $.error("Method " + method + " does not exist on jQuery.caret");
        }
    };

    $.fn.caret.EditableCaret = EditableCaret;

    $.fn.caret.InputCaret = InputCaret;

    $.fn.caret.Utils = Utils;

    $.fn.caret.apis = methods;

}());

/**
 * @class core.list
 *
 * list utils
 *
 * @singleton
 * @alternateClassName list
 */
var list = (function () {
    /**
     * returns the first item of an array.
     *
     * @param {Array} array
     */
    var head = function ( array ) {
        return array[ 0 ];
    };

    /**
     * returns the last item of an array.
     *
     * @param {Array} array
     */
    var last = function ( array ) {
        return array[ array.length - 1 ];
    };

    /**
     * returns everything but the last entry of the array.
     *
     * @param {Array} array
     */
    var initial = function ( array ) {
        return array.slice(0, array.length - 1);
    };

    /**
     * returns the rest of the items in an array.
     *
     * @param {Array} array
     */
    var tail = function ( array ) {
        return array.slice(1);
    };

    /**
     * returns item of array
     */
    var find = function ( array, pred ) {
        for ( var idx = 0, len = array.length; idx < len; idx++ ) {
            var item = array[ idx ];
            if ( pred(item) ) {
                return item;
            }
        }
    };

    /**
     * returns true if all of the values in the array pass the predicate truth test.
     */
    var all = function ( array, pred ) {
        for ( var idx = 0, len = array.length; idx < len; idx++ ) {
            if ( !pred(array[ idx ]) ) {
                return false;
            }
        }
        return true;
    };

    /**
     * returns index of item
     */
    var indexOf = function ( array, item ) {
        return $.inArray(item, array);
    };

    /**
     * returns true if the value is present in the list.
     */
    var contains = function ( array, item ) {
        return indexOf(array, item) !== -1;
    };

    /**
     * get sum from a list
     *
     * @param {Array} array - array
     * @param {Function} fn - iterator
     */
    var sum = function ( array, fn ) {
        fn = fn || func.self;
        return array.reduce(function ( memo, v ) {
            return memo + fn(v);
        }, 0);
    };

    /**
     * returns a copy of the collection with array type.
     * @param {Collection} collection - collection eg) node.childNodes, ...
     */
    var from = function ( collection ) {
        var result = [], idx = -1, length = collection.length;
        while ( ++idx < length ) {
            result[ idx ] = collection[ idx ];
        }
        return result;
    };

    /**
     * returns whether list is empty or not
     */
    var isEmpty = function ( array ) {
        return !array || !array.length;
    };

    /**
     * cluster elements by predicate function.
     *
     * @param {Array} array - array
     * @param {Function} fn - predicate function for cluster rule
     * @param {Array[]}
     */
    var clusterBy = function ( array, fn ) {
        if ( !array.length ) {
            return [];
        }
        var aTail = tail(array);
        return aTail.reduce(function ( memo, v ) {
            var aLast = last(memo);
            if ( fn(last(aLast), v) ) {
                aLast[ aLast.length ] = v;
            } else {
                memo[ memo.length ] = [ v ];
            }
            return memo;
        }, [ [ head(array) ] ]);
    };

    /**
     * returns a copy of the array with all falsy values removed
     *
     * @param {Array} array - array
     * @param {Function} fn - predicate function for cluster rule
     */
    var compact = function ( array ) {
        var aResult = [];
        for ( var idx = 0, len = array.length; idx < len; idx++ ) {
            if ( array[ idx ] ) {
                aResult.push(array[ idx ]);
            }
        }
        return aResult;
    };

    /**
     * produces a duplicate-free version of the array
     *
     * @param {Array} array
     */
    var unique = function ( array ) {
        var results = [];

        for ( var idx = 0, len = array.length; idx < len; idx++ ) {
            if ( !contains(results, array[ idx ]) ) {
                results.push(array[ idx ]);
            }
        }

        return results;
    };

    /**
     * returns next item.
     * @param {Array} array
     */
    var next = function ( array, item ) {
        var idx = indexOf(array, item);
        if ( idx === -1 ) {
            return null;
        }

        return array[ idx + 1 ];
    };

    /**
     * returns prev item.
     * @param {Array} array
     */
    var prev = function ( array, item ) {
        var idx = indexOf(array, item);
        if ( idx === -1 ) {
            return null;
        }

        return array[ idx - 1 ];
    };

    return {
        head     : head,
        last     : last,
        initial  : initial,
        tail     : tail,
        prev     : prev,
        next     : next,
        find     : find,
        contains : contains,
        all      : all,
        sum      : sum,
        from     : from,
        isEmpty  : isEmpty,
        clusterBy: clusterBy,
        compact  : compact,
        unique   : unique
    };
})();

/**
 * @class core.func
 *
 * func utils (for high-order func's arg)
 *
 * @singleton
 * @alternateClassName func
 */
var func = (function () {
    var eq = function ( itemA ) {
        return function ( itemB ) {
            return itemA === itemB;
        };
    };

    var eq2 = function ( itemA, itemB ) {
        return itemA === itemB;
    };

    var peq2 = function ( propName ) {
        return function ( itemA, itemB ) {
            return itemA[ propName ] === itemB[ propName ];
        };
    };

    var ok = function () {
        return true;
    };

    var fail = function () {
        return false;
    };

    var not = function ( f ) {
        return function () {
            return !f.apply(f, arguments);
        };
    };

    var and = function ( fA, fB ) {
        return function ( item ) {
            return fA(item) && fB(item);
        };
    };

    var self = function ( a ) {
        return a;
    };

    var invoke = function ( obj, method ) {
        return function () {
            return obj[ method ].apply(obj, arguments);
        };
    };

    var idCounter = 0;

    /**
     * generate a globally-unique id
     *
     * @param {String} [prefix]
     */
    var uniqueId = function ( prefix ) {
        var id = ++idCounter + '';
        return prefix ? prefix + id : id;
    };

    /**
     * returns bnd (bounds) from rect
     *
     * - IE Compatibility Issue: http://goo.gl/sRLOAo
     * - Scroll Issue: http://goo.gl/sNjUc
     *
     * @param {Rect} rect
     * @return {Object} bounds
     * @return {Number} bounds.top
     * @return {Number} bounds.left
     * @return {Number} bounds.width
     * @return {Number} bounds.height
     */
    var rect2bnd = function ( rect ) {
        var $document = $(document);
        return {
            top   : rect.top + $document.scrollTop(),
            left  : rect.left + $document.scrollLeft(),
            width : rect.right - rect.left,
            height: rect.bottom - rect.top
        };
    };

    /**
     * returns a copy of the object where the keys have become the values and the values the keys.
     * @param {Object} obj
     * @return {Object}
     */
    var invertObject = function ( obj ) {
        var inverted = {};
        for ( var key in obj ) {
            if ( obj.hasOwnProperty(key) ) {
                inverted[ obj[ key ] ] = key;
            }
        }
        return inverted;
    };

    /**
     * @param {String} namespace
     * @param {String} [prefix]
     * @return {String}
     */
    var namespaceToCamel = function ( namespace, prefix ) {
        prefix = prefix || '';
        return prefix + namespace.split('.').map(function ( name ) {
                return name.substring(0, 1).toUpperCase() + name.substring(1);
            }).join('');
    };

    return {
        eq              : eq,
        eq2             : eq2,
        peq2            : peq2,
        ok              : ok,
        fail            : fail,
        self            : self,
        not             : not,
        and             : and,
        invoke          : invoke,
        uniqueId        : uniqueId,
        rect2bnd        : rect2bnd,
        invertObject    : invertObject,
        namespaceToCamel: namespaceToCamel
    };
})();

var range = (function () {


    /**
     * Wrapped Range
     *
     * @constructor
     * @param {Node} sc - start container
     * @param {Number} so - start offset
     * @param {Node} ec - end container
     * @param {Number} eo - end offset
     */
    var WrappedRange = function ( sc, so, ec, eo ) {
        this.sc = sc;
        this.so = so;
        this.ec = ec;
        this.eo = eo;

        // nativeRange: get nativeRange from sc, so, ec, eo
        var nativeRange = function () {
            var w3cRange = document.createRange();
            w3cRange.setStart(sc, so);
            w3cRange.setEnd(ec, eo);

            return w3cRange;
        };

        this.getPoints = function () {
            return {
                sc: sc,
                so: so,
                ec: ec,
                eo: eo
            };
        };

        this.getStartPoint = function () {
            return {
                node  : sc,
                offset: so
            };
        };

        this.getEndPoint = function () {
            return {
                node  : ec,
                offset: eo
            };
        };

        /**
         * select update visible range
         */
        this.select = function () {
            var nativeRng = nativeRange();
            var selection = document.getSelection();
            if ( selection.rangeCount > 0 ) {
                selection.removeAllRanges();
            }
            selection.addRange(nativeRng);

            return this;
        };


        /**
         * @return {WrappedRange}
         */
        this.normalize = function () {

            /**
             * @param {BoundaryPoint} point
             * @param {Boolean} isLeftToRight
             * @return {BoundaryPoint}
             */
            var getVisiblePoint = function ( point, isLeftToRight ) {
                if ( (dom.isVisiblePoint(point) && !dom.isEdgePoint(point)) ||
                    (dom.isVisiblePoint(point) && dom.isRightEdgePoint(point) && !isLeftToRight) ||
                    (dom.isVisiblePoint(point) && dom.isLeftEdgePoint(point) && isLeftToRight) ||
                    (dom.isVisiblePoint(point) && dom.isBlock(point.node) && dom.isEmpty(point.node)) ) {
                    return point;
                }

                // point on block's edge
                var block = dom.ancestor(point.node, dom.isBlock);
                if ( ((dom.isLeftEdgePointOf(point, block) || dom.isVoid(dom.prevPoint(point).node)) && !isLeftToRight) ||
                    ((dom.isRightEdgePointOf(point, block) || dom.isVoid(dom.nextPoint(point).node)) && isLeftToRight) ) {

                    // returns point already on visible point
                    if ( dom.isVisiblePoint(point) ) {
                        return point;
                    }
                    // reverse direction
                    isLeftToRight = !isLeftToRight;
                }

                var nextPoint = isLeftToRight ? dom.nextPointUntil(dom.nextPoint(point), dom.isVisiblePoint) :
                    dom.prevPointUntil(dom.prevPoint(point), dom.isVisiblePoint);
                return nextPoint || point;
            };

            var endPoint   = getVisiblePoint(this.getEndPoint(), false);
            var startPoint = this.isCollapsed() ? endPoint : getVisiblePoint(this.getStartPoint(), true);

            return new WrappedRange(
                startPoint.node,
                startPoint.offset,
                endPoint.node,
                endPoint.offset
            );
        };

        /**
         * returns matched nodes on range
         *
         * @param {Function} [pred] - predicate function
         * @param {Object} [options]
         * @param {Boolean} [options.includeAncestor]
         * @param {Boolean} [options.fullyContains]
         * @return {Node[]}
         */
        this.nodes = function ( pred, options ) {
            pred = pred || func.ok;

            var includeAncestor = options && options.includeAncestor;
            var fullyContains   = options && options.fullyContains;

            // TODO compare points and sort
            var startPoint = this.getStartPoint();
            var endPoint   = this.getEndPoint();

            var nodes         = [];
            var leftEdgeNodes = [];

            dom.walkPoint(startPoint, endPoint, function ( point ) {
                if ( dom.isEditable(point.node) ) {
                    return;
                }

                var node;
                if ( fullyContains ) {
                    if ( dom.isLeftEdgePoint(point) ) {
                        leftEdgeNodes.push(point.node);
                    }
                    if ( dom.isRightEdgePoint(point) && list.contains(leftEdgeNodes, point.node) ) {
                        node = point.node;
                    }
                } else if ( includeAncestor ) {
                    node = dom.ancestor(point.node, pred);
                } else {
                    node = point.node;
                }

                if ( node && pred(node) ) {
                    nodes.push(node);
                }
            }, true);

            return list.unique(nodes);
        };

        /**
         * returns commonAncestor of range
         * @return {Element} - commonAncestor
         */
        this.commonAncestor = function () {
            return dom.commonAncestor(sc, ec);
        };

        /**
         * returns expanded range by pred
         *
         * @param {Function} pred - predicate function
         * @return {WrappedRange}
         */
        this.expand = function ( pred ) {
            var startAncestor = dom.ancestor(sc, pred);
            var endAncestor   = dom.ancestor(ec, pred);

            if ( !startAncestor && !endAncestor ) {
                return new WrappedRange(sc, so, ec, eo);
            }

            var boundaryPoints = this.getPoints();

            if ( startAncestor ) {
                boundaryPoints.sc = startAncestor;
                boundaryPoints.so = 0;
            }

            if ( endAncestor ) {
                boundaryPoints.ec = endAncestor;
                boundaryPoints.eo = dom.nodeLength(endAncestor);
            }

            return new WrappedRange(
                boundaryPoints.sc,
                boundaryPoints.so,
                boundaryPoints.ec,
                boundaryPoints.eo
            );
        };

        /**
         * @param {Boolean} isCollapseToStart
         * @return {WrappedRange}
         */
        this.collapse = function ( isCollapseToStart ) {
            if ( isCollapseToStart ) {
                return new WrappedRange(sc, so, sc, so);
            } else {
                return new WrappedRange(ec, eo, ec, eo);
            }
        };

        /**
         * splitText on range
         */
        this.splitText = function () {
            var isSameContainer = sc === ec;
            var boundaryPoints  = this.getPoints();

            if ( dom.isText(ec) && !dom.isEdgePoint(this.getEndPoint()) ) {
                ec.splitText(eo);
            }

            if ( dom.isText(sc) && !dom.isEdgePoint(this.getStartPoint()) ) {
                boundaryPoints.sc = sc.splitText(so);
                boundaryPoints.so = 0;

                if ( isSameContainer ) {
                    boundaryPoints.ec = boundaryPoints.sc;
                    boundaryPoints.eo = eo - so;
                }
            }

            return new WrappedRange(
                boundaryPoints.sc,
                boundaryPoints.so,
                boundaryPoints.ec,
                boundaryPoints.eo
            );
        };

        /**
         * delete contents on range
         * @return {WrappedRange}
         */
        this.deleteContents = function () {
            if ( this.isCollapsed() ) {
                return this;
            }

            var rng   = this.splitText();
            var nodes = rng.nodes(null, {
                fullyContains: true
            });

            // find new cursor point
            var point = dom.prevPointUntil(rng.getStartPoint(), function ( point ) {
                return !list.contains(nodes, point.node);
            });

            var emptyParents = [];
            $.each(nodes, function ( idx, node ) {
                // find empty parents
                var parent = node.parentNode;
                if ( point.node !== parent && dom.nodeLength(parent) === 1 ) {
                    emptyParents.push(parent);
                }
                dom.remove(node, false);
            });

            // remove empty parents
            $.each(emptyParents, function ( idx, node ) {
                dom.remove(node, false);
            });

            return new WrappedRange(
                point.node,
                point.offset,
                point.node,
                point.offset
            ).normalize();
        };

        /**
         * makeIsOn: return isOn(pred) function
         */
        var makeIsOn = function ( pred ) {
            return function () {
                var ancestor = dom.ancestor(sc, pred);
                return !!ancestor && (ancestor === dom.ancestor(ec, pred));
            };
        };

        // isOnEditable: judge whether range is on editable or not
        // isOnList: judge whether range is on list node or not
        this.isOnList   = makeIsOn(dom.isList);
        // isOnAnchor: judge whether range is on anchor node or not
        this.isOnAnchor = makeIsOn(dom.isAnchor);
        // isOnAnchor: judge whether range is on cell node or not

        /**
         * @param {Function} pred
         * @return {Boolean}
         */
        this.isLeftEdgeOf = function ( pred ) {
            if ( !dom.isLeftEdgePoint(this.getStartPoint()) ) {
                return false;
            }

            var node = dom.ancestor(this.sc, pred);
            return node && dom.isLeftEdgeOf(this.sc, node);
        };

        /**
         * returns whether range was collapsed or not
         */
        this.isCollapsed = function () {
            return sc === ec && so === eo;
        };

        /**
         * wrap inline nodes which children of body with paragraph
         *
         * @return {WrappedRange}
         */
        this.wrapBodyInlineWithPara = function () {
            if ( dom.isBodyContainer(sc) && dom.isEmpty(sc) ) {
                sc.innerHTML = dom.emptyPara;
                console.warn('wrapBodyInlineWithPara sc.innerHTML : ', sc.innerHTML);
                return new WrappedRange(sc.firstChild, 0, sc.firstChild, 0);
            }

            /**
             * [workaround] firefox often create range on not visible point. so normalize here.
             *  - firefox: |<p>text</p>|
             *  - chrome: <p>|text|</p>
             */
            var rng = this.normalize();
            if ( dom.isParaInline(sc) || dom.isPara(sc) ) {
                return rng;
            }

            // find inline top ancestor
            var topAncestor;
            if ( dom.isInline(rng.sc) ) {
                var ancestors = dom.listAncestor(rng.sc, func.not(dom.isInline));
                topAncestor   = list.last(ancestors);
                if ( !dom.isInline(topAncestor) ) {
                    topAncestor = ancestors[ ancestors.length - 2 ] || rng.sc.childNodes[ rng.so ];
                }
            } else {
                topAncestor = rng.sc.childNodes[ rng.so > 0 ? rng.so - 1 : 0 ];
            }

            // siblings not in paragraph
            var inlineSiblings = dom.listPrev(topAncestor, dom.isParaInline).reverse();
            inlineSiblings     = inlineSiblings.concat(dom.listNext(topAncestor.nextSibling, dom.isParaInline));

            // wrap with paragraph
            if ( inlineSiblings.length ) {
                var para = dom.wrap(list.head(inlineSiblings), PARA);
                //console.warn('dom.appendChildNodes wrap with paragraph para : ', para);
                dom.appendChildNodes(para, list.tail(inlineSiblings));
            }

            return this.normalize();
        };

        /**
         * insert node at current cursor
         *
         * @param {Node} node
         * @return {Node}
         */
        this.insertNode = function ( node ) {
            var rng  = this.wrapBodyInlineWithPara().deleteContents();
            var info = dom.splitPoint(rng.getStartPoint(), dom.isInline(node));

            if ( info.rightNode ) {
                info.rightNode.parentNode.insertBefore(node, info.rightNode);
            } else {
                info.container.appendChild(node);
            }

            return node;
        };

        /**
         * returns text in range
         *
         * @return {String}
         */
        this.toString = function () {
            var nativeRng = nativeRange();
            return agent.isW3CRangeSupport ? nativeRng.toString() : nativeRng.text;
        };

        /**
         * getClientRects
         * @return {Rect[]}
         */
        this.getClientRects = function () {
            var nativeRng = nativeRange();
            return nativeRng.getClientRects();
        };
    };

    /**
     * @class core.range
     *
     * Data structure
     *  * BoundaryPoint: a point of dom tree
     *  * BoundaryPoints: two boundaryPoints corresponding to the start and the end of the Range
     *
     * See to http://www.w3.org/TR/DOM-Level-2-Traversal-Range/ranges.html#Level-2-Range-Position
     *
     * @singleton
     * @alternateClassName range
     */
    return {
        /**
         * create Range Object From arguments or Browser Selection
         *
         * @param {Node} sc - start container
         * @param {Number} so - start offset
         * @param {Node} ec - end container
         * @param {Number} eo - end offset
         * @return {WrappedRange}
         */
        create: function ( sc, so, ec, eo ) {
            if ( arguments.length === 4 ) {
                return new WrappedRange(sc, so, ec, eo);
            } else if ( arguments.length === 2 ) { //collapsed
                ec = sc;
                eo = so;
                return new WrappedRange(sc, so, ec, eo);
            } else {
                var wrappedRange = this.createFromSelection();
                if ( !wrappedRange && arguments.length === 1 ) {
                    wrappedRange = this.createFromNode(arguments[ 0 ]);
                    return wrappedRange.collapse(dom.emptyPara === arguments[ 0 ].innerHTML);
                }
                return wrappedRange;
            }
        },

        createFromSelection: function () {
            var sc, so, ec, eo;
            var selection = document.getSelection();
            if ( !selection || selection.rangeCount === 0 ) {
                return null;
            } else if ( dom.isBody(selection.anchorNode) ) {
                // Firefox: returns entire body as range on initialization.
                // We won't never need it.
                return null;
            }

            var nativeRng = selection.getRangeAt(0);
            sc            = nativeRng.startContainer;
            so            = nativeRng.startOffset;
            ec            = nativeRng.endContainer;
            eo            = nativeRng.endOffset;

            return new WrappedRange(sc, so, ec, eo);
        },

        /**
         * @method
         *
         * create WrappedRange from node
         *
         * @param {Node} node
         * @return {WrappedRange}
         */
        createFromNode: function ( node ) {
            var sc = node;
            var so = 0;
            var ec = node;
            var eo = dom.nodeLength(ec);

            // browsers can't target a picture or void node
            if ( dom.isVoid(sc) ) {
                so = dom.listPrev(sc).length - 1;
                sc = sc.parentNode;
            }
            if ( dom.isBR(ec) ) {
                eo = dom.listPrev(ec).length - 1;
                ec = ec.parentNode;
            } else if ( dom.isVoid(ec) ) {
                eo = dom.listPrev(ec).length;
                ec = ec.parentNode;
            }

            return this.create(sc, so, ec, eo);
        },

        /**
         * create WrappedRange from node after position
         *
         * @param {Node} node
         * @return {WrappedRange}
         */
        createFromNodeAfter: function ( node ) {
            return this.createFromNode(node).collapse();
        },

    };
})();

/**
 * @class editing.Style
 *
 * Style
 *
 */
var Style = function () {
    /**
     * @method jQueryCSS
     *
     * [workaround] for old jQuery
     * passing an array of style properties to .css()
     * will result in an object of property-value pairs.
     * (compability with version < 1.9)
     *
     * @private
     * @param  {jQuery} $obj
     * @param  {Array} propertyNames - An array of one or more CSS properties.
     * @return {Object}
     */
    var jQueryCSS = function ( $obj, propertyNames ) {
        var result = {};
        $.each(propertyNames, function ( idx, propertyName ) {
            result[ propertyName ] = $obj.css(propertyName);
        });
        return result;
    };

    /**
     * returns style object from node
     *
     * @param {jQuery} $node
     * @return {Object}
     */
    this.fromNode = function ( $node ) {
        var properties           = [ 'font-family', 'font-size', 'text-align', 'list-style-type', 'line-height' ];
        var styleInfo            = jQueryCSS($node, properties) || {};
        styleInfo[ 'font-size' ] = parseInt(styleInfo[ 'font-size' ], 10);
        return styleInfo;
    };


    /**
     * insert and returns styleNodes on range.
     *
     * @param {WrappedRange} rng
     * @param {Object} [options] - options for styleNodes
     * @param {String} [options.nodeName] - default: `SPAN`
     * @param {Boolean} [options.expandClosestSibling] - default: `false`
     * @param {Boolean} [options.onlyPartialContains] - default: `false`
     * @return {Node[]}
     */
    this.styleNodes = function ( rng, options ) {
        rng = rng.splitText();

        var nodeName             = options && options.nodeName || 'SPAN';
        var expandClosestSibling = !!(options && options.expandClosestSibling);
        var onlyPartialContains  = !!(options && options.onlyPartialContains);
        console.error('Create Style Note : ', rng, ' nodeName : ', nodeName);

        if ( rng.isCollapsed() ) {
            return [ rng.insertNode(dom.create(nodeName)) ];
        }

        var pred  = dom.makePredByNodeName(nodeName);
        var nodes = rng.nodes(dom.isText, {
            fullyContains: true
        }).map(function ( text ) {
            return dom.singleChildAncestor(text, pred) || dom.wrap(text, nodeName);
        });

        if ( expandClosestSibling ) {
            if ( onlyPartialContains ) {
                var nodesInRange = rng.nodes();
                // compose with partial contains predication
                pred             = func.and(pred, function ( node ) {
                    return list.contains(nodesInRange, node);
                });
            }

            return nodes.map(function ( node ) {
                var siblings = dom.withClosestSiblings(node, pred);
                var head     = list.head(siblings);
                var tails    = list.tail(siblings);
                $.each(tails, function ( idx, elem ) {
                    dom.appendChildNodes(head, elem.childNodes);
                    dom.remove(elem);
                });
                return list.head(siblings);
            });
        } else {
            return nodes;
        }
    };

    /**
     * get current style on cursor
     *
     * @param {WrappedRange} rng
     * @return {Object} - object contains style properties.
     */
    this.current = function ( rng ) {
        var $cont     = $(!dom.isElement(rng.sc) ? rng.sc.parentNode : rng.sc);
        var styleInfo = this.fromNode($cont);

        // document.queryCommandState for toggle state
        // [workaround] prevent Firefox nsresult: "0x80004005 (NS_ERROR_FAILURE)"
        try {
            styleInfo = $.extend(styleInfo, {
                'font-bold'         : document.queryCommandState('bold') ? 'bold' : 'normal',
                'font-italic'       : document.queryCommandState('italic') ? 'italic' : 'normal',
                'font-underline'    : document.queryCommandState('underline') ? 'underline' : 'normal',
                'font-subscript'    : document.queryCommandState('subscript') ? 'subscript' : 'normal',
                'font-superscript'  : document.queryCommandState('superscript') ? 'superscript' : 'normal',
                'font-strikethrough': document.queryCommandState('strikethrough') ? 'strikethrough' : 'normal'
            });
        } catch ( e ) {
        }

        // list-style-type to list-style(unordered, ordered)
        if ( !rng.isOnList() ) {
            styleInfo[ 'list-style' ] = 'none';
        } else {
            var orderedTypes          = [ 'circle', 'disc', 'disc-leading-zero', 'square' ];
            var isUnordered           = $.inArray(styleInfo[ 'list-style-type' ], orderedTypes) > -1;
            styleInfo[ 'list-style' ] = isUnordered ? 'unordered' : 'ordered';
        }

        var para = dom.ancestor(rng.sc, dom.isPara);
        if ( para && para.style[ 'line-height' ] ) {
            styleInfo[ 'line-height' ] = para.style.lineHeight;
        } else {
            var lineHeight             = parseInt(styleInfo[ 'line-height' ], 10) / parseInt(styleInfo[ 'font-size' ], 10);
            styleInfo[ 'line-height' ] = lineHeight.toFixed(1);
        }

        styleInfo.anchor    = rng.isOnAnchor() && dom.ancestor(rng.sc, dom.isAnchor);
        styleInfo.ancestors = dom.listAncestor(rng.sc, dom.isEditable);
        styleInfo.range     = rng;

        return styleInfo;
    };
};


var dom = (function () {
    /**
     * @method isEditable
     *
     * returns whether node is `note-editable` or not.
     *
     * @param {Node} node
     * @return {Boolean}
     */
    var isEditable = function ( node ) {
        return node && $(node).hasClass('note-editable');
    };

    /**
     * @method isControlSizing
     *
     * returns whether node is `note-control-sizing` or not.
     *
     * @param {Node} node
     * @return {Boolean}
     */
    var isControlSizing = function ( node ) {
        return node && $(node).hasClass('note-control-sizing');
    };

    /**
     * @method makePredByNodeName
     *
     * returns predicate which judge whether nodeName is same
     *
     * @param {String} nodeName
     * @return {Function}
     */
    var makePredByNodeName = function ( nodeName ) {
        nodeName = nodeName.toUpperCase();
        return function ( node ) {
            return node && node.nodeName.toUpperCase() === nodeName;
        };
    };

    /**
     * @method isText
     *
     *
     *
     * @param {Node} node
     * @return {Boolean} true if node's type is text(3)
     */
    var isText = function ( node ) {
        return node && node.nodeType === 3;
    };

    /**
     * @method isElement
     *
     *
     *
     * @param {Node} node
     * @return {Boolean} true if node's type is element(1)
     */
    var isElement = function ( node ) {
        return node && node.nodeType === 1;
    };

    /**
     * ex) br, col, embed, hr, img, input, ...
     * @see http://www.w3.org/html/wg/drafts/html/master/syntax.html#void-elements
     */
    var isVoid = function ( node ) {
        return node && /^BR|^IMG|^HR|^IFRAME|^BUTTON/.test(node.nodeName.toUpperCase());
    };

    var isPara = function ( node ) {
        if ( isEditable(node) ) {
            return false;
        }

        // Chrome(v31.0), FF(v25.0.1) use DIV for paragraph
        return node && /^DIV|^P|^LI|^H[1-7]/.test(node.nodeName.toUpperCase());
    };

    var isHeading = function ( node ) {
        return node && /^H[1-7]/.test(node.nodeName.toUpperCase());
    };

    var isPre = makePredByNodeName('PRE');

    var isLi = makePredByNodeName('LI');

    var isPurePara = function ( node ) {
        return isPara(node) && !isLi(node);
    };

    var isTable = makePredByNodeName('TABLE');

    var isInline = function ( node ) {
        return !isBodyContainer(node) && !isList(node) && !isHr(node) && !isPara(node) && !isTable(node) && !isBlockquote(node);
    };

    var isList = function ( node ) {
        return node && /^UL|^OL/.test(node.nodeName.toUpperCase());
    };

    var isHr = makePredByNodeName('HR');

    var isCell = function ( node ) {
        return node && /^TD|^TH/.test(node.nodeName.toUpperCase());
    };

    var isBlockquote = makePredByNodeName('BLOCKQUOTE');

    var isBodyContainer = function ( node ) {
        return isCell(node) || isBlockquote(node) || isEditable(node);
    };

    var isAnchor = makePredByNodeName('A');

    var isParaInline = function ( node ) {
        return isInline(node) && !!ancestor(node, isPara);
    };

    var isBodyInline = function ( node ) {
        return isInline(node) && !ancestor(node, isPara);
    };

    var isBody = makePredByNodeName('BODY');

    /**
     * returns whether nodeB is closest sibling of nodeA
     *
     * @param {Node} nodeA
     * @param {Node} nodeB
     * @return {Boolean}
     */
    var isClosestSibling = function ( nodeA, nodeB ) {
        return nodeA.nextSibling === nodeB ||
            nodeA.previousSibling === nodeB;
    };

    /**
     * returns array of closest siblings with node
     *
     * @param {Node} node
     * @param {function} [pred] - predicate function
     * @return {Node[]}
     */
    var withClosestSiblings = function ( node, pred ) {
        pred = pred || func.ok;

        var siblings = [];
        if ( node.previousSibling && pred(node.previousSibling) ) {
            siblings.push(node.previousSibling);
        }
        siblings.push(node);
        if ( node.nextSibling && pred(node.nextSibling) ) {
            siblings.push(node.nextSibling);
        }
        return siblings;
    };

    /**
     * blank HTML for cursor position
     * - [workaround] old IE only works with &nbsp;
     * - [workaround] IE11 and other browser works with bogus br
     */
    var blankHTML = '<br>';

    /**
     * @method nodeLength
     *
     * returns #text's text size or element's childNodes size
     *
     * @param {Node} node
     */
    var nodeLength = function ( node ) {
        if ( isText(node) ) {
            return node.nodeValue.length;
        }

        return node.childNodes.length;
    };

    /**
     * returns whether node is empty or not.
     *
     * @param {Node} node
     * @return {Boolean}
     */
    var isEmpty = function ( node ) {
        var len = nodeLength(node);

        if ( len === 0 ) {
            return true;
        } else if ( !isText(node) && len === 1 && node.innerHTML === blankHTML ) {
            // ex) <p><br></p>, <span><br></span>
            return true;
        } else if ( list.all(node.childNodes, isText) && node.innerHTML === '' ) {
            // ex) <p></p>, <span></span>
            return true;
        }

        return false;
    };

    /**
     * padding blankHTML if node is empty (for cursor position)
     */
    var paddingBlankHTML = function ( node ) {
        if ( !isVoid(node) && !nodeLength(node) ) {
            node.innerHTML = blankHTML;
        }
    };

    /**
     * find nearest ancestor predicate hit
     *
     * @param {Node} node
     * @param {Function} pred - predicate function
     */
    var ancestor = function ( node, pred ) {
        while ( node ) {
            if ( pred(node) ) {
                return node;
            }
            if ( isEditable(node) ) {
                break;
            }
            
            node = node.parentNode;
        }
        return null;
    };

    /**
     * find nearest ancestor only single child blood line and predicate hit
     *
     * @param {Node} node
     * @param {Function} pred - predicate function
     */
    var singleChildAncestor = function ( node, pred ) {
        node = node.parentNode;

        while ( node ) {
            if ( nodeLength(node) !== 1 ) {
                break;
            }
            if ( pred(node) ) {
                return node;
            }
            if ( isEditable(node) ) {
                break;
            }
            
            node = node.parentNode;
        }
        return null;
    };

    /**
     * returns new array of ancestor nodes (until predicate hit).
     *
     * @param {Node} node
     * @param {Function} [optional] pred - predicate function
     */
    var listAncestor = function ( node, pred ) {
        pred = pred || func.fail;

        var ancestors = [];
        ancestor(node, function ( el ) {
            if ( !isEditable(el) ) {
                ancestors.push(el);
            }

            return pred(el);
        });
        return ancestors;
    };

    /**
     * find farthest ancestor predicate hit
     */
    var lastAncestor = function ( node, pred ) {
        var ancestors = listAncestor(node);
        return list.last(ancestors.filter(pred));
    };

    /**
     * returns common ancestor node between two nodes.
     *
     * @param {Node} nodeA
     * @param {Node} nodeB
     */
    var commonAncestor = function ( nodeA, nodeB ) {
        var ancestors = listAncestor(nodeA);
        for ( var n = nodeB; n; n = n.parentNode ) {
            if ( $.inArray(n, ancestors) > -1 ) {
                return n;
            }
        }
        return null; // difference document area
    };

    /**
     * listing all previous siblings (until predicate hit).
     *
     * @param {Node} node
     * @param {Function} [optional] pred - predicate function
     */
    var listPrev = function ( node, pred ) {
        pred = pred || func.fail;

        var nodes = [];
        while ( node ) {
            if ( pred(node) ) {
                break;
            }
            nodes.push(node);
            node = node.previousSibling;
        }
        return nodes;
    };

    /**
     * listing next siblings (until predicate hit).
     *
     * @param {Node} node
     * @param {Function} [pred] - predicate function
     */
    var listNext = function ( node, pred ) {
        pred = pred || func.fail;

        var nodes = [];
        while ( node ) {
            if ( pred(node) ) {
                break;
            }
            nodes.push(node);
            node = node.nextSibling;
        }
        return nodes;
    };

    /**
     * listing descendant nodes
     *
     * @param {Node} node
     * @param {Function} [pred] - predicate function
     */
    var listDescendant = function ( node, pred ) {
        var descendants = [];
        pred            = pred || func.ok;

        // start DFS(depth first search) with node
        (function fnWalk ( current ) {
            if ( node !== current && pred(current) ) {
                descendants.push(current);
            }
            for ( var idx = 0, len = current.childNodes.length; idx < len; idx++ ) {
                fnWalk(current.childNodes[ idx ]);
            }
        })(node);

        return descendants;
    };

    /**
     * wrap node with new tag.
     *
     * @param {Node} node
     * @param {Node} tagName of wrapper
     * @return {Node} - wrapper
     */
    var wrap = function ( node, wrapperName ) {
        var parent  = node.parentNode;
        var wrapper = $('<' + wrapperName + '>')[ 0 ];

        parent.insertBefore(wrapper, node);
        wrapper.appendChild(node);

        return wrapper;
    };

    /**
     * insert node after preceding
     *
     * @param {Node} node
     * @param {Node} preceding - predicate function
     */
    var insertAfter = function ( node, preceding ) {
        var next = preceding.nextSibling, parent = preceding.parentNode;
        if ( next ) {
            parent.insertBefore(node, next);
        } else {
            parent.appendChild(node);
        }
        return node;
    };

    /**
     * append elements.
     *
     * @param {Node} node
     * @param {Collection} aChild
     */
    var appendChildNodes = function ( node, aChild ) {
        $.each(aChild, function ( idx, child ) {
            node.appendChild(child);
        });
        return node;
    };

    /**
     * returns whether boundaryPoint is left edge or not.
     *
     * @param {BoundaryPoint} point
     * @return {Boolean}
     */
    var isLeftEdgePoint = function ( point ) {
        return point.offset === 0;
    };

    /**
     * returns whether boundaryPoint is right edge or not.
     *
     * @param {BoundaryPoint} point
     * @return {Boolean}
     */
    var isRightEdgePoint = function ( point ) {
        return point.offset === nodeLength(point.node);
    };

    /**
     * returns whether boundaryPoint is edge or not.
     *
     * @param {BoundaryPoint} point
     * @return {Boolean}
     */
    var isEdgePoint = function ( point ) {
        return isLeftEdgePoint(point) || isRightEdgePoint(point);
    };

    /**
     * returns whether node is left edge of ancestor or not.
     *
     * @param {Node} node
     * @param {Node} ancestor
     * @return {Boolean}
     */
    var isLeftEdgeOf = function ( node, ancestor ) {
        while ( node && node !== ancestor ) {
            if ( position(node) !== 0 ) {
                return false;
            }
            node = node.parentNode;
        }

        return true;
    };

    /**
     * returns whether node is right edge of ancestor or not.
     *
     * @param {Node} node
     * @param {Node} ancestor
     * @return {Boolean}
     */
    var isRightEdgeOf = function ( node, ancestor ) {
        while ( node && node !== ancestor ) {
            if ( position(node) !== nodeLength(node.parentNode) - 1 ) {
                return false;
            }
            node = node.parentNode;
        }

        return true;
    };

    /**
     * returns whether point is left edge of ancestor or not.
     * @param {BoundaryPoint} point
     * @param {Node} ancestor
     * @return {Boolean}
     */
    var isLeftEdgePointOf = function ( point, ancestor ) {
        return isLeftEdgePoint(point) && isLeftEdgeOf(point.node, ancestor);
    };

    /**
     * returns whether point is right edge of ancestor or not.
     * @param {BoundaryPoint} point
     * @param {Node} ancestor
     * @return {Boolean}
     */
    var isRightEdgePointOf = function ( point, ancestor ) {
        return isRightEdgePoint(point) && isRightEdgeOf(point.node, ancestor);
    };

    /**
     * returns offset from parent.
     *
     * @param {Node} node
     */
    var position = function ( node ) {
        var offset = 0;
        while ( (node = node.previousSibling) ) {
            offset += 1;
        }
        return offset;
    };

    var hasChildren = function ( node ) {
        return !!(node && node.childNodes && node.childNodes.length);
    };

    /**
     * returns previous boundaryPoint
     *
     * @param {BoundaryPoint} point
     * @param {Boolean} isSkipInnerOffset
     * @return {BoundaryPoint}
     */
    var prevPoint = function ( point, isSkipInnerOffset ) {
        var node, offset;

        if ( point.offset === 0 ) {
            if ( isEditable(point.node) ) {
                return null;
            }
            
            node   = point.node.parentNode;
            offset = position(point.node);
        } else if ( hasChildren(point.node) ) {
            node   = point.node.childNodes[ point.offset - 1 ];
            offset = nodeLength(node);
        } else {
            node   = point.node;
            offset = isSkipInnerOffset ? 0 : point.offset - 1;
        }

        return {
            node  : node,
            offset: offset
        };
    };

    /**
     * returns next boundaryPoint
     *
     * @param {BoundaryPoint} point
     * @param {Boolean} isSkipInnerOffset
     * @return {BoundaryPoint}
     */
    var nextPoint = function ( point, isSkipInnerOffset ) {
        var node, offset;

        if ( nodeLength(point.node) === point.offset ) {
            if ( isEditable(point.node) ) {
                return null;
            }
            
            node   = point.node.parentNode;
            offset = position(point.node) + 1;
        } else if ( hasChildren(point.node) ) {
            node   = point.node.childNodes[ point.offset ];
            offset = 0;
        } else {
            node   = point.node;
            offset = isSkipInnerOffset ? nodeLength(point.node) : point.offset + 1;
        }

        return {
            node  : node,
            offset: offset
        };
    };

    /**
     * returns whether pointA and pointB is same or not.
     *
     * @param {BoundaryPoint} pointA
     * @param {BoundaryPoint} pointB
     * @return {Boolean}
     */
    var isSamePoint = function ( pointA, pointB ) {
        return pointA.node === pointB.node && pointA.offset === pointB.offset;
    };

    /**
     * returns whether point is visible (can set cursor) or not.
     *
     * @param {BoundaryPoint} point
     * @return {Boolean}
     */
    var isVisiblePoint = function ( point ) {
        if ( isText(point.node) || !hasChildren(point.node) || isEmpty(point.node) ) {
            return true;
        }

        var leftNode  = point.node.childNodes[ point.offset - 1 ];
        var rightNode = point.node.childNodes[ point.offset ];
        if ( (!leftNode || isVoid(leftNode)) && (!rightNode || isVoid(rightNode)) ) {
            return true;
        }

        return false;
    };

    /**
     * @method prevPointUtil
     *
     * @param {BoundaryPoint} point
     * @param {Function} pred
     * @return {BoundaryPoint}
     */
    var prevPointUntil = function ( point, pred ) {
        while ( point ) {
            if ( pred(point) ) {
                return point;
            }
            
            point = prevPoint(point);
        }

        return null;
    };

    /**
     * @method nextPointUntil
     *
     * @param {BoundaryPoint} point
     * @param {Function} pred
     * @return {BoundaryPoint}
     */
    var nextPointUntil = function ( point, pred ) {
        while ( point ) {
            if ( pred(point) ) {
                return point;
            }
            
            point = nextPoint(point);
        }

        return null;
    };

    /**
     * returns whether point has character or not.
     *
     * @param {Point} point
     * @return {Boolean}
     */
    var isCharPoint = function ( point ) {
        if ( !isText(point.node) ) {
            return false;
        }

        var ch = point.node.nodeValue.charAt(point.offset - 1);
        return ch && (ch !== ' ' && ch !== NBSP_CHAR);
    };

    /**
     * @method walkPoint
     *
     * @param {BoundaryPoint} startPoint
     * @param {BoundaryPoint} endPoint
     * @param {Function} handler
     * @param {Boolean} isSkipInnerOffset
     */
    var walkPoint = function ( startPoint, endPoint, handler, isSkipInnerOffset ) {
        var point = startPoint;

        while ( point ) {
            handler(point);
            
            if ( isSamePoint(point, endPoint) ) {
                break;
            }
            
            var isSkipOffset = isSkipInnerOffset &&
                startPoint.node !== point.node &&
                endPoint.node !== point.node;
            point            = nextPoint(point, isSkipOffset);
        }
    };

    /**
     * @method makeOffsetPath
     *
     * return offsetPath(array of offset) from ancestor
     *
     * @param {Node} ancestor - ancestor node
     * @param {Node} node
     */
    var makeOffsetPath = function ( ancestor, node ) {
        var ancestors = listAncestor(node, func.eq(ancestor));
        return ancestors.map(position).reverse();
    };

    /**
     * @method fromOffsetPath
     *
     * return element from offsetPath(array of offset)
     *
     * @param {Node} ancestor - ancestor node
     * @param {array} offsets - offsetPath
     */
    var fromOffsetPath = function ( ancestor, offsets ) {
        var current = ancestor;
        for ( var i = 0, len = offsets.length; i < len; i++ ) {
            if ( current.childNodes.length <= offsets[ i ] ) {
                current = current.childNodes[ current.childNodes.length - 1 ];
            } else {
                current = current.childNodes[ offsets[ i ] ];
            }
        }
        return current;
    };

    /**
     * @method splitNode
     *
     * split element or #text
     *
     * @param {BoundaryPoint} point
     * @param {Object} [options]
     * @param {Boolean} [options.isSkipPaddingBlankHTML] - default: false
     * @param {Boolean} [options.isNotSplitEdgePoint] - default: false
     * @return {Node} right node of boundaryPoint
     */
    var splitNode = function ( point, options ) {
        var isSkipPaddingBlankHTML = options && options.isSkipPaddingBlankHTML;
        var isNotSplitEdgePoint    = options && options.isNotSplitEdgePoint;

        // edge case
        if ( isEdgePoint(point) && (isText(point.node) || isNotSplitEdgePoint) ) {
            if ( isLeftEdgePoint(point) ) {
                return point.node;
            } else if ( isRightEdgePoint(point) ) {
                return point.node.nextSibling;
            }
        }

        // split #text
        if ( isText(point.node) ) {
            return point.node.splitText(point.offset);
        } else {
            var childNode = point.node.childNodes[ point.offset ];
            var clone     = insertAfter(point.node.cloneNode(false), point.node);
            appendChildNodes(clone, listNext(childNode));
            
            if ( !isSkipPaddingBlankHTML ) {
                paddingBlankHTML(point.node);
                paddingBlankHTML(clone);
            }
            
            return clone;
        }
    };

    /**
     * @method splitTree
     *
     * split tree by point
     *
     * @param {Node} root - split root
     * @param {BoundaryPoint} point
     * @param {Object} [options]
     * @param {Boolean} [options.isSkipPaddingBlankHTML] - default: false
     * @param {Boolean} [options.isNotSplitEdgePoint] - default: false
     * @return {Node} right node of boundaryPoint
     */
    var splitTree = function ( root, point, options ) {
        // ex) [#text, <span>, <p>]
        var ancestors = listAncestor(point.node, func.eq(root));

        if ( !ancestors.length ) {
            return null;
        } else if ( ancestors.length === 1 ) {
            return splitNode(point, options);
        }

        return ancestors.reduce(function ( node, parent ) {
            if ( node === point.node ) {
                node = splitNode(point, options);
            }

            return splitNode({
                node  : parent,
                offset: node ? dom.position(node) : nodeLength(parent)
            }, options);
        });
    };

    /**
     * split point
     *
     * @param {Point} point
     * @param {Boolean} isInline
     * @return {Object}
     */
    var splitPoint = function ( point, isInline ) {
        // find splitRoot, container
        //  - inline: splitRoot is a child of paragraph
        //  - block: splitRoot is a child of bodyContainer
        var pred        = isInline ? isPara : isBodyContainer;
        var ancestors   = listAncestor(point.node, pred);
        var topAncestor = list.last(ancestors) || point.node;

        var splitRoot, container;
        if ( pred(topAncestor) ) {
            splitRoot = ancestors[ ancestors.length - 2 ];
            container = topAncestor;
        } else {
            splitRoot = topAncestor;
            container = splitRoot.parentNode;
        }

        // if splitRoot is exists, split with splitTree
        var pivot = splitRoot && splitTree(splitRoot, point, {
                isSkipPaddingBlankHTML: isInline,
                isNotSplitEdgePoint   : isInline
            });

        // if container is point.node, find pivot with point.offset
        if ( !pivot && container === point.node ) {
            pivot = point.node.childNodes[ point.offset ];
        }

        return {
            rightNode: pivot,
            container: container
        };
    };

    var create = function ( nodeName ) {
        return document.createElement(nodeName);
    };

    var createText = function ( text ) {
        return document.createTextNode(text);
    };

    /**
     * @method remove
     *
     * remove node, (isRemoveChild: remove child or not)
     *
     * @param {Node} node
     * @param {Boolean} isRemoveChild
     */
    var remove = function ( node, isRemoveChild ) {
        if ( !node || !node.parentNode ) {
            return;
        }
        if ( node.removeNode ) {
            return node.removeNode(isRemoveChild);
        }

        var parent = node.parentNode;
        if ( !isRemoveChild ) {
            var nodes = [];
            var i, len;
            for ( i = 0, len = node.childNodes.length; i < len; i++ ) {
                nodes.push(node.childNodes[ i ]);
            }
            
            for ( i = 0, len = nodes.length; i < len; i++ ) {
                parent.insertBefore(nodes[ i ], node);
            }
        }

        parent.removeChild(node);
    };

    /**
     * @method removeWhile
     *
     * @param {Node} node
     * @param {Function} pred
     */
    var removeWhile = function ( node, pred ) {
        while ( node ) {
            if ( isEditable(node) || !pred(node) ) {
                break;
            }
            
            var parent = node.parentNode;
            remove(node);
            node = parent;
        }
    };

    /**
     * @method replace
     *
     * replace node with provided nodeName
     *
     * @param {Node} node
     * @param {String} nodeName
     * @return {Node} - new node
     */
    var replace = function ( node, nodeName ) {
        if ( node.nodeName.toUpperCase() === nodeName.toUpperCase() ) {
            return node;
        }

        var newNode = create(nodeName);

        if ( node.style.cssText ) {
            newNode.style.cssText = node.style.cssText;
        }

        appendChildNodes(newNode, list.from(node.childNodes));
        insertAfter(newNode, node);
        remove(node);

        return newNode;
    };

    var isTextarea = makePredByNodeName('TEXTAREA');

    /**
     * @param {jQuery} $node
     * @param {Boolean} [stripLinebreaks] - default: false
     */
    var value = function ( $node, stripLinebreaks ) {
        var val = isTextarea($node[ 0 ]) ? $node.val() : $node.html();
        if ( stripLinebreaks ) {
            return val.replace(/[\n\r]/g, '');
        }
        return val;
    };

    /**
     * @method html
     *
     * get the HTML contents of node
     *
     * @param {jQuery} $node
     * @param {Boolean} [isNewlineOnBlock]
     */
    var html = function ( $node, isNewlineOnBlock ) {
        var markup = value($node);

        if ( isNewlineOnBlock ) {
            var regexTag = /<(\/?)(\b(?!!)[^>\s]*)(.*?)(\s*\/?>)/g;
            markup       = markup.replace(regexTag, function ( match, endSlash, name ) {
                name                       = name.toUpperCase();
                var isEndOfInlineContainer = /^DIV|^TD|^TH|^P|^LI|^H[1-7]/.test(name) && !!endSlash;
                var isBlockNode            = /^BLOCKQUOTE|^TABLE|^TBODY|^TR|^HR|^UL|^OL/.test(name);

                return match + ((isEndOfInlineContainer || isBlockNode) ? '\n' : '');
            });
            markup       = $.trim(markup);
        }

        return markup;
    };

    var posFromPlaceholder = function ( placeholder ) {
        var $placeholder = $(placeholder);
        var pos          = $placeholder.offset();
        var height       = $placeholder.outerHeight(true); // include margin

        return {
            left: pos.left,
            top : pos.top + height
        };
    };

    var attachEvents = function ( $node, events ) {
        Object.keys(events).forEach(function ( key ) {
            $node.on(key, events[ key ]);
        });
    };

    var detachEvents = function ( $node, events ) {
        Object.keys(events).forEach(function ( key ) {
            $node.off(key, events[ key ]);
        });
    };

    return {
        /** @property {String} NBSP_CHAR */
        NBSP_CHAR           : NBSP_CHAR,
        /** @property {String} ZERO_WIDTH_NBSP_CHAR */
        ZERO_WIDTH_NBSP_CHAR: ZERO_WIDTH_NBSP_CHAR,
        /** @property {String} blank */
        blank               : blankHTML,
        /** @property {String} emptyPara */
        /*
         TODO
         1. IE 에선 <div><strong></strong></div> 으로 수정하자
         2. IE strong 태그, em 태그 파싱하자. align property 도.
         */
        emptyPara           : '<p><b>' + blankHTML + '</b></p>',
        makePredByNodeName  : makePredByNodeName,
        isEditable          : isEditable,
        isControlSizing     : isControlSizing,
        isText              : isText,
        isElement           : isElement,
        isVoid              : isVoid,
        isPara              : isPara,
        isPurePara          : isPurePara,
        isHeading           : isHeading,
        isInline            : isInline,
        isBlock             : func.not(isInline),
        isBodyInline        : isBodyInline,
        isBody              : isBody,
        isParaInline        : isParaInline,
        isPre               : isPre,
        isList              : isList,
        isTable             : isTable,
        isCell              : isCell,
        isBlockquote        : isBlockquote,
        isBodyContainer     : isBodyContainer,
        isAnchor            : isAnchor,
        isDiv               : makePredByNodeName('DIV'),
        isLi                : isLi,
        isBR                : makePredByNodeName('BR'),
        isSpan              : makePredByNodeName('SPAN'),
        isB                 : makePredByNodeName('B'),
        isU                 : makePredByNodeName('U'),
        isS                 : makePredByNodeName('S'),
        isI                 : makePredByNodeName('I'),
        isImg               : makePredByNodeName('IMG'),
        isTextarea          : isTextarea,
        isEmpty             : isEmpty,
        isEmptyAnchor       : func.and(isAnchor, isEmpty),
        isClosestSibling    : isClosestSibling,
        withClosestSiblings : withClosestSiblings,
        nodeLength          : nodeLength,
        isLeftEdgePoint     : isLeftEdgePoint,
        isRightEdgePoint    : isRightEdgePoint,
        isEdgePoint         : isEdgePoint,
        isLeftEdgeOf        : isLeftEdgeOf,
        isRightEdgeOf       : isRightEdgeOf,
        isLeftEdgePointOf   : isLeftEdgePointOf,
        isRightEdgePointOf  : isRightEdgePointOf,
        prevPoint           : prevPoint,
        nextPoint           : nextPoint,
        isSamePoint         : isSamePoint,
        isVisiblePoint      : isVisiblePoint,
        prevPointUntil      : prevPointUntil,
        nextPointUntil      : nextPointUntil,
        isCharPoint         : isCharPoint,
        walkPoint           : walkPoint,
        ancestor            : ancestor,
        singleChildAncestor : singleChildAncestor,
        listAncestor        : listAncestor,
        lastAncestor        : lastAncestor,
        listNext            : listNext,
        listPrev            : listPrev,
        listDescendant      : listDescendant,
        commonAncestor      : commonAncestor,
        wrap                : wrap,
        insertAfter         : insertAfter,
        appendChildNodes    : appendChildNodes,
        position            : position,
        hasChildren         : hasChildren,
        makeOffsetPath      : makeOffsetPath,
        fromOffsetPath      : fromOffsetPath,
        splitTree           : splitTree,
        splitPoint          : splitPoint,
        create              : create,
        createText          : createText,
        remove              : remove,
        removeWhile         : removeWhile,
        replace             : replace,
        html                : html,
        value               : value,
        posFromPlaceholder  : posFromPlaceholder,
        attachEvents        : attachEvents,
        detachEvents        : detachEvents
    };
})();


(function ( $doc, $win, zccEditor ) {
    /*!
     *
     * ZSSRichTextEditor v0.5.2
     * http://www.zedsaid.com
     *
     * Copyright 2014 Zed Said Studio LLC
     *
     *
     */
    var $ios;
    var $footer;
    // If we are using iOS or desktop
    zccEditor.isUsingiOS = false;

    // If the user is draging
    zccEditor.isDragging = false;

    // The current selection
    zccEditor.currentSelection;

    // The current editing image
    zccEditor.currentEditingImage;

    // The current editing link
    zccEditor.currentEditingLink;

    // The objects that are enabled
    zccEditor.enabledItems = {};

    // Height of content window, will be set by viewController
    zccEditor.contentHeight = 244;

    // Sets to true when extra footer gap shows and requires to hide
    zccEditor.updateScrollOffset = false;

    /**
     * The initializer function that must be called onLoad
     *
     * 가장 처음에 실행되는 코드
     * 웹뷰의 HTML 이 준비되면 바로 DOM 조작을 시작한다는 뜻
     * 이 안에는 호출 코드가 없는걸로 봐서 다른 곳에서 호출되는 함수인 듯.
     * 그렇다면 여기선 Document Load Event 는 모른다는 뜻인가보군..
     */
    zccEditor.init = function () {
        $ios          = $('#toIOS');
        $footer       = $('#zss_editor_footer');
        zccEditor.$el = $('#zss_editor_content').on('touchend', function ( e ) {
            zccEditor.enabledEditingItems(e);
            var clicked = $(e.target);
            if ( !clicked.hasClass('zs_active') ) {
                $('img').removeClass('zs_active');
            }
        });

        // Selection 이 변경될 경우 이벤트를 받음
        zccEditor.$el.on('selectionchange', function ( e ) {
            // Selection 이 되면 무조건 해당 위치로 스크롤해서 포커스함
            zccEditor.calculateEditorHeightWithCaretPosition();
            // device 한테 스크롤 위치를 알려줌
            zccEditor.letDeviceKnowScrollPosition();
            // editting item 을 Enable 시켜줌
            // editting item 이 평소에는 Disable 되어있나봄
            zccEditor.enabledEditingItems(e);
        });
        zccEditor.$footer = $footer;

        $win.on('scroll', function ( e ) {
            zccEditor.updateOffset();
        });

        // Make sure that when we tap anywhere in the document we focus on the editor
        // 글로벌 이벤트 핸들러
        $win.on('touchmove', function ( e ) {
                // Browser 에서 드래그 이벤트를 판단하는 흔한 방식
                // 글로벌로 터치후 드래그(움직이는) 이벤트를 받아서 기기와 스크롤바 위치를 통신함
                zccEditor.isDragging         = true;
                zccEditor.updateScrollOffset = true;
                zccEditor.letDeviceKnowScrollPosition(); // 여기서 기기와 통신이 일어남
                zccEditor.enabledEditingItems(e);
                // 아마 에디터영역을 터치하면 포커스 효과를 주는듯
            })
            .on('touchstart', function ( e ) {
                // dragging flag initialize 를 start 이벤트에서 하네
                zccEditor.isDragging = false;
            })
            .on('touchend', function ( e ) {
                // 드래그중이 아닌데 에디터 영역 바깥일 경우 에디터로 포커스해줌
                // document 방식의 입력 모드일 때는 기본적인 이벤트
                if ( !zccEditor.isDragging && (e.target.id == "zss_editor_footer" || e.target.nodeName.toLowerCase() == "html") ) {
                    zccEditor.focusEditor();
                }
            });

        if ( !zccEditor.isUsingiOS ) {
            //            window.controller.init(zccEditor);
        }
    }; //end


    zccEditor.updateOffset = function () {

        if ( !zccEditor.updateScrollOffset )
            return;

        var offsetY = window.document.body.scrollTop;

        var footer = $('#zss_editor_footer');

        var maxOffsetY = footer.offset().top - zccEditor.contentHeight;

        if ( maxOffsetY < 0 )
            maxOffsetY = 0;

        if ( offsetY > maxOffsetY ) {
            window.scrollTo(0, maxOffsetY);
        }

        zccEditor.letDeviceKnowScrollPosition();
    }

    // This will show up in the XCode console as we are able to push this into an NSLog.
    zccEditor.debug = function ( msg ) {
        window.location = 'debug://' + msg;
        $('#debug_info').html(msg);
    }


    zccEditor.letDeviceKnowScrollPosition = function () {
        var position    = window.pageYOffset;
        window.location = 'scroll://' + position;
        $('#scroll_info').html(position);
        // device 로 scroll 값을 보내주네
    }


    zccEditor.setPlaceholder = function ( placeholder ) {

        var editor = zccEditor.$el;

        //set placeHolder
        if ( editor.text().length == 1 ) {
            editor.text(placeholder);
            editor.css("color", "gray");
        }
        //set focus
        editor.focus(function () {
            if ( $(this).text() == placeholder ) {
                $(this).text("");
                $(this).css("color", "black");
            }
        }).focusout(function () {
            if ( !$(this).text().length ) {
                $(this).text(placeholder);
                $(this).css("color", "gray");
            }
        });

    }

    zccEditor.setFooterHeight = function ( footerHeight ) {
        var footer = $('#zss_editor_footer');
        footer.height(footerHeight + 'px');
    }

    zccEditor.getCaretYPosition = function () {
        var sel = window.getSelection();
        // Next line is comented to prevent deselecting selection. It looks like work but if there are any issues will appear then uconmment it as well as code above.
        //sel.collapseToStart();
        var range = sel.getRangeAt(0);
        var span  = document.createElement('span');// something happening here preventing selection of elements
        range.collapse(false);
        range.insertNode(span);
        var topPosition = span.offsetTop;
        span.parentNode.removeChild(span);
        return topPosition;
    }

    zccEditor.calculateEditorHeightWithCaretPosition = function () {
        /*
         var padding       = 50;
         var caretPosition = zccEditor.getCaretYPosition();
         console.log('caretPosition; ', caretPosition);
         var e       = zccEditor.$el[ 0 ];
         var height  = e.offsetHeight;
         var offsetY = window.document.body.scrollTop;
         console.log('calculateEditorHeightWithCaretPosition height: ', height, ' offsetY : ', offsetY);
         var newPos = window.pageYOffset;

         if ( caretPosition < offsetY ) {
         newPos = caretPosition;
         } else if ( caretPosition > (offsetY + height - padding) ) {
         newPos = caretPosition - height + padding - 18;
         }
         console.log('newPos: ', newPos);
         window.scrollTo(0, newPos);*/
    }

    zccEditor.backuprange = function () {
        var selection              = window.getSelection();
        var range                  = selection.getRangeAt(0);
        zccEditor.currentSelection = {
            "startContainer": range.startContainer, "startOffset": range.startOffset,
            "endContainer"  : range.endContainer,
            "endOffset"     : range.endOffset
        };
        return zccEditor.currentSelection;
    }

    zccEditor.restorerange = function () {
        var selection = window.getSelection();
        selection.removeAllRanges();
        var range = document.createRange();
        range.setStart(zccEditor.currentSelection.startContainer, zccEditor.currentSelection.startOffset);
        range.setEnd(zccEditor.currentSelection.endContainer, zccEditor.currentSelection.endOffset);
        selection.addRange(range);
        return range;
    }

    zccEditor.getCurrentRange     = function () {
        var range = document.createRange();
        if ( zccEditor.currentSelection ) {
            range.setStart(zccEditor.currentSelection.startContainer, zccEditor.currentSelection.startOffset);
            range.setEnd(zccEditor.currentSelection.endContainer, zccEditor.currentSelection.endOffset);
        }
        return range;
    };
    zccEditor.getCurrentSelection = function () {
        var selection = window.getSelection();
        var range     = selection.getRangeAt(0);
        return selection;
    };


    zccEditor.getSelectedNode = function () {
        var node, selection;
        if ( window.getSelection ) {
            selection = getSelection();
            node      = selection.anchorNode;
        }
        if ( !node && document.selection ) {
            selection = document.selection;
            var range = selection.getRangeAt ? selection.getRangeAt(0) : selection.createRange();
            node      = range.commonAncestorContainer ? range.commonAncestorContainer :
                range.parentElement ? range.parentElement() : range.item(0);
        }
        if ( node ) {
            return (node.nodeName == "#text" ? node.parentNode : node);
        }
    };

    var execCmds = function ( method, ui, value ) {
        var result = document.execCommand(method, ui, value);
        console.log('result: ', result);
        return result;
    }

    zccEditor.setBold = function () {
        execCmds('bold', false, null);
        zccEditor.enabledEditingItems();
    }

    zccEditor.setItalic = function () {
        execCmds('italic', false, null);
        zccEditor.enabledEditingItems();
    }

    zccEditor.setUnderline = function () {
        execCmds('underline', false, null);
        zccEditor.enabledEditingItems();
    }

    zccEditor.setBlockquote = function () {
        execCmds('formatBlock', false, '<blockquote>');
        zccEditor.enabledEditingItems();
    }

    zccEditor.setPre = function () {
        execCmds('FormatBlock', false, '<pre>');
        zccEditor.enabledEditingItems();
    }

    zccEditor.removeFormating = function () {
        execCmds('removeFormat', false, null);
        execCmds('formatBlock', false, 'div');
        zccEditor.enabledEditingItems();
    }


    zccEditor.setHeading = function ( heading ) {
        var current_selection = $(zccEditor.getSelectedNode());
        var t                 = current_selection.prop("tagName").toLowerCase();
        var is_heading        = (t == 'h1' || t == 'h2' || t == 'h3' || t == 'h4' || t == 'h5' || t == 'h6');
        if ( is_heading && heading == t ) {
            var c = current_selection.html();
            current_selection.replaceWith(c);
        } else {
            execCmds('formatBlock', false, '<' + heading + '>');
        }

        zccEditor.enabledEditingItems();
    }

    zccEditor.setParagraph = function () {
        var current_selection = $(zccEditor.getSelectedNode());
        var t                 = current_selection.prop("tagName").toLowerCase();
        var is_paragraph      = (t == 'p');
        if ( is_paragraph ) {
            var c = current_selection.html();
            current_selection.replaceWith(c);
        } else {
            execCmds('formatBlock', false, '<p>');
        }

        zccEditor.enabledEditingItems();
    }

    // Need way to remove formatBlock
    zccEditor.undo = function () {
        execCmds('undo', false, null);
        zccEditor.enabledEditingItems();
    }

    zccEditor.redo = function () {
        execCmds('redo', false, null);
        zccEditor.enabledEditingItems();
    }

    zccEditor.setJustifyCenter = function () {
        execCmds('justifyCenter', false, null);
        zccEditor.enabledEditingItems();
    }

    zccEditor.setJustifyLeft = function () {
        execCmds('justifyLeft', false, null);
        zccEditor.enabledEditingItems();
    }

    zccEditor.setJustifyRight = function () {
        execCmds('justifyRight', false, null);
        zccEditor.enabledEditingItems();
    }

    zccEditor.setIndent = function () {
        execCmds('indent', false, null);
        zccEditor.enabledEditingItems();
    }

    zccEditor.setOutdent = function () {
        execCmds('outdent', false, null);
        zccEditor.enabledEditingItems();
    }

    zccEditor.setTextColor = function ( color ) {
        //        zccEditor.restorerange();
        execCmds("styleWithCSS", null, true);
        execCmds('foreColor', false, color);
        execCmds("styleWithCSS", null, false);
        setTimeout(function () {
            zccEditor.enabledEditingItems();
        }, 0);
        // execCmds("removeFormat", false, "foreColor"); // Removes just foreColor
    }

    zccEditor.setBackgroundColor = function ( color ) {
        //        zccEditor.restorerange();
        execCmds("styleWithCSS", null, true);
        execCmds('hiliteColor', false, color);
        execCmds("styleWithCSS", null, false);
        setTimeout(function () {
            zccEditor.enabledEditingItems();
        }, 0);
    }

    zccEditor.setForeColor = zccEditor.setTextColor;
    zccEditor.setBackColor = zccEditor.setBackgroundColor;

    zccEditor.prepareInsert = function () {
        zccEditor.backuprange();
    }

    zccEditor.insertImage = function ( url, alt ) {
        zccEditor.restorerange();
        var html = '<img src="' + url + '" alt="' + alt + '" />';
        zccEditor.insertHTML(html);
        zccEditor.enabledEditingItems();
    }

    zccEditor.insertImageBase64String = function ( imageBase64String, alt ) {
        zccEditor.restorerange();
        var html = '<img src="data:image/jpeg;base64,' + imageBase64String + '" alt="' + alt + '" />';
        zccEditor.insertHTML(html);
        zccEditor.enabledEditingItems();
    }

    zccEditor.setHTML = function ( html ) {
        var editor = zccEditor.$el;
        editor.html(html);
    }

    zccEditor.insertHTML = function ( html ) {
        execCmds('insertHTML', false, html);
        zccEditor.enabledEditingItems();
    }


    // CSS normalize
    zccEditor.getHTML = function () {

        // Blockquote
        var bq = $('blockquote');
        if ( bq.length != 0 ) {
            bq.each(function () {
                var b = $(this);
                if ( b.css('border').indexOf('none') != -1 ) {
                    b.css({ 'border': '' });
                }
                if ( b.css('padding').indexOf('0px') != -1 ) {
                    b.css({ 'padding': '' });
                }
            });
        }

        // Get the contents
        var h = zccEditor.$el[ 0 ].innerHTML;

        return h;
    }

    zccEditor.getText = function () {
        return zccEditor.$el.text();
    }

    zccEditor.isCommandEnabled = function ( commandName ) {
        return document.queryCommandState(commandName);
    }


    var cssProps = [ 'backgroundColor', 'color', 'fontSize' ];

    /**
     * iOS 로 커맨
     * @param e
     */
    zccEditor.enabledEditingItems = function ( e ) {
        var items = [];

        if ( zccEditor.isCommandEnabled('bold') ) {
            items.push('bold');
        }
        if ( zccEditor.isCommandEnabled('italic') ) {
            items.push('italic');
        }
        if ( zccEditor.isCommandEnabled('justifyCenter') ) {
            items.push('justifyCenter');
        }
        if ( zccEditor.isCommandEnabled('justifyLeft') ) {
            items.push('justifyLeft');
        }
        if ( zccEditor.isCommandEnabled('justifyRight') ) {
            items.push('justifyRight');
        }
        if ( zccEditor.isCommandEnabled('underline') ) {
            items.push('underline');
        }

        // Heading, Paragraph, Pre, BlockQuote, UL, OL 등의 태그로 선택 영역을 포맷해줌.
        // 이건 해당 웹뷰가 포맷팅을 지원하는지 판단
        var formatBlock = document.queryCommandValue('formatBlock');
        // Editor 상에 표시해주기 위해 보내는듯함.
        // 어차피 우린 Heading 태그는 쓰지 않으니 BlockQuote 냐 Pre 냐 아니냐만 알면 됨
        // Use jQuery to figure out those that are not supported
        if ( typeof(e) != "undefined" ) {
            // The target element
            //            var node = zccEditor.getSelectedNode() || e.target;
            var node = e.target;
            console.log('node:,', node, ' e.target :', e.target);
            var $node    = $(node);
            var nodeName = e.target.nodeName.toLowerCase();
            var cssProp  = $node.css(cssProps);
            if ( e.target !== zccEditor.$el[ 0 ] ) {
                var bgColor = cssProp.backgroundColor;
            }
            var fontSize  = cssProp.fontSize;
            var textColor = cssProp.color;

            items.push('fontSize:' + fontSize);

            // background Color 가 투명이 아닐때만 적용하네
            if ( bgColor && bgColor != 'rgba(0, 0, 0, 0)' && bgColor != 'rgb(0, 0, 0)' && bgColor != 'transparent' ) {
                items.push('backgroundColor:' + bgColor);
            }
            $footer.find('.color-circle.back-color').css('backgroundColor', (bgColor || ''));

            // Text Color
            if ( nodeName === 'font' ) {
                textColor = node && node.color;
                items.push('textColor:' + textColor);
            }
            if ( textColor && textColor != 'rgba(0, 0, 0, 0)' && textColor != 'rgb(0, 0, 0)' && textColor != 'transparent' ) {
                items.push('textColor:' + textColor);
            }
            $footer.find('.color-circle.fore-color').css('backgroundColor', (textColor || ''));
            // Blockquote
            if ( nodeName == 'blockquote' ) {
                items.push('indent');
            }
            if ( nodeName == 'pre' ) {
                items.push('pre');
            }
        }

        console.log('items: ', items);

        // TODO DEBUG
        $footer.find('button').each(function () {
            var action = this.getAttribute('data-action');
            $(this).removeClass('active');
            if ( items.indexOf(action) !== -1 ) {
                $(this).addClass('active');
            }
        });
        if ( items.length > 0 ) {
            if ( zccEditor.isUsingiOS ) {
                //window.location = "zss-callback/"+items.join(',');
                window.location = "callback://0/" + items.join(',');
            } else {
                $ios.html(items.join('<br>'));
            }

        } else {
            if ( zccEditor.isUsingiOS ) {
                window.location = "zss-callback/";
            } else {
                $ios.empty();
            }
        }

    }

    zccEditor.focusEditor = function () {

        // the following was taken from http://stackoverflow.com/questions/1125292/how-to-move-cursor-to-end-of-contenteditable-entity/3866442#3866442
        // and ensures we move the cursor to the end of the editor
        var editor = zccEditor.$el;
        var range  = document.createRange();
        range.selectNodeContents(editor.get(0));
        range.collapse(false);
        var selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        editor.focus();
    }

    zccEditor.blurEditor = function () {
        zccEditor.$el.blur();
    }//end

}($(document), $(window), zss_editor));
