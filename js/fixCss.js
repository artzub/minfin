!function() {
    var items = document.querySelectorAll('.layer')
        , item
        , ds
        , i = items.length
        ;

    while(i--) {
        item = items[i];
        ds = item.dataset;
        if (!item.style.zIndex && parseInt(item.style.zIndex) !== 0)
            item.style.zIndex = ds.zIndex || 1;
    }
}();