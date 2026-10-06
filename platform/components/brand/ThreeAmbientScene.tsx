"use client";

import React, { useEffect, useRef } from "react";
import * as THREE from "three";

interface ThreeAmbientSceneProps {
  opacity?: number;
  interactive?: boolean;
}

export default function ThreeAmbientScene({
  opacity = 1,
  interactive = true,
}: ThreeAmbientSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const parent = canvas.parentElement || document.body;
    const getW = () => canvas.clientWidth || parent.clientWidth || window.innerWidth;
    const getH = () => canvas.clientHeight || parent.clientHeight || window.innerHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(65, getW() / getH(), 0.1, 1000);
    camera.position.z = 6.2;

    let renderer: THREE.WebGLRenderer | null = null;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      });
      renderer.setSize(getW(), getH(), false);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    } catch (e) {
      console.warn("WebGL initialization skipped:", e);
      return;
    }

    // Dynamic initial color from CSS variables or default royal blue
    const computedStyle = getComputedStyle(document.documentElement);
    const initialHex = computedStyle.getPropertyValue("--g").trim() || "#2540ea";
    const initialLightHex = computedStyle.getPropertyValue("--gl").trim() || "#93c5fd";

    // 1. Torus Knot
    const knotGeo = new THREE.TorusKnotGeometry(2.1, 0.5, 128, 20);
    const knotMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(initialHex),
      wireframe: true,
      transparent: true,
      opacity: 0.32,
    });
    const knot = new THREE.Mesh(knotGeo, knotMat);
    scene.add(knot);

    // 2. Surrounding Icosahedron
    const icoGeo = new THREE.IcosahedronGeometry(3.5, 1);
    const icoMat = new THREE.MeshBasicMaterial({
      color: 0x60a5fa,
      wireframe: true,
      transparent: true,
      opacity: 0.08,
    });
    const ico = new THREE.Mesh(icoGeo, icoMat);
    scene.add(ico);

    // 3. Central Wireframe Sphere
    const sphereGeo = new THREE.SphereGeometry(0.8, 20, 20);
    const sphereMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(initialLightHex),
      wireframe: true,
      transparent: true,
      opacity: 0.22,
    });
    const sphere = new THREE.Mesh(sphereGeo, sphereMat);
    scene.add(sphere);

    // 4. Stellar Particles
    const particleCount = 1400;
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i++) {
      positions[i] = (Math.random() - 0.5) * 24;
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const ptsMat = new THREE.PointsMaterial({
      size: 0.025,
      color: 0xffffff,
      transparent: true,
      opacity: 0.45,
    });
    const pts = new THREE.Points(pGeo, ptsMat);
    scene.add(pts);

    // Dynamic color update handler
    const handlePaletteChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ color: string; lightColor: string }>;
      if (customEvent.detail?.color) {
        const col = new THREE.Color(customEvent.detail.color);
        knotMat.color = col;
        if (customEvent.detail.lightColor) {
          sphereMat.color = new THREE.Color(customEvent.detail.lightColor);
        } else {
          sphereMat.color = col;
        }
      }
    };
    window.addEventListener("easytrade-palette-change", handlePaletteChange);

    // Mouse / Touch tracking
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;

    const onMouseMove = (e: MouseEvent) => {
      if (!interactive) return;
      targetX = (e.clientX / window.innerWidth - 0.5) * 1.4;
      targetY = -(e.clientY / window.innerHeight - 0.5) * 1.4;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!interactive || !e.touches[0]) return;
      targetX = (e.touches[0].clientX / window.innerWidth - 0.5) * 1.2;
      targetY = -(e.touches[0].clientY / window.innerHeight - 0.5) * 1.2;
    };

    window.addEventListener("mousemove", onMouseMove, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });

    // Animation loop
    let animId: number;
    let frame = 0;

    const animate = () => {
      animId = requestAnimationFrame(animate);
      frame += 0.005;

      knot.rotation.x = frame * 0.35;
      knot.rotation.y = frame * 0.52;

      ico.rotation.x = -frame * 0.12;
      ico.rotation.y = frame * 0.16;

      sphere.rotation.y = frame * 0.4;
      pts.rotation.y = frame * 0.03;

      currentX += (targetX - currentX) * 0.04;
      currentY += (targetY - currentY) * 0.04;

      camera.position.x = currentX;
      camera.position.y = currentY;
      camera.lookAt(scene.position);

      renderer?.render(scene, camera);
    };

    animate();

    const onResize = () => {
      const w = getW();
      const h = getH();
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer?.setSize(w, h, false);
    };

    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("easytrade-palette-change", handlePaletteChange);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("resize", onResize);

      knotGeo.dispose();
      knotMat.dispose();
      icoGeo.dispose();
      icoMat.dispose();
      sphereGeo.dispose();
      sphereMat.dispose();
      pGeo.dispose();
      ptsMat.dispose();
      renderer?.dispose();
    };
  }, [interactive]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none transition-opacity duration-700"
      style={{ opacity, zIndex: 0 }}
      aria-hidden="true"
    />
  );
}
