/**
 * Created at 23.01.2015
 * @author {@link http://artzub.com|Artem Zubkov}
 */

var layers = layers || {};

/**
 * @typedef {{
 *  position : string=,
 *  class : string=,
 *  keepOpen : boolean=
 * }} LayerOptions
 */

/**
 * @param {LayerOptions} [options]
 * @constructor
 * @see LayerOptions
 * @implements layers.BaseLayer
 */
layers.Layer = function(options) {
    var that = this;

    /**
     * @type {LayerOptions}
     */
    that.options = {
        position : 'top left',
        class : "",
        keepOpen : false
    };

    layers.merge(options, that.options);

    function onAdd(own) {
        if (that.container == own && that.div) {
            that.div.show();
            return;
        }

        that.container = own;

        that.options.position = that.options.position || "top left";

        that.div = (own.select ? own : d3.select(own))
            .insert('div', 'firstChild')
            .classed([
                that.options.class,
                (that.options.keepOpen ? 'open' : ''),
                that.options.position
            ].join(' '), true);

        that.div.hide = function() {
            this.style('display', 'none');
        };

        that.div.show = function() {
            this.style('display', null);
        };
    }

    /**
     * @inheritDoc
     * @returns {layers.Layer}
     */
    that.addTo = function (own) {
        onAdd(own);
        return that;
    }
};

/**
 * Factory for create instance of {@link layers.Layer}
 * @param {LayerOptions} [options]
 * @returns {layers.Layer}
 * @see layers.Layer
 * @see LayerOptions
 */
layers.layer = function(options) {
    return new layers.Layer(options);
};