define("gui/badge", ["canvas", "gui/element"], function(Canvas, Element) {
	var Badge = function(obj) {
	    var badge = Element({
	        position: { X: 30, Y: 80 },
	        size: { width: 48, height: 48 },	        
	        title: "Ghost",
	        description: "Finished level without being seen",
	        active: false
	    });
	    badge.on("run", function() {
	    	if(!badge.active) {
	    		Canvas.context.globalAlpha = 0.2;
	    	}
	    	if(badge.image) {
		        Canvas.context.drawImage(badge.image, 0, 0, 
		            badge.image.width, 
		            badge.image.height, 
		            badge.position.X,
		            badge.position.Y,
		            badge.size.width,
		            badge.size.height);	    		
	    	}
	        Canvas.context.font = "32px RapscallionRegular";
	        Canvas.context.fillText(badge.title, badge.position.X + badge.size.width + 10, badge.position.Y - 8);
	        Canvas.context.font = "14px Arial";
	        Canvas.context.fillText(badge.description, badge.position.X + badge.size.width + 10, badge.position.Y + 28);        
	        Canvas.context.globalAlpha = 1.0;
	    });
	    if(obj) {
	    	badge.eat(obj);
	    }
		return badge;		
	}
    return Badge;
});