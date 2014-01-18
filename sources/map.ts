

module 	Mod1 {

	export class	Map {
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
			console.log('map generated');
		}

		public addPoints(points) {
			for (var i = 0; i < points.length; i++) {
				this.points[points[i].y][points[i].x] = points[i].z
			}
		}

		public get(x, y) {
			return (this.points[y][x]);
		}
	}
}