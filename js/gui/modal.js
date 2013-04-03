define("gui/modal", ["easing", "canvas", "gui/element"], function(easing, Canvas, Element) {
    var color = "rgba(0, 0, 0, 0.5)",
        buffer = 80,
        duration = 500;

    return function(size) {        
        var start = 0, from, to,
            position = {X: 0, Y: Canvas.height / 2 - size.height / 2 },
            context = Canvas.context;
        var modal = Element({
            font: "48px RapscallionRegular",
            position: position,
            size: size,
            lifetime: function() {
                return Date.now() - start;
            },
            clear: function(cb) {
                modal.time = Date.now() - start;
                start = Date.now();
                from = 0;
                to = -size.width;
                position.X = from;
                modal.done = cb;
            }
        });

        modal.on("init", function() {
            modal.background = document.createElement("canvas");
            modal.background.width = Canvas.width;
            modal.background.height = Canvas.height;
            modal.background.getContext("2d").drawImage(Canvas.element, 0, 0);

            start = Date.now();
            from = -size.width;
            to = (Canvas.width / 2) - (size.width / 2) + size.width;
            position.X = from;
        });
        
        modal.on("run", function() {
            if(start === 0) return;
            var now = Date.now() - start,
                sign = -1;
                
            if(now < duration) {
                position.X = easing(now, from, to, duration) | 0;
            } else {
                position.X = from + to;
                if(to < 0 && modal.done) {
                    modal.done();
                }
            }                
            context.drawImage(modal.background, 0, 0);
            context.fillStyle = color;
            context.fillRect(position.X, position.Y, size.width, size.height);
        });
        return modal;
    };
});