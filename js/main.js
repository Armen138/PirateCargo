/*jshint newcap:false, nonew:true */
/*global console */
require(["game",
        "canvas",
        "play",
        "resources",
        //"keys",
        "menu",
        //"stars",
        //"enemy",
        //"enemyTypes",
        //"effects",
        //"bullet",
        //"powerup",
        //"topbar",
        "gamepad",
        //"waves",
        "racket"
        //"raf"
        //"ParticleSystem",
        //"stats.min"
        ],
    function(
            game,
            Canvas,
            play,
            Resources,
            //keys,
            Menu,
            //Stars,
            //Enemy,
            //EnemyTypes,
            //effects,
            //Bullet,
            //Powerup,
            //TopBar,
            gamePad,
            //Waves,
            racket
            //raf
            //PS
            ) {
    "use strict";
    Canvas.size(800, 600);

    Resources.on("load", function() {
        console.log("loaded");
        document.getElementById("loading").style.display = "none";
        game.run();
    });

    Resources.load({
        "ships": "images/spaceships_1.png",
        "logo": "images/piratecargo_inverted.png",
        "bomb": "images/fire-bomb.png",
        "shield": "images/edged-shield.png",
        "doubleshot": "images/double-shot.png",
        "heal": "images/heal.png",
        "rocket": "images/rocket.png",
        "homing": "images/on-target.png",
        "star": "images/star.png",
        "gameover": "images/gameover.png",
        "winner": "images/winner.png",
        "map": "maps/test1.png"
    });

    Resources.audio = {
        "select": racket.create("audio/select.ogg"),
        "explosion": racket.create("audio/explosion.ogg"),
        "rapidfire": racket.create("audio/rapidfire.ogg"),
        "shoot": racket.create("audio/shoot.ogg"),
        "shoot2": racket.create("audio/shoot2.ogg"),
        "rocket": racket.create("audio/rocket.ogg"),
        "rocket2": racket.create("audio/rocket2.ogg"),
        "pickup": racket.create("audio/pickup.ogg"),
        "strange": racket.create("audio/strange.ogg"),
        "enemyshoot": racket.create("audio/enemyshoot.ogg"),
        "error": racket.create("audio/error.ogg")
    };
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
        ], Resources.images.gameover);

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
        ], Resources.images.winner);

    var paused = Menu(Canvas.element, [
            {
                label: "Resume",
                action: function() {
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
                    //alert("play");
                    play.reset();
                    play.mode = "waves";
                    game.state = play;
                }
            },
            {
                label: "Credits",
                action: function() {
                    //alert("credits");
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
        ], Resources.images.logo);

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
    Canvas.clear("white");
    game.state = home;
});
