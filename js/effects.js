define ("effects", {
	bullet: function() { 
		return {"position":{"X":0,"Y":0},"image":"particle","scale":{"min":0,"max":0.44115112872652074},"speed":{"min":0.01,"max":0.02},"ttl":{"min":0.43544820547712193,"max":893.3310356712045},"count":50};
	},
	explosion: function() {
		return {"position":{"X":0,"Y":0},"image":"particle","scale":{"min":0.5,"max":1},"speed":{"min":0.001,"max":0.1},"ttl":{"min":399,"max":400},"count":50, "systemTtl": 10};
	}
});