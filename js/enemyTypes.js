define("enemyTypes", ["bullet", "canvas"], function(Bullet, Canvas) {
	return function(ship) {
		var weapons = {
			gun: {
				loadTime: 5000,
				ammo: function(position, enemies) {
					return Bullet(position, [ship], {"south": true, damage: 3});
				}
			},
			doubleBarrel: {
				loadTime: 1000,
				ammo: function(position, enemies) {
					return Bullet(position, [ship], { "south": true, "double" : true, damage: 6 });
				}
			},
			rocket: {
				loadTime: 2000,
				ammo: function(position, enemies) {
					return Bullet(position, [ship], { "south": true, damage: 8, rocket: true });
				}
			}
		};
		var ships = {
			"pirate": {
				sprite: {
					width: 28,
					height: 25,
					X: 264,
					Y: 920
				},
				weapon: weapons.gun,
				options: {}
			},
			"schooner": {
				sprite: {
					width: 31,
					height: 39,
					X: 233,
					Y: 923
				},
				weapon: weapons.doubleBarrel,
				options: {}
			},
			"zipper": {
				sprite: {
					width: 31,
					height: 33,
					X: 264,
					Y: 887
				},
				weapon: weapons.rocket,
				options: {
					score: 14,
					speed: 0.1,
					movePattern: function(startPosition, position, start, speed, delta) {
						if(!position.direction) {
							position.direction = 1;
						}
						position.Y = startPosition.Y + ((Date.now() - start) * speed);
						position.X += delta * speed * position.direction;
						if(position.X > Canvas.width - 33) {
							position.direction = -1;
						}
						if(position.X < 33) {
							position.direction = 1;
						}
					}
				}
			},
			"hauler": {
				sprite: {
					width: 28,
					height: 37,
					X: 234,
					Y: 887
				},
				weapon: weapons.gun,
				options: {
					movePattern: function(startPosition, position, start, speed) {
						position.Y = startPosition.Y + ((Date.now() - start) * speed);
						position.X = startPosition.X + (100 * Math.cos(((Date.now() - start) / 500)));
					}
				}
			},
			"tube": {
				sprite: {
					width: 45,
					height: 19,
					X: 234,
					Y: 868
				},
				weapon: weapons.gun,
				options: {}
			},
			"shuttle": {
				sprite: {
					width: 61,
					height: 22,
					X: 234,
					Y: 846
				},
				weapon: weapons.gun,
				options: {}
			},
			"waterhauler": {
				sprite: {
					width: 57,
					height: 39,
					X: 234,
					Y: 807
				},
				weapon: weapons.gun,
				options: {}
			},
			"elder": {
				sprite: {
					width: 84,
					height: 58,
					X: 127,
					Y: 913
				},
				weapon: weapons.gun,
				options: {
					score: 60,
					hp: 30,
					speed: 0.07,
					movePattern: function(startPosition, position, start, speed) {
						position.Y = startPosition.Y + ((Date.now() - start) * speed);
						position.X = startPosition.X + (150 * Math.cos(((Date.now() - start) / 1500)));
					}
				}
			},
			"destroyer": {
				sprite: {
					width: 106,
					height: 69,
					X: 127,
					Y: 844
				},
				weapon: weapons.gun,
				options: {
					hp: 50,
					speed: 0.05,
					score: 100,
					movePattern: function(startPosition, position, start, speed) {
						position.Y = startPosition.Y + ((Date.now() - start) * speed);
						position.X = startPosition.X + (100 * Math.cos(((Date.now() - start) / 1000)));
					}
				}
			},

		}
		return ships;
	};
});