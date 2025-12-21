import type { VRM } from "@pixiv/three-vrm";
import { AnimationClip, Quaternion, QuaternionKeyframeTrack, VectorKeyframeTrack, type KeyframeTrack } from "three";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { mixamoVRMRigMap } from "../services/animation/config/mixamoMapping";


/**
 * Load Mixamo animation, convert for three-vrm use, and return it.
 *
 * @param {string} url A url of mixamo animation data
 * @param {VRM} vrm A target VRM
 * @returns {Promise<THREE.AnimationClip>} The converted AnimationClip
 */
export function loadMixamoAnimation( url: string, vrm: VRM ) {

	const loader = new FBXLoader(); // A loader which loads FBX
	return loader.loadAsync( url ).then( ( asset ) => {

		const clip = AnimationClip.findByName( asset.animations, 'mixamo.com' ); // extract the AnimationClip

		if (!clip) {
			throw new Error('Mixamo animation clip not found');
		}

		const tracks: KeyframeTrack[] = []; // KeyframeTracks compatible with VRM will be added here

		const restRotationInverse = new Quaternion();
		const parentRestWorldRotation = new Quaternion();
		const _quatA = new Quaternion();

		// Adjust with reference to hips height.
		const motionHipsHeight = asset.getObjectByName( 'mixamorigHips' )?.position.y ?? 0;
		const vrmHipsHeight = vrm.humanoid?.normalizedRestPose?.hips?.position?.[1] ?? 0;
		const hipsPositionScale = motionHipsHeight > 0 ? vrmHipsHeight / motionHipsHeight : 1;

		clip.tracks.forEach( ( track ) => {

			// Convert each tracks for VRM use, and push to `tracks`
			const trackSplitted = track.name.split( '.' );
			const mixamoRigName = trackSplitted[ 0 ];
			const vrmBoneName = mixamoRigName in mixamoVRMRigMap ? mixamoVRMRigMap[mixamoRigName as keyof typeof mixamoVRMRigMap] : undefined;
			// Use getRawBone to get the actual scene bone node name (not normalized)
			const rawBone = vrmBoneName ? vrm.humanoid?.getRawBone( vrmBoneName as any ) : undefined;
			const vrmNodeName = rawBone?.node?.name;
			const mixamoRigNode = asset.getObjectByName( mixamoRigName );

			if ( vrmNodeName != null && mixamoRigNode && mixamoRigNode.parent ) {

				const propertyName = trackSplitted[ 1 ];

				// Store rotations of rest-pose.
				mixamoRigNode.getWorldQuaternion( restRotationInverse ).invert();
				mixamoRigNode.parent.getWorldQuaternion( parentRestWorldRotation );

				if ( track instanceof QuaternionKeyframeTrack ) {

					// Retarget rotation of mixamoRig to NormalizedBone.
					for ( let i = 0; i < track.values.length; i += 4 ) {

						const flatQuaternion = track.values.slice( i, i + 4 );

						_quatA.fromArray( flatQuaternion );

						// 親のレスト時ワールド回転 * トラックの回転 * レスト時ワールド回転の逆
						_quatA
							.premultiply( parentRestWorldRotation )
							.multiply( restRotationInverse );

						_quatA.toArray( flatQuaternion );

						flatQuaternion.forEach( ( v, index ) => {

							track.values[ index + i ] = v;

						} );

					}

					tracks.push(
						new QuaternionKeyframeTrack(
							`${vrmNodeName}.${propertyName}`,
							track.times,
							track.values.map( ( v, i ) => ( vrm.meta?.metaVersion === '0' && i % 2 === 0 ? - v : v ) ),
						),
					);

				} else if ( track instanceof VectorKeyframeTrack ) {

					const value = track.values.map( ( v, i ) => ( vrm.meta?.metaVersion === '0' && i % 3 !== 1 ? - v : v ) * hipsPositionScale );
					tracks.push( new VectorKeyframeTrack( `${vrmNodeName}.${propertyName}`, track.times, value ) );

				}

			}

		} );

		return new AnimationClip( 'vrmAnimation', clip.duration, tracks );

	} );

}

/**
 * Check if an FBX file uses Mixamo rig by looking for mixamorig bones
 * 
 * @param {string} url A url of FBX animation data
 * @returns {Promise<boolean>} True if the FBX uses Mixamo rig
 */
export async function isMixamoAnimation(url: string): Promise<boolean> {
	const loader = new FBXLoader();
	try {
		const asset = await loader.loadAsync(url);
		// Check if the asset has any bones starting with "mixamorig"
		let hasMixamoRig = false;
		asset.traverse((child) => {
			if (child.name && child.name.startsWith('mixamorig')) {
				hasMixamoRig = true;
			}
		});
		// Also check if animations have mixamo.com in the name
		if (!hasMixamoRig && asset.animations) {
			hasMixamoRig = asset.animations.some((anim) => 
				anim.name.includes('mixamo.com') || 
				anim.tracks.some((track) => track.name.startsWith('mixamorig'))
			);
		}
		return hasMixamoRig;
	} catch (error) {
		console.error('Error checking if FBX is Mixamo:', error);
		return false;
	}
}
