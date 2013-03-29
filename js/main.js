/*jshint newcap:false, nonew:true */
/*global console */
require(["game",
        "canvas",
        "play",
        "resources",
        //"keys",
        "menu",
        //"powerup",
        "gamepad"
        ],
    function(
            game,
            Canvas,
            play,
            Resources,
            //keys,
            Menu,
            //Powerup,
            gamePad
            ) {
    "use strict";
    Canvas.size(800, 600);
    Canvas.clear("black");

    Resources.on("load", function() {
        console.log("loaded");
        document.getElementById("loading").style.display = "none";
        game.run();
    });

    Resources.load({
        "ships": "images/spaceships_1.png",
        "logo": "images/piratecargo.png",
        "bomb": "images/fire-bomb.png",
        "chest": "images/chest32.png",
        "sign": "images/sign32.png",
        "bigsign": "images/sign.png",
        "shield": "images/edged-shield.png",
        "doubleshot": "images/double-shot.png",
        "heal": "images/heal.png",
        "rocket": "images/rocket.png",
        "homing": "images/on-target.png",
        "star": "images/star.png",
        "gameover": "images/gameover.png",
        "winner": "images/winner.png",
        "map": "maps/intro.png"
        // "select": "audio/select.ogg",
        // "explosion": "audio/explosion.ogg",
        // "rapidfire": "audio/rapidfire.ogg",
        // "shoot": "audio/shoot.ogg",
        // "shoot2": "audio/shoot2.ogg",
        // "rocketsfx": "audio/rocket.ogg",
        // "rocket2": "audio/rocket2.ogg",
        // "pickup": "audio/pickup.ogg",
        // "strange": "audio/strange.ogg",
        // "enemyshoot": "audio/enemyshoot.ogg",
        // "error": "audio/error.ogg"
    });

    var gameover = Menu(Canvas.element, [
            {
                label: "Restart",
                action: function() {
                    play.reset();
                    game.state = play;
                }
            },
            {
                label: "Menu",
                action: function() {
                    game.state = home;
                }
            },
            {
                label: "High Scores",
                action: function() {
                    if(game.leaderboard) {
                        game.leaderboard.show({});
                    }
                }
            }
        ], Resources.gameover);

    var winner = Menu(Canvas.element, [
            {
                label: "Restart",
                action: function() {
                    play.reset();
                    game.state = play;
                }
            },
            {
                label: "Menu",
                action: function() {
                    game.state = home;
                }
            },
            {
                label: "High Scores",
                action: function() {
                    if(game.leaderboard) {
                        game.leaderboard.show({});
                    }
                }
            }
        ], Resources.winner);

    var paused = Menu(Canvas.element, [
            {
                label: "Resume",
                action: function() {
                    play.getWorld().pausetime = paused.lifetime;
                    game.state = play;
                }
            },
            {
                label: "Menu",
                action: function() {
                    game.state = home;
                }
            },
            {
                label: "High Scores",
                action: function() {
                    if(game.leaderboard) {
                        game.leaderboard.show({});
                    }
                }
            }
        ]);
    var home = Menu(Canvas.element, [
            {
                label: "Play",
                action: function() {
                    play.respawn();
                    play.mode = "waves";
                    game.state = play;
                }
            },
            {
                label: "Credits",
                action: function() {
                    document.getElementById("credits").style.display = "block";
                }
            },
            {
                label: "High Scores",
                action: function() {
                    if(game.leaderboard) {
                        game.leaderboard.show({});
                    }
                }
            }
        ], Resources.logo);

    window.addEventListener("blur", function() {
        if(game.state == play) {
            game.state = paused;
        }
    });



    // gamePad.on("axis", function(e) {
    //     if(e.which === 1) {
    //         if(e.action === "engage") {
    //             if(e.value < 0) {
    //                 down[keys.DOWN] = false;
    //                 down[keys.UP] = true;
    //             } else {
    //                 down[keys.UP] = false;
    //                 down[keys.DOWN] = true;
    //             }
    //         } else {
    //             down[keys.UP] = false;
    //             down[keys.DOWN] = false;
    //         }
    //     }
    //     if(e.which === 0) {
    //         if(e.action === "engage") {
    //             if(e.value < 0) {
    //                 down[keys.RIGHT] = false;
    //                 down[keys.LEFT] = true;
    //             } else {
    //                 down[keys.LEFT] = false;
    //                 down[keys.RIGHT] = true;
    //             }
    //         } else {
    //             down[keys.LEFT] = false;
    //             down[keys.RIGHT] = false;
    //         }
    //     }
    // });
    // gamePad.on("button", function(e) {
    //     if(e.action === "down") {
    //         if(e.which === 0) {
    //             down[keys.SPACE] = true;
    //         }
    //     }
    //     if(e.action === "up") {
    //         if(e.which === 0) {
    //             down[keys.SPACE] = false;
    //         }
    //     }
    // });
    game.paused = paused;
    game.state = home;
});
