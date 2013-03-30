define("bullet", ["canvas", "effects", "particles"], function(Canvas, effects, Particles) {
    function distance(p1, p2) {
        return Math.max(
                Math.abs(p1.X - p2.X),
                Math.abs(p1.Y - p2.Y)
            );
    }
    //TODO retire enemies argument
    var bullet = function(position, enemies, options) {
        if(!options) {
            options = {};
        }
        var particleSettings = effects.bullet();
        particleSettings.position = position;
        var trail = Particles(particleSettings);
        trail.on("death", function() {
            dead = true;
        });
        var lastPosition = {X: position.X, Y: position.Y};
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
                    //dead = true;
                    trail.kill();
            },
            draw: function(bb) {
                var now = Date.now();
                var distance = (now - lastDraw) * 0.5;
                position.X += distance * Math.cos(options.angle);
                position.Y += distance * Math.sin(options.angle);
                travelled += distance;
                //Canvas.context.fillRect(position.X, position.Y, 8, 8);
                if(travelled > range) {
                    //dead = true;
                    trail.kill();
                }

                if(bb) {
                    Canvas.context.strokeStyle = "red";
                    Canvas.context.save();
                    Canvas.context.translate(position.X, position.Y);
                    Canvas.context.strokeRect.apply(Canvas.context, b.boundingbox);
                    Canvas.context.restore();
                }

                b.dirty = true;
                trail.draw();
                lastDraw = now;
                return dead;
            }
        };
        return b;
    };
    return bullet;
});
