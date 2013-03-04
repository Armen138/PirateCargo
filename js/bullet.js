define("bullet", ["canvas"], function(Canvas) {
    function distance(p1, p2) {
        return Math.max(
                Math.abs(p1.X - p2.X),
                Math.abs(p1.Y - p2.Y)
            );
    }
    var bullet = function(position, enemies, options) {
        if(!options) {
            options = {};
        }
        var start = Date.now();
        var speed = options.speed || 0.7;
        var dead = false;
        var damage = options.damage || 1;
        var range = options.range || 256;
        var baseY = position.Y;
        var baseX = position.X;
        var lastDraw = Date.now();
        var travelled = 0;
        var b = {
            type: "bullet",
            position: position,
            dirty: true,
            boundingbox: [-8, -8, 16, 16],
            die: function() {
                    dead = true;
            },
            draw: function(bb) {
                var now = Date.now();
                var distance = (now - lastDraw) * 0.5;
                position.X += distance * Math.cos(options.angle);
                position.Y += distance * Math.sin(options.angle);
                travelled += distance;
                if(travelled > range) {
                    dead = true;
                }

                if(bb) {
                    Canvas.context.strokeStyle = "red";
                    Canvas.context.save();
                    Canvas.context.translate(position.X, position.Y);
                    Canvas.context.strokeRect.apply(Canvas.context, b.boundingbox);
                    Canvas.context.restore();
                }

                b.dirty = true;
                lastDraw = now;
                return dead;
            }
        };
        return b;
    };
    return bullet;
});
