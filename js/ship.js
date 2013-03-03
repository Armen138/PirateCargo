define("ship", ["canvas"], function(Canvas) {
    "use strict";
    var Ship = function(image) {
        var ship = {
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
                Canvas.context.restore();
                if(bb) {
                    drawBB();
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
        return ship;
    };
    // var bullets = [];
    // var lastShot = 0;
    // var shield = new PS.ParticleSystem(effects("shield"));
    // var burner = new PS.ParticleSystem(effects("afterburner"));
    // var shieldAngle = 0;
    // var lastShield = 0;
    // var ship = {
    //     width: 25,
    //     height: 22,
    //     position: {X: 400, Y: 500},
    //     hp: 10,
    //     shield: 0,
    //     currentWeapon: weapons.gun,
    //     weaponTime: 0,
    //     enableShield: false,
    //     loadTime: 100,
    //     setWeapon: function(weapon) {
    //         ship.weaponTime = Date.now();
    //         ship.currentWeapon = weapon;
    //     },
    //     hit: function(damage) {
    //         if(ship.shield > 0) {
    //             ship.shield -= damage;
    //             if(ship.shield < 0) {
    //                 ship.hp += ship.shield;
    //                 ship.shield = 0;
    //             }
    //         } else {
    //             ship.hp -= damage;
    //         }
    //         if(ship.hp < 0) {
    //             ship.die();
    //         }
    //         console.log(ship.hp);
    //     },
    //     die: function() {
    //         console.log("death");
    //         game.state = gameover;
    //         if(play.mode === "survival") {
    //             if(game.survivalboard) {
    //                 game.survivalboard.post({ score: play.score}, function(response) {
    //                     console.log(response);
    //                 });
    //             }
    //         } else {
    //             if(game.leaderboard) {
    //                 game.leaderboard.post({ score: play.score}, function(response) {
    //                     console.log(response);
    //                 });
    //             }
    //         }
    //     },
    //     draw: function() {
    //         if(ship.currentWeapon !== weapons.gun && Date.now() - ship.weaponTime > 10000) {
    //             ship.currentWeapon = weapons.gun;
    //             ship.weaponTime = 0;
    //         }
    //         //264,945
    //         //22,25
    //             Canvas.context.save();
    //             var angle = -90 * 0.0174532925;
    //             Canvas.context.translate(ship.position.X, ship.position.Y);
    //             Canvas.context.rotate(angle);
    //             Canvas.context.drawImage(Resources.images.ships, 264, 945, 22, 25, 0 - 11, 0 - 12, 22, 25);
    //             Canvas.context.restore();
    //             var x = ship.position.X + 32 * Math.cos(shieldAngle);
    //             var y = ship.position.Y + 32 * Math.sin(shieldAngle);
    //             shieldAngle += 0.2;
    //             if(shieldAngle > 2 * Math.PI) {
    //                 shieldAngle = 0;
    //             }
    //             burner.draw(Canvas.element, ship.position.X, ship.position.Y + 11, 17);
    //             if(ship.enableShield) {
    //                 shield.draw(Canvas.element, x, y, 17);
    //             }

    //         for(var i = bullets.length -1; i >= 0; --i) {
    //             if(bullets[i].draw()) {
    //                 bullets.splice(i, 1);
    //             }
    //         }

    //         if(down[play.controls.left]) {
    //             ship.left();
    //         }
    //         if(down[play.controls.right]) {
    //             ship.right();
    //         }
    //         if(down[play.controls.up]) {
    //             ship.up();
    //         }
    //         if(down[play.controls.down]) {
    //             ship.down();
    //         }
    //         if(down[play.controls.fire]) {
    //             ship.fire();
    //         }
    //         if(ship.shield <= 0) {
    //             ship.enableShield = false;
    //         }
    //     },
    //     left: function() {
    //         if(ship.position.X < 32) {
    //             ship.position.X = 32;
    //             return;
    //         }
    //         ship.position.X -=10;
    //     },
    //     right: function() {
    //         if(ship.position.X > 768) {
    //             ship.position.X = 768;
    //             return;
    //         }
    //         ship.position.X += 10;
    //     },
    //     up: function() {
    //         if(ship.position.Y < 32) {
    //             ship.position.Y = 32;
    //             return;
    //         }
    //         ship.position.Y -= 10;
    //     },
    //     down: function() {
    //         if(ship.position.Y > 568) {
    //             ship.position.Y = 568;
    //             return;
    //         }
    //         ship.position.Y += 10;
    //     },
    //     fire: function() {
    //         if(Date.now() - lastShot > ship.currentWeapon.loadTime) {
    //             lastShot = Date.now();
    //             bullets.push(ship.currentWeapon.ammo({X: ship.position.X, Y: ship.position.Y - 12}, enemies));
    //             Resources.audio[ship.currentWeapon.sound].play();
    //         }
    //     }
    // };
    return Ship;
});
