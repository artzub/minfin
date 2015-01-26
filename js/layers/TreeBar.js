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
 * @param {TreeBarOptions} [options]
 * @constructor
 * @implements layers.BaseLayer
 * @see TreeBarOptions
 */
layers.TreeBar = function(options) {

    var that = this
        , root
        , vis
        , i
        , margin = {
            left : 20,
            right : 20,
            bottom : 20,
            top : 20
        }
        ;
    var height
        , width
        ;

    var dispatch = d3.dispatch('select');

    that = d3.rebind(that, dispatch, 'on');

    that.options = {};
    layers.merge(options, that.options);
    that.options.margin = that.options.margin || margin;

    var tree = d3.layout.tree()
            .children(children)
        , diagonal = d3.svg.diagonal()
            .projection(function(d) { return [d.x, d.y]; })
        ;

    function children(d) {
        return d.values;
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

        d3.select(document).on('resize.treeBar', resize);

        root = null;
    }

    function resize() {
        tree.div &&
            tree.size([
                tree.div.node().clientWidth,
                tree.div.node().clientHeight
            ]);
    }

    function toggle(d) {
        if (d.values) {
            d._values = d.values;
            d.values = null;
        } else {
            d.values = d._values;
            d._values = null;
        }
    }

    function depthFilter(d) {
        return d.depth < 5 && d.hasOwnProperty('values')
            && (!d.parent
                || d.key != d.parent.key)
            ;
    }

    function update(source) {
        if (!that.div)
            return;

        var duration = d3.event && d3.event.altKey ? 5000 : 500;

        var mb = that.options.margin.bottom;

        // Compute the new tree layout.
        var nodes = tree.nodes(root).filter(depthFilter).reverse();

        // Update the nodes…
        var node = vis.selectAll("g.node")
            .data(nodes, function(d) {
                d.y = height - (d.depth == 1 ? mb * .3 : (d.depth - 1) * (mb + 26));
                return d.id || (d.id = ++i);
            });

        // Enter any new nodes at the parent's previous position.
        var nodeEnter = node.enter().append("g")
            .attr("class", "node")
            .attr("transform", function(d) { return "translate(" + source.x0 + "," + source.y0 + ")"; })
            .attr('title', function(d) {
                return d.key;
            })
            .on("click", function(d) {
                toggle(d);
                update(d);
                dispatch.select(d);
            });

        nodeEnter.append("rect");

        nodeEnter.append("circle")
            .attr("r", 1e-6)
            .style("fill", function(d) {
                return d._values ? "lightsteelblue" : "#fff";
            });

        nodeEnter.append("text")
            .attr("dy", "1.2em")
            //.attr("dx", ".95em")
            .attr("text-anchor", "middle" /*function(d) { return d.values || d._values ? "middle" : "start"; }*/)
            .text(function(d) {
                return d.key.length > 5 && d.depth > 2
                    ? d.key.substr(0, 5) + '...'
                    : d.key;
            })
            .style("fill-opacity", 1e-6);

        // Transition nodes to their new position.
        var nodeUpdate = node.transition()
            .duration(duration)
            .attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });

        nodeUpdate.select("circle")
            .attr("r", 4.5)
            .style("fill", function(d) {
                return d._values && d != source ? "#919fb9" : "#fff";
            });

        nodeUpdate.select("text")
            .style("fill-opacity", 1)
            ;

        nodeUpdate.selectAll("rect")
            .each(function(d, i) {
                var text = d3.select(this.parentNode).select('text')
                    .node()
                    .getBBox()
                    ;
                d3.select(this).attr('height', text.height + 9)
                .attr('width', text.width + 11)
                .attr('x', -(text.width/2) - 5)
                .attr('y', -1)
            })
        ;

        // Transition exiting nodes to the parent's new position.
        var nodeExit = node.exit().transition()
            .duration(duration)
            .attr("transform", function(d) { return "translate(" + source.x + "," + source.y + ")"; })
            .remove();

        nodeExit.select("circle")
            .attr("r", 1e-6);

        nodeExit.select("text")
            .style("fill-opacity", 1e-6);

        nodeExit.select("rect")
            .attr('height', 1e-6)
            .attr('width', 1e-6);

        // Update the links…
        var link = vis.selectAll("path.link")
            .data(tree.links(nodes.filter(function(d) {
                return d.key != "root";
            })).filter(function(d) {
                return d.target.depth < 5 && d.source.key != d.target.key;
            }), function(d) { return d.target.id; });

        // Enter any new links at the parent's previous position.
        link.enter().insert("svg:path", "g")
            .attr("class", "link")
            .attr("d", function(d) {
                var o = {x: source.x0, y: source.y0};
                return diagonal({source: o, target: o});
            })
            .transition()
            .duration(duration)
            .attr("d", diagonal);

        // Transition links to their new position.
        link.transition()
            .duration(duration)
            .attr("d", diagonal);

        // Transition exiting nodes to the parent's new position.
        link.exit().transition()
            .duration(duration)
            .attr("d", function(d) {
                var o = {x: source.x, y: source.y};
                return diagonal({source: o, target: o});
            })
            .remove();

        // Stash the old positions for transition.
        nodes.forEach(function(d) {
            d.x0 = d.x;
            d.y0 = d.y;
        });

        return that;
    }

    /**
     * @param data
     * @returns {layers.TreeBar}
     */
    that.data = function(data) {
        i = 0;
        root = {
            key : 'root',
            values : data,
            x0 : width / 2,
            y0 : height - (that.options.margin.bottom + 24)
        };

        function toggleAll(d) {
            if (!d.values)
                return;
            d.values.forEach(toggleAll);
            toggle(d);
        }

        data.forEach(toggleAll);
        var has = root.values && root.values.length ? root.values[0] : null;
        has && toggle(has);
        update(root);
        has && dispatch.select(has);
        return that;
    };

    /**
     * @param {Array<Number>} [size]
     * @returns {layers.TreeBar|Array<Number>}
     */
    that.size = function(size) {
        if (!arguments.length)
            return tree.size();

        var m = that.options.margin || margin;

        that.div && that.div
            .attr("width", width)
            .attr("height", height)
        ;

        width = size[0] - m.left - m.right;
        height = size[1] - m.top - m.bottom;

        tree.size([width, height]);
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
