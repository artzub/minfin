/**
 * Created at 23.01.2015
 * @author {@link http://artzub.com|Artem Zubkov}
 */

(function() {
    var rawData
        , tree
        , width = innerWidth
        , height = innerHeight
        , selectedMetric
        , selectedData
        , metrics
        ;

    var ui = d3.select('#ui')
        , vis = d3.select('#vis').append('div')
        , surfaceContainer = layers.layer().addTo(vis)
        , metricsContainer = layers.layer({position: "top right"}).addTo(vis)
        , controls = layers.layer().addTo(ui)
        , bottomBar = layers.layer({position : "bottom left"}).addTo(ui)
        ;

    function resize() {
        width = innerWidth;
        height = innerHeight;
    }

    d3.select(window).on('resize', resize);

    bottomBar.div
        .attr('id', 'bottomBar')
        .classed('override', true)
    ;

    var progress = layers.progressBar().addTo(
        bottomBar.div
            .append('div')
            .style('position', 'absolute')
            .style('width', '100%')
            .attr('class', 'left bottom')
    );

    progress.div
        .style('height', '4px')
    ;

    var treeContainer = bottomBar.div
        .append('div')
        .style({
            'position': 'absolute',
            'width': '100%',
            'bottom': '4px',
            'height': '120px'
        })
        .attr('class', 'left bottom')
    ;

    surfaceContainer.div.attr('id', 'surfaceContainer');
    metricsContainer.div.attr('id', 'metricsContainer');

    var surface = layers.surface().addTo(surfaceContainer.div);
    surface.maxHeight(300);

    function getZero() {
        return 0;
    }

    function makeMatrix(metric, d) {
        var result = {}
            , row
            , current = d
            , parent
            , values
            , key
            , stack = []
            , day
            , maxResult = 0
            ;

        var i = rawData.length;
        while(i--) {
            row = rawData[i];
            current = d;
            switch (current.depth) {
                case 3:
                    if (dfW(row.time) != current.key)
                        continue;
                    current = current.parent;
                case 2:
                    if (dfM(row.time) != current.key)
                        continue;
                    current = current.parent;
                case 1:
                    if (dfY(row.time) != current.key)
                        continue;
                    break;
            }
            key = +dfWd(row.time);

            day = result[key];
            if (!day)
                day = result[key] = {};

            key = +dfDH(row.time);
            if (!day[key])
                day[key] = [];
            if (row.hasOwnProperty(metric))
                day[key].push(row[metric].value);
            maxResult = Math.max(maxResult, day[key].length);
        }

        var arr = new Array(7)
            , hour
            ;
        key = arr.length;

        while(key--) {
            day = arr[key] = new Array(23);
            hour = arr[key].length;
            while(hour--) {
                if(!result[key] || !result[key][hour]) {
                    day[hour] = 0;
                    continue;
                }

                stack = result[key][hour];
                if (maxResult > stack.length) {
                    stack = stack.concat(d3.range(0, maxResult - stack.length).map(getZero))
                }

                day[hour] = d3.mean(stack);
            }
        }

        return arr;
    }

    function makeSurface(d, multi) {
        selectedData = d;

        if (!selectedMetric || !metrics[selectedMetric]) {
            var m = Object.keys(metrics);
            selectedMetric = m && m.length ? m[0] : null;
        }

        if (!selectedMetric)
            return;

        surface.appendSurface(selectedMetric, makeMatrix(selectedMetric, d), multi);
    }

    function initMetrics(data) {
        metricsContainer.div.selectAll('ul')
            .remove();


        if (!data || !selectedMetric || !data[selectedMetric])
            selectedMetric = null;

        data = Object.keys(data);
        selectedMetric = !selectedMetric ? (data && data.length ? data[0] : null) : selectedMetric;

        metricsContainer.div
            .append('ul')
            .attr('title', 'Ctrl+Mouse for multi-select')
            .selectAll('li')
            .data(data)
            .enter()
            .append('li')
            .text(function(d) {
                return d;
            })
            .on('click', function(d) {
                setWait();
                (!d3.event || !d3.event.ctrlKey)
                && d3.select(this.parentNode)
                    .selectAll('li')
                    .classed('selected', false)
                ;
                d3.select(this).classed('selected', true);

                selectedMetric = d;
                selectedData && makeSurface(selectedData, d3.event && d3.event.ctrlKey);

                unsetWait();
            })
            .classed("selected", function(d) {
                return d == selectedMetric;
            })
        ;
    }

    function setWait() {
        d3.select("body").classed('wait', true);
    }
    function unsetWait() {
        d3.select("body").classed('wait', false);
    }

    function initTree(data) {
        if (tree)
            tree.remove();
        else {
            tree = layers.treeBar();
            tree.on('select', function(d) {
                setWait();
                //makeSurface(d);
                controls.log(d);
                unsetWait();
            });
        }
        tree.addTo(treeContainer)
            .data(data);
    }

    function dataParsing(err, inData) {
        var data = [];

        progress.title('Analyse data...')
            .position(20)
            .max(100)
        ;

        if(err || !inData || !inData.length) {
            progress.title('Not data!')
                .position(100);
            err && app.logErr(err);
            return initTree(data);
        }

        var lastName
            , level
            , subLevel
            , reg = /^[IVX]+/
            , reg2 = /^\d+/
            ;

        inData.forEach(function(d) {
            lastName = d.name || lastName;
            d.name = lastName;
            if (reg.test(d.name)) {
                level = d.name;
                subLevel = level;
            } else if (reg2.test(d.name)) {
                subLevel = d.name;
            }
            d.level = level;
            d.subLevel = subLevel;
        });

        data = d3.nest()
            .key(function(d) {
                return d.level;
            })
            .key(function(d) {
                return d.subLevel;
            })
            .key(function(d) {
                return d.name;
            })
            .key(function(d) {
                return d.year;
            })
            .entries(inData)
        ;

        data.forEach(function t(d) {
            if (!d.key)
                return;
            console.log(d.key);
            d.values.forEach(t);
        });

        progress.position(100)
            .title('Complete!')
        ;

        //initMetrics(metrics);
        initTree(data);
    }

    app.dataLoader({
        beforesend : function() {
            progress.title('loading...')
                .max(100)
                .position(20);
        },
        progress : function(e) {
            if (!d3.event)
                return;
            e = d3.event;
            progress.max(e.total)
                .position(e.loaded);
        }
    }).loadData(
        ['data/1937-1940.csv', 'data/1941-1945.csv', 'data/1946-1950.csv']
        , dataParsing
    );

    resize();
})();