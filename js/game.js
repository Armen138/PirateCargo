define("game",
        ["raf",
        "canvas",
        "stats.min"],
    function(raf, Canvas) {
    "strict mode";
    var stats = new Stats();
    stats.domElement.style.position = 'absolute';
    stats.domElement.style.left = '0px';
    stats.domElement.style.top = '0px';

    document.body.appendChild( stats.domElement );

    var game = {
            run: function() {
                stats.begin();
                if(game.state) {
                    game.state.run();
                }
                raf.requestAnimationFrame.call(window, game.run);
                stats.end();
            }
        },
        state = null;

    Object.defineProperty(game, "state", {
        get: function() {
            return state;
        },
        set: function(newstate) {
            if(state) {
                state.clear(function() {
                    newstate.init();
                    state = newstate;
                });
            } else {
                newstate.init();
                state = newstate;
            }
        }
    });

    window.addEventListener("keyup", function(e) {
        if(game.state && game.state.keyup) {
            game.state.keyup(e.keyCode);
        }
    });
    window.addEventListener("keydown", function(e) {
        if(game.state && game.state.keydown) {
            game.state.keydown(e.keyCode);
        }
    });

    window.addEventListener("click", function(e) {
        if(game.state && game.state.click) {
            var x = e.clientX - Canvas.position.X;
            var y = e.clientY - Canvas.position.Y;
            game.state.click({X: x, Y: y});
        }
    });

    if(typeof(Clay) !== "undefined") {
        game.leaderboard = new Clay.Leaderboard({id: 675});
    }

    return game;
});