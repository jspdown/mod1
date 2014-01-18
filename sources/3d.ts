
declare 	var THREE;

module 	Mod1 {

	export class Renderer {
		renderer;
		map;
		size;
		scene;
		camera;
		plane;
		material;
		controls;

		constructor(map, size, domElement) {
			this.map = map;
			this.size = size;
			this.renderer = new THREE.WebGLRenderer();

			this.renderer.setSize(size.x, size.y);
			domElement.appendChild(this.renderer.domElement);

			this.scene = new THREE.Scene();

			this.initCamera();
		    this.initPlane();
		    this.initTracking();
		    console.log('renderer ready');
		}

		private initTracking() {
			var self = this;
		    function animate() {
 		 		requestAnimationFrame(animate);
	 			self.controls.update();
			}
			function render() {
				self.renderer.render(self.scene, self.camera);
			}

			this.controls = new THREE.TrackballControls(this.camera);

			this.controls.rotateSpeed = 1.0;
			this.controls.zoomSpeed = 1.2;
			this.controls.panSpeed = 0.8;

			this.controls.noZoom = false;
			this.controls.noPan = false;

			this.controls.staticMoving = true;
			this.controls.dynamicDampingFactor = 0.3;

			this.controls.keys = [ 65, 83, 68 ];
			this.controls.addEventListener( 'change', render );
			animate();
		}

		private initCamera() {
			this.camera = new THREE.PerspectiveCamera(50, this.size.x / this.size.y, 1, 10000);

		    this.camera.position.set(0, 0, 1000);

		    this.scene.add(this.camera);
		}

		private initPlane() {
			this.plane = new THREE.PlaneGeometry(
				500,
				500,
				this.map.size.x,
				this.map.size.y
			);

			this.material = new THREE.MeshBasicMaterial({
        		color : 0xff0000,
        		wireframe : true
    		});

			var idx = 0;
			for (var j = 0; j < this.map.size.y; j++) {
				for (var i = 0; i < this.map.size.x; i++) {
					this.plane.vertices[idx].z = this.map.get(i, j);
					idx++;
				}
			}

			var mesh = new THREE.Mesh(this.plane, this.material);
			this.scene.add(mesh);
		}

		public render() {
			this.renderer.render(this.scene, this.camera);
		}
	}
}