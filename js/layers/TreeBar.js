/**
 * Created at 23.01.2015
 * @author {@link http://artzub.com|Artem Zubkov}
 */

"use strict";

var layers = layers || {};

/**
 * @typedef {Object} TreeBarOptions
 * @property {MarginOptions} [margin]
 * @see MarginOptions
 */

/**
 * @callback ItemCallback
 * @param d
 */

/**
 * @param {TreeBarOptions} [options]
 * @constructor
 * @implements layers.BaseLayer
 * @see TreeBarOptions
 */
layers.TreeBar = function(options) {

    var that = this
        , root
        , baseParent
        , vis
        , i
        , margin = {
            left : 20,
            right : 20,
            bottom : 20,
            top : 20
        }
        , height
        , width
        , colorFunction
        , node
        , selected
        ;

    var x = d3.scale.linear();

    var y = d3.scale.linear();

    var dispatch = d3.dispatch('select', 'mouseover', 'mouseout', 'mousemove');

    that = d3.rebind(that, dispatch, 'on');

    that.options = {};
    layers.merge(options, that.options);
    that.options.margin = that.options.margin || margin;

    var partition = d3.layout.partition()
        .children(children)
        .sort(null)
        .value(function(d) {
            return d.metric;
        });

    function children(d) {
        return d.items;//d.values;
    }

    function onAdd(own) {

        if (that.div)
            return;

        var m = that.options.margin || margin;

        own = own instanceof layers.Layer ? own.div : own;
        own = (own.select ? own : d3.select(own));

        that.container = own;

        width = own.node().clientWidth;
        height = own.node().clientHeight;

        that.div = own
            .append("svg:svg");

        vis = that.div
            .append("svg:g")
            .attr("transform", "translate(" + m.left + "," + m.top + ")")
        ;
        that.size([width, height]);

        d3.select(window).on('resize.treeBar', that.resize);

        root = null;
    }

    function nodeColor(d) {
        return colorFunction
            ? typeof colorFunction === "function"
                ? colorFunction(d)
                : colorFunction
            : null;
    }

    function updateNew(source) {
        if (!that.div)
            return;

        var nodes = partition.nodes(source);//.filter(depthFilter).reverse();

        node = vis.selectAll("g.node")
            .data(nodes, function(d) {
                return d.tree_id;
            })
            ;

        var gs = node.enter()
            .append("g")
            .attr("class", "node")
            .on('click', clicked)
            .on('mouseover', function(d) {
                d3.select(this)
                    .select('rect')
                    .style('fill-opacity', .9)
                dispatch.mouseover(d);
            })
            .on('mousemove', function(d) {
                dispatch.mousemove(d);
            })
            .on('mouseout', function(d) {
                d3.select(this)
                    .select('rect')
                    .style('fill-opacity', null)
                dispatch.mouseout(d);
            })
        ;

        gs.filter(function(d) {
                return !d.children
            })
            .on('click', null)
            .style('cursor', 'help')
        ;

        gs.append('title')
            .text(function(d) {
                return d.key;
            })
        ;

        gs.append('rect');

        gs.append('text')
            .attr("text-anchor", "middle")
            .attr("class", "label")
            .attr("dy", ".35em")
            .text(function(d) { return d.key; })
            .each(function() {
                this.textWidth = this.getBBox().width;
            })
        ;

        refreshNode();
    }

    function refreshNode() {
        var trans = node
            .transition()
            .duration(750)
            .attr("transform", nodeTranslate)
        ;

        trans.selectAll("rect")
            .style("fill", nodeColor)
            .attr("width", rectWidth)
            .attr("height", rectHeight);

        trans.selectAll("text")
            .attr("transform", textTranslate)
            .style("display", textDisplay)
        ;
    }

    function nodeTranslate(d) {
        return "translate(" + [x(d.x), y(d.y)] + ")";
    }

    function rectWidth(d) {
        return x(d.x + d.dx) - x(d.x);
    }

    function rectHeight(d) {
        return y(d.y + d.dy) - y(d.y);
    }

    function rectX(d) {
        return x(d.x);
    }

    function rectY(d) {
        return y(d.y);
    }

    function textTranslate(d) {
        var w = rectWidth(d);
        if (w > width && d.depth < root.depth && d == root.parent)
            w = Math.abs(rectX(d)) + width/2;
        else
            w /= 2;
        return "translate(" + (w) + "," + (rectHeight(d) / 2) + ")";
    }

    function textDisplay(d) {
        return this.textWidth > rectWidth(d) - 4 ? "none" : null;
    }

    function clicked(d) {
        x.domain([d.x, d.x + d.dx]);
        y.domain([d.y, 1]).range([d.y ? 20 : 0, height]);

        root = d;
        dispatch.select(d);
        refreshNode();
    }

    function getRoot(root) {
        return !root.parent ? root : getRoot(root.parent);
    }

    /**
     * @param data
     * @returns {layers.TreeBar}
     */
    that.data = function(data, selected) {
        root = data;

        var has = selected != root || !selected;

        selected = selected || root;

        updateNew(root);
        has && clicked(selected);
        return that;
    };

    /**
     * @param {Array<Number>} [size]
     * @returns {layers.TreeBar|Array<Number>}
     */
    that.size = function(size) {
        if (!arguments.length)
            return [width, height];

        var m = that.options.margin || margin;

        that.div && that.div
            .attr("width", size[0])
            .attr("height", size[1])
        ;

        width = size[0] - m.left - m.right;
        height = size[1] - m.top - m.bottom;

        x.range([0, width]);
        y.range([0, height]);

        root && updateNew(getRoot(root), root);
        return that;
    };

    /**
     * Set/get color or function for getting color
     * @param {string|ItemCallback} value
     * @returns {layers.TreeBar|ItemCallback}
     * @see ItemCallback
     */
    that.color = function(value) {
        if(!arguments.length)
            return colorFunction;
        colorFunction = value;
        return that;
    };

    /**
     * @inheritDoc
     * @returns {layers.TreeBar}
     */
    that.addTo = function(own) {
        onAdd(own);
        return that;
    };

    /**
     * Remove the layer
     * @returns {layers.TreeBar}
     */
    that.remove = function() {
        that.div && that.div.remove();
        that.div = null;
        return that;
    };

    /**
     * Resize tree based on container size
     */
    that.resize = function () {
        that.container &&
        that.size([
            that.container.node().clientWidth,
            that.container.node().clientHeight
        ]);
    };
};

/**
 * Factory for create instance of {@link layers.TreeBar}
 * @param {TreeBarOptions} [options]
 * @returns {layers.TreeBar}
 * @see layers.TreeBar
 * @see TreeBarOptions
 */
layers.treeBar = function(options) {
    return new layers.TreeBar(options);
};
