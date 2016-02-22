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
        , yearReg = /^\d{4}$/
        ;

    var ui = d3.select('#ui')
        , vis = d3.select('#vis').append('div')
        , surfaceContainer = layers.layer().addTo(vis)
        , metricsContainer = layers.layer({position: "top right menu"}).addTo(vis)
        , controls = layers.layer({position: "top right menu"}).addTo(ui)
        , bottomBar = layers.layer({position : "bottom left"}).addTo(ui)
        , df = d3.format(",.2f")
        , dfp = d3.format(",.2%")
        ;

    var templateCell = d3.select("#templateCell").html()
        , templateTreeNode = d3.select("#templateTreeNode").html()
        ;

    var lastOver = {
        cell : {}
        , node : {}
        , year : {}
    };
    var tooltip = d3.helper.tooltip()
        .padding(16)
        .text(function(d) {
            return d
                ? d.data
                    ? textForCell(d)
                    : d.key
                        ? yearReg.test(d.key)
                            ? textForTreeNodeYear(d)
                            : textForTreeNode(d)
                        : ""
                : ""
        });

    function textForTreeNodeYear(d) {
        var delta, pr = 0;
        if(!d)
            return "";

        if (lastOver.node != d) {
            if (lastOver.node) {
                delta = d.value - lastOver.node.value;
                pr = delta / (Math.max(d.value, lastOver.node.value) || 1);
            }
            d.colorClass = !delta ? "" : delta > 0 ? "green" : "red";
            d.lastDelta = !delta ? "" : dfp(Math.abs(pr));
            lastOver.node = d;
        }
        d.valueText = df(d.value);
        d.name = d.tree_id.replace('_' + d.key, '');
        d.year = d.key;

        return template(templateCell, d);
    }

    function textForTreeNode(d) {
        var delta = {
                min : 0,
                max : 0,
                mid : 0,
                value : 0
            },
            pr = {
                min : 0,
                max : 0,
                mid : 0,
                value : 0
            }
            , data
            , max = -Infinity
            , min = Infinity
            ;
        if(!d)
            return "";

        var k = d;
        while((data = safeValues(k))[0].key == k.key)
            k = data[0];
        d.midValue = d3.mean(data, function(k) {
            var value = k.hasOwnProperty('value')
                ? k.value
                : yearReg.test(k.key)
                    ? k.values[0][selectedMetric]
                    : 0
                ;
            max = Math.max(value, max);
            min = Math.min(value, min);
            return value;
        });

        d.minValue = min;
        d.maxValue = max;

        var key, keyObj;

        if (lastOver.node != d) {
            for(key in delta) {
                if(!delta.hasOwnProperty(key))
                    continue;
                keyObj = key == "value" ? key : key + "Value";
                if (lastOver.node) {
                    delta[key] = d[keyObj] - lastOver.node[keyObj];
                    pr[key] = delta[key] / (Math.max(d[keyObj], lastOver.node[keyObj]) || 1);
                }

                key = key == "value" ? "" : key;
                d[key + 'colorClass'] = !delta[key || "value"] ? "" : delta[key || "value"] > 0 ? "green" : "red";
                d[key + 'lastDelta'] = !delta[key || "value"] ? "" : dfp(Math.abs(pr[key || "value"]));
            }
            lastOver.node = d;
        }
        for(key in delta)
            if(delta.hasOwnProperty(key))
                d[key + 'Text'] = df(d[key == "value" ? key : key + "Value"]);

        return template(templateTreeNode, d);
    }

    function textForCell(d) {
        var delta, pr = 0;
        if(!d || !d.data)
            return "";

        if (lastOver.cell != d) {
            if (lastOver.cell && lastOver.cell.data) {
                delta = d.data.value - lastOver.cell.data.value;
                pr = delta / (Math.max(d.data.value, lastOver.cell.data.value) || 1);

            }
            d.data.colorClass = delta > 0 ? "green" : delta < 0 ? "red" : "";
            d.data.lastDelta = !delta ? "" : dfp(Math.abs(pr));
            lastOver.cell = d;
        }
        d.data.valueText = df(d.data.value);

        return template(templateCell, d.data);
    }

    function resize() {
        width = innerWidth;
        height = innerHeight;

        tooltip.spaceWidth(width)
            .spaceHeight(height);
        //tree && tree.resize();
        surface && surface.resize();
    }

    d3.select(window).on('resize', resize);

    bottomBar.div
        .attr('id', 'bottomBar')
        .classed('override', true)
    ;

    function toggleBar() {
        bottomBar.container.classed("open", !bottomBar.container.classed("open"));
    }

    bottomBar.div.append("span").attr("class", "before").on('click', toggleBar);

    setTimeout(toggleBar, 2000);

    bottomBar = layers.layer().addTo(bottomBar.div);

    var treeContainer = bottomBar.div
        .append('div')
        .style({
            'position': 'absolute',
            'width': '100%',
            //'bottom': '4px',
            'height': '176px'
        })
        .attr('class', 'left top')
    ;

    var progress = layers.progressBar().addTo(
        bottomBar.div
            .append('div')
            .style({
                'position' : 'absolute'
                , 'width' : '100%'
                , 'bottom' : '13px'
            })
            .attr('class', 'left bottom')
    );

    progress.div
        .style('height', '4px')
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
        return d.items || d.values || d._values || [];
    }

    function makeMatrix(metric, selected) {
        var result = {}
            , stack = []
            , d = selected
            , value
            , data
            , i, j
            , max = 0
            , years = {}
            , name, year
            , entryDepth = d.depth
            ;

        data = safeValues(d);
        i = data.length;

        var key = entryDepth == 0
            ? 'level'
            : entryDepth == 1
                ? 'subLevel'
                : entryDepth == 2
                ? 'subSubLevel'
                : 'name'
        ;

        while(i--) {
            d = data[i];
            if(yearReg.test(d.key)) {
                d = safeValues(d)[0];

                if (key != 'name' && entryDepth > 1 && d[key] == d['subLevel']) {
                    key = 'name';
                }

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
                if(d.depth > 1 && d.key == d.parent.key && safeValues(d.parent).length > 1)
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
            stack[i] = new Array(j + 1);
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
            stack[i][stack[i].length - 1] = getZero(name, 0);
        }
        stack[stack.length - 1] = years.map(getZero);
        stack[stack.length - 1].push(getZero());

        console.log(stack);
        return stack;
    }

    var currentSurface;
    var surfaceChangeTimer;
    function makeSurface(d, multi) {
        selectedData = d;

        if (!selectedMetric || !metrics[selectedMetric]) {
            var m = Object.keys(metrics);
            selectedMetric = m && m.length ? m[0] : null;
        }

        if (!selectedMetric)
            return;

        if (surfaceChangeTimer)
            clearTimeout(surfaceChangeTimer);

        surfaceChangeTimer = setTimeout(function() {
            currentSurface = surface.appendSurface(
                selectedMetric
                , makeMatrix(selectedMetric, d)
                , multi
            ).surface
                .surfaceCellId(surfaceCellId)
                .surfaceCellOver(surfaceCellOver)
                .surfaceCellOut(surfaceCellOut)
                .surfaceCellMove(tooltip.mousemove)
                .transition()
                .duration(500)
                .surfaceHeight(surfaceHeight)
                .surfaceColor(surfaceColor)
            ;
        }, currentSurface ? 0 : 500);
    }

    var hovered;
    function surfaceCellOver(d) {
        tooltip.mouseover(d);
        hovered = d;
        currentSurface.colorize();
        currentSurface.highlightEdgeByKey(d ? d.data.name : null);
    }

    function surfaceCellOut(d) {
        tooltip.mouseout();
        hovered = null;
        currentSurface.colorize();
        currentSurface.highlightEdgeByKey();
    }

    function surfaceCellId(d, x, y) {
        return d.name ? d.name + y : x + ' ' + y
    }

    function surfaceHeight(d) {
        return -d.normalized * height * .35;
    }

    function surfaceColor(d) {
        var c = d.name ? colors(d.name) : 0;

        var real = hovered;
        if (real && !real.data && selectedData != real.parent)
            real = null;

        var o = real && real.data && d == real.data ? .8 : .5;

        real = real
            ? real.data ? real.data.name : real.key
            : null
        ;

        var s = real && d.name !== real ? .3 : 1;
        c = d3.hsl(c, s, d.name ? 0.5 + d.normalized/2 : 0).rgb();
        return "rgba(" + parseInt(c.r) + "," + parseInt(c.g) + "," + parseInt(c.b) + "," + o + ")";
    }

    function treeColor(d) {
        var key = d.key
            , l = 0
            , mkey = "mv_" + selectedMetric
            ;
        if (yearReg.test(d.key)) {
            key = d.parent.key;
            l = d.parent[mkey] ? d.value / d.parent[mkey] : 0
        }
        var c = d.key ? colors(key) : 0;
        c = d3.hsl(c, 1, .5 + l/2).rgb();
        return "rgb(" + parseInt(c.r) + "," + parseInt(c.g) + "," + parseInt(c.b) + ")";
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

                selectedData && updateTree(selectedData);

                selectedData && makeSurface(selectedData);

                unsetWait();
            })
            .classed("selected", function(d) {
                return d == selectedMetric;
            })
        ;
    }

    !function() {
        var temp = d3.select("#controls").html();
        controls.div.style("top","40%").html(temp);
        controls.div.selectAll("li")
            .on('click', function() {
                var that = d3.select(this).select("span:first-child");

                if(!currentSurface)
                    return;

                if (that.classed("expand-right")) {
                    surface.turntable(0, 0);
                }
                else if (that.classed("expand-left")) {
                    surface.turntable(1.57, 0);
                }
                else if (that.classed("expand-down")) {
                    surface.turntable(1.57, 1.58);
                }
                else if (that.classed("loop")) {
                    surface.turntable(.5, .3);
                }
            })
    }();

    function setWait() {
        d3.select("body").classed('wait', true);
    }
    function unsetWait() {
        d3.select("body").classed('wait', false);
    }

    function treeItemSelect(d) {
        setWait();
        makeSurface(d);
        unsetWait();
    }

    function treeItemOver(d) {
        tooltip.mouseover(d);
        hovered = d;
        currentSurface.colorize();
        currentSurface.highlightEdgeByKey(d ? d.key : null);
    }

    var treeItemOut = surfaceCellOut;

    function initTree(data) {
        if (tree)
            tree.remove();
        else {
            tree = layers.treeBar();
            tree.on('select', treeItemSelect)
            .on('mouseover', treeItemOver)
            .on('mouseout', treeItemOut)
            .on('mousemove', tooltip.mousemove)
            ;
        }

        tree.addTo(treeContainer)
            .color(treeColor)
            .data(data);
    }

    function updateTree(selected) {
        rawData.values.forEach(restructure(rawData));
        tree && tree.data(rawData, selected);
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
            , subSubLevel
            , reg = /^[IVX]+/
            , reg2 = /^\d+/
            , reg3 = /^.\)/
            ;

        data = d3.nest()
            .key(function(d) {
                return d.level;
            })
            .key(function(d) {
                return d.subLevel;
            })
            .key(function(d) {
                return d.subSubLevel;
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
                    subSubLevel = level;
                } else if (reg2.test(d.name)) {
                    subLevel = d.name;
                    subSubLevel = subLevel;
                } else if (reg3.test(d.name)) {
                    subSubLevel = d.name;
                }

                d.level = level;
                d.subLevel = subLevel;
                d.subSubLevel = subSubLevel;

                fixCosts(d);

                return d.year && d.name != "Итого расходов";
            }))
        ;
        rawData = {
            key : "История бюджета 1937 - 1950гг.",
            values : data,
            items : data
        };

        hashNames = Object.keys(hashNames);

        colors
            .range(d3.range(0, 300, 500/(hashNames.length||1)))
            .domain(hashNames);

        progress.position(100)
            .title('Complete!')
        ;

        initMetrics(metrics);

        rawData.values.forEach(restructure(rawData));
        initTree(rawData);
    }

    function restructure(parent) {
        return function (d) {
            if (!d.values)
                return;

            var maxMetricKey;

            d.tree_id = d.key;

            if (yearReg.test(d.key)) {
                d.tree_id = parent.key + '_' + d.key;
                d.metric = d.values[0][selectedMetric];

                maxMetricKey = "mv_" + selectedMetric;

                parent[maxMetricKey] = Math.max(d.metric
                    , typeof parent[maxMetricKey] === "undefined"
                        ? -Infinity
                        : parent[maxMetricKey]
                );
                return;
            }

            var arr = d.values
                , curParent = d
                ;
            if (d.key == parent.key) {
                if (parent.items.length > 1) {
                    d.metric = 0;
                    return;
                }

                parent.items = arr;
                curParent = parent;
            }
            else {
                d.items = arr;
            }

            arr.forEach(restructure(curParent));
        }
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

    // fixed zoom event

    var timerResize;
    d3.select(document.querySelector("#zoomEvent").contentWindow)
        .on('resize', function() {
            if(timerResize)
                clearTimeout(timerResize);
            timerResize = setTimeout(resize, 300);
        })
    ;

    function template(template, item) {
        if (!template || !item)
            return "";

        for(var key in item) {
            if(!item.hasOwnProperty(key))
                continue;
            template = template.replace("{{" + key + "}}", item[key]);
        }

        return template;
    }

    setTimeout(function() {
        d3.select('#info').classed('open', false);
    }, 3000);
})();
