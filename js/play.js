/*jshint newcap:false, nonew:true */
/*global console, alert */
define("play", [
        "canvas",
        "resources",
        "topbar",
        "keys",
        "ship",
        "bullet",
        "world",
        "container",
        "quickbuttons"
    ],function(Canvas,
            Resources,
            TopBar,
            keys,
            Ship,
            Bullet,
            World,
            Container,
            QuickButtons) {
    "use strict";
    Resources.load({
        "ships": "images/spaceships_1.png",
        "chest": "images/chest32.png",
        "sign": "images/sign32.png",
        "bigsign": "images/sign.png",
        "map": "maps/test1.png"
    });
    var down = {};
    var topBar;
    var bullets = [];
    var before = Date.now();
    var ship = Ship(Resources.ships);
    var ship2 = Ship(Resources.ships);
    ship2.position.Y = 600;
    var world = World(Resources.map, Resources);
    var enemies = Container();
    world.add(enemies);
    world.add(ship);
    enemies.add(ship2);
    world.on("collision", function(c) {
        //console.log(c);
        if(c[0].type === "bullet" || c[1].type === "bullet") {
            if ((c[0].owner && c[0].owner !== c[1]) ||
                (c[1].owner && c[1].owner !== c[0])) {
                c[0].die();
                c[1].die();
            }
        } else {
            if(c[1].type === "collisionbox" && c[0].unmove) {
                c[0].unmove(c[2], c[3]);
            }
            //console.log(c[0].type + " <> " + c[1].type);
        }
        if(c[1].type === "powerup") {
            if(!ship.inventory[c[1].name]) {
                ship.inventory[c[1].name] = {};
                ship.inventory[c[1].name].count = 0;
                ship.inventory[c[1].name].button = {
                    label: 0,
                    icon: c[1].image,
                    action: c[1].collect
                };
                QuickButtons.buttons.push(ship.inventory[c[1].name].button);

            }
            ship.inventory[c[1].name].count += 1;
            ship.cargo++;
            ship.inventory[c[1].name].button.label = ship.inventory[c[1].name].count + "";
            //QuickButtons.buttons[0].label = ship.cargo + "";
            c[1].collect();
        }
    });
    function shoot() {
        if(ship.ammo > 0) {
            var bullet = Bullet({X: ship.position.X, Y: ship.position.Y}, [], {angle: ship.angle});
            bullet.owner = ship;
            world.add(bullet);
            ship.ammo--;
        }
    }
    var play = {
        cargo: 6,
        mouse: {X: 0, Y: 0},
        reset: function() {
            ship.ammo = 12;
        },
        init: function() {
            topBar = TopBar([
                {
                    obj: ship,
                    prop: "ammo",
                    name: "ammo",
                    type: "string"
                },
                {
                    obj: ship,
                    prop: "cargo",
                    name: "cargo",
                    type: "string"
                }
            ]);
            QuickButtons.buttons = [];
        },
        run: function() {
            var now = Date.now();
            var d = now - before;
            world.draw();
            if(down[keys.LEFT] || down[keys.A]) {
                ship.angle -= 0.1;
            }
            if(down[keys.RIGHT] || down[keys.D]) {
                ship.angle += 0.1;
            }

            if(down[keys.UP] || down[keys.W]) {
                ship.forward(d);
                if(ship.position.X - world.offset.X < 200) {
                    world.offset.X -= (200 - (ship.position.X - world.offset.X));
                    if(world.offset.X < 0) world.offset.X = 0;
                }
                if(ship.position.X - world.offset.X > 600) {
                    world.offset.X += ship.position.X - world.offset.X - 600;
                    if(world.offset.X > world.width - 800) {
                        world.offset.X = world.width - 800;
                    }
                }
                if(ship.position.Y - world.offset.Y < 200) {
                    world.offset.Y -= (200 - (ship.position.Y - world.offset.Y));
                    if(world.offset.Y < 0) world.offset.Y = 0;
                }
                if(ship.position.Y - world.offset.Y > 400) {
                    world.offset.Y += ship.position.Y - world.offset.Y - 400;
                    if(world.offset.Y > world.height - 600) {
                        world.offset.Y = world.height - 600;
                    }
                }
                ship.dirty = true;
            }
            enemies.each(function(enemy) {
                enemy.angle = Math.atan2((enemy.position.X - ship.position.X), (ship.position.Y - enemy.position.Y)) + 1.5707963249999999;
            });
            for(var i = 0; i < bullets.length; i++) {
                bullets[i].draw();
            }
            topBar.draw();
            QuickButtons.draw();
            Canvas.context.fillRect(play.mouse.X, play.mouse.Y, 10, 10);
            before = now;
        },
        keydown:  function(keyCode) {
            down[keyCode] = true;
            if(keyCode === keys.SPACE) {
                shoot();
            }
        },
        keyup: function(keyCode) {
            down[keyCode] = false;
        },
        click: function(mouse) {
            //shoot something
            shoot();
            QuickButtons.click(mouse);
        },
        mousemove: function(mouse) {
            play.mouse = mouse;
        },
        clear: function(cb) { cb(); }
    };

    /*
    window.addEventListener("mousemove", function(e) {
            var x = e.clientX - Canvas.position.X + world.offset.X;
            var y = e.clientY - Canvas.position.Y + world.offset.Y;
        ship.angle = Math.atan2((ship.position.X - x), (y - ship.position.Y)) + 1.5707963249999999;
    });*/
    return play;
});