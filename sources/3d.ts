

module 	Mod1 {

	class 	3dRenderer {
		renderer;
		map;
		size;
		scene;
		camera;
		plane;

		constructor(map, size, domElement) {
			this.map = map;
			this.size = size;
			this.renderer = new THREE.WebGLRenderer();

			this.renderer.setSize(size.x, size.y);
			domElement.appendChild(this.renderer.domElement);

			this.scene = new THREE.Scene();
			initCamera();
		    initPlane();
		}

		initCamera() {
			this.camera = new THREE.PerspectiveCamera(50, this.size.x / this.size.y, 1, 10000);

		    this.camera.position.set(0, 0, 1000);
		    this.scene.add(this.camera);
		}

		initPlane() {
			this.plane = THREE.PlaneGeometry(
				this.size.x,
				this.size.y,
				this.map.size.x,
				this.map.size.y
			);

			var idx = 0;
			for (var j = 0; j < this.map.size.y; j++) {
				for (var i = 0; i < this.map.size.x; i++) {
					this.plane.vertices[idx] = this.map[j][i];
					this.idx++;
				}
			}

			var mesh = new THREE.Mesh(this.plane);
			this.scene.add(mesh);
		}

		render() {
			this.scene.render();
		}

	}
}