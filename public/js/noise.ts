
class Noise2D {
	size;
	map;
	step2d;
	pi;
	octave;
	widthMax;
	heightMax;

	constructor(sizeX, sizeY, points, p, octave) {
		this.size = {
			x:	sizeX,
			y:	sizeY,
		};
		this.octave = octave;
		this.step2d = p;

		console.log(Math.ceil);
		console.log(Math.pow);

		this.widthMax = Math.ceil(this.size.x * Math.pow(2, this.octave  - 1)  / this.step2d);
		this.heightMax = Math.ceil(this.size.y * Math.pow(2, this.octave  - 1)  / this.step2d);
		this.map = new Array(this.widthMax * this.heightMax);
		this.pi = Math.PI;
		for (var i = 0; i < this.widthMax * this.heightMax; i++) { this.map[i] = 0 }
		for (var i = 0; i < points.length; i++) {
			this.map[points[i].y * sizeX + points[i].x] = points[i].z;
			console.log(points[i].z);
		}
	}

	fmod(a,b) { 
		return (Number((a - (Math.floor(a / b) * b)).toPrecision(8)));
	}

	cosInterpolation1D(a, b, x) {
		var k = (1 - Math.cos(x * this.pi)) / 2;
//		console.log(a * (1 - k) + b * k, a, b, x);
		return (a * (1 - k) + b * k);
	}

	cosInterpolation2D(a, b, c, d, x, y) {
		var y1 = this.cosInterpolation1D(a, b, x);
		var y2 = this.cosInterpolation1D(c, d, x);
		return (this.cosInterpolation1D(y1, y2, y));
	}

	noise2D(i, j) {
		var v = this.map[j * this.widthMax + i];
		if (v != 0)
			console.log(v);
		return (v);
	}

	noiseFunction2D(x, y) {
		var i = (x / this.step2d) | 0;
		var j = (y / this.step2d) | 0;
		var res = this.cosInterpolation2D(
				this.noise2D(i, j), 
				this.noise2D(i + 1, j), 
				this.noise2D(i, j + 1), 
				this.noise2D(i + 1, j + 1), 
				this.fmod(x / this.step2d, 1), 
				this.fmod(y / this.step2d, 1));
		return (res);
	}

	noise2DWithParam(x, y, persistence) {
		var sum = 0;
		var p 	= 1;
		var f 	= 1;

		for (var i = 0; i < this.octave; i++) {
			sum += p * this.noiseFunction2D(x * f, y * f);
			p *= persistence;
			f *= 2;
		}
		return (sum * (1 - persistence)/ (1 - p));
	}

}