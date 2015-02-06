"use strict";

/**
 * http://bl.ocks.org/supereggbert/aff58196188816576af0
 */

/**
 * @callback ItemCallback
 * @param d - data
 */

/**
 * @callback CellIdCallback
 * @param d - data
 * @param i - index
 * @param j - index
 */

(function () {

    //Cache function
    var svg = {
        getId : function(d) {
            return d.id;
        }
        , getTranslate : function(d) {
            return "translate(" + d.point + ")";
        }
        , getPath : function (d) {
            return d.path;
        }
        , getSort : function (a, b) {
            return b.depth - a.depth
        }
        , getName : function (d) {
            return d.name
        }
        , getTranslateForEdge : function(d) {
            return "translate(" + d[0] + ")";
        }
        , getBasePathForEdge : function(d) {
            var path = "M0,0";
            var arr = d.slice(1).reverse();
            var i = arr.length;
            while(i--) {
                path += "L" + [0, 0];
            }
            return path;
        }
        , getRealPathForEdge : function(d) {
            var path = "M0,0";
            var arr = d.slice(1).reverse();
            var i = arr.length;
            while(i--) {
                path += "L" + arr[i];
            }
            return path;
        }
        , getPathForAsix : function (d) {
            var path = "", l;
            if (!d || !(l = d.length))
                return path;
            path = "M" + d[0][0] + ',' + d[0][1];
            for (var i = 1; i < l; i++)
                path += "L" + d[i][0] + ',' + d[i][1];
            return path;
        }
        , getPathColor : null
    };

    function parentDatum() {
        return this.parentNode.__data__
    }

    /**
     * @param {d3.selection} node
     * @constructor
     */
    var Surface = function (node) {
        var heightFunction
            , colorFunction
            , cellIdFunction
            , cellOverFunction
            , cellOutFunction
            , cellMoveFunction
            , timer
            , transformPrecalc = []
            , displayWidth = 300
            , displayHeight = 300
            , zoom = 1
            , trans
        ;

        /**
         * @returns {d3.selection}
         */
        this.container = function() {
            return node;
        };

        /**
         * Set zoom level
         * @param {Number} zoomLevel
         */
        this.zoom = function (zoomLevel) {
            if (!arguments.length)
                return zoom;
            zoom = zoomLevel;
            if (timer)
                clearTimeout(timer);
            timer = setTimeout(renderSurface, 0);
        };

        var getHeights = function (data) {
            var output = [];
            var x = data.length
                , yL = data[0].length
                , y
                , temp
                , value
                ;
            while(x--) {
                temp = [];
                y = yL;
                while(y--) {
                    value = heightFunction(data[x][y], x, y);
                    temp.push(value);
                }
                output.push(temp);
            }
            return output;
        };

        var transformPoint = function (point) {
            var l = transformPrecalc.length
                , output = new Array(l/3)
                , p0 = point[0]
                , p1 = point[1]
                , p2 = point[2]
                ;
            while((l -= 3) > -1)
                output[~~(l/3)] = transformPrecalc[l] * p0
                    + transformPrecalc[l + 1] * p1
                    + transformPrecalc[l + 2] * p2
                ;
            return output;
        };

        var getTransformedData = function (data, asix) {
            if (!heightFunction || !data || !data.length || !data[0] || !data[0].length)
                return [[]];
            var t, a, k, kx, ky
                , km, am
                , output = []
                , heights = getHeights(data)
                , x, y
                , xLength = data.length
                , yLength = data[0].length
                ;
            x = xLength;
            a = Math.min(displayWidth, displayHeight) || 1;
            k = 1; //1.41
            kx = a*k/(xLength);
            ky = a*k/yLength;
            while(x--) {
                t = [];
                output.push(t);
                y = yLength;
                while(y--) {
                    t.push(transformPoint([
                        (x - xLength / 2) * kx * zoom
                        , asix ? 0 : heights[x][y] * zoom
                        , (y - yLength / 2) * ky * zoom
                    ]));
                }
            }
            return output;
        };

        var getAsix = function (lx, ly) {
            var t, a, k, kx, ky
                , output = []
                , x, y
                , xLength = lx++
                , yLength = ly++
                , xhl = xLength/2
                , yhl = yLength/2
                ;
            a = Math.min(displayWidth, displayHeight) || 1;
            k = 1; //1.41
            kx = a*k/(xLength);
            ky = a*k/yLength;
            var valx, valy;
            for(x = -1; x < lx; x++) {
                t = [];
                output.push(t);
                for(y = -1; y < ly; y++) {
                    valx = (x - xhl) * kx * zoom;
                    valy = (y - yhl) * ky * zoom;

                    if (!(xLength - x))
                        valx = (x -.8 - xhl) * kx * zoom;
                    else if (x < 0)
                        valx = (-.2 - xhl) * kx * zoom;

                    if (!(yLength - y))
                        valy = (y -.8 - yhl) * ky * zoom;
                    if (y < 0) {
                        valy = (-.2 - yhl) * ky * zoom;
                    }

                    t.push(transformPoint([valx, 0, valy]));
                }
            }
            return output;
        };

        svg.getPathColor = function (d) {
            return colorFunction ? colorFunction(d.data) : null;
        };

        function drawCells(data, originData, xLength, yLength, w2, h2) {
            var d, d0 = [], d1 = new Array(xLength - 1)
                , x, y, px, py, dpx, dpy
                , d1px = w2, d1py = h2
                , depth
            ;

            for (x = 0; x < xLength - 1; x++) {

                d1[x] = d1[x] || [];

                for (y = 0; y < yLength - 1; y++) {
                    depth = data[x][y][2]
                    + data[x + 1][y][2]
                    + data[x + 1][y + 1][2]
                    + data[x][y + 1][2]
                    ;
                    px = data[x][y][0] + w2;
                    py = data[x][y][1] + h2;
                    dpx = w2 - px;
                    dpy = h2 - py;
                    d = originData[x][y];

                    d0.push({
                        path: 'M0,0'
                        + 'L' + (data[x + 1][y][0] + dpx).toFixed(10)
                        + ',' + (data[x + 1][y][1] + dpy).toFixed(10)
                        + 'L' + (data[x + 1][y + 1][0] + dpx).toFixed(10)
                        + ',' + (data[x + 1][y + 1][1] + dpy).toFixed(10)
                        + 'L' + (data[x][y + 1][0] + dpx).toFixed(10)
                        + ',' + (data[x][y + 1][1] + dpy).toFixed(10) + 'Z'
                        , depth: depth
                        , point: [px.toFixed(10), py.toFixed(10)]
                        , data: d
                        , id : cellIdFunction
                            ? cellIdFunction(d, x, y)
                            : [x, y].join('')
                    });

                    d1[x].id = d1[x].id || d.name;

                    if (!d1[x].length) {
                        d1[x].push([px, py]);
                        d1px = w2 - px;
                        d1py = h2 - py;
                    }
                    d1[x].push([data[x][y + 1][0] + d1px, data[x][y + 1][1] + d1py]);
                }
            }

            //start cells
            var dr = node.selectAll('g.cell')
                .data(d0, svg.getId)
            ;

            var gs = dr.enter()
                .append('g')
                .attr('class', 'cell')
                .on('mouseover', cellOverFunction)
                .on('mouseout', cellOutFunction)
                .on('mousemove', cellMoveFunction)
                .attr('transform', 'translate(' + [w2, h2] + ')')
            ;
            gs.append("path");

            dr.selectAll("path")
                .datum(parentDatum)
                .attr("fill", svg.getPathColor)
            ;

            dr.exit().style('display', "none");

            dr.sort(svg.getSort);

            dr = trans
                ? dr.transition()
                    .delay(trans.delay())
                    .duration(trans.duration())
                : dr
            ;

            dr.attr("transform", svg.getTranslate)
                .style('display', null)
                .selectAll("path")
                .attr("d", svg.getPath)
            ;
            //end cells

            //start dots
            dr = node.selectAll('g.dot')
                    .data(d0, svg.getId)
                ;

            gs = dr.enter()
                    .append('g')
                    .attr('class', 'dot')
                    .on('mouseover', cellOverFunction)
                    .on('mouseout', cellOutFunction)
                    .on('mousemove', cellMoveFunction)
                    .attr('transform', 'translate(' + [w2, h2] + ')')
                ;
            gs.append("circle").attr('r', 2.5);

            dr.exit().style('display', "none");

            dr.sort(svg.getSort);

            dr = trans
                ? dr.transition()
                .delay(trans.delay())
                .duration(trans.duration())
                : dr
            ;

            dr.style('display', null)
                .attr("transform", svg.getTranslate);
            //end dots

            dr = node.selectAll('g.edge')
                .data(d1, svg.getId)
            ;

            dr.enter()
                .append('g')
                .attr('class', 'edge')
                .attr('transform', 'translate(' + [w2, h2] + ')')
                .append('path')
                .attr("d", svg.getBasePathForEdge)
            ;

            dr.selectAll('path')
                .datum(parentDatum);

            dr.exit().style('display', "none");

            dr = trans
                ? dr.transition()
                    .delay(trans.delay())
                    .duration(trans.duration())
                : dr
            ;

            dr.style('display', null)
                .attr("transform", svg.getTranslateForEdge)
                .selectAll('path')
                .attr("d", svg.getRealPathForEdge)
                ;

        }

        function drawAsix(originData, xLength, yLength, w2, h2) {
            var px = transformPoint([-0, 0, -0]);

            var asix = getAsix(xLength, yLength);

            asix = node.selectAll('g.asix')
                .data([asix.map(function (d) {
                    return [d[0][0] + w2 + px[0], d[0][1] + h2 + px[1]];
                }), asix[xLength + 1].map(function (d) {
                    return [d[0] + w2 + px[0], d[1] + h2 + px[1]];
                })]
                , function (d, i) {
                    return i;
                })
            ;
            asix.enter()
                .append('g')
                .attr('class', 'asix')
                .append('path')
            ;
            asix = asix.selectAll('path')
                .datum(parentDatum);

            (trans
                ? asix
                .transition()
                .delay(trans.delay())
                .duration(trans.duration())
                : asix
            ).attr('d', svg.getPathForAsix);

            node.selectAll('g.asix').each(function(d, i) {
                var that = d3.select(this)
                    .selectAll('g.asix-text')
                    .data(d.slice(2).map(function (k, j) {
                        return {
                            point: k,
                            name: j >= (i ? yLength - 1 : xLength - 1)
                                ? ""
                                : i
                                ? originData[0][yLength - j - 2].year
                                : originData[xLength - j - 2][0].name
                        }
                    }), function (k) {
                        return k.name
                    });
                asixAppend.apply(that, [i]);
            });
        }

        function overEdgeByKey(key) {
            node.selectAll('.edge path')
                .filter(function(b) {
                    return b.id == key
                })
                .style('stroke-opacity', 1)
                .style('stroke-width', '4px')
            ;
        }

        function outEdge() {
            node.selectAll('.edge path')
                .style('stroke-opacity', null)
                .style('stroke-width', null)
            ;
        }

        /**
         * @param i
         * @this d3.selection
         */
        function asixAppend(i) {
            var asix = this;
            var gs = asix.enter()
                .append("g")
                .attr("class", "asix-text")
                .attr("transform", "translate(" + [displayWidth/2, displayHeight/2] + ")")
                .on('mouseover', function(k) {
                    !i && overEdgeByKey(k.name);
                })
                .on('mouseout', function(k) {
                    !i && outEdge();
                })
            ;
            gs.append("circle").attr("r", 2);
            gs.append('text')
                .attr("text-anchor", function() {
                    return i ? "middle" : "end";
                })
                .attr("dx", function() {
                    return i ? ".3em" : "-.3em";
                })
                .attr("dy", function() {
                    return i ? "1em" : ".35em";
                })
                .text(svg.getName)
            ;

            asix.exit().remove();

            (trans
                ? asix.transition()
                .delay(trans.delay())
                .duration(trans.duration())
                : asix
            ).attr("transform", svg.getTranslate);
        }

        /**
         * Rending surface
         * @function
         * @memberOf {Surface}
         */
        var renderSurface = function () {
            var originData = node.datum()
                , data = getTransformedData(originData)
                , xLength = data.length
                , yLength = data[0].length
                , w2 = displayWidth/2
                , h2 = displayHeight/2
            ;

            drawCells(data, originData, xLength, yLength, w2, h2);
            drawAsix(originData, xLength, yLength, w2, h2);
            trans = false;
        };

        this.renderSurface = renderSurface;

        /**
         * @returns {Surface}
         */
        this.colorize = function() {
            node.selectAll(".cell path")
                .attr("fill", svg.getPathColor);
            return this;
        };

        /**
         * @param key
         * @returns {Surface}
         */
        this.highlightEdgeByKey = function(key) {
            key ? overEdgeByKey(key) : outEdge();
            return this;
        };

        /**
         * @param yaw
         * @param pitch
         * @returns {Surface}
         */
        this.setTurntable = function (yaw, pitch) {
            var cosA = Math.cos(pitch);
            var sinA = Math.sin(pitch);
            var cosB = Math.cos(yaw);
            var sinB = Math.sin(yaw);
            transformPrecalc[0] = cosB;
            transformPrecalc[1] = 0;
            transformPrecalc[2] = sinB;
            transformPrecalc[3] = sinA * sinB;
            transformPrecalc[4] = cosA;
            transformPrecalc[5] = -sinA * cosB;
            transformPrecalc[6] = -sinB * cosA;
            transformPrecalc[7] = sinA;
            transformPrecalc[8] = cosA * cosB;
            if (timer)
                clearTimeout(timer);
            timer = setTimeout(renderSurface, 0);
            return this;
        };

        this.setTurntable(0.5, 0.5);

        /**
         * @param {ItemCallback} [callback]
         * @returns {Surface|Function}
         * @see ItemCallback
         */
        this.surfaceColor = function (callback) {
            if(!arguments.length)
                return colorFunction;

            colorFunction = callback;
            if (timer)
                clearTimeout(timer);
            timer = setTimeout(renderSurface, 0);
            return this;
        };

        /**
         * @param {ItemCallback} [callback]
         * @returns {Surface|Function}
         * @see ItemCallback
         */
        this.surfaceHeight = function (callback) {
            if(!arguments.length)
                return heightFunction;

            heightFunction = callback;
            if (timer)
                clearTimeout(timer);
            timer = setTimeout(renderSurface, 0);
            return this;
        };

        /**
         * @param {CellIdCallback} [callback]
         * @returns {Surface|Function}
         * @see CellIdCallback
         */
        this.surfaceCellId = function (callback) {
            if(!arguments.length)
                return cellIdFunction;

            cellIdFunction = callback;
            if (timer)
                clearTimeout(timer);
            timer = setTimeout(renderSurface, 0);
            return this;
        };

        /**
         * @param {ItemCallback} [callback]
         * @returns {Surface|Function}
         * @see ItemCallback
         */
        this.surfaceCellOver = function (callback) {
            if(!arguments.length)
                return cellOverFunction;

            cellOverFunction = callback;
            if (timer)
                clearTimeout(timer);
            timer = setTimeout(renderSurface, 0);
            return this;
        };

        /**
         * @param {ItemCallback} [callback]
         * @returns {Surface|Function}
         * @see ItemCallback
         */
        this.surfaceCellOut = function (callback) {
            if(!arguments.length)
                return cellOutFunction;

            cellOutFunction = callback;
            if (timer)
                clearTimeout(timer);
            timer = setTimeout(renderSurface, 0);
            return this;
        };

        /**
         * @param {ItemCallback} [callback]
         * @returns {Surface|Function}
         * @see ItemCallback
         */
        this.surfaceCellMove = function (callback) {
            if(!arguments.length)
                return cellMoveFunction;

            cellMoveFunction = callback;
            if (timer)
                clearTimeout(timer);
            timer = setTimeout(renderSurface, 0);
            return this;
        };


        /**
         * @returns {d3.selection.transition}
         */
        this.transition = function () {
            var transition = d3.selection.prototype.transition.bind(node)();
            colorFunction = null;
            heightFunction = null;

            for(var key in this)
                if(this.hasOwnProperty(key))
                    transition[key] = this[key];

            trans = transition;
            return transition;
        };

        /**
         * @param {Number} [height]
         * @returns {Surface|Number}
         */
        this.setHeight = function (height) {
            if(!arguments.length || !height)
                return displayHeight;

            if (height) {
                displayHeight = height;
                if (timer)
                    clearTimeout(timer);
                timer = setTimeout(renderSurface, 0);
            }
            return this;
        };

        /**
         * @param {Number} [width]
         * @returns {Surface|Number}
         */
        this.setWidth = function (width) {
            if(!arguments.length || !width)
                return displayWidth;

            if (width) {
                displayWidth = width;
                if (timer)
                    clearTimeout(timer);
                timer = setTimeout(renderSurface, 0);
            }
            return this;
        };
    };

    /**
     * @param width
     * @param height
     * @returns {d3.selection}
     */
    d3.selection.prototype.surface3D = function (width, height) {
        if (!this.node().__surface__)
            /**
             * @type {Surface}
             * @private
             */
            this.node().__surface__ = new Surface(this);

        var surface = this.node().__surface__
            , key
            ;

        for(key in surface)
            if(surface.hasOwnProperty(key))
                this[key] = surface[key];

        surface.setHeight(height);
        surface.setWidth(width);
        this.transition = surface.transition.bind(surface);
        return this;
    };
})();