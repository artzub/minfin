/**
 * Created at 23.01.2015
 * @author {@link http://artzub.com|Artem Zubkov}
 */

var layers = layers || {};

/**
 * ProgressBar
 * @param {Object} [options]
 * @constructor
 * @implements layers.BaseLayer
 */
layers.ProgressBar = function(options) {

    var that = this;
    var max
        , pos
        , spanTitle
        , bar
    ;

    function onAdd(own) {
        own = own instanceof layers.Layer ? own.div : own;
        own = (own.select ? own : d3.select(own));

        that.container = own;

        that.div = own.append('div')
            .attr('class', 'progress')
        ;

        var p = that.div.append('div');
        spanTitle = p.append('span');
        bar = p.append('div');
        that.max(1);
        that.position(0);
    }

    /**
     * @inheritDoc
     * @returns {layers.ProgressBar}
     */
    that.addTo = function(own) {
        onAdd(own);
        return that;
    };

    /**
     * Set/get max value for bar
     * @param {Number} [value]
     * @returns {layers.ProgressBar|Number}
     */
    that.max = function(value) {
        if (arguments.length < 1)
            return max || 1;
        max = Math.abs(value) || 1;
        return that;
    };

    /**
     * Set/get title of progress bar
     * @param {*} [title]
     * @returns {layers.ProgressBar|String}
     */
    that.title = function(title) {
        if (arguments.length < 1)
            return spanTitle.text() || 0;
        spanTitle.text(title);
        return that;
    };

    /**
     * Set/get current position of bar
     * @param {Number} [value]
     * @returns {layers.ProgressBar|Number}
     */
    that.position = function(value) {
        if (arguments.length < 1)
            return pos || 0;

        pos = Math.abs(value || 0);

        bar.style('width', (pos / that.max() * 100) + '%');

        that.div.style('display', pos < that.max() ? null : 'none');

        return that;
    };
};

/**
 * Factory for create instance of {@link layers.ProgressBar}
 * @param {Object} [options]
 * @returns {layers.ProgressBar}
 */
layers.progressBar = function(options) {
    return new layers.ProgressBar(options);
};
