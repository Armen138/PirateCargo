define("quickbuttons", ["canvas"], function(Canvas) {
	var size = { width: 0 * 74 + 20, height: 84 };	
	var position = { X: Canvas.width / 2, Y: Canvas.height - size.height };
	var quickButtons = {
		buttons: [],
		click: function(mouse) {
			position = { X: Canvas.width / 2, Y: Canvas.height - size.height };
			for(var i = 0; i < quickButtons.buttons.length; i++) {			
				var topleft = (position.X - size.width / 2) + (10 + (i * 74));
				if (mouse.X > topleft &&
					mouse.X < topleft + 64 &&
					mouse.Y > position.Y + 10) {
					console.log("peep");
					quickButtons.buttons[i].action();
					return true;
				}
			}
			return false;
		},
		draw: function() {
			if(quickButtons.buttons.length === 0) {
				return;
			}
			size = { width: quickButtons.buttons.length * 74 + 20, height: 84 };
			position = { X: Canvas.width / 2, Y: Canvas.height - size.height };
			Canvas.context.save();			
			Canvas.context.fillStyle = "rgba(0, 0, 0, 0.6)";
			Canvas.context.strokeStyle = "rgba(255, 255, 255, 1.0)";
			Canvas.context.shadowColor = 'rgba(150, 150, 150, 1.0)';
			Canvas.context.shadowOffsetX = 0;
			Canvas.context.shadowOffsetY = 0;
			Canvas.context.shadowBlur = 16;
			Canvas.context.textAlign = "center";

			Canvas.context.translate(position.X - size.width / 2, position.Y);
			Canvas.context.fillStyle = "rgba(0, 0, 0, 0.6)";
			for(var i = 0; i < quickButtons.buttons.length; i++) {
				Canvas.context.fillStyle = "rgba(0, 0, 0, 0.6)";
				Canvas.context.shadowColor = 'rgba(150, 150, 150, 1.0)';
				Canvas.context.fillRect(10 + (i * 74), 10, 64, 64);
				Canvas.context.drawImage(quickButtons.buttons[i].icon, 
										10 + (i * 74) + (quickButtons.buttons[i].icon.width / 2), 
										10 + (quickButtons.buttons[i].icon.height / 2) );
				Canvas.context.fillStyle = "white";				
				Canvas.context.fillText(quickButtons.buttons[i].label,
										10 + (i * 74) + (quickButtons.buttons[i].icon.width / 2), 
										22);

				Canvas.context.strokeStyle = "black";
				var topleft = 10 + (i * 74);
				Canvas.context.strokeRect(topleft, 10, 64, 64);	
			}
			//Canvas.context.strokeRect(10, 10, 64, 64);
			Canvas.context.restore();
		

		}
	};
	return quickButtons;
});