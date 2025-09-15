'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

interface RotatingBananaProps {
  modelPath?: string;
  rotationSpeed?: number;
  forcedRotationAngle?: number;
  pixelSize?: number;
  gapRatio?: number;
  customResolution?: number;
  initialRotationAngle?: number;
  solid?: boolean;
  onModelLoaded?: () => void;
  onRotationUpdate?: (angle: number) => void;
}

export default function RotatingBanana({
  modelPath = '/assets/models/banana3d.glb',
  rotationSpeed = 0.0025,
  forcedRotationAngle,
  pixelSize = 1,
  gapRatio = 1.5,
  customResolution = 320,
  initialRotationAngle = 0,
  solid = false,
  onModelLoaded,
  onRotationUpdate,
}: RotatingBananaProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const renderTargetRef = useRef<THREE.WebGLRenderTarget | null>(null);
  const modelRef = useRef<THREE.Group | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const postMaterialRef = useRef<THREE.ShaderMaterial | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  const rotationAngleRef = useRef(initialRotationAngle);
  const mouseRef = useRef({ x: 0, y: 0 });
  const targetMouseRef = useRef({ x: 0, y: 0 });
  const lastFrameTimeRef = useRef(Date.now());

  const [isLoaded, setIsLoaded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [disableMouseInteractions] = useState(true);

  const MOUSE_RADIUS = 50.0;

  // Shader code
  const vertexShader = `
    varying vec2 vUv;
    varying float vDepth;

    void main() {
      vUv = uv;
      vec4 modelViewPosition = modelViewMatrix * vec4(position, 1.0);
      vDepth = -modelViewPosition.z;
      gl_Position = projectionMatrix * modelViewPosition;
    }
  `;

  const fragmentShader = `
    uniform sampler2D tDiffuse;
    uniform vec2 resolution;
    uniform vec2 mousePos;
    uniform float mouseRadius;
    uniform vec2 lastMousePos;
    uniform float time;
    uniform float uPixelSize;
    uniform float uGapRatio;
    uniform float uRotationAngle;
    uniform bool uSolid;

    varying vec2 vUv;
    varying float vDepth;

    float hash(vec2 p) {
      float h = dot(p, vec2(127.1, 311.7));
      return fract(sin(h) * 43758.5453123);
    }

    float getColorIntensity(vec3 color) {
      return length(color);
    }

    float smoothTransition(float edge0, float edge1, float x) {
      float t = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
      return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
    }

    vec3 colorama(vec2 uv, vec3 color) {
      float intensity = getColorIntensity(color);

      vec2 centeredUV = uv * 2.0 - 1.0;
      float baseAmount = 0.2;
      float rotatedAmount = 0.18;

      float angle = mod(uRotationAngle, 3.14159 * 2.0);
      float dist90 = abs(angle - 3.14159 / 2.0);
      float dist270 = abs(angle - 3.14159 * 3.0 / 2.0);
      float normalizedDist = min(dist90, dist270) / (3.14159 / 2.0);

      float curveAmount = mix(
          rotatedAmount,
          baseAmount,
          smoothstep(0.0, 0.8, normalizedDist)
      );

      float curvedY = uv.y + (sin(uv.x * 3.14159) * curveAmount);

      float depthFactor = 1.0 - smoothstep(0.2, 0.7, intensity);
      float factor = mix(curvedY, depthFactor, 0.1);

      vec3 yellow = vec3(0.95, 0.89, 0.15);
      vec3 orange = vec3(0.82, 0.5, 0.05);
      vec3 brown = vec3(0.35, 0.25, 0.0);
      vec3 darkBrown = vec3(0.3, 0.25, 0.0);

      vec3 baseColor;
      if (factor < 0.53) {
          baseColor = yellow;
      } else if (factor < 0.56) {
          float t = smoothstep(0.53, 0.56, factor);
          baseColor = mix(yellow, orange, t);
      } else if (factor < 0.57) {
          baseColor = orange;
      } else if (factor < 0.65) {
          float t = smoothstep(0.57, 0.65, factor);
          baseColor = mix(orange, brown, t);
      } else if (factor < 0.78) {
          baseColor = brown;
      } else if (factor < 0.88) {
          float t = smoothstep(0.78, 0.88, factor);
          baseColor = mix(brown, darkBrown, t);
      } else {
          baseColor = darkBrown;
      }

      float darkening = mix(0.3, 1.0, pow(1.0 - depthFactor, 0.8));
      return baseColor * darkening;
    }

    void main() {
      float pixelSizeValue = uPixelSize;
      float gap = pixelSizeValue * uGapRatio;
      float totalSize = pixelSizeValue + gap;

      vec2 gridPos = floor(vUv * resolution / totalSize);
      vec2 pixelCenter = (gridPos + 0.5) * totalSize / resolution;

      vec2 screenPos = pixelCenter * resolution;

      vec2 toMouse = mousePos - screenPos;
      float distanceToMouse = length(toMouse);

      float uniqueOffset = hash(gridPos) * 2.0 - 1.0;
      float timeOffset = time * (0.5 + hash(gridPos) * 0.5);

      vec2 currentPos = screenPos;

      float normalizedDist = distanceToMouse / (mouseRadius * (1.0 + uniqueOffset * 0.1));
      float targetDecay = 1.0 / (1.0 + normalizedDist * normalizedDist * 2.0);
      targetDecay *= 0.8 + sin(timeOffset) * 0.1;

      float defaultMovement = sin(timeOffset + gridPos.x * 0.1) * cos(timeOffset + gridPos.y * 0.1) * 1.0;

      vec2 direction = normalize(toMouse + vec2(cos(timeOffset), sin(timeOffset)) * 0.5);
      float displacement = max(defaultMovement, targetDecay * mouseRadius * 0.7);

      vec2 attractionOffset = direction * displacement;
      vec2 finalPos = screenPos - attractionOffset;

      vec2 attractedUV = finalPos / resolution;

      // Keep the pixelated effect with gaps between dots
      vec2 pixelOffset = fract(vUv * resolution / totalSize);
      float pixelRatio = pixelSizeValue / totalSize;

      if (pixelOffset.x < (0.5 - pixelRatio/2.0) ||
          pixelOffset.x > (0.5 + pixelRatio/2.0) ||
          pixelOffset.y < (0.5 - pixelRatio/2.0) ||
          pixelOffset.y > (0.5 + pixelRatio/2.0)) {
        discard;
        return;
      }

      vec4 texel = texture2D(tDiffuse, attractedUV);

      if(texel.a <= 0.0) {
        discard;
        return;
      }

      vec3 colorized = colorama(attractedUV, texel.rgb);
      // Control alpha: solid=true means fully opaque dots, solid=false means original alpha
      float finalAlpha = uSolid ? 1.0 : texel.a;
      gl_FragColor = vec4(colorized, finalAlpha);
    }
  `;

  // Update rotation function
  const updateRotation = useCallback(() => {
    if (modelRef.current && forcedRotationAngle !== undefined) {
      modelRef.current.rotation.y = forcedRotationAngle;
      rotationAngleRef.current = forcedRotationAngle;
    }
  }, [forcedRotationAngle]);

  // Handle resize
  const handleResize = useCallback(() => {
    if (!cameraRef.current || !rendererRef.current) return;

    const frustumSize = 5;
    const size = Math.min(window.innerWidth, window.innerHeight);
    const aspect = 1.0;

    cameraRef.current.left = (frustumSize * aspect) / -2;
    cameraRef.current.right = (frustumSize * aspect) / 2;
    cameraRef.current.top = frustumSize / 2;
    cameraRef.current.bottom = -frustumSize / 2;
    cameraRef.current.updateProjectionMatrix();

    rendererRef.current.setSize(size, size);

    if (canvasRef.current) {
      canvasRef.current.style.position = 'absolute';
      canvasRef.current.style.left = `${(window.innerWidth - size) / 2}px`;
      canvasRef.current.style.top = `${(window.innerHeight - size) / 2}px`;
    }
  }, []);

  // Handle mouse move
  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      if (isMobile) return;
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = ((event.clientX - rect.left) / rect.width) * customResolution;
      const y =
        (1.0 - (event.clientY - rect.top) / rect.height) * customResolution;
      mouseRef.current = { x, y };
      targetMouseRef.current = { x, y };
    },
    [isMobile, customResolution],
  );

  // Handle mouse leave
  const handleMouseLeave = useCallback(() => {
    mouseRef.current = { x: 0, y: 0 };
    targetMouseRef.current = { x: 0, y: 0 };
  }, []);

  // Load model
  const loadModel = useCallback(() => {
    const loader = new GLTFLoader();

    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath(
      'https://www.gstatic.com/draco/versioned/decoders/1.5.6/',
    );
    loader.setDRACOLoader(dracoLoader);

    loader.load(modelPath, (gltf) => {
      const model = gltf.scene;

      // Optimize the model for better performance
      model.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          if (child.geometry) {
            child.geometry.computeVertexNormals();
            child.geometry.computeBoundingSphere();
            child.geometry.computeBoundingBox();
          }

          if (child.material) {
            child.material.needsUpdate = false;
          }
        }
      });

      // Remove any existing model to prevent duplicates
      if (modelRef.current && sceneRef.current) {
        sceneRef.current.remove(modelRef.current);
      }

      const scale = isMobile ? 1.05 : 1.0;
      model.scale.set(scale, scale, scale);
      model.position.set(0, 0, 0);
      model.rotation.set(0, 0, 0);
      sceneRef.current?.add(model);
      modelRef.current = model;

      if (
        rendererRef.current &&
        sceneRef.current &&
        cameraRef.current &&
        renderTargetRef.current
      ) {
        for (let i = 0; i < 3; i++) {
          rendererRef.current.setRenderTarget(renderTargetRef.current);
          rendererRef.current.clear();
          rendererRef.current.render(sceneRef.current, cameraRef.current);

          rendererRef.current.setRenderTarget(null);
          rendererRef.current.clear();
          const postScene = new THREE.Scene();
          const postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
          rendererRef.current.render(postScene, postCamera);
        }
      }
      setIsLoaded(true);
      onModelLoaded?.();
    });
  }, [modelPath, isMobile, onModelLoaded]);

  // Setup Three.js
  const setupThreeJS = useCallback(() => {
    if (!canvasRef.current) return;

    // Create scene
    const scene = new THREE.Scene();
    scene.background = null;

    const aspect = window.innerWidth / window.innerHeight;
    const frustumSize = 5;
    const camera = new THREE.OrthographicCamera(
      (frustumSize * aspect) / -2,
      (frustumSize * aspect) / 2,
      frustumSize / 2,
      frustumSize / -2,
      -1000,
      1000,
    );
    camera.position.set(0, 0, 0);
    camera.lookAt(0, 0, 0);

    const createDirectionalLight = (
      x: number,
      y: number,
      z: number,
      intensity: number,
    ) => {
      const light = new THREE.DirectionalLight(0xffffff, intensity);
      light.position.set(x, y, z);
      return light;
    };

    scene.add(createDirectionalLight(0, 0, 5, 1.5));
    scene.add(createDirectionalLight(0, 0, -5, 1.5));
    scene.add(createDirectionalLight(5, 0, 0, 1.5));
    scene.add(createDirectionalLight(-5, 0, 0, 1.5));
    scene.add(createDirectionalLight(0, 5, 0, 1.5));
    scene.add(createDirectionalLight(0, -5, 0, 1));
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));

    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      alpha: true,
      antialias: false,
      premultipliedAlpha: false,
      preserveDrawingBuffer: true,
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);
    renderer.setClearAlpha(0);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enabled = false;
    controlsRef.current = controls;

    sceneRef.current = scene;
    cameraRef.current = camera;
    rendererRef.current = renderer;
    renderTargetRef.current = new THREE.WebGLRenderTarget(
      customResolution,
      customResolution,
    );

    const postScene = new THREE.Scene();
    const postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    renderer.setRenderTarget(renderTargetRef.current);
    renderer.clear();
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);
    renderer.clear();
    renderer.render(postScene, postCamera);

    const centerX = -200;
    const centerY = 0;

    const postMaterial = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: renderTargetRef.current.texture },
        resolution: {
          value: new THREE.Vector2(customResolution, customResolution),
        },
        mousePos: { value: new THREE.Vector2(centerX, centerY) },
        lastMousePos: { value: new THREE.Vector2(centerX, centerY) },
        mouseRadius: { value: MOUSE_RADIUS },
        time: { value: 0.0 },
        uPixelSize: { value: pixelSize },
        uGapRatio: { value: gapRatio },
        uRotationAngle: { value: 0.0 },
        uSolid: { value: solid },
      },
      vertexShader,
      fragmentShader,
      transparent: true,
    });

    postMaterialRef.current = postMaterial;
    const postQuad = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      postMaterial,
    );
    postScene.add(postQuad);

    mouseRef.current = { x: centerX, y: centerY };
    targetMouseRef.current = { x: centerX, y: centerY };

    const animate = () => {
      if (
        !rendererRef.current ||
        !sceneRef.current ||
        !cameraRef.current ||
        !renderTargetRef.current ||
        !postScene ||
        !postCamera
      ) {
        animationFrameIdRef.current = requestAnimationFrame(animate);
        return;
      }

      const currentTime = Date.now();
      const deltaTime = Math.min(
        (currentTime - lastFrameTimeRef.current) / 1000,
        0.016,
      );
      lastFrameTimeRef.current = currentTime;

      const screenCenterX = customResolution / 2;
      const screenCenterY = customResolution / 2;

      if (modelRef.current) {
        if (forcedRotationAngle === undefined) {
          rotationAngleRef.current += rotationSpeed;
          modelRef.current.rotation.y = rotationAngleRef.current;
          onRotationUpdate?.(rotationAngleRef.current);
        } else {
          modelRef.current.rotation.y = forcedRotationAngle;
          rotationAngleRef.current = forcedRotationAngle;
          onRotationUpdate?.(rotationAngleRef.current);
        }

        if (postMaterialRef.current) {
          postMaterialRef.current.uniforms.uRotationAngle.value =
            rotationAngleRef.current;
        }
      }

      if (isMobile) {
        mouseRef.current = { x: screenCenterX, y: screenCenterY };
        targetMouseRef.current = { x: screenCenterX, y: screenCenterY };
      }

      if (postMaterialRef.current) {
        const mouseX = mouseRef.current?.x ?? screenCenterX;
        const mouseY = mouseRef.current?.y ?? screenCenterY;

        postMaterialRef.current.uniforms.lastMousePos.value.copy(
          postMaterialRef.current.uniforms.mousePos.value,
        );
        postMaterialRef.current.uniforms.mousePos.value.set(mouseX, mouseY);
        postMaterialRef.current.uniforms.mouseRadius.value = MOUSE_RADIUS;
        postMaterialRef.current.uniforms.time.value += deltaTime;
      }

      rendererRef.current.setRenderTarget(renderTargetRef.current);
      rendererRef.current.clear();
      rendererRef.current.render(sceneRef.current, cameraRef.current);

      rendererRef.current.setRenderTarget(null);
      rendererRef.current.clear();
      rendererRef.current.render(postScene, postCamera);

      animationFrameIdRef.current = requestAnimationFrame(animate);
    };

    animate();
    loadModel();
    handleResize();
  }, [
    customResolution,
    pixelSize,
    gapRatio,
    rotationSpeed,
    forcedRotationAngle,
    isMobile,
    loadModel,
    handleResize,
    onRotationUpdate,
    solid,
    vertexShader,
    fragmentShader,
  ]);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (animationFrameIdRef.current !== null) {
      cancelAnimationFrame(animationFrameIdRef.current);
    }

    if (!isMobile && !disableMouseInteractions) {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('visibilitychange', handleMouseLeave);
    }

    window.removeEventListener('resize', handleResize);

    rendererRef.current?.dispose();
    controlsRef.current?.dispose();
    postMaterialRef.current?.dispose();
    renderTargetRef.current?.dispose();

    sceneRef.current = null;
    cameraRef.current = null;
    rendererRef.current = null;
    renderTargetRef.current = null;
    modelRef.current = null;
    controlsRef.current = null;
    postMaterialRef.current = null;
  }, [
    isMobile,
    disableMouseInteractions,
    handleMouseMove,
    handleMouseLeave,
    handleResize,
  ]);

  // Setup event listeners
  const setupEventListeners = useCallback(() => {
    if (!isMobile && !disableMouseInteractions) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseleave', handleMouseLeave);
      document.addEventListener('visibilitychange', handleMouseLeave);
    }

    window.addEventListener('resize', handleResize);
  }, [
    isMobile,
    disableMouseInteractions,
    handleMouseMove,
    handleMouseLeave,
    handleResize,
  ]);

  // Check if mobile on mount
  useEffect(() => {
    setIsMobile(
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent,
      ),
    );
  }, []);

  // Setup Three.js on mount
  useEffect(() => {
    setupThreeJS();
    setupEventListeners();

    return cleanup;
  }, [setupThreeJS, setupEventListeners, cleanup]);

  // Update rotation when prop changes
  useEffect(() => {
    updateRotation();
  }, [updateRotation]);

  return (
    <div
      ref={containerRef}
      className={`fixed z-10 mx-auto flex h-screen w-screen touch-none items-center justify-center transition-all duration-[250ms] ease-in ${
        isLoaded ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
      }`}
      style={{
        pointerEvents: isMobile || disableMouseInteractions ? 'none' : 'all',
      }}
    >
      <canvas
        ref={canvasRef}
        className="absolute h-full w-full"
        style={{
          pointerEvents: isMobile || disableMouseInteractions ? 'none' : 'auto',
          touchAction: isMobile || disableMouseInteractions ? 'none' : 'auto',
        }}
      />
    </div>
  );
}
