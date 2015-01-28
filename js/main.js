/**
 * Created at 23.01.2015
 * @author {@link http://artzub.com|Artem Zubkov}
 */

"use strict";

(function() {
    var rawData
        , tree
        , width = innerWidth
        , height = innerHeight
        , maxHeight = 250
        , selectedMetric
        , selectedData
        , metrics = {
            total_budget : "Итого по бюджетам"
            , resp_budgets : "Республиканские бюджеты"
            , local_budgets : "Местные бюджеты"
            , union_budget : "Союзный бюджет"
        }
        , colors = d3.scale.ordinal()
            .range(d3.range(50, 300, 20))
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
            'height': '176px'
        })
        .attr('class', 'left bottom')
    ;

    surfaceContainer.div.attr('id', 'surfaceContainer');
    metricsContainer.div.attr('id', 'metricsContainer');

    var surface = layers.surface().addTo(surfaceContainer.div);

    var zero = {
        value : 0,
        data : null,
        normalized : 0
    };
    function getZero(name, year) {
        return name ? {
            value : 0,
            data : null,
            name : name,
            year : year,
            normalized : 0
        } : zero;
    }

    function safeValues(d) {
        return d.values || d._values || [];
    }

    function makeMatrix(metric, selected) {
        var result = {}
            , stack = []
            , reg = /^\d{4}$/
            , d = selected
            , value
            , data
            , i, j
            , max = 0
            , years = {}
            , name, year
            ;

        data = safeValues(d);
        i = data.length;

        var key = d.depth == 1
            ? 'level'
            : d.depth == 2
            ? 'subLevel'
            : 'name'
        ;

        while(i--) {
            d = data[i];
            if(reg.test(d.key)) {
                d = safeValues(d)[0];
                value = result[d[key]];
                if(!value)
                    value = result[d[key]] = {};
                years[d.year] = 1;
                value = value[d.year] = {
                    value : d[metric],
                    data : d
                };
                max = Math.max(value.value, max);
            }
            else {
                stack.push({
                    data : data,
                    i : i
                });
                if(d.depth > 2 && d.key == d.parent.key && safeValues(d.parent).length > 1)
                    break;
                while((data = safeValues(d))[0].key == d.key) {
                    value = d.key;
                    d = data[0];
                }
                i = data.length;
            }
            if (!i && stack.length) {
                d = stack.pop();
                data = d.data;
                i = d.i;
            }
        }

        data = Object.keys(result);
        years = Object.keys(years);
        j = years.length;
        i = data.length;
        if (!i || !j)
            return [[]];

        years.sort().reverse();

        stack = new Array(i + 1);
        while(i--) {
            name = data[i];
            j = years.length;
            stack[i] = new Array(j);
            while(j--) {
                year = years[j];
                value = result[name];
                value = value[year];
                stack[i][j] = value ? {
                    value : value.value,
                    data : value.data,
                    name : name,
                    year : year,
                    normalized : value.value
                        ? value.value/(max||value.value)
                        : 0
                } : getZero(name, year);
            }
        }
        stack[stack.length - 1] = years.map(getZero);

        console.log(stack);
        return stack;
    }


    function makeSurface(d, multi) {
        selectedData = d;

        if (!selectedMetric || !metrics[selectedMetric]) {
            var m = Object.keys(metrics);
            selectedMetric = m && m.length ? m[0] : null;
        }

        if (!selectedMetric)
            return;

        surface.appendSurface(selectedMetric,
            makeMatrix(selectedMetric, d), multi)
            .surface
            .transition()
            .duration(500)
            .surfaceHeight(surfaceHeight)
            .surfaceColor(surfaceColor)
            .surfaceCellId(surfaceCellId)
        ;
    }

    function surfaceCellId(d, x, y) {
        return d.name ? d.name + y : x + ' ' + y
    }

    function surfaceHeight(d) {
        return -d.normalized * height * .35;
    }

    function surfaceColor(d) {
        var c = d.name ? colors(d.name) : 0;
        c = d3.hsl(c, 1, d.name ? 0.5 + d.normalized/2 : 0).rgb();
        return "rgba(" + parseInt(c.r) + "," + parseInt(c.g) + "," + parseInt(c.b) + ",.5)";
    }

    function initMetrics() {
        metricsContainer.div.selectAll('ul')
            .remove();


        if (!metrics || !selectedMetric)
            selectedMetric = null;

        var data = Object.keys(metrics);

        selectedMetric = !selectedMetric
            ? (data && data.length ? data[0] : null)
            : selectedMetric;

        metricsContainer.div
            .append('ul')
            .selectAll('li')
            .data(data)
            .enter()
            .append('li')
            .text(function(d) {
                return metrics[d];
            })
            .on('click', function(d) {
                setWait();
                d3.select(this.parentNode)
                    .selectAll('li')
                    .classed('selected', false)
                ;
                d3.select(this).classed('selected', true);

                selectedMetric = d;
                selectedData && makeSurface(selectedData);

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
                makeSurface(d);
                unsetWait();
            });
        }
        tree.addTo(treeContainer)
            .data(data);
    }

    /**
     * @param {string} cost
     * @returns {number}
     */
    function fixCost(cost) {
        return !cost || cost == "-" ? 0 : parseFloat(cost.replace(',', '.'));
    }

    var costKeys = Object.keys(metrics);
    function fixCosts(d) {
        var key
            , i = costKeys.length
            ;

        while(i--)
            if (d.hasOwnProperty(key = costKeys[i]))
                d[key] = fixCost(d[key]);
    }

    function dataParsing(err, inData) {
        var data = []
            , hashNames = {}
            ;


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
            .entries(inData.filter(function(d) {
                lastName = d.name || lastName;

                if (lastName == "Содержание органов государственного управления") {
                    lastName = "1. " + lastName;
                }
                else if (lastName == "Судебные учреждения, прокуратура и нотариат") {
                    lastName = "2. " + lastName;
                }

                d.name = lastName;
                hashNames[lastName] = 1;

                if (reg.test(d.name)) {
                    level = d.name;
                    subLevel = level;
                } else if (reg2.test(d.name)) {
                    subLevel = d.name;
                }
                d.level = level;
                d.subLevel = subLevel;

                fixCosts(d);

                return d.year && d.name != "Итого расходов";
            }))
        ;
        data = [{
            key : "Исторический бюджет",
            values : data
        }];

        hashNames = Object.keys(hashNames);

        colors
            .range(d3.range(0, 300, 500/(hashNames.length||1)))
            .domain(hashNames);

        data.forEach(function t(d) {
            if (!d.key)
                return;
            console.log(d.key);
            d.values.forEach(t);
        });

        progress.position(100)
            .title('Complete!')
        ;

        initMetrics(metrics);
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