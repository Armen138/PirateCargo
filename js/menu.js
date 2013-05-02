define("menu", ["easing"], function(easing) {
    var color = "rgba(0, 0, 0, 0.7)",
        width = 300,
        buffer = 80,
        duration = 500;


    function hit(index, pos) {
        var rect = {X: 10, Y: 10 + (index * 120), W: 280, H: 100};
        if (pos.X > rect.X &&
            pos.X < rect.X + rect.W &&
            pos.Y > rect.Y && pos.Y < rect.Y + rect.H) {
            return true;
        }
        return false;
    }
    return function(canvas, menu, splash) {
        var start = 0, from, to,
            position = {X: 0, Y: 0},
            context = canvas.getContext("2d"),
            splashX = 0;
        var paused = {
            font: "48px RapscallionRegular",
            click: function(mouse) {
                //menu[0].action();
                if(mouse.X < width) {
                    for(var i = 0; i < menu.length; i++) {
                        if(hit(i, mouse)) {
                            menu[i].action();
                        }
                    }
                }
            },
            run: function() {
                if(start === 0) return;
                var now = Date.now() - start,
                    sign = -1,
                    splashStart = canvas.width;
                if(splash && to < 0) {
                    sign = 1;
                    splashStart = canvas.width - splash.width;
                }
                if(now < duration) {
                    position.X = easing(now, from, to, duration) | 0;
                    if(splash) {
                        splashX = easing(now, splashStart, sign * splash.width, duration) | 0;
                    }
                } else {
                    position.X = from + to;
                    if(splash) {
                        splashX = canvas.width - splash.width;
                    }
                    if(to < 0 && paused.done) {
                        paused.done();
                    }
                }
                context.save();
                context.drawImage(paused.background, 0, 0);
                if(splash) {
                    context.drawImage(splash, splashX, canvas.height / 2 - splash.height / 2)
                }
                context.fillStyle = color;
                context.fillRect(position.X - buffer, position.Y, width + buffer, canvas.height);
                context.translate(position.X, position.Y);

                context.textBaseline = "middle";
                context.textAlign = "center";
                context.font = paused.font;
                for(var i = 0; i < menu.length; i++) {
                    var iconSpace = menu[i].icon ? 37 : 0;
                    if(menu[i].label) {
                        context.fillStyle = color;
                        //context.strokeRect(10, 10 + (i * 120), 280, 100);
                        context.fillStyle = "white";
                        context.fillText(menu[i].label, 10 + 140 + iconSpace, 10 + 50 + (i * 120));
                    }
                    if(menu[i].icon) {
                        context.drawImage(menu[i].icon, 0, 0, menu[i].icon.width, menu[i].icon.height, 37, 37 + (i * 120), 48, 48);
                    }
                }
                context.restore();
            },
            init: function() {
                paused.background = document.createElement("canvas");
                paused.background.width = canvas.width;
                paused.background.height = canvas.height;
                paused.background.getContext("2d").drawImage(canvas, 0, 0);

                start = Date.now();
                from = -width;
                to = width;
                position.X = from;
            },
            lifetime: function() {
                return Date.now() - start;
            },
            clear: function(cb) {
                paused.time = Date.now() - start;
                start = Date.now();
                from = 0;
                to = -width;
                position.X = from;
                paused.done = cb;
            }
        };
        return paused;
    };
});