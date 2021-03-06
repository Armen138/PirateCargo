/*jshint newcap:false, nonew:true */
/*global console, alert */
define("ship", [
    "canvas", 
    "bullet", 
    "events", 
    "effects", 
    "resources",
    "particles"], function(
        Canvas, 
        Bullet, 
        Events, 
        effects,
        Resources, 
        Particles) {
    "use strict";
    var Ship = function(image, world) {
        var dead = false;
        var back = {X:0, Y: 0};
        var before = Date.now();
        var explosion = null;
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
            kills: 0,
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
                    if(ship.inventory.bullets) {
                        ship.inventory.bullets.count = ship.ammo;
                        ship.inventory.bullets.button.label = ship.ammo;
                    }
                    //Resources.shoot.play();
                }
            },
            draw: function(bb) {
                if(explosion !== null) {
                    explosion.draw();
                    return dead;
                }
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
                if(ship.waypoints.length > 0) {
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
                    ship.enemy.seen = true;
                    ship.target = ship.enemy.position;
                } else if(ship.waypoints.length > 0){
                    ship.target = ship.waypoints[ship.nextWaypoint];
                }
                if(ship.target && ship.waypoints.length === 0) {
                    if(Math.abs(ship.position.X - ship.target.X) < 32 &&
                        Math.abs(ship.position.Y - ship.target.Y) < 32) {
                        ship.target = null;
                    }
                }
                before = now;
                return dead;
            },
            die: function() {
                var particleOptions = effects.explosion();
                particleOptions.position = ship.position;
                explosion = Particles(particleOptions);
                ship.dead = true;
                explosion.on("death", function() {
                    dead = true;                    
                    ship.fire("death");                    
                });
                console.log("kill ship");
                //Resources.explosion.play();
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
