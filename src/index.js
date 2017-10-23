import * as THREE from 'three'
import stats from 'stats.js'
import initOrbitControls from 'three-orbit-controls'
import OBJLoader from 'three-obj-loader'

const vertext = `
   void main()
    {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
    }
  `

const fragment = `
    uniform vec2 resolution;
    uniform float time;

    vec2 rand(vec2 pos)
    {
    return fract( 0.00005 * (pow(pos+2.0, pos.yx + 1.0) * 22222.0));
    }
    vec2 rand2(vec2 pos)
    {
    return rand(rand(pos));
    }

    float softnoise(vec2 pos, float scale)
    {
    vec2 smplpos = pos * scale;
    float c0 = rand2((floor(smplpos) + vec2(0.0, 0.0)) / scale).x;
    float c1 = rand2((floor(smplpos) + vec2(1.0, 0.0)) / scale).x;
    float c2 = rand2((floor(smplpos) + vec2(0.0, 1.0)) / scale).x;
    float c3 = rand2((floor(smplpos) + vec2(1.0, 1.0)) / scale).x;

    vec2 a = fract(smplpos);
    return mix(
    mix(c0, c1, smoothstep(0.0, 1.0, a.x)),
    mix(c2, c3, smoothstep(0.0, 1.0, a.x)),
    smoothstep(0.0, 1.0, a.y));
    }

    void main(void)
    {
    vec2 pos = gl_FragCoord.xy / resolution.y;
    pos.x += time * 0.1;
    float color = 0.0;
    float s = 1.0;
    for(int i = 0; i < 8; i++)
    {
    color += softnoise(pos+vec2(i)*0.02, s * 4.0) / s / 2.0;
    s *= 2.0;
    }
    gl_FragColor = vec4(color);
    }
  `

OBJLoader(THREE)
const OrbitControls = initOrbitControls(THREE)
const {
  WebGLRenderer,
  Scene,
  PerspectiveCamera,
  DirectionalLight,
  Color,
  Vector3,
  Raycaster,
  TextureLoader,
  MeshBasicMaterial,
  BackSide,
  Mesh,
  CubeGeometry,
  MeshFaceMaterial,
  DoubleSide,
  JSONLoader,
  Group,
  Geometry,
  PointsMaterial,
  AddEquation,
  Points,
  Vector2,
  MeshLambertMaterial,
  LensFlare,
  AdditiveBlending,
  ShaderMaterial,
} = THREE

export default class SeatingPlan3D {
  constructor(options) {
    const defaultOptions = {
      width: window.innerWidth,
      height: window.innerHeight,
      element: document.body,
      pixelRatio: window.devicePixelRatio,
      debugMode: false
    }

    this.animate = this.animate.bind(this)
    this.onTouchStart = this.onTouchStart.bind(this)
    this.options = Object.assign({}, defaultOptions, options)

    this.initThreejs()
    this.initSence()
    this.initCamera()
    this.initLight()
    this.initControl()
    this.initRaycaster()
    this.initBackground()
    this.initProjector()
    this.initSeat()
    this.initLamp()
    this.initScreen()
    this.animate()
    this.bindEvent()
    if (this.options.debugMode) {
      this.initStats()
    }
  }

  initThreejs() {
    const renderer = this.renderer = new WebGLRenderer({alpha: true, antialias: true})
    renderer.setSize(this.options.width, this.options.height)
    renderer.setPixelRatio(this.options.pixelRatio)
    this.options.element.appendChild && this.options.element.appendChild(renderer.domElement)
  }

  initStats() {
    const stat = this.stat = new Stats()
    stat.domElement.style.position = 'absolute'
    stat.domElement.style.right = '0px'
    stat.domElement.style.top = '0px'
    this.options.element.appendChild && this.options.element.appendChild(stat.domElement)
  }

  initSence() {
    const scene = this.scene = new Scene()
    scene.background = new Color(0x333333)
  }

  initCamera() {
    const camera = this.camera = new PerspectiveCamera(70, this.options.width/this.options.height, 1, 10000)
    camera.position.set(150, 250, 300)
    camera.lookAt(new Vector3(0, 0, 0))
    this.scene.add(camera)
  }

  initLight() {
    const light = this.light = new DirectionalLight()
    light.position.set(0, 20, 20)
    this.camera.add(light)
  }

  initControl() {
    const controls = this.controls = new OrbitControls(this.camera)
    controls.maxPolarAngle = 1.5
    controls.minPolarAngle = 0.5
    controls.rotateSpeed = 5.0
    controls.zoomSpeed = 5
    controls.panSpeed = 2
    controls.onZoom = false
    controls.noPan = false
    controls.staticMoving = true
    controls.dynamicDampingFactor = 0.3
    controls.minDistance = 200
    controls.maxDistance = 800
  }

  initRaycaster() {
    this.raycaster = new Raycaster()
  }

  initBackground() {
    const path = 'assets/image/'
    const format = '.jpg'
    const urls = [
      `${path}px${format}`, `${path}nx${format}`,
      `${path}py${format}`, `${path}ny${format}`,
      `${path}pz${format}`, `${path}nz${format}`
    ]
    const materials = []
    urls.forEach(url => {
      const textureLoader = new TextureLoader()
      textureLoader.setCrossOrigin(this.crossOrigin)
      const texture = textureLoader.load(url)
      materials.push(new MeshBasicMaterial({
        map: texture,
        overdraw: true,
        side: BackSide
      }))
    })
    const cube = new Mesh(new CubeGeometry(9000, 9000, 9000), new MeshFaceMaterial(materials))
    this.scene.add(cube)
  }

  initPointSystem(geometry) {
    this.points = new Group()
    const vertices = []
    let point
    const texture = new TextureLoader().load('assets/image/dot.png')
    geometry.vertices.forEach((o, i) => {
      vertices.push(o.clone())
      const _geometry = new Geometry()
      const pos = vertices[i]
      _geometry.vertices.push(new Vector3())
      const color = new Color()
      color.r = Math.abs(Math.random() * 10)
      color.g = Math.abs(Math.random() * 10)
      color.b = Math.abs(Math.random() * 10)
      const material = new PointsMaterial({
        color,
        size: Math.random() * 4 + 2,
        map: texture,
        blending: AddEquation,
        depthTest: false,
        transparent: true
      })
      point = new Points(_geometry, material)
      point.position.copy(pos)
      this.points.add(point)
    })
    return this.points
  }
  
  initLamp() {
    const loader = new JSONLoader()
    loader.load('assets/lamp.json', (geometry) => {
      let lamp = this.initPointSystem(geometry)
      lamp.scale.set(0.2, 0.2, 0.2)
      lamp.position.set(100, 100, -20)
      this.scene.add(lamp)
    })
  }

  initSeat() {
    const loader = new THREE.OBJLoader()
    this.seats = []
    loader.load('assets/chair.obj', obj => {
      obj.traverse(child=> {
        if (child instanceof Mesh) {
          for (let i = 0; i < 50; i++) {
            const color = i === 2 ? 0xff0000 : 0xffffff
            const seat = child.clone()
            seat.material = new MeshLambertMaterial({
                color: color,
                side: DoubleSide
            })
            this.seats.push(seat)
            seat.rotation.set(0, 4, 0)
            seat.position.set((i % 5) * 20 - 30, (Math.floor(i / 5) - 1) * 10, -(Math.floor(i / 5) * 20) + 50)
            this.scene.add(seat)
          }
        }
      })
    })
  }
  initProjector () {
    const loader = new JSONLoader()
    loader.load('assets/projector.json', geometry => {
      let projector = new Mesh(geometry, new MeshLambertMaterial())
      projector.position.set(0, 150, -100)
      projector.rotation.set(6.6, 0, 0)
      let textureFlare = new TextureLoader().load('assets/image/lensflare0.png')
      let textureFlare3 = new TextureLoader().load('assets/image/lensflare3.png')
      let flareColor = new Color(0xffffff)
      let lensFlare = new LensFlare(textureFlare, 150, 0.0 , AdditiveBlending, flareColor)
      lensFlare.add(textureFlare3, 60, 0.6, AdditiveBlending);
      lensFlare.add(textureFlare3, 70, 0.7, AdditiveBlending);
      lensFlare.add(textureFlare3, 120, 0.9, AdditiveBlending);
      lensFlare.add(textureFlare3, 70, 1.0, AdditiveBlending);
      lensFlare.position.set(0, 150, -85)
      this.scene.add(projector)
      this.scene.add(lensFlare)
    })
  }
  initScreen() {
    const loader = new JSONLoader()
    loader.load('assets/particleScreen.json', geometry => {
      let uniforms = {
        time: {type: 'f', value: 0.2},
        scale: {type: 'f', value: 0.2},
        alpha: {type: 'f', value: 0.6},
        resolution: {type: 'v2', value: new Vector2()}
      }
      uniforms.resolution.value.x = window.innerWidth
      uniforms.resolution.value.y = window.innerHeight

      let material = new ShaderMaterial({
        uniforms: uniforms,
        vertexShader: vertext,
        fragmentShader: fragment,
        transparent: true,
      })

      this.screen = new Mesh(geometry, material)
      this.screen.position.set(200, -50, 150)
      this.scene.add(this.screen)
    })
  }

  render() {
    this.updatePoint()
    if (this.screen) {
      this.screen.material.uniforms.time.value += 0.01
    }
    this.renderer.render(this.scene, this.camera)
  }

  animate() {
    window.requestAnimationFrame(this.animate)
    this.controls.update()
    this.render()
    if (this.stat) {
      this.stat.update()
    }
  }

  bindEvent() {
    document.addEventListener('touchstart', this.onTouchStart, false)
  }

  onTouchStart(event) {
    event.preventDefault()
    event.clientX = event.touches[0].clientX;
    event.clientY = event.touches[0].clientY;
    this.onClick(event)
  }

  onClick(event) {
    const mouse = new Vector2()
    mouse.x = ( event.clientX / this.renderer.domElement.clientWidth ) * 2 - 1
    mouse.y = - ( event.clientY / this.renderer.domElement.clientHeight ) * 2 + 1;
    this.raycaster.setFromCamera(mouse, this.camera)
    const intersects = this.raycaster.intersectObjects(this.seats)
    if (intersects.length > 0) {
        intersects[0].object.material = new MeshLambertMaterial({
            color: 0xff0000
        })
    }
  }

  updatePoint() {
    const time = Date.now() * 0.005
    if (this.points) {
      this.points.children.forEach((point, i) => {
        point.material.size = 1.5 * (2.0 + Math.sin(0.02 * i + time))
      })
    }
  }
}
