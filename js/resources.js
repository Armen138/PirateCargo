define("resources", ["events", "racket"], function(events, Racket) {
    var audio = ["wav", "mp3", "ogg"];
    var resources = {
        total: 0,
        loaded: 0,
        images: {},
        audio: {},
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
                if(audio.indexOf(files[file].slice(-3)) !== -1) {
                    (function(file) {
                        resources.audio[file] = Racket.create(files[file], function(success) {
                            if(!success) {
                                console.log("failed to load: " + files[file]);
                            }
                            loaded(file);
                        });
                    }(file));
                } else {
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
        }
    };
    events.attach(resources);
    return resources;
});