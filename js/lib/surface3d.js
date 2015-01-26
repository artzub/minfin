"use strict";

/**
 * @callback ItemCallback
 * @param d
 */

(function () {

    /**
     * @param {d3.selection} node
     * @constructor
     */
    var Surface = function (node) {
        var heightFunction
            , colorFunction
            , timer
            , transformPrecalc = [];
        var displayWidth = 300
            , displayHeight = 300
            , zoom = 1;
        var trans;

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

        var getHeights = function () {
            var data = node.datum();
            var output = [];
            var x = data.length
                , yL = data[0].length
                , y
                , t
                ;
            while(x--) {
                t = [];
                output.push(t);
                y = yL;
                while(y--) {
                    var value = heightFunction(data[x][y], x, y);
                    t.push(value);
                }
            }
            return output;
        };

        var transformPoint = function (point) {
            var x = transformPrecalc[0] * point[0] + transformPrecalc[1] * point[1] + transformPrecalc[2] * point[2];
            var y = transformPrecalc[3] * point[0] + transformPrecalc[4] * point[1] + transformPrecalc[5] * point[2];
            var z = transformPrecalc[6] * point[0] + transformPrecalc[7] * point[1] + transformPrecalc[8] * point[2];
            return [x, y, z];
        };

        var getTransformedData = function () {
            var data = node.datum();
            if (!heightFunction)
                return [[]];
            var t, output = [];
            var heights = getHeights();
            var x, y
                , xLength = data.length
                , yLength = data[0].length
                ;
            x = xLength;
            var a = Math.min(displayWidth, displayHeight) || 1;
            var k = 1; //1.41
            var kx = a*k/xLength;
            var ky = a*k/yLength;
            while(x--) {
                output.push(t = []);
                y = yLength;
                while(y--) {
                    t.push(transformPoint([
                        (x - xLength / 2) * kx * zoom
                        , heights[x][y] * zoom
                        , (y - yLength / 2) * ky * zoom
                    ]));
                }
            }
            return output;
        };

        /**
         * Rending surface
         * @function
         * @memberOf {Surface}
         */
        var renderSurface = function () {
            var originalData = node.datum();
            var data = getTransformedData();
            var xLength = data.length;
            var yLength = data[0].length;
            var d0 = [];


            for (var x = 0; x < xLength - 1; x++) {
                for (var y = 0; y < yLength - 1; y++) {
                    var depth = data[x][y][2]
                        + data[x + 1][y][2]
                        + data[x + 1][y + 1][2]
                        + data[x][y + 1][2]
                        ;
                    d0.push({
                        path: 'M' + (data[x][y][0] + displayWidth / 2).toFixed(10)
                            + ',' + (data[x][y][1] + displayHeight / 2).toFixed(10)
                            + 'L' + (data[x + 1][y][0] + displayWidth / 2).toFixed(10)
                            + ',' + (data[x + 1][y][1] + displayHeight / 2).toFixed(10)
                            + 'L' + (data[x + 1][y + 1][0] + displayWidth / 2).toFixed(10)
                            + ',' + (data[x + 1][y + 1][1] + displayHeight / 2).toFixed(10)
                            + 'L' + (data[x][y + 1][0] + displayWidth / 2).toFixed(10)
                            + ',' + (data[x][y + 1][1] + displayHeight / 2).toFixed(10) + 'Z',
                        depth: depth,
                        data: originalData[x][y],
                        id : [x, y].join('')
                    });
                }
            }

            var dr = node.selectAll('path').data(d0, function(d) {
                return d.id;
            });
            dr.enter().append("path");
            if (colorFunction) {
                dr.attr("fill", function (d) {
                    return colorFunction(d.data)
                });
            }
            dr.exit().remove();
            dr.sort(function (a, b) {
                return b.depth - a.depth
            });
            if (trans) {
                dr = dr.transition().delay(trans.delay()).duration(trans.duration());
            }
            dr.attr("d", function (d) {
                return d.path;
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