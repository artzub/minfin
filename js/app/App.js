/**
 * Created at 23.01.2015
 * @author {@link http://artzub.com|Artem Zubkov}
 */

/**
 * @callback DataRequestCallback
 * @param {Error|*} err
 * @param data
 */

var app = {
    /**
     * Version of application
     * @type {Number}
     * @const
     */
    version: 0.1,
    /**
     * @param {(Error|*)} err
     * @returns {app}
     */
    logErr : function(err) {
        err && console.error(err);
        return this;
    },
    /**
     * Checks what is param a function
     * @param fun
     * @returns {boolean}
     */
    isFun : function(fun) {
        return typeof fun === "function";
    },
    /**
     * Merge properties of objects from and to
     * @param from
     * @param to
     * @returns {*}
     */
    merge : function(from, to) {
        if (!from || !to)
            return;
        for(var key in from) {
            if (from.hasOwnProperty(key)) {
                to[key] = from[key];
                if (app.isFun(from[key]))
                    to[key] = from[key].bind(to);
            }
        }
        return to;
    }
};
