import { getStarColor, loadStarData, calculateAverages,
         getLuminosity, getTemperature, getRadius } from './starDataUtils'
import { useEffect, useState, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import vertexShader from './shaders/vertex.glsl?raw'
import fragmentShader from './shaders/fragment.glsl?raw'

const uniforms = {
  progress: { value: 0.0 },
};

const App = () => {
  const [starData, setStarData] = useState(null);
  const mountRef = useRef(null);
  const materialRef = useRef(null);
  const sceneRef = useRef(new THREE.Scene());
  const isSetupRef = useRef(false);

    // Initial data loading and setup effect
    useEffect(() => {
        const init = async () => {
            const data = await loadStarData();
            if (data) {
                setStarData(data);
                console.log(`Loaded and decompressed ${data.length} stars.`);
                console.log(calculateAverages(data));
            }
        };
        init();
    }, []);

    useEffect(() => {
      // --- Scene Setup ---
      const currentMount = mountRef.current;
      if (!currentMount || !starData || isSetupRef.current) {
            // This is the guard clause that handles initial renders
            console.log('Mount or data not ready. Skipping Three.js setup.');
            return;
      }

      isSetupRef.current = true; // Set flag on first run for vite strict mode.

      const scene = sceneRef.current;
      const camera = new THREE.PerspectiveCamera(
        75, // Field of view
        currentMount.clientWidth / currentMount.clientHeight, // Aspect ratio
        0.1, // Near clipping plane
        4444 // Far clipping plane
      );
      camera.position.set(0, 0, -250);
      camera.lookAt(new THREE.Vector3(0, 0, 0));
      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
      currentMount.appendChild(renderer.domElement);

      // Handle window resize
      const handleResize = () => {
          camera.aspect = currentMount.clientWidth / currentMount.clientHeight;
          camera.updateProjectionMatrix();
          renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
      };
      window.addEventListener('resize', handleResize);

      // Orbit Controls for user interaction 
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.25;
      controls.screenSpacePanning = true;

      // --- Star Visualization (Points) ---
      // Blueprint geometry for a single point
      const starGeometry = new THREE.InstancedBufferGeometry();
      const positionAttribute = new THREE.BufferAttribute(new Float32Array([0, 0, 0]), 3);
      starGeometry.setAttribute('position', positionAttribute);
      const totalStars = starData.length;
      const starSizes = new Float32Array(totalStars);
      const starColors = new Float32Array(totalStars * 3);
      const starLatentPosition = new Float32Array(totalStars * 3);
      const starGalacticPosition = new Float32Array(totalStars * 3);

      for (let i = 0; i < totalStars; i++) {
        // Calculate size using Stefan-Boltzmann law
        const luminosity = getLuminosity(starData[i].absmag);
        const temperature = getTemperature(starData[i].spect);
        let radius = getRadius(luminosity, temperature);
        // Apply a scale factor for visual clarity
        radius = Math.max(0.1, radius * 0.1); // Ensure minimum size and scale down
        starSizes[i] = radius;
        const tempColor = getStarColor(starData[i].spect)
        starColors[i * 3] = tempColor.r;
        starColors[i * 3 + 1] = tempColor.g;
        starColors[i * 3 + 2] = tempColor.b;
        starLatentPosition[i * 3] = starData[i].latent_x * 5;
        starLatentPosition[i * 3 + 1] = starData[i].latent_y * 5;
        starLatentPosition[i * 3 + 2] = starData[i].latent_z * 5;
        starGalacticPosition[i * 3] = starData[i].x;
        starGalacticPosition[i * 3 + 1] = starData[i].y;
        starGalacticPosition[i * 3 + 2] = starData[i].z;
      }

      starGeometry.setAttribute('instanceSize', new THREE.InstancedBufferAttribute(starSizes, 1));
      starGeometry.setAttribute('instanceColor', new THREE.InstancedBufferAttribute(starColors, 3));
      starGeometry.setAttribute('latentPosition', new THREE.InstancedBufferAttribute(starLatentPosition, 3));
      starGeometry.setAttribute('galacticPosition', new THREE.InstancedBufferAttribute(starGalacticPosition, 3));

      const starMaterial = new THREE.ShaderMaterial({
        uniforms: uniforms,
        vertexShader: vertexShader,
        fragmentShader: fragmentShader,
        transparent: true,
      });
      
      materialRef.current = starMaterial;
      const starPoints = new THREE.Points(starGeometry, starMaterial);
      starPoints.frustumCulled = false
      scene.add(starPoints);

      const animate = () => {
        requestAnimationFrame(animate);
        starPoints.rotation.y += 0.001;
        starPoints.rotation.x += 0.0005;
        controls.update();
        renderer.render(scene, camera);
      };
      animate();

      // Cleanup function
        return () => {
            isSetupRef.current = false;
            if (currentMount && renderer.domElement) {
            currentMount.removeChild(renderer.domElement);
            }
            window.removeEventListener('resize', handleResize);
            renderer.dispose();
            controls.dispose();

            // Add proper scene cleanup
            scene.traverse((object) => {
            if (object.geometry) object.geometry.dispose();
            if (object.material) object.material.dispose();
            });
            scene.remove(...scene.children);
        };
    }, [starData]);

    // GSAP Animation Hook
    useGSAP(() => {
        if (!materialRef.current) return;
        
        gsap.to(uniforms.progress, {
            value: 1.0,
            duration: 5,
            ease: "power2.inOut",
            delay: 5,
        });
    }, { scope: mountRef, dependencies: [starData] });

    return (
        <div ref={mountRef} style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
        </div>
    );
};

export default App;
