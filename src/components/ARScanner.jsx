// src/components/ARScanner.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';

/**
 * ARScanner component (full, ready-to-copy)
 *
 * Pastikan public/pola.patt dan public/ekosistem.glb ada.
 */

const ARScanner = () => {
    const sceneRef = useRef(null);
    const [displaySize, setDisplaySize] = useState({
        width: typeof window !== 'undefined' ? window.innerWidth : 640,
        height: typeof window !== 'undefined' ? window.innerHeight : 480,
    });
    const [overlayVisible, setOverlayVisible] = useState(false);

    // CSS (override A-Frame/AR.js video/canvas and overlay)
    const styles = `
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
      opacity: 0;
      transition: opacity 250ms ease;
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
      object-fit: cover !important;
      object-position: center center !important;
      transform: none !important;
      z-index: 5 !important;
      pointer-events: none;
    }
  `;

    const patternUrl = `${process.env.PUBLIC_URL || ''}/pola.patt`;
    const modelUrl = `${process.env.PUBLIC_URL || ''}/ekosistem.glb`;

    const buildArjsSettings = (displayWidth, displayHeight) => {
        const cameraPara = 'https://rawcdn.githack.com/AR-js-org/AR.js/master/three.js/data/camera_para.dat';
        const srcW = 1280;
        const srcH = 720;
        return `sourceType: webcam; sourceWidth: ${srcW}; sourceHeight: ${srcH}; displayWidth: ${displayWidth}; displayHeight: ${displayHeight}; cameraParametersUrl: ${cameraPara}; trackingMethod: best; debugUIEnabled: false;`;
    };

    const initialArjs = useMemo(() => buildArjsSettings(displaySize.width, displaySize.height), [displaySize]);

    // update arjs attribute when displaySize changes
    useEffect(() => {
        const sceneEl = sceneRef.current;
        if (!sceneEl) return;
        const newSettings = buildArjsSettings(displaySize.width, displaySize.height);
        try {
            sceneEl.setAttribute('arjs', newSettings);
        } catch (e) {
            // fallback
            sceneEl.arjs = newSettings;
        }
    }, [displaySize]);

    // tryFixResize: call AR.js resize helpers and patch video/canvas styles until stable
    useEffect(() => {
        let afterTimer = null;
        let intervalTimer = null;

        const applyVideoCanvasPatch = () => {
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
            return !!(video || canvas);
        };

        const tryFixResize = () => {
            // dispatch generic resize
            window.dispatchEvent(new Event('resize'));

            // attempt to call AR.js internal helpers (safe-guard many names)
            const sceneEl = sceneRef.current;
            if (sceneEl) {
                try {
                    const arSystem = sceneEl.systems && (sceneEl.systems.arjs || sceneEl.systems['arjs']);
                    const src = arSystem && (arSystem.arToolkitSource || arSystem.arToolKitSource || arSystem._arToolkitSource || arSystem.arToolkitSource);
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
                        // try to copy to arController canvas if present
                        try {
                            if (ctx && ctx.arController && ctx.arController.canvas && typeof src.copyElementSizeTo === 'function') {
                                src.copyElementSizeTo(ctx.arController.canvas);
                            }
                        } catch (e) { }
                    }
                } catch (e) {
                    // not fatal; continue to patch styles
                    // console.warn('AR resize helpers not available yet', e);
                }
            }

            // run repeated short attempts to patch video/canvas; once stable, show overlay
            let tries = 0;
            if (intervalTimer) clearInterval(intervalTimer);
            intervalTimer = setInterval(() => {
                const found = applyVideoCanvasPatch();
                tries += 1;
                // if found and a few tries passed, consider stable
                if (found && tries >= 3) {
                    clearInterval(intervalTimer);
                    intervalTimer = null;
                    setOverlayVisible(true);
                }
                // safety fallback
                if (tries > 12) {
                    clearInterval(intervalTimer);
                    intervalTimer = null;
                    setOverlayVisible(true);
                }
            }, 300);
        };

        // initial calls (two times to avoid race conditions)
        tryFixResize();
        afterTimer = setTimeout(tryFixResize, 600);

        // re-run on orientation change and window resize (throttled)
        let resizeTimeout = null;
        const onWinResize = () => {
            if (resizeTimeout) clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                setDisplaySize({ width: window.innerWidth, height: window.innerHeight });
                // run tryFixResize again to re-align
                tryFixResize();
            }, 120);
        };

        window.addEventListener('orientationchange', tryFixResize);
        window.addEventListener('resize', onWinResize);

        // cleanup
        return () => {
            if (afterTimer) clearTimeout(afterTimer);
            if (intervalTimer) clearInterval(intervalTimer);
            window.removeEventListener('orientationchange', tryFixResize);
            window.removeEventListener('resize', onWinResize);
            if (resizeTimeout) clearTimeout(resizeTimeout);
        };
    }, []); // run once on mount

    // helper debug: toggle object-fit to see full frame
    const toggleObjectFitDebug = () => {
        const video = document.querySelector('.ar-container video');
        if (!video) return;
        video.style.objectFit = video.style.objectFit === 'contain' ? 'cover' : 'contain';
    };

    return (
        <div className="ar-container">
            <style>{styles}</style>

            {/* Scanner overlay (hidden until stable) */}
            <div className={`scanner-frame ${overlayVisible ? 'visible' : ''}`} aria-hidden>
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

            {/* debug button */}
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
