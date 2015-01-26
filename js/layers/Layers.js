/**
 * Created at 23.01.2015
 * @author {@link http://artzub.com|Artem Zubkov}
 */

"use strict";

var layers = {};
layers.merge = app.merge;

/**
 * @interface
 */
layers.BaseLayer = function(){
    /**
     * Insert this layer into own.
     * @param {HTMLElement|d3.selection} own
     * @returns {layers.BaseLayer}
     */
    this.addTo = function(own) {
        return this;
    };
};

/**
 * @typedef {{
 *  top : Number,
 *  bottom : Number,
 *  left : Number,
 *  right : Number
 * }} MarginOptions
 */
