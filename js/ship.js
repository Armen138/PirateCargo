/*jshint newcap:false, nonew:true */
/*global console, alert */
define("ship", ["canvas", "bullet", "events"], function(Canvas, Bullet, Events) {
    "use strict";
    var Ship = function(image, world) {
        var dead = false;
        var back = {X:0, Y: 0};
        var before = Date.now();
        var ship = {
            type: "ship",
            boundingbox: [-16, -16, 32, 32],
            position: {X: 300, Y: 300, ship: true},
            ammo: 12,
            hp: 10,
            range: 200,
            angle: 0,
            dirty: false,
            speed: 0.3, //px/ms
            currentSpeed: 0,
            fireDelay: 1000,
            lastShot: 0,
            cargo: 0,
            dead: false,
            inventory: {},
            waypoints: [],
            nextWaypoint: 0,
            target: null,
            setWorld: function(w) {
                world = w;
            },
            distance: function(other) {
                return Math.sqrt((ship.position.X - other.position.X) *
                                (ship.position.X - other.position.X) +
                                (ship.position.Y - other.position.Y) *
                                (ship.position.Y - other.position.Y) );
            },
            shoot: function() {
                if(ship.ammo > 0) {
                    var bullet = Bullet({X: ship.position.X, Y: ship.position.Y}, [], {angle: ship.angle});
                    bullet.owner = ship;
                    world.add(bullet);
                    ship.ammo--;
                }
            },
            draw: function(bb) {
                var now = Date.now();
                var d = now - before;
                if(d > 64) {
                    d = 17;
                }
                Canvas.context.save();
                Canvas.context.translate(ship.position.X, ship.position.Y);
                Canvas.context.rotate(ship.angle);
                Canvas.context.drawImage.apply(Canvas.context, image);
                //Canvas.context.drawImage(image, 234, 807, 57, 39,-27, -19, 57, 39);
                Canvas.context.restore();
                if(bb) {
                    drawBB();
                }
                if(ship.waypoints.length > 0 || ship.target !== null) {
                    var speed = ship.speed;
                    if(ship.target && ship.target.ship) {
                        speed *= 2;
                        if(now - ship.lastShot > ship.fireDelay) {
                            ship.shoot();
                            ship.lastShot = now;
                        }
                    }
                    ship.forward(d, speed);
                    ship.dirty = true;
                }
                if(ship.enemy  && !ship.enemy.dead && ship.distance(ship.enemy) < ship.range) {
                    ship.target = ship.enemy.position;
                } else if(ship.waypoints.length > 0){
                    ship.target = ship.waypoints[ship.nextWaypoint];
                }
                before = now;
                return dead;
            },
            die: function() {
                console.log("kill ship");
                dead = true;
                ship.dead = true;
                ship.fire("death");
            },
            unmove: function(x, y) {
                if(x) ship.position.X = back.X;
                if(y) ship.position.Y = back.Y;
            },
            lastPosition: function() {
                return back;
            },
            forward: function(d, speed) {
                ship.lastForward = Date.now();
                speed = speed || ship.speed;
                ship.currentSpeed = speed;
                if(!ship.target && ship.waypoints.length > 0 && ship.angle === 0 && ship.nextWaypoint === 0) {
                    ship.nextWaypoint++;
                    ship.target = ship.waypoints[ship.nextWaypoint];
                }
                if(ship.target) {
                    ship.angle = Math.atan2((ship.position.X - ship.target.X),
                                            (ship.target.Y - ship.position.Y)) + 1.5707963249999999;
                }

                var distance = d * speed;
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
                        ship.target = ship.waypoints[ship.nextWaypoint];
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
        Events.attach(ship);
        ship.waypoints.next = 0;
        return ship;
    };
    return Ship;
});
