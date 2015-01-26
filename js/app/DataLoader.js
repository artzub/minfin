/**
 * Created at 23.01.2015
 * @author {@link http://artzub.com|Artem Zubkov}
 */

"use strict";

(function(app){

    /**
     * @param {{beforesend: Function, progress: Function}} [options]
     * @returns {app.DataLoader}
     * @constructor
     */
    app.DataLoader = function(options) {

        var that = this
            , rawData
            , scsv = d3.dsv(';', "text/csv")
            ;

        that.options = {
            'beforesend' : null,
            'progress' : null
        };

        app.merge(options, that.options);

        /**
         * @param callback
         * @returns {DataRequestCallback}
         */
        function dataProcessing(callback) {
            return function(err, data) {
                if (err) {
                    return app.isFun(callback)
                        && callback(err, null);
                }

                rawData = data;

                app.isFun(callback)
                    && callback(null, data);
            }
        }

        /**
         *
         * @param d
         * @param {DataRequestCallback} callback
         */
        function getData(d, callback) {
            var xhr = scsv(d, callback);

            ['beforesend', 'progress'].forEach(function(d) {
                app.isFun(that.options[d])
                    && xhr.on(d, that.options[d]);
            })
        }

        /**
         * Starts loading data from each url into array urls
         * after completed loading run callback (if it's exist)
         * with params: err, data
         * @see DataRequestCallback
         * @param {Array.<string>} urls
         * @param {DataRequestCallback} [callback]
         */
        that.loadData = function(urls, callback) {
            async.concat(
                urls,
                getData,
                dataProcessing(callback)
            )
        };

        return that;
    };

    /**
     * Create instance of DataLoader
     * @param {{beforesend: Function=, progress: Function=}} [options]
     * @see DataLoader
     * @returns {DataLoader}
     */
    app.dataLoader = function(options) {
        return new app.DataLoader(options);
    }
})(app || (app = {}));
