define("bullet", ["ParticleSystem", "canvas", "effects"], function(PS, Canvas, effects) {
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
        var double = options.double || false;
        var south = options.south || false;
        var rocket = options.rocket || false;
        var homing = options.homing || false;
        var damage = options.damage || 1;
        var baseY = position.Y;
        var baseX = position.X;
        var twistAngle = 0;
        var rocketTrail = new PS.ParticleSystem(effects("shield"));
        var trail = new PS.ParticleSystem(effects("bullet"));
        var lastDraw = Date.now();
        var b = {
            dirty: true,
            boundingbox: [-8, -8, 16, 16],
            draw: function(bb) {
                var now = Date.now();
                if(!double) {
                    trail.draw(Canvas.element, position.X, position.Y, 17);
                } else {
                    trail.draw(Canvas.element, position.X - 10, position.Y, 17);
                    trail.draw(Canvas.element, position.X + 10, position.Y, 17);
                }
                if(rocket) {
                    twistAngle += 0.4;
                    var twist = {
                        X: position.X + 16 * Math.cos(twistAngle),
                        Y: position.Y
                    };
                    rocketTrail.draw(Canvas.element, twist.X, twist.Y, 17);
                }
                if(homing && enemies.length > 0) {
                    var closest = null;
                    for(var i = 0; i < enemies.length; i++) {
                        var d = distance(enemies[i].position, position);
                        if(!closest || closest.distance > d) {
                            closest = {
                                distance: d,
                                enemy: enemies[i]
                            };
                        }
                    }
                    var diff ={
                        X: position.X - closest.enemy.position.X,
                        Y: position.Y - closest.enemy.position.Y
                    };
                    if(diff.X < 0) {
                        position.X += (Date.now() - lastDraw) * speed;
                    } else {
                        position.X -= (Date.now() - lastDraw) * speed;
                    }
                    if(diff.Y < 0) {
                        position.Y += (Date.now() - lastDraw) * speed;
                    } else {
                        position.Y -= (Date.now() - lastDraw) * speed;
                    }
                } else {
                    /*var direction = south ? -1 : 1;
                    position.Y = baseY - ((Date.now() - start) * speed) * direction;*/
                    var distance = (now - lastDraw) * 0.5;
                    position.X += distance * Math.cos(options.angle);
                    position.Y += distance * Math.sin(options.angle);
                    //position.X = baseX - ((Date.now() - start) * speed);
                }
                if (position.Y < -10 ||
                    position.Y > Canvas.height + 10 ||
                    position.X < -10 ||
                    position.X > Canvas.width + 10 &&
                     !dead) {
                    trail.kill();
                    rocketTrail.kill();
                    dead = true;
                }

                if(bb) {
                    Canvas.context.strokeStyle = "red";
                    Canvas.context.save();
                    Canvas.context.translate(position.X, position.Y);
                    Canvas.context.strokeRect.apply(Canvas.context, b.boundingbox);
                    Canvas.context.restore();
                }

                if(!dead) {
                    for(var i = 0; i < enemies.length; i++) {
                        if((Math.abs(enemies[i].position.X - position.X) < enemies[i].width / 2) &&
                           (Math.abs(enemies[i].position.Y - position.Y) < enemies[i].height / 2)) {
                            enemies[i].hit(damage);
                            trail.kill();
                            dead = true;
                           }
                    }
                }
                b.dirty = true;
                lastDraw = now;
                if(trail.isDone()) {
                    return true;
                }
                return false;
            }
        };
        return b;
    };
    return bullet;
});
