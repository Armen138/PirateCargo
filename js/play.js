define("play", [
        "canvas",
        "resources",
        "topbar",
        "keys",
        "ship",
        "bullet"
    ],function(Canvas, 
            Resources, 
            TopBar,
            keys,
            Ship, 
            Bullet) {
    "strict mode";
    Resources.load({
        "ships": "images/spaceships_1.png"
    });
    var down = {};
    var topBar;
    var bullets = [];
    var before = Date.now();
    var ship = Ship(Resources.images.ships);
    var play = {
        reset: function() {},
        init: function() {
            console.log("play time");
            topBar = TopBar([
                {
                    obj: ship,
                    prop: "ammo",
                    name: "ammo",
                    type: "string"
                }
            ]);
        },
        run: function() {
            var now = Date.now();
            var d = now - before;
            Canvas.clear("black");
            ship.draw();
            if(down[keys.UP] || down[keys.W]) {
                //move hsip forward
                var distance = d * ship.speed;
                var x = ship.position.X + distance * Math.cos(ship.angle);
                var y = ship.position.Y + distance * Math.sin(ship.angle);
                ship.position.X = x;
                ship.position.Y = y;
            }
            for(var i = 0; i < bullets.length; i++) {
                bullets[i].draw();
            }
            topBar.draw();
            before = now;
        },
        keydown:  function(keyCode) {
            down[keyCode] = true;
        },
        keyup: function(keyCode) {
            down[keyCode] = false;
        },
        click: function(mouse) {
            //shoot something
            if(ship.ammo > 0) {
                bullets.push(Bullet({X: ship.position.X, Y: ship.position.Y }, [], {angle: ship.angle}));                
                ship.ammo--;
            }            
        },
        clear: function(cb) { cb(); }
    };

    window.addEventListener("mousemove", function(e) {
            var x = e.clientX - Canvas.position.X;
            var y = e.clientY - Canvas.position.Y;
        ship.angle = Math.atan2((ship.position.X - x), (y - ship.position.Y)) +1.5707963249999999;
    });

    // //this shouldn't be here.
    // var weapons = {
    //     gun: {
    //         toString: function() { return "gun"; },
    //         loadTime: 100,
    //         ammo: Bullet,
    //         sound: "shoot"
    //     },
    //     doubleBarrel: {
    //         toString: function() { return "double shot"; },
    //         loadTime: 150,
    //         ammo: function(position, enemies) {
    //             return Bullet(position, enemies, { "double" : true, damage: 3 });
    //         },
    //         sound: "shoot2"
    //     },
    //     rocket: {
    //         toString: function() { return "rocket"; },
    //         loadTime: 300,
    //         ammo: function(position, enemies) {
    //             return Bullet(position, enemies, { rocket: true, speed: 0.3, damage: 10 });
    //         },
    //         sound: "rocket"
    //     },
    //     homingMissile: {
    //         toString: function() { return "homing missile"; },
    //         loadTime: 900,
    //         ammo: function(position, enemies) {
    //             return Bullet(position, enemies, { rocket: true, speed: 0.3, damage: 10, homing: true });
    //         },
    //         sound: "rocket2"
    //     }
    // };



    // function getPowerup() {
    //     powerupQueue.shift();
    //     Resources.audio.pickup.play();
    //     var blast = new PS.ParticleSystem(effects("powerup", Resources.images.star));
    //     systems.push({
    //         effect: blast,
    //         X: ship.position.X,
    //         Y: ship.position.Y
    //     });
    // }

    // var shieldPowerup = {
    //     image: Resources.images.shield,
    //     action: function() {
    //         getPowerup();
    //         ship.shield = 10;
    //         ship.enableShield = true;
    //     }
    // };

    // var doublePowerup = {
    //     image: Resources.images.doubleshot,
    //     action: function() {
    //         getPowerup();
    //         ship.setWeapon(weapons.doubleBarrel);
    //     }
    // };

    // var rocketPowerup = {
    //     image: Resources.images.rocket,
    //     action: function() {
    //         getPowerup();
    //         ship.setWeapon(weapons.rocket);
    //     }
    // };

    // var homingPowerup = {
    //     image: Resources.images.homing,
    //     action: function() {
    //         getPowerup();
    //         ship.setWeapon(weapons.homingMissile);
    //     }
    // };

    // var healPowerup = {
    //     image: Resources.images.heal,
    //     action: function() {
    //         getPowerup();
    //         ship.hp++;
    //         console.log(ship.hp);
    //     }
    // };

    // var allpowerups = [shieldPowerup, doublePowerup, rocketPowerup, homingPowerup, healPowerup];

    // var enemyTypes = EnemyTypes(ship);
    // var powerupQueue;
    // var down = {};
    // var enemies = [];
    // var powerups = [];
    // var systems = [];
    // var starField = Stars(Canvas);
    // var waves;
    // var topBar;
    // var play = {
    //     score: 0,
    //     mode: "waves",
    //     init: function() {
    //         Resources.audio.strange.play(true);
    //         Resources.audio.shoot.volume(0.5);
    //         Resources.audio.shoot2.volume(0.5);
    //         Resources.audio.rocket.volume(0.5);
    //         Resources.audio.rocket2.volume(0.5);
    //     },
    //     reset: function() {
    //         powerupQueue = [shieldPowerup, doublePowerup, rocketPowerup, homingPowerup, healPowerup,
    //                         shieldPowerup, doublePowerup, rocketPowerup, homingPowerup, healPowerup];
    //         ship.hp = 10;
    //         ship.shield = 0;
    //         ship.position = {X: 400, Y: 500};
    //         ship.currentWeapon = weapons.gun;
    //         play.score = 0;
    //         enemies = [];
    //         powerups = [];
    //         waves = Waves();
    //         topBar = TopBar([

    //             {
    //                 obj: ship,
    //                 prop: "currentWeapon",
    //                 name: "weapon",
    //                 type: "string",
    //                 count: 10,
    //                 countStart: "weaponTime"
    //             },
    //             {
    //                 name: "shield",
    //                 obj: ship,
    //                 prop: "shield",
    //                 type: "bar"
    //             },
    //             {
    //                 name: "score",
    //                 obj: play,
    //                 prop: "score",
    //                 type: "string"
    //             }
    //         ]);
    //     },
    //     clear: function(cb) {
    //         Resources.audio.strange.stop();
    //         cb();
    //     },
    //     run: function() {
    //         var now = Date.now();
    //         var i;
    //         Canvas.clear("black");
    //         starField.draw();
    //         ship.draw();
    //         for(i = enemies.length - 1; i >= 0; --i) {
    //             if(enemies[i].draw()) {
    //                 enemies.splice(i, 1);
    //             }
    //         }
    //         for(i = powerups.length - 1; i >= 0; --i) {
    //             powerups[i].collect({X: ship.position.X, Y: ship.position.Y} );
    //             if(powerups[i].draw()) {
    //                 powerups.splice(i, 1);
    //             }
    //         }
    //         for(i = systems.length -1; i >= 0; --i) {
    //             systems[i].effect.draw(Canvas.element, systems[i].X, systems[i].Y, 17);
    //             if(systems[i].effect.isDone()) {
    //                 systems.splice(i, 1);
    //             }
    //         }
    //         topBar.draw();
    //         /*
    //         if(play.mode === "waves") {
    //             if(!play.lastSpawn || waves.length > 0 && now - play.lastSpawn > waves[0].delay) {
    //                 spawnEnemy(waves[0].type, waves[0].X);
    //                 waves.shift();
    //                 play.lastSpawn = now;
    //             } else {
    //                 if(waves.length === 0) {
    //                     game.state = winner;
    //                     if(play.mode === "survival") {
    //                         if(game.survivalboard) {
    //                             game.survivalboard.post({ score: play.score}, function(response) {
    //                                 console.log(response);
    //                             });
    //                         }
    //                     } else {
    //                         if(game.leaderboard) {
    //                             game.leaderboard.post({ score: play.score}, function(response) {
    //                                 console.log(response);
    //                             });
    //                         }
    //                     }
    //                 }
    //             }
    //         }  else {
    //             if(!play.lastSpawn || now - play.lastSpawn > 600) {
    //                 var types = ["schooner", "pirate", "zipper", "hauler", "tube", "shuttle", "waterhauler"];
    //                 var type = types[Math.random() * types.length | 0];
    //                 spawnEnemy(type, Math.random() * 800 | 0);
    //                 play.lastSpawn = now;
    //             }
    //         }*/
    //     },
    //     controls: {
    //         up: keys.UP,
    //         down: keys.DOWN,
    //         left: keys.LEFT,
    //         right: keys.RIGHT,
    //         fire: keys.SPACE
    //     }
    // };   
    return play;
});