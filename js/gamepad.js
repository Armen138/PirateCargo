define("gamepad", ["raf", "events"], function(raf, Events) {
	var buttonStates = [];
	var axisStates = [];
	var lastPad = null;
	var padID = null;
	var gamepad = {
		deadzone: 0.5,
		poll: function() {
			var i;
			var pad = navigator.webkitGetGamepads && navigator.webkitGetGamepads()[0];
			if(pad) {
				if(!padID) {
					padID = pad.id;
					console.log("gamepad: " + padID);
				}
				for(i = 0; i < pad.buttons.length; i++) {
					if(pad.buttons[i] !== 0) {
						gamepad.fire("button", { which: i, action: "down"});
						buttonStates[i] = true;
					} else {
						if(buttonStates[i]) {
							gamepad.fire("button", { which: i, action: "up"});
							buttonStates[i] = false;
						}
					}
				}
				for(i = 0; i < pad.axes.length; i++) {
					if(Math.abs(pad.axes[i]) > gamepad.deadzone) {
						gamepad.fire("axis", { which: i, value: pad.axes[i], action: "engage" });
					} else {
						if(Math.abs(axisStates[i]) > gamepad.deadzone) {
							gamepad.fire("axis", {which: i, value: pad.axes[i], action: "release"});
						}
					}
					axisStates[i] = pad.axes[i];
				}
				lastPad = pad;
			}
			raf.requestAnimationFrame.call(window, gamepad.poll);
		},
		A: 0,
		B: 1,
		X: 2,
		Y: 3
	};

	Events.attach(gamepad);
	gamepad.poll();

	return gamepad;
});