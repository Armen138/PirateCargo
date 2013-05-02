define("game",
        ["raf",
        "canvas"
        /*"stats.min"*/],
    function(raf, Canvas /*Stats*/) {
    "strict mode";
    // var stats = new Stats();
    // stats.domElement.style.position = 'absolute';
    // stats.domElement.style.left = '0px';
    // stats.domElement.style.top = '0px';

    // document.body.appendChild( stats.domElement );

    var game = {
            run: function() {
                // stats.begin();
                if(game.state) {
                    game.state.run();
                }
                raf.requestAnimationFrame.call(window, game.run);
                // stats.end();
            },
            touches: {}
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
        if(e.keyCode === 27) {
            game.state = game.paused;
        }
    });
    window.addEventListener("keydown", function(e) {
        if(game.state && game.state.keydown) {
            game.state.keydown(e.keyCode);
        }
    });

    window.addEventListener("mousemove", function(e) {
        if(game.state && game.state.mousemove) {
            var x = e.clientX - Canvas.position.X;
            var y = e.clientY - Canvas.position.Y;
            game.state.mousemove({X: x, Y: y});
        }
    });

    window.addEventListener("click", function(e) {
        if(game.state && game.state.click) {
            var x = e.clientX - Canvas.position.X;
            var y = e.clientY - Canvas.position.Y;
            game.state.click({X: x, Y: y});
        }
    });

    window.addEventListener("mousedown", function(e) {
        if(game.state && game.state.mousedown) {
            var x = e.clientX - Canvas.position.X;
            var y = e.clientY - Canvas.position.Y;
            game.state.mousedown({X: x, Y: y});
        }
    });


    window.addEventListener("mouseup", function(e) {
        if(game.state && game.state.mouseup) {
            var x = e.clientX - Canvas.position.X;
            var y = e.clientY - Canvas.position.Y;
            game.state.mouseup({X: x, Y: y});
        }
    });

    window.addEventListener("touchstart", function(e) {
        console.log("touchstart");
        if(game.state && game.state.mousedown) {
            var touches = e.changedTouches;
            if(touches.length > 0) {
                var x = (touches[0].pageX | 0);// - Canvas.position.X;
                var y = (touches[0].pageY | 0);// - Canvas.position.Y;
                game.state.mousedown({X: x, Y: y}); 
                game.touches[touches[0].identifier] = Date.now();               
            }
        }        
    });


    window.addEventListener("touchmove", function(e) {
        console.log("touchmove");
        if(game.state && game.state.mousemove) {
            var touches = e.changedTouches;
            if(touches.length > 0) {
                var x = (touches[0].pageX | 0);// - Canvas.position.X;
                var y = (touches[0].pageY | 0);// - Canvas.position.Y;
                game.state.mousemove({X: x, Y: y}); 
                //game.touches[touches[0].identifier] = Date.now();               
            }
        }        
    });

    window.addEventListener("touchend", function(e) {
        console.log("touchend");
        var touches = e.changedTouches;
        if(game.state && game.state.mouseup) {
            if(touches.length > 0) {
                var x = (touches[0].pageX | 0);// - Canvas.position.X;
                var y = (touches[0].pageY | 0);// - Canvas.position.Y;
                game.state.mouseup({X: x, Y: y});           
            
                //game.touches[touches[0].identifier] = null;
            }
        } 
        console.log(game.touches[touches[0].identifier]);
        console.log(Date.now() - game.touches[touches[0].identifier]);
        if(/*game.touches[touches[0].identifier] && 
            Date.now() - game.touches[touches[0].identifier] < 400 &&*/
            game.state.click) {
            //if(touches.length > 0) {
                var x = (touches[0].pageX | 0);// - Canvas.position.X;
                var y = (touches[0].pageY | 0);// - Canvas.position.Y;

                game.state.click({X: x, Y: y})
            //}
        }            
        
    });
    return game;
});