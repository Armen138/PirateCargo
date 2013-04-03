define("gui/element", ["canvas", "events"], function(Canvas, Events) {
	var Element = function(obj) {
		var elements = [];
		var element = {
			eat: function(obj) {
				for(var prop in obj) {
					element[prop] = obj[prop];
				}			
			},
			add: function(e) {
				elements.push(e);				
			},
			position: {X: 0, Y: 0},
			size:  {width: 0, height: 0},
			init: function() {
				element.fire("init");
				for(var i = 0; i < elements.length; i++) {
					elements[i].init();
				}
			},
			click: function(mouse) {
                if (mouse.X > element.position.X &&
                    mouse.X < element.position.X + element.size.width &&
                    mouse.Y > element.position.Y &&
                    mouse.Y < element.position.Y + element.size.height)  {
                    for(var i = 0; i < elements.length; i++) {
                        elements[i].click({X: mouse.X - element.position.X, Y: mouse.Y - element.position.Y });
                    }                    
                    element.fire("click");
                }                
			},
			run: function() {
				element.fire("run");
				Canvas.context.save();
				Canvas.context.translate(element.position.X, element.position.Y);
				for(var i = 0; i < elements.length; i++) {
					elements[i].run();
				}				
				Canvas.context.restore();				
			}
		};
		if(obj) {
			element.eat(obj);
		}
		Events.attach(element);
		return element;
	};
	return Element;
});