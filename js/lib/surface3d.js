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
        },
        getTranslate : function(d) {
            return "translate(" + d.point + ")";
        },
        getPath : function (d) {
            return d.path;
        },
        getSort : function (a, b) {
            return b.depth - a.depth
        },
        getColor : null
    };

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
        this.node = function() {
            return node;
        };

        /**
         * Set zoom level
         * @param {Number} zoomLevel
         */
        this.setZoom = function (zoomLevel) {
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
                , output = []
                , heights = getHeights(data)
                , x, y
                , xLength = data.length
                , yLength = data[0].length
                ;
            x = xLength;
            a = Math.min(displayWidth, displayHeight) || 1;
            k = 1; //1.41
            kx = a*k/xLength;
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
                ;
            a = Math.min(displayWidth, displayHeight) || 1;
            k = 1; //1.41
            kx = a*k/xLength;
            ky = a*k/yLength;
            var min = lx <= ly ? 1 : 0;
            var valx, valy;
            for(x = -1; x < lx; x++) {
                t = [];
                output.push(t);
                for(y = -1; y < ly; y++) {
                    valx = (x - xLength/2) * kx * zoom;
                    valy = (y - yLength/2) * ky * zoom;

                    t.push(transformPoint([valx, 0, valy]));
                }
            }
            return output;
        };

        svg.getPathColor = function (d) {
            return colorFunction ? colorFunction(d.data) : null;
        };

        /**
         * Rending surface
         * @function
         * @memberOf {Surface}
         */
        var renderSurface = function () {
            var originalData = node.datum()
                , data = getTransformedData(originalData)
                , xLength = data.length
                , yLength = data[0].length
                , d, d0 = []
                , w2 = displayWidth/2
                , h2 = displayHeight/2
                , x, y, px, py, dpx, dpy
                , depth
                , asix = getAsix(xLength, yLength)
            ;

            for (x = 0; x < xLength - 1; x++) {
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
                    d = originalData[x][y];

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
                }
            }

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
            gs.append("circle").attr('r', 2.5);

            dr.selectAll("path")
                .datum(function() {
                    return this.parentNode.__data__
                })
                .attr("fill", svg.getPathColor)
            ;
            /*dr.selectAll("cirlce")
                .attr("fill", svg.getPathColor)
            ;*/

            dr.exit().remove();

            dr.sort(svg.getSort);

            dr = trans
                ? dr.transition()
                    .delay(trans.delay())
                    .duration(trans.duration())
                : dr
            ;

            dr.attr("transform", svg.getTranslate)
                .selectAll("path")
                .attr("d", svg.getPath)
            ;

            //node.selectAll('g.asix').remove();

            px = transformPoint([-0, 0, -0]);

            asix = node.selectAll('g.asix')
                .data([asix.map(function(d){
                        return [d[0][0] + w2 + px[0], d[0][1] + h2 + px[1]];
                    }), asix[xLength + 1].map(function(d){
                        return [d[0] + w2 + px[0], d[1] + h2 + px[1]];
                    })]
                , function(d, i) {
                    return i;
                })
            ;
            asix.enter()
                .append('g')
                .attr('class', 'asix')
                .append('path')
            ;
            asix = asix.selectAll('path')
                .datum(function() {
                    return this.parentNode.__data__
                });

            (trans
                ? asix
                    .transition()
                    .delay(trans.delay())
                    .duration(trans.duration())
                : asix
            ).attr('d', function(d) {
                var path = "", l;
                if (!d || !(l = d.length))
                    return path;
                path = "M" + d[0][0] + ',' + d[0][1];
                for(var i = 1; i < l; i++)
                    path += "L" + d[i][0] + ',' + d[i][1];
                return path;
            });

            node.selectAll('g.asix')
                .each(function(d, i) {
                    asix = d3.select(this)
                        .selectAll('g.asix-text')
                        .data(d.slice(2).map(function(k, j) {
                            return {
                                point : k,
                                name : j >= (i ? yLength - 1 : xLength - 1)
                                    ? ""
                                    : i
                                        ? originalData[0][yLength - j - 2].year
                                        : originalData[xLength - j - 2][0].name
                            }
                        }), function(k) {
                            return k.name
                        })
                    ;
                    gs = asix.enter()
                        .append("g")
                        .attr("class", "asix-text")
                        .attr("transform", "translate(" + [w2, h2] + ")")
                    ;
                    gs.append("circle")
                        .attr("r", 2)
                    ;
                    gs.append('text')
                        .attr("text-anchor", "end")
                        .attr("dx", "-.3em")
                        .attr("dy", ".35em")
                        .text(function(d, j) {
                            return d.name
                        })
                    ;
                    asix.exit().remove();

                    (trans
                        ? asix.transition()
                            .delay(trans.delay())
                            .duration(trans.duration())
                        : asix
                    ).attr("transform", function(d) {
                            return "translate(" + d.point + ")"
                    });
                });
            trans = false;
        };

        this.renderSurface = renderSurface;

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

            /** @lends Surface */
            transition.surfaceHeight = this.surfaceHeight;

            /** @lends Surface */
            transition.surfaceColor = this.surfaceColor;

            /** @lends Surface */
            transition.surfaceCellId = this.surfaceCellId;

            /** @lends Surface */
            transition.surfaceCellOver = this.surfaceCellOver;

            /** @lends Surface */
            transition.surfaceCellOut = this.surfaceCellOut;

            /** @lends Surface */
            transition.surfaceCellMove = this.surfaceCellMove;

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

        var surface = this.node().__surface__;

        //** @lends Surface */
        this.setTurntable = surface.setTurntable;

        //** @lends Surface */
        this.surfaceColor = surface.surfaceColor;

        //** @lends Surface */
        this.surfaceHeight = surface.surfaceHeight;

        this.surfaceCellId = surface.surfaceCellId;

        this.surfaceCellOver = surface.surfaceCellOver;

        this.surfaceCellOut = surface.surfaceCellOut;

        this.surfaceCellMove = surface.surfaceCellMove;

        //** @lends Surface */
        this.zoom = surface.setZoom;

        //** @lends Surface */
        this.setHeight = surface.setHeight;
        surface.setHeight(height);

        //** @lends Surface */
        this.setWidth = surface.setWidth;
        surface.setWidth(width);

        //** @lends Surface */
        this.transition = surface.transition.bind(surface);
        return this;
    };
})();