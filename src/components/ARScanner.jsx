// src/components/ARScanner.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';

/**
 * ARScanner component
 *
 * Penjelasan singkat:
 * - Mengatur arjs dengan sourceWidth/sourceHeight 1280x720 untuk mengurangi efek "zoom".
 * - Menambahkan cameraParametersUrl untuk kalibrasi.
 * - Memaksa video/canvas agar object-position:center dan menghapus transform yang kadang diterapkan AR.js.
 * - Menangani resize/orientation change untuk menjaga feed tetap centered.
 *
 * Pastikan file pola.patt dan ekosistem.glb ada di folder public/:
 * - public/pola.patt
 * - public/ekosistem.glb
 */
const ARScanner = () => {
    const sceneRef = useRef(null);
    const [displaySize, setDisplaySize] = useState({
        width: typeof window !== 'undefined' ? window.innerWidth : 640,
        height: typeof window !== 'undefined' ? window.innerHeight : 480,
    });

    // CSS yang diperlukan — termasuk override untuk video/canvas A-Frame/AR.js
    const styles = `
    /* Container & overlay */
    .ar-container { position: relative; width: 100%; height: 100vh; overflow: hidden; }
    .scanner-frame {
      position: absolute;
      top: 50%; left: 50%;
      width: 280px; height: 280px;
      transform: translate(-50%, -50%);
      border-radius: 12px; box-sizing: border-box;
      z-index: 9999; background: rgba(0,0,0,0.08); backdrop-filter: blur(2px);
      border: 2px dashed rgba(255,255,255,0.25);
      pointer-events: none;
    }
    .corner { position: absolute; width: 32px; height: 32px; border: 4px solid #00ffcc; border-radius: 4px; }
    .corner.tl { top: -2px; left: -2px; border-right: none; border-bottom: none; }
    .corner.tr { top: -2px; right: -2px; border-left: none; border-bottom: none; }
    .corner.bl { bottom: -2px; left: -2px; border-right: none; border-top: none; }
    .corner.br { bottom: -2px; right: -2px; border-left: none; border-top: none; }
    .scan-line { position: absolute; left:0; top:0; width:100%; height:3px;
      background: linear-gradient(to right, transparent, #00ffcc, transparent);
      animation: scan 2.5s linear infinite;
    }
    @keyframes scan { 0% { top: 0% } 100% { top: 100% } }

    /* Force A-Frame / AR.js canvas/video to fill and center */
    .ar-container a-scene,
    .ar-container .a-canvas,
    .ar-container canvas,
    .ar-container video {
      width: 100% !important;
      height: 100% !important;
      position: absolute !important;
      top: 0 !important;
      left: 0 !important;
      object-fit: cover !important; /* jika masih crop, ubah ke contain untuk debug */
      object-position: center center !important;
      transform: none !important; /* override transform yang AR.js kadang apply */
      z-index: 5 !important;
      pointer-events: none; /* biarkan overlay tetap menerima touch events jika perlu */
    }

    /* Jika ingin men-debug area yang dipotong, ganti object-fit: contain sementara */
  `;

    // paths asset (public)
    const patternUrl = `${process.env.PUBLIC_URL || ''}/pola.patt`;
    const modelUrl = `${process.env.PUBLIC_URL || ''}/ekosistem.glb`;

    // builder for arjs settings (so can re-generate on resize)
    const buildArjsSettings = (displayWidth, displayHeight) => {
        // camera_para.dat via rawcdn untuk kompatibilitas (tidak bergantung ke raw.githack)
        const cameraPara = 'https://rawcdn.githack.com/AR-js-org/AR.js/master/three.js/data/camera_para.dat';
        // source resolution diset lebih besar (kurangi crop / zoom)
        const srcW = 1280;
        const srcH = 720;
        // trackingMethod best untuk stabilitas
        return `sourceType: webcam; sourceWidth: ${srcW}; sourceHeight: ${srcH}; displayWidth: ${displayWidth}; displayHeight: ${displayHeight}; cameraParametersUrl: ${cameraPara}; trackingMethod: best; debugUIEnabled: false;`;
    };

    // initial arjs setting (memoize but will update at runtime if resize)
    const initialArjs = useMemo(() => buildArjsSettings(displaySize.width, displaySize.height), [displaySize]);

    // Update scene's arjs attribute when displaySize changes (resize/orientation)
    useEffect(() => {
        const sceneEl = sceneRef.current;
        if (!sceneEl) return;
        const newSettings = buildArjsSettings(displaySize.width, displaySize.height);
        try {
            sceneEl.setAttribute('arjs', newSettings);
        } catch (e) {
            // some browsers/libraries might throw — but setAttribute usually works
            // fallback: setAttribute via dataset
            sceneEl.arjs = newSettings;
        }
    }, [displaySize]);

    // handle resize/orientation changes and update state
    useEffect(() => {
        const onResize = () => {
            setDisplaySize({
                width: window.innerWidth,
                height: window.innerHeight,
            });
            // small timeout to let layout settle
            setTimeout(() => {
                // Force reapply video styles right after resize
                const vid = document.querySelector('.ar-container video');
                if (vid) {
                    vid.style.objectFit = 'cover';
                    vid.style.objectPosition = 'center center';
                    vid.style.transform = 'none';
                }
            }, 120);
        };

        window.addEventListener('resize', onResize);
        window.addEventListener('orientationchange', onResize);

        return () => {
            window.removeEventListener('resize', onResize);
            window.removeEventListener('orientationchange', onResize);
        };
    }, []);

    // runtime "patch" — beberapa versi AR.js re-apply transform periodically; kita pastikan videonya tetap center
    useEffect(() => {
        const cleanupInterval = () => { };
        let timer = null;

        const startFix = () => {
            timer = setInterval(() => {
                const video = document.querySelector('.ar-container video');
                const canvas = document.querySelector('.ar-container canvas');
                if (video) {
                    video.style.objectFit = 'cover';
                    video.style.objectPosition = 'center center';
                    video.style.transform = 'none';
                    video.style.top = '0';
                    video.style.left = '0';
                }
                if (canvas) {
                    canvas.style.objectFit = 'cover';
                    canvas.style.objectPosition = 'center center';
                    canvas.style.transform = 'none';
                    canvas.style.top = '0';
                    canvas.style.left = '0';
                }
            }, 300); // ringan; cukup untuk menangkal reapply dari AR.js
        };

        startFix();
        return () => {
            if (timer) clearInterval(timer);
            cleanupInterval();
        };
    }, []);

    // optional: small helper untuk debug (ganti object-fit sementara)
    const toggleObjectFitDebug = () => {
        const video = document.querySelector('.ar-container video');
        if (!video) return;
        video.style.objectFit = video.style.objectFit === 'contain' ? 'cover' : 'contain';
    };

    return (
        <div className="ar-container">
            <style>{styles}</style>

            {/* Scanner overlay (di atas video) */}
            <div className="scanner-frame" aria-hidden>
                <div className="corner tl"></div>
                <div className="corner tr"></div>
                <div className="corner bl"></div>
                <div className="corner br"></div>
                <div className="scan-line"></div>
            </div>

            {/* A-Frame scene */}
            <a-scene
                ref={sceneRef}
                embedded
                arjs={initialArjs}
                vr-mode-ui="enabled: false"
                renderer="logarithmicDepthBuffer: true;"
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 5 }}
            >
                <a-marker type="pattern" url={patternUrl}>
                    <a-entity
                        gltf-model={modelUrl}
                        scale="0.1 0.1 0.1"
                        rotation="-90 0 0"
                        position="0 0.5 0"
                    ></a-entity>
                </a-marker>

                <a-camera fov="95"></a-camera>
            </a-scene>

            {/* small debug button (non-intrusive) */}
            <button
                onClick={toggleObjectFitDebug}
                style={{
                    position: 'absolute',
                    right: 12,
                    bottom: 12,
                    zIndex: 10000,
                    background: 'rgba(0,0,0,0.45)',
                    color: '#fff',
                    border: 'none',
                    padding: '6px 10px',
                    borderRadius: 8,
                    fontSize: 12,
                    cursor: 'pointer',
                }}
                title="Toggle object-fit (debug)"
            >
                debug fit
            </button>
        </div>
    );
};

export default ARScanner;
