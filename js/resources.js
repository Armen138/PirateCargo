define("resources", ["events"], function(events) {
    var resources = {
        total: 0,
        loaded: 0,
        images: {},
        load: function(files) {
            function loaded(file) {
                resources.loaded++;
                resources.fire("progress", file);
                if(resources.loaded === resources.total) {
                    resources.fire("load");
                }
            }
            for(var file in files) {
                resources.total++;
                var img = new Image();
                (function(img, file){
                    img.onload = function() {
                        loaded(file);
                    };
                    img.onerror = function() {
                        //fail silently.
                        console.log("failed to load: " + file);
                        loaded(file);
                    };
                }(img, file));
                img.src = files[file];
                resources.images[file] = img;
            }
        }
    };
    events.attach(resources);
    return resources;
});