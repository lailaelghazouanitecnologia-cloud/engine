/**
 * PlayCanvas Engine Demo
 * Demonstrates the Unity-like API with Scene, GameObjects, and Components
 */

import {
    // Core
    GameObject,
    Scene,
    SceneManager,
    Transform,
    // Math
    Vector3,
    Quaternion,
    Color,
    // Components
    Camera,
    Light,
    LightType,
    MeshRenderer,
    // Graphics
    GraphicsDevice,
    Mesh,
    StandardMaterial,
    // Geometry
    BoxGeometry,
    SphereGeometry,
    PlaneGeometry,
} from '../src';

// Get canvas and info elements
const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const info = document.getElementById('info') as HTMLDivElement;

// Create graphics device
let device: GraphicsDevice | null = null;

try {
    device = new GraphicsDevice({ canvas, antialias: true });
    info.textContent = `WebGL2 initialized | Max Texture Size: ${device.capabilities.maxTextureSize}`;
} catch (e) {
    info.textContent = `Failed to initialize WebGL2: ${e}`;
}

// Create scene
const scene = SceneManager.createScene('MainScene');

// ==================== Create Camera ====================
const cameraObject = new GameObject('Main Camera');
const camera = cameraObject.addComponent(Camera);
camera.fieldOfView = 60;
camera.nearClipPlane = 0.1;
camera.farClipPlane = 1000;
camera.backgroundColor = new Color(0.1, 0.1, 0.15, 1);
cameraObject.transform.position = new Vector3(0, 5, 10);
cameraObject.transform.lookAt(Vector3.zero);
scene.addRootGameObject(cameraObject);

// ==================== Create Lights ====================
const sunObject = new GameObject('Directional Light');
const sunLight = sunObject.addComponent(Light);
sunLight.type = LightType.Directional;
sunLight.color = new Color(1, 0.95, 0.9, 1);
sunLight.intensity = 1.2;
sunObject.transform.rotation = Quaternion.euler(50, -30, 0);
scene.addRootGameObject(sunObject);

const pointLightObj = new GameObject('Point Light');
const pointLight = pointLightObj.addComponent(Light);
pointLight.type = LightType.Point;
pointLight.color = new Color(0.3, 0.5, 1, 1);
pointLight.intensity = 2;
pointLight.range = 15;
pointLightObj.transform.position = new Vector3(3, 3, 3);
scene.addRootGameObject(pointLightObj);

// ==================== Create Ground ====================
const groundObject = new GameObject('Ground');
if (device) {
    const groundRenderer = groundObject.addComponent(MeshRenderer);
    const groundGeometry = new PlaneGeometry({ width: 20, height: 20 });
    groundRenderer.mesh = Mesh.fromGeometry(device, groundGeometry);
    const groundMaterial = new StandardMaterial(device);
    groundMaterial.color = new Color(0.3, 0.35, 0.3, 1);
    groundMaterial.smoothness = 0.2;
    groundRenderer.material = groundMaterial;
}
scene.addRootGameObject(groundObject);

// ==================== Create Cube ====================
const cubeObject = new GameObject('Cube');
cubeObject.transform.position = new Vector3(-2, 1, 0);
if (device) {
    const cubeRenderer = cubeObject.addComponent(MeshRenderer);
    const cubeGeometry = new BoxGeometry({ width: 2, height: 2, depth: 2 });
    cubeRenderer.mesh = Mesh.fromGeometry(device, cubeGeometry);
    const cubeMaterial = new StandardMaterial(device);
    cubeMaterial.color = new Color(0.8, 0.2, 0.3, 1);
    cubeMaterial.metallic = 0.1;
    cubeMaterial.smoothness = 0.7;
    cubeRenderer.material = cubeMaterial;
}
scene.addRootGameObject(cubeObject);

// ==================== Create Sphere ====================
const sphereObject = new GameObject('Sphere');
sphereObject.transform.position = new Vector3(2, 1.5, 0);
if (device) {
    const sphereRenderer = sphereObject.addComponent(MeshRenderer);
    const sphereGeometry = new SphereGeometry({ radius: 1.5, segments: 32 });
    sphereRenderer.mesh = Mesh.fromGeometry(device, sphereGeometry);
    const sphereMaterial = new StandardMaterial(device);
    sphereMaterial.color = new Color(0.2, 0.5, 0.9, 1);
    sphereMaterial.metallic = 0.8;
    sphereMaterial.smoothness = 0.9;
    sphereRenderer.material = sphereMaterial;
}
scene.addRootGameObject(sphereObject);

// ==================== Animation Loop ====================
let time = 0;
let lastTime = performance.now();
let frameCount = 0;
let fps = 0;

function update() {
    const now = performance.now();
    const deltaTime = (now - lastTime) / 1000;
    lastTime = now;
    time += deltaTime;

    // FPS counter
    frameCount++;
    if (frameCount >= 60) {
        fps = Math.round(frameCount / deltaTime / 60);
        frameCount = 0;
    }

    // Rotate cube
    cubeObject.transform.rotation = Quaternion.euler(time * 30, time * 45, 0);

    // Bounce sphere
    const bounceY = 1.5 + Math.sin(time * 2) * 0.5;
    sphereObject.transform.position = new Vector3(2, bounceY, 0);

    // Orbit camera slowly
    const camRadius = 12;
    const camAngle = time * 0.2;
    cameraObject.transform.position = new Vector3(
        Math.sin(camAngle) * camRadius,
        5 + Math.sin(time * 0.5) * 2,
        Math.cos(camAngle) * camRadius
    );
    cameraObject.transform.lookAt(Vector3.zero);

    // Move point light
    pointLightObj.transform.position = new Vector3(
        Math.sin(time * 1.5) * 4,
        3,
        Math.cos(time * 1.5) * 4
    );

    // Update scene
    scene._update(deltaTime);

    // Render (simple clear for now)
    if (device) {
        device.clear(camera.backgroundColor, 1.0);
    }

    // Update info
    const sceneInfo = `
        Scene: ${scene.name} |
        Objects: ${scene.rootCount} |
        FPS: ${fps} |
        Camera: (${cameraObject.transform.position.x.toFixed(1)}, ${cameraObject.transform.position.y.toFixed(1)}, ${cameraObject.transform.position.z.toFixed(1)})
    `;
    info.textContent = sceneInfo;

    requestAnimationFrame(update);
}

// Start animation
update();

// Log scene hierarchy
console.log('Scene Hierarchy:');
scene.getRootGameObjects().forEach((go, i) => {
    console.log(`  ${i + 1}. ${go.name}`);
    go.getAllComponents().forEach(comp => {
        console.log(`     - ${comp.constructor.name}`);
    });
});
