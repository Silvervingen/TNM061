var container
var camera, scene, renderer
var mouseX = 0
var mouseY = 0
var windowHalfX = window.innerWidth / 2
var windowHalfY = window.innerHeight / 2

// Object3D ("Group") nodes and Mesh nodes
var sceneRoot = new THREE.Group()
var sunSpin = new THREE.Group()
var earthSpin = new THREE.Group(); var earthTilt = new THREE.Group(); var earthRotate = new THREE.Group(); var earthTranslate = new THREE.Group(); var earthCounter = new THREE.Group()
var moonTranslate = new THREE.Group(); var moonRotate = new THREE.Group() // kan lägga till för måne peka rätt och tilt orbit
var jupSpin = new THREE.Group(); var jupRotate = new THREE.Group(); var jupTranslate = new THREE.Group()
var earthMesh, moonMesh, sunMesh, jupMesh, marsMesh, nepMesh, satMesh
var marsSpin = new THREE.Group(); var marsRotate = new THREE.Group(); var marsTranslate = new THREE.Group()
var satSpin = new THREE.Group(); var satRotate = new THREE.Group(); var satTranslate = new THREE.Group()
var nepSpin = new THREE.Group(); var nepRotate = new THREE.Group(); var nepTranslate = new THREE.Group()
const sunLight = new THREE.PointLight(0x202020, 10, 50)
const ambientLight = new THREE.AmbientLight(0x202020, 3)
var animation = true

function onWindowResize () {
  windowHalfX = window.innerWidth / 2
  windowHalfY = window.innerHeight / 2
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
}

function onDocumentMouseMove (event) {
  // mouseX, mouseY are in the range [-1, 1]
  mouseX = (event.clientX - windowHalfX) / windowHalfX
  mouseY = (event.clientY - windowHalfY) / windowHalfY
}

function createSceneGraph () {
  scene = new THREE.Scene()

  // Top-level node
  scene.add(sceneRoot)
  scene.add(sunLight)
  scene.add(ambientLight)
  sceneRoot.add(sunSpin)
  sceneRoot.add(earthRotate)
  sceneRoot.add(jupRotate)
  sceneRoot.add(marsRotate)
  sceneRoot.add(satRotate)
  sceneRoot.add(nepRotate)
  // Sun branch
  sunSpin.add(sunMesh)
  // Earth branch
  earthRotate.add(earthTranslate)
  earthTranslate.add(earthCounter)
  earthCounter.add(earthTilt)
  earthTilt.add(earthSpin)
  earthSpin.add(earthMesh)
  // Moon branch (connects to earth branch)
  earthTranslate.add(moonRotate)
  moonRotate.add(moonTranslate)
  moonTranslate.add(moonMesh)
  // Jupiter branch
  jupRotate.add(jupTranslate)
  jupTranslate.add(jupSpin)
  jupSpin.add(jupMesh)
  // Neptune Branch
  nepRotate.add(nepTranslate)
  nepTranslate.add(nepSpin)
  nepSpin.add(nepMesh)
  // Saturne Branch
  satRotate.add(satTranslate)
  satTranslate.add(satSpin)
  satSpin.add(satMesh)
  // Mars
  marsRotate.add(satTranslate)
  marsTranslate.add(satSpin)
  marsSpin.add(satMesh)
}

function init () {
  container = document.getElementById('container')

  camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.1, 100)
  camera.position.z = 30

  var texloader = new THREE.TextureLoader()

  // Sun mesh
  var geometrySun = new THREE.SphereGeometry(4, 42, 42)
  var materialSun = new THREE.MeshBasicMaterial()
  materialSun.combine = 0
  materialSun.needsUpdate = true
  materialSun.wireframe = false
  // Earth mesh
  var geometryEarth = new THREE.SphereGeometry(1, 32, 32)
  // var materialEarth = new THREE.MeshLambertMaterial()
  // materialEarth.combine = 0
  // materialEarth.needsUpdate = true
  // materialEarth.wireframe = false
  // Moon mesh
  var geometryMoon = new THREE.SphereGeometry(0.27, 12, 12)
  var materialMoon = new THREE.MeshLambertMaterial()
  materialMoon.combine = 0
  materialMoon.needsUpdate = true
  materialMoon.wireframe = false
  // Jupiter mesh
  var geometryJup = new THREE.SphereGeometry(2, 32, 32)
  var materialJup = new THREE.MeshLambertMaterial()
  materialJup.combine = 0
  materialJup.needsUpdate = true
  materialJup.wireframe = false
  // Mars mesh
  var geometryMars = new THREE.SphereGeometry(0.5, 25, 25)
  var materialMars = new THREE.MeshBasicMaterial()
  materialSun.combine = 0
  materialSun.needsUpdate = true
  materialSun.wireframe = false
  // Neptune mesh
  var geometryNep = new THREE.SphereGeometry(0.6, 25, 25)
  var materialNep = new THREE.MeshBasicMaterial()
  materialSun.combine = 0
  materialSun.needsUpdate = true
  materialSun.wireframe = false
  // Saturne mesh
  var geometrySat = new THREE.SphereGeometry(0.9, 25, 25)
  var materialSat = new THREE.MeshBasicMaterial()
  materialSun.combine = 0
  materialSun.needsUpdate = true
  materialSun.wireframe = false

  // texture and material allocation (task 2 was written here)
  const sunTexture = texloader.load('tex/2k_sun.jpg')
  const earthTexture = texloader.load('tex/2k_earth_daymap.jpg')
  const specularMap = texloader.load('tex/2k_earth_specular_map.jpg')
  const moonTexture = texloader.load('tex/2k_moon.jpg')
  const jupTexture = texloader.load('tex/2k_jupiter.jpg')
  const marsTexture = texloader.load('tex/2k_mars.jpg')
  const nepTexture = texloader.load('tex/2k_saturn.jpg')
  const satTexture = texloader.load('tex/2k_neptune.jpg')

  materialSun.map = sunTexture
  materialMoon.map = moonTexture
  materialJup.map = jupTexture
  materialNep.map = nepTexture
  materialSat.map = satTexture
  materialMars.map = marsTexture

  // Task 8: material using custom Vertex Shader and Fragment Shader

  var uniforms = THREE.UniformsUtils.merge([
    {
      colorTexture: { value: new THREE.Texture() },
      specularMap: { value: new THREE.Texture() }
    },
    THREE.UniformsLib.lights
  ])

  const shaderMaterial = new THREE.ShaderMaterial({
    uniforms: uniforms,
    vertexShader: document.getElementById('vertexShader').textContent.trim(),
    fragmentShader: document.getElementById('fragmentShader').textContent.trim(),
    lights: true
  })
  shaderMaterial.uniforms.specularMap.value = specularMap
  shaderMaterial.uniforms.colorTexture.value = earthTexture

  earthMesh = new THREE.Mesh(geometryEarth, shaderMaterial)
  moonMesh = new THREE.Mesh(geometryMoon, materialMoon)
  sunMesh = new THREE.Mesh(geometrySun, materialSun)
  jupMesh = new THREE.Mesh(geometryJup, materialJup)
  nepMesh = new THREE.Mesh(geometryNep, materialNep)
  satMesh = new THREE.Mesh(geometrySat, materialSat)
  marsMesh = new THREE.Mesh(geometryMars, materialMars)

  createSceneGraph()

  renderer = new THREE.WebGLRenderer()
  renderer.setClearColor(0x000000)
  renderer.setPixelRatio(window.devicePixelRatio)
  renderer.setSize(window.innerWidth, window.innerHeight)

  container.appendChild(renderer.domElement)

  document.addEventListener('mousemove', onDocumentMouseMove, false)
  window.addEventListener('resize', onWindowResize, false)

  var checkBoxAnim = document.getElementById('animation')
  animation = checkBoxAnim.checked
  checkBoxAnim.addEventListener('change', (event) => {
    animation = event.target.checked
  })

  var checkBoxWireframe = document.getElementById('wireframe')
  earthMesh.material.wireframe = checkBoxWireframe.checked
  moonMesh.material.wireframe = checkBoxWireframe.checked
  sunMesh.material.wireframe = checkBoxWireframe.checked
  jupMesh.material.wireframe = checkBoxWireframe.checked
  marsMesh.material.wireframe = checkBoxWireframe.checked
  nepMesh.material.wireframe = checkBoxWireframe.checked
  satMesh.material.wireframe = checkBoxWireframe.checked
  checkBoxWireframe.addEventListener('change', (event) => {
    earthMesh.material.wireframe = event.target.checked
    moonMesh.material.wireframe = event.target.checked
    sunMesh.material.wireframe = event.target.checked
    jupMesh.material.wireframe = event.target.checked
    marsMesh.material.wireframe = event.target.checked
    nepMesh.material.wireframe = event.target.checked
    satMesh.material.wireframe = event.target.checked
  })
}

function render () {
  // Set up the camera
  camera.position.x = mouseX * 50
  camera.position.y = -mouseY * 50
  camera.lookAt(scene.position)

  // Perform transformations
  earthTranslate.position.x = 8.0
  earthTilt.rotation.z = Math.PI / (180 / 23.44)
  moonTranslate.position.x = -2.0
  jupTranslate.position.x = 41.7
  marsTranslate.position.x = 13.2
  nepTranslate.position.x = 10.2 // ändra
  satTranslate.position.x = 15.2 // ändra
  sunLight.position.set(0, 0, 0)

  // Perform animations
  if (animation) {
    sunSpin.rotation.y += Math.PI / (60 * 25)
    earthSpin.rotation.y += Math.PI / 60
    earthRotate.rotation.y += Math.PI / (60 * 365)
    earthCounter.rotation.y -= Math.PI / (60 * 365)
    moonRotate.rotation.y += Math.PI / (60 * 27.3)
    jupSpin.rotation.y += Math.PI / (60 * 0.42)
    jupRotate.rotation.y += Math.PI / (60 * 365 * 11.86)
    marsSpin.rotation.y += Math.PI / (60 * 1.025)
    marsRotate.rotation.y += Math.PI / (60 * 365 * 1.8)
    nepSpin.rotation.y += Math.PI / (60 * 1.025) //
    nepRotate.rotation.y += Math.PI / (60 * 365 * 1.8) //
    satSpin.rotation.y += Math.PI / (60 * 1.025) //
    satRotate.rotation.y += Math.PI / (60 * 365 * 1.8) //
  }

  // Render the scene
  renderer.render(scene, camera)
}

function animate () {
  requestAnimationFrame(animate) // Request to be called again for next frame
  render()
}

init() // Set up the scene
animate() // Enter an infinite loop
