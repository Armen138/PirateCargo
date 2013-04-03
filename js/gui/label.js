define("gui/label", ["canvas", "gui/element"], function(Canvas, Element) {
	var Label = function(text, obj) {
		var label = Element({
	        position: {X: 200, Y: 20},
	        size: { width: 0, height: 0 },
	        text: text,
	        fontSize: 48,
	        font: "RapscallionRegular",
	        color: "white",
	        align: "center",
	        background: null
	    });
	    label.on("init", function() {
	    	if(!label.initialized) {
		    	//set correct size for click events
		    	Canvas.context.font = label.fontSize + "px " + label.font;
		    	var labelSize = Canvas.context.measureText(label.text);
		    	label.size = {width: labelSize.width + label.fontSize / 2, 
		    					height: label.fontSize * 1.4};	  
		    	if(label.align = "center") {
		    		label.position.X -= label.size.width / 2 - label.fontSize / 4;
		    	}  		    		
		    	label.initialized = true;
	    	}	    	
	    });
	    label.on("run", function() {
	    	if(label.background) {
	    		Canvas.context.fillStyle = label.background;
	    		Canvas.context.fillRect(label.position.X - (label.fontSize / 4), 
	    								label.position.Y - (label.fontSize / 4), 
	    								label.size.width, 
	    								label.size.height);
	    	}
	        Canvas.context.fillStyle = label.color;
	        Canvas.context.font = label.fontSize + "px " + label.font;
	        Canvas.context.textAlign = "left";
	        Canvas.context.textBaseline = "top";
	        Canvas.context.fillText(label.text, label.position.X, label.position.Y);
	    });	    
	    if(obj) {
	    	label.eat(obj);
	    }

		return label;
	};
	return Label;
});