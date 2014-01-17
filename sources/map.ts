

module 	Mod1 {

	class	Map {
		points;
		name;
		size;

		constructor(sizeX, sizeY, name) {
			this.name = name;
			this.size = {
				x: 	sizeX,
				y: 	sizeY
			};
			this.points = [];
			for (var j = 0; j < this.size.y; j++) {
				this.points[j] = [];
				for (var i = 0; i < this.size.x; i++) {
					this.points[j][i] = 0;
				}
			}
		}

		public addPoints(points) {
			var self = this;
			points.forEach(function (itm) {
				if (itm.y > 0 && itm.y < self.size.y && itm.x > 0 && itm.x < self.size.x)
					self.points[itm.y][itm.x] = itm.z;
			});
		}
	}


	function 	main() {
		var map = new Map(10000, 10000, 'test');

		var points = [
			{ x: 10, y: 10, z: 10 },
			{ x: 11, y: 11, z: 10 },
			{ x: 12, y: 12, z: 12 }
		];

		map.addPoints(points);
		
		console.log('GTS prod\'');
	}

	main();
}