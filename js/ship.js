define("ship", ["canvas"], function(Canvas) {
    "use strict";
    var Ship = function(image) {
        var dead = false;
        var back = {X:0, Y: 0};
        var before = Date.now();
        var ship = {
            type: "ship",
            boundingbox: [-16, -16, 32, 32],
            position: {X: 300, Y: 300},
            ammo: 12,
            hp: 10,
            angle: 0,
            dirty: false,
            speed: 0.1, //px/ms
            cargo: 0,
            inventory: {},
            waypoints: [],
            nextWaypoint: 0,
            draw: function(bb) {
                var now = Date.now();
                var d = now - before;
                Canvas.context.save();
                Canvas.context.translate(ship.position.X, ship.position.Y);
                Canvas.context.rotate(ship.angle);
                Canvas.context.drawImage(image, 264, 945, 22, 25,- 11, - 12, 22, 25);
                //Canvas.context.drawImage(image, 234, 807, 57, 39,-27, -19, 57, 39);
                Canvas.context.restore();
                if(bb) {
                    drawBB();
                }
                if(ship.waypoints.length > 0) {
                    ship.forward(d);
                }
                before = now;
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
                if(ship.waypoints.length > 0 && ship.angle === 0 && ship.nextWaypoint === 0) {
                    ship.nextWaypoint++;
                    ship.angle = Math.atan2((ship.position.X - ship.waypoints[ship.nextWaypoint].X),
                                            (ship.waypoints[ship.nextWaypoint].Y - ship.position.Y)) + 1.5707963249999999;
                }
                var distance = d * ship.speed;
                back = {X: ship.position.X, Y: ship.position.Y};
                ship.position.X = ship.position.X + distance * Math.cos(ship.angle);
                ship.position.Y = ship.position.Y + distance * Math.sin(ship.angle);
                if(ship.waypoints.length > 0) {
                    if(Math.abs(ship.position.X - ship.waypoints[ship.nextWaypoint].X) < 32 &&
                       Math.abs(ship.position.Y - ship.waypoints[ship.nextWaypoint].Y) < 32 ) {
                        ship.nextWaypoint++;
                        if(ship.nextWaypoint > ship.waypoints.length - 1) {
                            ship.nextWaypoint = 0;
                        }
                        ship.angle = Math.atan2((ship.position.X - ship.waypoints[ship.nextWaypoint].X),
                                                (ship.waypoints[ship.nextWaypoint].Y - ship.position.Y)) + 1.5707963249999999;
                        //ship.angle
                    }
                }
            }
        };
        var drawBB = function() {
            Canvas.context.save();
            Canvas.context.translate(ship.position.X, ship.position.Y);
            Canvas.context.strokeStyle = "red";
            Canvas.context.strokeRect.apply(Canvas.context, ship.boundingbox);
            Canvas.context.restore();
        };
        ship.waypoints.next = 0;
        return ship;
    };
    return Ship;
});
