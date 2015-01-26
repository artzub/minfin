/**
 * Created by artzub on 21.12.2014.
 */

var layers = {
    merge : function(from, to) {
        for (var i in from) {
            if (from.hasOwnProperty(i))
                to[i] = from[i];
        }
    }
};