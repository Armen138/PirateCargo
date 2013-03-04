define("ship", ["canvas"], function(Canvas) {
    "use strict";
    var Ship = function(image) {
        var dead = false;
        var back = {X:0, Y: 0};
        var ship = {
            type: "ship",
            boundingbox: [-16, -16, 32, 32],
            position: {X: 300, Y: 300},
            ammo: 12,
            hp: 10,
            angle: 0,
            dirty: false,
            speed: 0.3, //px/ms
            draw: function(bb) {
                Canvas.context.save();
                Canvas.context.translate(ship.position.X, ship.position.Y);
                Canvas.context.rotate(ship.angle);
                Canvas.context.drawImage(image, 264, 945, 22, 25,- 11, - 12, 22, 25);
                //Canvas.context.drawImage(image, 234, 807, 57, 39,-27, -19, 57, 39);
                Canvas.context.restore();
                if(bb) {
                    drawBB();
                }
                return dead;
            },
            die: function() {
                dead = true;
            },
            unmove: function(x, y) {
                if(x) ship.position.X = back.X;
                if(y) ship.position.Y = back.Y;
            },
            forward: function(d) {
                var distance = d * ship.speed;
                back = {X: ship.position.X, Y: ship.position.Y};
                ship.position.X = ship.position.X + distance * Math.cos(ship.angle);
                ship.position.Y = ship.position.Y + distance * Math.sin(ship.angle);
            }
        };
        var drawBB = function() {
            Canvas.context.save();
            Canvas.context.translate(ship.position.X, ship.position.Y);
            Canvas.context.strokeStyle = "red";
            Canvas.context.strokeRect.apply(Canvas.context, ship.boundingbox);
            Canvas.context.restore();
        };
        return ship;
    };
    return Ship;
});
