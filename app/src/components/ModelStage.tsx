import { Suspense, useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { useGLTF, OrbitControls, Environment, ContactShadows, useProgress } from '@react-three/drei'
import * as THREE from 'three'

const MODEL_URL = '/model.glb'
/** Largest model dimension is normalized to this many world units. */
const FIT_SIZE = 2.4

/**
 * Loads the GLB, then recenters and uniformly scales it so any source model
 * frames identically regardless of its authored units or origin.
 */
function Model() {
  const { scene } = useGLTF(MODEL_URL)

  const { object, shadowY } = useMemo(() => {
    const clone = scene.clone(true)
    const box = new THREE.Box3().setFromObject(clone)
    const size = box.getSize(new THREE.Vector3())
    const center = box.getCenter(new THREE.Vector3())
    const maxDim = Math.max(size.x, size.y, size.z) || 1
    const scale = FIT_SIZE / maxDim

    clone.scale.setScalar(scale)
    clone.position.set(-center.x * scale, -center.y * scale, -center.z * scale)

    clone.traverse((node) => {
      const mesh = node as THREE.Mesh
      if (mesh.isMesh) {
        mesh.castShadow = true
        mesh.receiveShadow = true
      }
    })

    return { object: clone, shadowY: (box.min.y - center.y) * scale }
  }, [scene])

  return (
    <>
      <primitive object={object} />
      <ContactShadows
        position={[0, shadowY + 0.002, 0]}
        scale={FIT_SIZE * 2.6}
        blur={2.8}
        opacity={0.6}
        far={FIT_SIZE}
        resolution={1024}
        color="#04060a"
      />
    </>
  )
}

/** Mono progress readout shown while the GLB streams in. */
function StageLoader() {
  const { active, progress } = useProgress()
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 flex items-center justify-center transition-opacity duration-500"
      style={{ opacity: active ? 1 : 0 }}
    >
      <div className="flex flex-col items-center gap-1.5">
        <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--text-3)]">
          Loading model
        </span>
        <span className="font-mono text-sm tabular-nums text-[var(--text-2)]">
          {Math.round(progress)}%
        </span>
      </div>
    </div>
  )
}

/**
 * The hero viewport: a self-framing, auto-orbiting render of the source GLB.
 * Drag to orbit; the camera resumes its slow swivel on release.
 */
export function ModelStage() {
  const reducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  return (
    <div className="absolute inset-0">
      <Canvas
        camera={{ position: [3.2, 1.55, 4.2], fov: 32 }}
        gl={{ alpha: true, antialias: true }}
        dpr={[1, 2]}
        shadows
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.45} />
        <directionalLight position={[5, 7.5, 4]} intensity={1.55} castShadow />
        <directionalLight position={[-6, 2.5, -4]} intensity={0.5} />
        <Suspense fallback={null}>
          <Model />
          <Environment files="/hdri.jpg" />
        </Suspense>
        <OrbitControls
          makeDefault
          enablePan={false}
          enableZoom={false}
          autoRotate={!reducedMotion}
          autoRotateSpeed={0.9}
          enableDamping
          dampingFactor={0.08}
          minPolarAngle={Math.PI * 0.26}
          maxPolarAngle={Math.PI * 0.6}
        />
      </Canvas>
      <StageLoader />
    </div>
  )
}

useGLTF.preload(MODEL_URL)
