

var FLUID = {};


FLUID.PipeModelWater = function (options) {

    this.baseHeights = [];
    this.heights = [];
    this.fluxR = [];
    this.fluxB = [];
    this.fluxL = [];
    this.fluxT = [];

    this.minWaterHeight = -0.1;
    this.dHeights = [];

    this.terrainMesh = options.terrainMesh;

    this.scene = options.scene;

    this.mesh           = options.mesh;
    this.size           = options.size;
    this.halfSize       = this.size / 2.0;
    this.res            = options.res;
    this.dampingFactor  = options.dampingFactor;
    this.__meanHeight   = options.meanHeight || 0.0;

    this.geometry           = this.mesh.geometry;
    this.numVertices        = this.res * this.res;
    this.segmentSize        = this.size / this.res;
    this.segmentSizeSquared = this.segmentSize * this.segmentSize;

    this.disturbField       = [];

    this.init();

    this.gravity = 9.81;
    this.density = 1;
    this.pipeLength = this.segmentSize;
    this.pipeCrossSectionArea = this.pipeLength * this.pipeLength;

};

FLUID.PipeModelWater.prototype.constructor = FLUID.PipeModelWater;

FLUID.PipeModelWater.prototype.init = function () {
    var i, len;
    for (i = 0, len = this.numVertices; i < len; i++) {
        this.baseHeights[i] = 0;
        this.heights[i] = 0.1;
        this.fluxR[i] = 0;
        this.fluxB[i] = 0;
        this.fluxL[i] = 0;
        this.fluxT[i] = 0;

        this.dHeights[i] = 0;
    }

    for (var i = 0; i < this.numVertices; i++) {
        this.disturbField[i] = 0;
    }
};

FLUID.PipeModelWater.prototype.__clearFields = function () {
    var i;
    for (i = 0; i < this.numVertices; i++) {
        this.disturbField[i] = 0;
    }
};

FLUID.PipeModelWater.prototype.update = function (dt) {


    if (this.terrainMesh) {
        var vertexPos = this.terrainMesh.geometry.vertices;
        var i, len;
        for (i = 0, len = this.numVertices; i < len; i++) {
            this.baseHeights[i] = vertexPos[i].y;
        }
    }
    this.sim(dt);
    this.__clearFields();
};

FLUID.PipeModelWater.prototype.setMeanHeight = function (meanHeight) {
    this.__meanHeight = meanHeight;

    var vertexPos = this.geometry.vertices;
    var resMinusOne = this.res - 1;

    var i, j, idx;
    j = 0;
    for (i = 0; i < this.res; i++) {
        idx = i * this.res + j;
        vertexPos[idx].y = this.__meanHeight;
    }
    j = resMinusOne;
    for (i = 0; i < this.res; i++) {
        idx = i * this.res + j;
        vertexPos[idx].y = this.__meanHeight;
    }
    i = 0;
    for (j = 1; j < resMinusOne; j++) {
        idx = i * this.res + j;
        vertexPos[idx].y = this.__meanHeight;
    }
    i = resMinusOne;
    for (j = 1; j < resMinusOne; j++) {
        idx = i * this.res + j;
        vertexPos[idx].y = this.__meanHeight;
    }
};


FLUID.PipeModelWater.prototype.sim = function (dt) {
    var i, j, idx;
    var vertexPos = this.geometry.vertices;
    var resMinusOne = this.res - 1;

    dt = 4.0 / 60.0;

    for (i = 1; i < resMinusOne; i++) {
        for (j = 1; j < resMinusOne; j++) {
            idx = i * this.res + j;
            this.heights[idx] += this.disturbField[idx];
        }
    }

    var thisHeight, dHeight;
    var heightToFluxFactor = dt * this.pipeCrossSectionArea * this.gravity / this.pipeLength;
    for (i = 1; i < resMinusOne; i++) {
        for (j = 1; j < resMinusOne; j++) {

            idx = i * this.res + j;

            if (this.heights[idx] <= this.minWaterHeight) {
                this.fluxL[idx] = 0;
                this.fluxR[idx] = 0;
                this.fluxT[idx] = 0;
                this.fluxB[idx] = 0;
            }

            thisHeight = this.baseHeights[idx] + this.heights[idx];

            dHeight = thisHeight - (this.baseHeights[idx + 1] + this.heights[idx + 1]);
            this.fluxR[idx] *= this.dampingFactor;
            this.fluxR[idx] += dHeight * heightToFluxFactor;
            if (this.fluxR[idx] < 0) {
                this.fluxR[idx] = 0;
            }

            dHeight = thisHeight - (this.baseHeights[idx - 1] + this.heights[idx - 1]);
            this.fluxL[idx] *= this.dampingFactor;
            this.fluxL[idx] += dHeight * heightToFluxFactor;
            if (this.fluxL[idx] < 0) {
                this.fluxL[idx] = 0;
            }

            dHeight = thisHeight - (this.baseHeights[idx + this.res] + this.heights[idx + this.res]);
            this.fluxB[idx] *= this.dampingFactor;
            this.fluxB[idx] += dHeight * heightToFluxFactor;
            if (this.fluxB[idx] < 0) {
                this.fluxB[idx] = 0;
            }

            dHeight = thisHeight - (this.baseHeights[idx - this.res] + this.heights[idx - this.res]);
            this.fluxT[idx] *= this.dampingFactor;
            this.fluxT[idx] += dHeight * heightToFluxFactor;
            if (this.fluxT[idx] < 0) {
                this.fluxT[idx] = 0;
            }
        }
    }
    j = 0;
    for (i = 1; i < this.res; i++) {
        idx = i * this.res + j;
        this.fluxL[idx + 1] = 0;
    }

    j = this.res - 1;
    for (i = 1; i < this.res; i++) {
        idx = i * this.res + j;
        this.fluxR[idx - 1] = 0;
    }

    i = 0;
    for (j = 1; j < this.res; j++) {
        idx = i * this.res + j;
        this.fluxT[idx + this.res] = 0;
    }

    i = this.res - 1;
    for (j = 1; j < this.res; j++) {
        idx = i * this.res + j;
        this.fluxB[idx - this.res] = 0;
    }
    
    var currVol, outVol, scaleAmt;
    for (i = 1; i < resMinusOne; i++) {
        for (j = 1; j < resMinusOne; j++) {

            idx = i * this.res + j;

            currVol = (this.heights[idx] - this.minWaterHeight) * this.segmentSizeSquared;
            outVol = dt * (this.fluxR[idx] + this.fluxL[idx] + this.fluxB[idx] + this.fluxT[idx]);
            if (outVol > currVol) {
                scaleAmt = currVol / outVol;
                if (isFinite(scaleAmt)) {
                    this.fluxL[idx] *= scaleAmt;
                    this.fluxR[idx] *= scaleAmt;
                    this.fluxB[idx] *= scaleAmt;
                    this.fluxT[idx] *= scaleAmt;
                }
            }
        }
    }

    var fluxIn, fluxOut, dV, avgWaterHeight;
    for (i = 1; i < resMinusOne; i++) {
        for (j = 1; j < resMinusOne; j++) {

            idx = i * this.res + j;

            fluxOut = this.fluxR[idx] + this.fluxL[idx] + this.fluxB[idx] + this.fluxT[idx];
            fluxIn = this.fluxR[idx - 1] + this.fluxL[idx + 1] + this.fluxB[idx - this.res] + this.fluxT[idx + this.res];
            dV = (fluxIn - fluxOut) * dt;

            this.dHeights[idx] = dV / (this.segmentSize * this.segmentSize);
            avgWaterHeight = this.heights[idx];
            this.heights[idx] += this.dHeights[idx];
            if (this.heights[idx] < this.minWaterHeight) {  //this will still happen, in very small amounts
                this.heights[idx] = this.minWaterHeight;
            }
            avgWaterHeight = 0.5 * (avgWaterHeight + this.heights[idx]);
        }
    }

    for (i = 1; i < resMinusOne; i++) {
        for (j = 1; j < resMinusOne; j++) {
            idx = i * this.res + j;
            vertexPos[idx].y = this.baseHeights[idx] + this.heights[idx];
        }
    }
    this.__matchEdges();
    this.__updateMesh();
};

FLUID.PipeModelWater.prototype.flood = function (volume) {
    var i, j, idx;
    for (i = 0; i < this.res; i++) {
        for (j = 0; j < this.res; j++) {
            idx = i * this.res + j;
            this.disturbField[idx] += volume / (this.res * this.res);
        }
    }
};

FLUID.PipeModelWater.prototype.__updateMesh = function () {
    this.geometry.verticesNeedUpdate = true;
    this.geometry.computeFaceNormals();
    this.geometry.computeVertexNormals();
    this.geometry.normalsNeedUpdate = true;
};

FLUID.PipeModelWater.prototype.__matchEdges = function () {
    var i, j, idx;
    var vertexPos = this.geometry.vertices;
    var resMinusOne = this.res - 1;

    j = 0;
    for (i = 1; i < resMinusOne; i++) {
        idx = i * this.res + j;
        vertexPos[idx].y = vertexPos[idx + 1].y;
    }
    j = this.res - 1;
    for (i = 1; i < resMinusOne; i++) {
        idx = i * this.res + j;
        vertexPos[idx].y = vertexPos[idx - 1].y;
    }

    i = 0;
    for (j = 1; j < resMinusOne; j++) {
        idx = i * this.res + j;
        vertexPos[idx].y = vertexPos[idx + this.res].y;
    }

    i = this.res - 1;
    for (j = 1; j < resMinusOne; j++) {
        idx = i * this.res + j;
        vertexPos[idx].y = vertexPos[idx - this.res].y;
    }

    idx = 0;
    vertexPos[idx].y = 0.5 * (vertexPos[idx + 1].y + vertexPos[idx + this.res].y);
    idx = this.res - 1;
    vertexPos[idx].y = 0.5 * (vertexPos[idx - 1].y + vertexPos[idx + this.res].y);
    idx = this.res * (this.res - 1);
    vertexPos[idx].y = 0.5 * (vertexPos[idx + 1].y + vertexPos[idx - this.res].y);
    idx = this.res * this.res - 1;
    vertexPos[idx].y = 0.5 * (vertexPos[idx - 1].y + vertexPos[idx - this.res].y);
};