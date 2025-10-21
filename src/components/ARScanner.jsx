// src/components/ARScanner.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';

/**
 * ARScanner (fixed)
 * - Menunggu a-scene loaded
 * - Memanggil helper AR.js resize jika tersedia
 * - Ketika video ready, melakukan manual centering dengan menghitung ukuran asli video
 * - Menampilkan overlay setelah video sudah distabilkan
 *
 * Pastikan public/pola.patt dan public/ekosistem.glb ada.
 */

const ARScanner = () => {
    const sceneRef = useRef(null);
    const [overlayVisible, setOverlayVisible] = useState(false);
    const [displaySize, setDisplaySize] = useState({
        width: typeof window !== 'undefined' ? window.innerWidth : 640,
        height: typeof window !== 'undefined' ? window.innerHeight : 480,
    });

    const styles = `
    .ar-container { position: relative; width: 100%; height: 100vh; overflow: hidden; background: black; }
    .scanner-frame {
      position: absolute; top: 50%; left: 50%;
      width: 280px; height: 280px;
      transform: translate(-50%, -50%);
      border-radius: 12px; box-sizing: border-box;
      z-index: 9999; background: rgba(0,0,0,0.08); backdrop-filter: blur(2px);
      border: 2px dashed rgba(255,255,255,0.25);
      pointer-events: none; opacity: 0; transition: opacity 300ms ease;
    }
    .scanner-frame.visible { opacity: 1; }
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

    /* Default forced sizing (we'll override manually when video metadata exists) */
    .ar-container a-scene,
    .ar-container .a-canvas,
    .ar-container canvas,
    .ar-container video {
      width: 100% !important;
      height: 100% !important;
      position: absolute !important;
      top: 0 !important;
      left: 0 !important;
      object-fit: cover !important;
      object-position: center center !important;
      transform: none !important;
      z-index: 5 !important;
      pointer-events: none;
      will-change: width, height, transform;
    }

    /* debug info */
    .ar-debug {
      position: absolute; left: 12px; top: 12px; z-index: 10001;
      background: rgba(0,0,0,0.45); color: #fff; padding: 6px 8px; border-radius: 6px; font-size: 12px;
    }
  `;

    const patternUrl = `${process.env.PUBLIC_URL || ''}/pola.patt`;
    const modelUrl = `${process.env.PUBLIC_URL || ''}/ekosistem.glb`;

    const buildArjsSettings = (w, h) => {
        const cameraPara = 'https://rawcdn.githack.com/AR-js-org/AR.js/master/three.js/data/camera_para.dat';
        const srcW = 1280;
        const srcH = 720;
        return `sourceType: webcam; sourceWidth: ${srcW}; sourceHeight: ${srcH}; displayWidth: ${w}; displayHeight: ${h}; cameraParametersUrl: ${cameraPara}; trackingMethod: best; debugUIEnabled: false;`;
    };

    const initialArjs = useMemo(() => buildArjsSettings(displaySize.width, displaySize.height), [displaySize]);

    // Update display size on resize/orientation
    useEffect(() => {
        const onResize = () => {
            setDisplaySize({ width: window.innerWidth, height: window.innerHeight });
        };
        window.addEventListener('resize', onResize);
        window.addEventListener('orientationchange', onResize);
        return () => {
            window.removeEventListener('resize', onResize);
            window.removeEventListener('orientationchange', onResize);
        };
    }, []);

    // Helper: call AR.js resize helpers if available
    const tryArjsResizeHelpers = () => {
        const sceneEl = sceneRef.current;
        if (!sceneEl) return;
        try {
            const arSystem = sceneEl.systems && (sceneEl.systems.arjs || sceneEl.systems['arjs']);
            const src = arSystem && (arSystem.arToolkitSource || arSystem.arToolKitSource || arSystem._arToolkitSource);
            const ctx = arSystem && (arSystem.arToolkitContext || arSystem.arToolKitContext || arSystem._arToolkitContext);
            if (src) {
                if (typeof src.onResizeElement === 'function') src.onResizeElement();
                if (typeof src.onResize === 'function') src.onResize();
                if (typeof src.copyElementSizeTo === 'function' && sceneEl.renderer) {
                    try { src.copyElementSizeTo(sceneEl.renderer.domElement); } catch (e) { }
                }
                if (typeof src.copySizeTo === 'function' && sceneEl.renderer) {
                    try { src.copySizeTo(sceneEl.renderer.domElement); } catch (e) { }
                }
                if (ctx && ctx.arController && ctx.arController.canvas && typeof src.copyElementSizeTo === 'function') {
                    try { src.copyElementSizeTo(ctx.arController.canvas); } catch (e) { }
                }
            }
        } catch (e) {
            // silent
        }
    };

    // Core: center video manually by reading natural video size and computing scale for 'cover'
    const centerVideoManually = (attempts = 6) => {
        const container = document.querySelector('.ar-container');
        const video = document.querySelector('.ar-container video');
        const canvas = document.querySelector('.ar-container canvas');

        if (!container) return false;
        const cw = container.clientWidth;
        const ch = container.clientHeight;

        if (video && video.videoWidth && video.videoHeight) {
            // Use natural video size
            const vw = video.videoWidth;
            const vh = video.videoHeight;

            // compute cover scale
            const scale = Math.max(cw / vw, ch / vh);

            const newW = Math.round(vw * scale);
            const newH = Math.round(vh * scale);

            const offsetX = Math.round((newW - cw) / 2);
            const offsetY = Math.round((newH - ch) / 2);

            // apply manual sizing and centering
            // set object-fit to none so manual sizes take effect
            video.style.objectFit = 'none';
            video.style.width = `${newW}px`;
            video.style.height = `${newH}px`;
            video.style.left = `${-offsetX}px`;
            video.style.top = `${-offsetY}px`;
            video.style.transform = 'none';

            // also try to adjust canvas if present (some AR.js versions use canvas overlay)
            if (canvas) {
                canvas.style.objectFit = 'none';
                canvas.style.width = `${newW}px`;
                canvas.style.height = `${newH}px`;
                canvas.style.left = `${-offsetX}px`;
                canvas.style.top = `${-offsetY}px`;
                canvas.style.transform = 'none';
            }

            return true;
        } else {
            // if video dims not ready yet, return false (caller may retry)
            return false;
        }
    };

    // When scene loaded, attach events and try centering
    useEffect(() => {
        const scene = sceneRef.current;
        if (!scene) return;

        let retryTimer = null;
        let stabilizeTimer = null;
        let tries = 0;

        const runCenteringSequence = () => {
            // 1) try AR.js helpers
            tryArjsResizeHelpers();

            // 2) try manual centering (retry a few times until video metadata available)
            const tryCenter = () => {
                tries += 1;
                const ok = centerVideoManually();
                if (ok) {
                    // success: show overlay and stop retries, but keep one more small timeout to ensure stability
                    setOverlayVisible(true);
                    if (retryTimer) { clearInterval(retryTimer); retryTimer = null; }
                    // one more check shortly after
                    stabilizeTimer = setTimeout(() => {
                        tryArjsResizeHelpers();
                        centerVideoManually();
                    }, 500);
                } else if (tries >= 8) {
                    // fallback: if still not available, show overlay anyway after some tries
                    setOverlayVisible(true);
                    if (retryTimer) { clearInterval(retryTimer); retryTimer = null; }
                }
            };

            // immediate first attempt
            tryCenter();
            // interval retries for a short period
            if (!retryTimer) {
                retryTimer = setInterval(tryCenter, 350);
            }
        };

        const onLoaded = () => {
            // small delay to let AR.js init camera then run sequence
            setTimeout(runCenteringSequence, 120);
        };

        // Listen for a-scene 'loaded' event
        scene.addEventListener('loaded', onLoaded);

        // If scene already loaded, call immediately
        if (scene.hasLoaded || scene.readyState === 4) {
            // a-scene might already be loaded
            onLoaded();
        }

        // Also react when video metadata fires (some browsers)
        const onVideoMeta = () => {
            // as soon as metadata available try center
            runCenteringSequence();
        };
        const vid = document.querySelector('.ar-container video');
        if (vid) {
            vid.addEventListener('loadedmetadata', onVideoMeta);
        }

        // cleanup
        return () => {
            scene.removeEventListener('loaded', onLoaded);
            if (vid) vid.removeEventListener('loadedmetadata', onVideoMeta);
            if (retryTimer) clearInterval(retryTimer);
            if (stabilizeTimer) clearTimeout(stabilizeTimer);
        };
    }, [sceneRef.current, displaySize]);

    // Keep calling AR.js resize and recenter on window resize/orientation
    useEffect(() => {
        let rTimeout = null;
        const onWinResize = () => {
            if (rTimeout) clearTimeout(rTimeout);
            rTimeout = setTimeout(() => {
                tryArjsResizeHelpers();
                centerVideoManually();
            }, 120);
        };
        window.addEventListener('resize', onWinResize);
        window.addEventListener('orientationchange', onWinResize);
        return () => {
            window.removeEventListener('resize', onWinResize);
            window.removeEventListener('orientationchange', onWinResize);
            if (rTimeout) clearTimeout(rTimeout);
        };
    }, []);

    // Debug toggle
    const toggleObjectFitDebug = () => {
        const video = document.querySelector('.ar-container video');
        if (!video) return;
        video.style.objectFit = video.style.objectFit === 'contain' ? 'none' : 'contain';
        // If toggled to none we want to keep video centered (recompute)
        centerVideoManually();
    };

    return (
        <div className="ar-container">
            <style>{styles}</style>

            <div className={`scanner-frame ${overlayVisible ? 'visible' : ''}`} aria-hidden>
                <div className="corner tl"></div>
                <div className="corner tr"></div>
                <div className="corner bl"></div>
                <div className="corner br"></div>
                <div className="scan-line"></div>
            </div>

            <a-scene
                ref={sceneRef}
                embedded
                arjs={initialArjs}
                vr-mode-ui="enabled: false"
                renderer="logarithmicDepthBuffer: true;"
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 5 }}
            >
                <a-marker type="pattern" url={patternUrl}>
                    <a-entity gltf-model={modelUrl} scale="0.1 0.1 0.1" rotation="-90 0 0" position="0 0.5 0"></a-entity>
                </a-marker>

                <a-camera fov="95"></a-camera>
            </a-scene>

            <div className="ar-debug">overlay: {overlayVisible ? 'visible' : 'hidden'}</div>

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
