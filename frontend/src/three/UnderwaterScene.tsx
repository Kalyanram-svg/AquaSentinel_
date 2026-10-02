import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface UnderwaterSceneProps {
  interactive?: boolean;
}

export const UnderwaterScene: React.FC<UnderwaterSceneProps> = ({ interactive = true }) => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x04192b, 0.022);

    const camera = new THREE.PerspectiveCamera(
      55,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0, 18);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    container.appendChild(renderer.domElement);

    // 2. Texture Loader for the Authentic Reference Login Asset
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load('/assets/login-bg.png', (bgTexture) => {
      bgTexture.colorSpace = THREE.SRGBColorSpace;
      
      // Calculate aspect ratio
      const aspect = 1536 / 1024;
      const planeGeo = new THREE.PlaneGeometry(36 * aspect, 36);
      const planeMat = new THREE.MeshBasicMaterial({
        map: bgTexture,
        depthWrite: false,
      });
      const bgMesh = new THREE.Mesh(planeGeo, planeMat);
      bgMesh.position.set(0, 0, -8);
      scene.add(bgMesh);
    });

    // 3. Volumetric Sunlight / Godrays Beams
    const rayGroup = new THREE.Group();
    const rayGeo = new THREE.CylinderGeometry(0.3, 4.5, 30, 16, 1, true);
    const rayMat = new THREE.MeshBasicMaterial({
      color: 0x4deeff,
      transparent: true,
      opacity: 0.075,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    for (let i = 0; i < 7; i++) {
      const ray = new THREE.Mesh(rayGeo, rayMat);
      ray.position.set(-10 + i * 3.5, 12, -2 + Math.sin(i) * 3);
      ray.rotation.z = -0.32 + (i * 0.04);
      ray.rotation.x = 0.15;
      rayGroup.add(ray);
    }
    scene.add(rayGroup);

    // 4. Floating Plankton & Marine Snow Particles
    const particleCount = 420;
    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const scales = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 38;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 26;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 22;
      scales[i] = Math.random() * 0.8 + 0.3;
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeo.setAttribute('scale', new THREE.BufferAttribute(scales, 1));

    // Particle Canvas Texture
    const pCanvas = document.createElement('canvas');
    pCanvas.width = 32;
    pCanvas.height = 32;
    const pCtx = pCanvas.getContext('2d')!;
    const gradient = pCtx.createRadialGradient(16, 16, 0, 16, 16, 16);
    gradient.addColorStop(0, 'rgba(0, 240, 255, 0.95)');
    gradient.addColorStop(0.4, 'rgba(77, 238, 255, 0.4)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    pCtx.fillStyle = gradient;
    pCtx.fillRect(0, 0, 32, 32);
    const particleTexture = new THREE.CanvasTexture(pCanvas);

    const particleMat = new THREE.PointsMaterial({
      size: 0.35,
      map: particleTexture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // 5. Rising Effervescent Bubbles
    const bubbleCount = 75;
    const bubbleGeo = new THREE.BufferGeometry();
    const bubblePos = new Float32Array(bubbleCount * 3);
    const bubbleSpeeds = new Float32Array(bubbleCount);

    for (let i = 0; i < bubbleCount; i++) {
      bubblePos[i * 3] = (Math.random() - 0.5) * 32;
      bubblePos[i * 3 + 1] = -12 + Math.random() * 24;
      bubblePos[i * 3 + 2] = 2 + Math.random() * 8;
      bubbleSpeeds[i] = 0.02 + Math.random() * 0.04;
    }
    bubbleGeo.setAttribute('position', new THREE.BufferAttribute(bubblePos, 3));

    const bubbleMat = new THREE.PointsMaterial({
      size: 0.45,
      map: particleTexture,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const bubbleSystem = new THREE.Points(bubbleGeo, bubbleMat);
    scene.add(bubbleSystem);

    // 6. Interactive 3D Submarine Headlamp Lighting
    const subLightGroup = new THREE.Group();
    // Dual searchlight cones mimicking the AquaSentinel AUV in reference image
    const spot1 = new THREE.SpotLight(0x00f0ff, 3.5, 30, Math.PI / 6, 0.45, 1.2);
    spot1.position.set(-6.5, 1.2, 5);
    spot1.target.position.set(-1.0, 0.0, -2);
    scene.add(spot1.target);
    subLightGroup.add(spot1);

    const spot2 = new THREE.SpotLight(0x38bdf8, 3.0, 28, Math.PI / 7, 0.5, 1.2);
    spot2.position.set(-5.5, 0.8, 5);
    spot2.target.position.set(-0.5, -0.5, -3);
    scene.add(spot2.target);
    subLightGroup.add(spot2);

    // Cyan volumetric beam cone mesh
    const beamGeo = new THREE.ConeGeometry(3.5, 18, 24, 1, true);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.075,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const beamMesh = new THREE.Mesh(beamGeo, beamMat);
    beamMesh.position.set(-4.5, 0.8, 3.0);
    beamMesh.rotation.z = -1.35;
    beamMesh.rotation.y = 0.25;
    subLightGroup.add(beamMesh);
    scene.add(subLightGroup);

    // 7. Mouse Parallax and Smooth Dampening
    let mouseX = 0;
    let mouseY = 0;
    let targetCameraX = 0;
    let targetCameraY = 0;

    const onMouseMove = (e: MouseEvent) => {
      if (!interactive) return;
      const rect = container.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      mouseX = nx * 1.8;
      mouseY = ny * 1.2;
    };

    window.addEventListener('mousemove', onMouseMove);

    // 8. Animation Loop
    let animationId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Smooth camera parallax
      targetCameraX += (mouseX - targetCameraX) * 0.045;
      targetCameraY += (mouseY - targetCameraY) * 0.045;
      camera.position.x = targetCameraX;
      camera.position.y = targetCameraY;
      camera.lookAt(0, 0, 0);

      // Undulate godrays gently
      rayGroup.rotation.y = Math.sin(elapsed * 0.25) * 0.035;
      for (let i = 0; i < rayGroup.children.length; i++) {
        const ray = rayGroup.children[i] as THREE.Mesh;
        (ray.material as THREE.MeshBasicMaterial).opacity = 0.05 + Math.sin(elapsed * 0.8 + i) * 0.025;
      }

      // Drift plankton particles
      const posAttr = particleGeo.getAttribute('position') as THREE.BufferAttribute;
      const pArr = posAttr.array as Float32Array;
      for (let i = 0; i < particleCount; i++) {
        pArr[i * 3 + 1] += 0.005; // slowly rise
        pArr[i * 3] += Math.sin(elapsed * 0.5 + i) * 0.003; // gentle sway
        if (pArr[i * 3 + 1] > 13) {
          pArr[i * 3 + 1] = -13;
        }
      }
      posAttr.needsUpdate = true;

      // Rising bubbles
      const bPosAttr = bubbleGeo.getAttribute('position') as THREE.BufferAttribute;
      const bArr = bPosAttr.array as Float32Array;
      for (let i = 0; i < bubbleCount; i++) {
        bArr[i * 3 + 1] += bubbleSpeeds[i];
        bArr[i * 3] += Math.cos(elapsed * 1.2 + i) * 0.006;
        if (bArr[i * 3 + 1] > 14) {
          bArr[i * 3 + 1] = -12;
          bArr[i * 3] = (Math.random() - 0.5) * 32;
        }
      }
      bPosAttr.needsUpdate = true;

      // AUV Headlamp subtle hovering oscillation
      subLightGroup.position.y = Math.sin(elapsed * 0.7) * 0.25;
      subLightGroup.position.x = Math.cos(elapsed * 0.5) * 0.15;
      beamMesh.scale.set(
        1.0 + Math.sin(elapsed * 1.5) * 0.03,
        1.0 + Math.cos(elapsed * 1.2) * 0.03,
        1.0
      );

      renderer.render(scene, camera);
    };

    animate();

    // 9. Resize Handling
    const handleResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationId);
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
      renderer.dispose();
      particleGeo.dispose();
      bubbleGeo.dispose();
      rayGeo.dispose();
      beamGeo.dispose();
    };
  }, [interactive]);

  return (
    <div
      ref={mountRef}
      className="absolute inset-0 w-full h-full pointer-events-auto overflow-hidden"
      style={{ zIndex: 0 }}
    />
  );
};
