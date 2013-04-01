define("container", function() {
	var Container = function() {
		var items = [];
		var container = {
			noncollider: true,
			count: function() {
				return items.length;
			},
			add: function(item) {
				items.push(item);
			},
			remove: function(item) {
				for(var i = items.length -1; i >= 0; --i) {
					if(items[i] === item) {
						items.splice(i, 1);
						break;
					}
				}
			},
			each: function(cb) {
				for(var i = 0; i < items.length; i++) {
					cb(items[i]);
				}
			},
			draw: function() {
				container.each(function(item) {
					item.draw();
				});
			}
		};
		return container;		
	};
	return Container;
});