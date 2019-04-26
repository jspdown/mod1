var Simplify = (function () {
    function Simplify(size, map, points) {
        this.map = map;
        console.log(map.length);
        this.size = size;
        this.tot = this.size.x * this.size.y;
        for (var i = 0; i < size.x * size.y; i++)
            this.map[i].y = 0.0;
        for (var i = 0; i < points.length; i++)
            this.map[this.get2(points[i].x, points[i].y)].y = points[i].z;
    }
    Simplify.prototype.get = function (i) {
        return ({ x: (i % this.size.x) | 0, y: (i / this.size.x) | 0 });
    };

    Simplify.prototype.get2 = function (x, y) {
        var val = y * this.size.x + x;
        return (y * this.size.x + x);
    };

    Simplify.prototype.inside = function (x, v, coef) {
        if (x >= 0 && x < this.tot)
            this.map[x].y = (v + this.map[x].y) / 2;
    };
    Simplify.prototype.interpolate = function (val, coef) {
        var pos = this.get(val);
        var v = this.map[val].y;

        var x1 = this.get2(pos.x - 1, pos.y - 1);
        var x2 = this.get2(pos.x, pos.y - 1);
        var x3 = this.get2(pos.x + 1, pos.y - 1);
        var x4 = this.get2(pos.x + 1, pos.y);
        var x5 = this.get2(pos.x + 1, pos.y + 1);
        var x6 = this.get2(pos.x, pos.y + 1);
        var x7 = this.get2(pos.x - 1, pos.y + 1);
        var x8 = this.get2(pos.x - 1, pos.y);

        this.inside(x1, v, coef);
        this.inside(x2, v, coef);
        this.inside(x3, v, coef);
        this.inside(x4, v, coef);
        this.inside(x5, v, coef);
        this.inside(x6, v, coef);
        this.inside(x7, v, coef);
        this.inside(x8, v, coef);
    };

    Simplify.prototype.run = function (step, coef) {
        for (var s = 0; s < step; s++) {
            for (var i = 0; i < this.size.x * this.size.y; i++) {
                this.interpolate(i, coef);
            }
        }
        return (this.map);
    };
    return Simplify;
})();

var Noise2D = (function () {
    function Noise2D(sizeX, sizeY, points, p, octave) {
        this.size = {
            x: sizeX,
            y: sizeY
        };
        this.octave = octave;
        this.step2d = p;

        this.widthMax = Math.ceil(this.size.x * Math.pow(2, this.octave - 1) / this.step2d);
        this.heightMax = Math.ceil(this.size.y * Math.pow(2, this.octave - 1) / this.step2d);
        this.map = new Array(this.widthMax * this.heightMax);
        this.pi = Math.PI;
        for (var i = 0; i < this.widthMax * this.heightMax; i++) {
            this.map[i] = 0;
        }
        for (var i = 0; i < points.length; i++)
            this.map[points[i].y * this.widthMax + points[i].x] = points[i].z;
    }
    Noise2D.prototype.fmod = function (a, b) {
        return (Number((a - (Math.floor(a / b) * b)).toPrecision(8)));
    };

    Noise2D.prototype.cosInterpolation1D = function (a, b, x) {
        var k = (1 - Math.cos(x * this.pi)) / 2;
        return (a * (1 - k) + b * k);
    };

    Noise2D.prototype.cosInterpolation2D = function (a, b, c, d, x, y) {
        var y1 = this.cosInterpolation1D(a, b, x);
        var y2 = this.cosInterpolation1D(c, d, x);
        return (this.cosInterpolation1D(y1, y2, y));
    };

    Noise2D.prototype.noise2D = function (i, j) {
        var v = this.map[j * this.widthMax + i];
        if (v != 0)
            console.log(v);
        return (v);
    };

    Noise2D.prototype.noiseFunction2D = function (x, y) {
        var i = (x / this.step2d) | 0;
        var j = (y / this.step2d) | 0;
        var res = this.cosInterpolation2D(this.noise2D(i, j), this.noise2D(i + 1, j), this.noise2D(i, j + 1), this.noise2D(i + 1, j + 1), this.fmod(x / this.step2d, 1), this.fmod(y / this.step2d, 1));
        return (res);
    };

    Noise2D.prototype.noise2DWithParam = function (x, y, persistence) {
        var sum = 0;
        var p = 1;
        var f = 1;

        for (var i = 0; i < this.octave; i++) {
            sum += p * this.noiseFunction2D(x * f, y * f);
            p *= persistence;
            f *= 2;
        }
        return (sum * (1 - persistence) / (1 - p));
    };
    return Noise2D;
})();
