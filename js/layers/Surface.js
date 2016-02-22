/**
 * Created at 23.01.2015
 * @author {@link http://artzub.com|Artem Zubkov}
 */

"use strict";

var layers = layers || {};

/**
 * @typedef {Object} SurfaceOptions
 * @prop {MarginOptions} [margin]
 * @see MarginOptions
 */

/**
 * @typedef {{
 *  g : d3.selection,
 *  surface : Surface
 * }} GroupItem
 */

/**
 * @param {SurfaceOptions} [options]
 * @constructor
 * @see SurfaceOptions
 * @implements layers.BaseLayer
 */
layers.Surface = function(options) {

    var that = this
        , margin = {
            left : 20,
            right : 20,
            bottom : 20,
            top : 20
        }
        , vis
        , height
        , width
        , groups = {}
        , yaw = .5
        , pitch = .3
        , drag
        ;

    that.options = {};
    layers.merge(options, that.options);
    that.options.margin = that.options.margin || margin;

    function mousedown() {
        drag = [d3.mouse(this), yaw, pitch];
        that.div.style('cursor', 'move')
    }

    function touchstart() {
        drag = [d3.touch(this), yaw, pitch];
        that.div.style('cursor', 'move')
    }

    function mouseup() {
        drag = false;
        that.div.style('cursor', null)
    }

    function touchend() {
        drag = false;
        that.div.style('cursor', null)
    }

    function moveFunc(fun) {
        return function () {
            if (!drag)
                return;

            var mouse = fun(this);
            yaw = drag[1] - (mouse[0] - drag[0][0]) / 50;
            pitch = drag[2] + (mouse[1] - drag[0][1]) / 50;
            pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch));

            Object.keys(groups).forEach(function (key) {
                groups[key]
                && groups[key].surface
                && groups[key].surface.setTurntable(yaw, pitch)
                ;
            });
        }
    }

    var mousemove = moveFunc(d3.mouse);
    var touchmove = moveFunc(d3.touch);

    function onAdd(own) {
        if (that.div)
            return;

        var m = that.options.margin = that.options.margin || margin;

        own = (own.select ? own : d3.select(own));

        that.container = own;

        that.div = own
            .append("svg:svg");

        vis = that.div
            .append("svg:g")
            .attr("transform", "translate(" + m.left + "," + m.top + ")")
        ;

        that.clearAll();

        that.resize();

        that.div.on("mousedown", mousedown)
            .on("touchstart", touchstart)
            .on("mouseup", mouseup)
            .on("touchend", touchend)
            .on("mousemove", mousemove)
            .on("touchmove", touchmove)
        ;

        d3.select(window).on('resize.treeBar', that.resize);
    }

    this.turntable = function(y, p) {
        if (that.div)

        yaw = y;
        pitch = p;
        Object.keys(groups).forEach(function(key) {
            groups[key]
            && groups[key].surface
            && groups[key].surface.setTurntable(yaw, pitch)
            ;
        });
    }

    /**
     * Get item by name
     * @param name
     * @returns {GroupItem}
     * @see GroupItem
     */
    that.getSurfaceByName = function(name) {
        return groups[name];
    };

    /**
     * Remove all items
     * @returns {layers.Surface}
     */
    that.clearAll = function(){
        for(var key in groups){
            if(groups.hasOwnProperty(key)) {
                that.removeByName(key);
            }
        }
        return that;
    };

    /**
     * Remove item by name
     * @param name
     * @returns {layers.Surface}
     */
    that.removeByName = function(name) {

        if (groups[name]) {
            groups[name].g.remove();
            groups[name].surface.remove();
            delete groups[name];
        }

        return that;
    };

    /**
     * @param name
     * @param {Array<Array<Number>>} matrix
     * @param {boolean} [multi=false]
     * @returns {GroupItem|Null}
     * @see GroupItem
     */
    that.appendSurface = function(name, matrix, multi) {
        if(!that.div)
            return null;

        //that.removeByName(name);
        var g;
        if (!multi) {
            for(g in groups) {
                if (!groups.hasOwnProperty(g) || g == name)
                    continue;
                if(groups[name])
                    that.removeByName(g);
                else {
                    groups[name] = groups[g];
                    delete groups[g];
                }
            }
        }

        g = groups[name];

        if (!groups[name])
            groups[name] = {g : that.div.append('g')
                .attr('transform', 'translate(' + [that.options.margin.left, that.options.margin.top] + ')')};
        groups[name].surface = groups[name].g.data([matrix])
            .surface3D(width, height)
            .setTurntable(yaw, pitch)
        ;
        return groups[name];
    };

    /**
     * @inheritDoc
     * @returns {layers.Surface}
     */
    that.addTo = function(own) {
        onAdd(own);
        return that;
    };

    /**
     * Remove layer
     * @returns {layers.Surface}
     */
    that.remove = function() {

        that.clearAll();

        that.div && that.div.remove();
        that.div = null;

        return that;
    };

    /**
     * @param {Array<Number>} [size]
     * @returns {layers.Surface|Array<Number>}
     */
    that.size = function(size) {
        if (!arguments.length)
            return [width, height];


        var m = that.options.margin = that.options.margin || margin;

        that.div && that.div
            .attr("width", width)
            .attr("height", height)
        ;

        width = size[0] - m.left - m.right;
        height = size[1] - m.top - m.bottom;

        Object.keys(groups).forEach(function(key) {
            groups[key]
                && groups[key].surface
                && groups[key].surface
                    .setHeight(height)
                    .setWidth(width)
            ;
        });
    };

    /**
     * Resize surface based on container size
     */
    that.resize = function() {
        width = that.container.node().clientWidth;
        height = that.container.node().clientHeight;

        that.size([width, height]);
    }
};

/**
 * Factory for create instance of {@link layers.Surface}
 * @param {SurfaceOptions} [options]
 * @returns {layers.Surface}
 * @see SurfaceOptions
 */
layers.surface = function(options) {
    return new layers.Surface(options);
};
