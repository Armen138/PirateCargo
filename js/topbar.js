define("topbar", ["canvas", "easing"], function(Canvas) {
    var color = "rgba(0, 0, 0, 0.7)",
        height = 30;

    return function(items) {
        var topbar = {
            items: items,
            draw: function() {
                Canvas.context.save();
                Canvas.context.font = "22px Arial";
                Canvas.context.lineWidth = 1;
                Canvas.context.fillStyle = color;
                Canvas.context.strokeStyle = "white";
                Canvas.context.fillRect(0, 0, Canvas.width, height);
                Canvas.context.beginPath();
                Canvas.context.moveTo(0, height);
                Canvas.context.lineTo(Canvas.width, height);
                Canvas.context.stroke();
                Canvas.context.fillStyle = "white";
                Canvas.context.textAlign = "center";
                Canvas.context.textBaseline = "middle";
                for(var i = 0; i < topbar.items.length; i++) {
                    var x = Canvas.width / topbar.items.length * i + (Canvas.width / topbar.items.length / 2);
                    var label = topbar.items[i].name + ": " + topbar.items[i].obj[topbar.items[i].prop];
                    if(topbar.items[i].count && topbar.items[i].obj[topbar.items[i].countStart] !== 0) {
                        label += " " + (topbar.items[i].count - ((Date.now() - topbar.items[i].obj[topbar.items[i].countStart]) / 1000 | 0)) + "s";
                    }
                    Canvas.context.fillText(label, x, height / 2);
                }

                Canvas.context.restore();
            }
        };
        return topbar;
    };
});