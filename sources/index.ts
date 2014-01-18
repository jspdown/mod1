
///<reference path='map.ts'/>
///<reference path='3d.ts'/>

declare 	var document;

class Main {
	renderer;
	map;

	constructor(sizeX, sizeY) {
		var size = {
			x: 	1500,
			y: 	800
		};

		this.map 		= new Mod1.Map(sizeX, sizeY, 'map');
		this.map.addPoints([
			{ x: 0, y: 0, z: 12, w: 1 },
			{ x: 10, y: 0, z: 12, w: 1 },
			{ x: 0, y: 10, z: 12, w :1 },
		]);
		this.renderer = new Mod1.Renderer(this.map, size, document.getElementById('view'));
	}
}

var main = new Main(30, 30);
