// Constants for hand visualization
const BONE_RADIUS = 0.005;
const JOINT_RADIUS = 0.008;

// Defines the names of the joints in the hand
const handJoints = [
  "wrist",
  "thumb-metacarpal", "thumb-phalanx-proximal", "thumb-phalanx-distal", "thumb-tip",
  "index-finger-metacarpal", "index-finger-phalanx-proximal", "index-finger-phalanx-intermediate", "index-finger-phalanx-distal", "index-finger-tip",
  "middle-finger-metacarpal", "middle-finger-phalanx-proximal", "middle-finger-phalanx-intermediate", "middle-finger-phalanx-distal", "middle-finger-tip",
  "ring-finger-metacarpal", "ring-finger-phalanx-proximal", "ring-finger-phalanx-intermediate", "ring-finger-phalanx-distal", "ring-finger-tip",
  "pinky-finger-metacarpal", "pinky-finger-phalanx-proximal", "pinky-finger-phalanx-intermediate", "pinky-finger-phalanx-distal", "pinky-finger-tip",
];

// Defines the connections between the joints to form the bones of the hand
const handBoneConnections = {
    "wrist": ["thumb-metacarpal", "index-finger-metacarpal", "middle-finger-metacarpal", "ring-finger-metacarpal", "pinky-finger-metacarpal"],
    "thumb-metacarpal": ["thumb-phalanx-proximal"],
    "thumb-phalanx-proximal": ["thumb-phalanx-distal"],
    "thumb-phalanx-distal": ["thumb-tip"],
    "index-finger-metacarpal": ["index-finger-phalanx-proximal"],
    "index-finger-phalanx-proximal": ["index-finger-phalanx-intermediate"],
    "index-finger-phalanx-intermediate": ["index-finger-phalanx-distal"],
    "index-finger-phalanx-distal": ["index-finger-tip"],
    "middle-finger-metacarpal": ["middle-finger-phalanx-proximal"],
    "middle-finger-phalanx-proximal": ["middle-finger-phalanx-intermediate"],
    "middle-finger-phalanx-intermediate": ["middle-finger-phalanx-distal"],
    "middle-finger-phalanx-distal": ["middle-finger-tip"],
    "ring-finger-metacarpal": ["ring-finger-phalanx-proximal"],
    "ring-finger-phalanx-proximal": ["ring-finger-phalanx-intermediate"],
    "ring-finger-phalanx-intermediate": ["ring-finger-phalanx-distal"],
    "ring-finger-phalanx-distal": ["ring-finger-tip"],
    "pinky-finger-metacarpal": ["pinky-finger-phalanx-proximal"],
    "pinky-finger-phalanx-proximal": ["pinky-finger-phalanx-intermediate"],
    "pinky-finger-phalanx-intermediate": ["pinky-finger-phalanx-distal"],
    "pinky-finger-phalanx-distal": ["pinky-finger-tip"],
};

class Hand {
    constructor(handedness, controllerBuffers) {
        this.handedness = handedness;
        this.jointPoses = new Map();
        this.lastUpdateTime = 0;
        this.controllerBuffers = controllerBuffers;

        this.isIndexPinching = false;
        this.wasIndexPinchingLastFrame = false;
        this.isMiddlePinching = false;
        this.wasMiddlePinchingLastFrame = false;

        this.pinchThreshold = 0.02; // Fingers must be within 2cm to be considered pinching
    }

    update(time, frame, referenceSpace) {
        if (time === this.lastUpdateTime) {
            return {};
        }
        this.lastUpdateTime = time;

        let hand;
        for (const source of frame.session.inputSources) {
            if (source.handedness === this.handedness && source.hand) {
                hand = source.hand;
                break;
            }
        }

        if (hand) {
            for (const jointName of handJoints) {
                const joint = hand.get(jointName);
                if (joint) {
                    const pose = frame.getJointPose(joint, referenceSpace);
                    if (pose) {
                        this.jointPoses.set(jointName, pose.transform.matrix);
                    }
                }
            }
        } else {
            this.jointPoses.clear();
        }

        this.wasIndexPinchingLastFrame = this.isIndexPinching;
        this.wasMiddlePinchingLastFrame = this.isMiddlePinching;

        const thumbTipPose = this.jointPoses.get('thumb-tip');
        const indexTipPose = this.jointPoses.get('index-finger-tip');
        const middleTipPose = this.jointPoses.get('middle-finger-tip');

        if (thumbTipPose && indexTipPose) {
            const { vec3, mat4 } = glMatrix;
            const thumbTipPos = vec3.create();
            mat4.getTranslation(thumbTipPos, thumbTipPose);
            const indexTipPos = vec3.create();
            mat4.getTranslation(indexTipPos, indexTipPose);
            const distance = vec3.distance(thumbTipPos, indexTipPos);
            this.isIndexPinching = distance < this.pinchThreshold;
        } else {
            this.isIndexPinching = false;
        }

        if (thumbTipPose && middleTipPose) {
            const { vec3, mat4 } = glMatrix;
            const thumbTipPos = vec3.create();
            mat4.getTranslation(thumbTipPos, thumbTipPose);
            const middleTipPos = vec3.create();
            mat4.getTranslation(middleTipPos, middleTipPose);
            const distance = vec3.distance(thumbTipPos, middleTipPos);
            this.isMiddlePinching = distance < this.pinchThreshold;
        } else {
            this.isMiddlePinching = false;
        }

        const indexPinchStart = this.isIndexPinching && !this.wasIndexPinchingLastFrame;
        const indexPinchEnd = !this.isIndexPinching && this.wasIndexPinchingLastFrame;
        const middlePinchStart = this.isMiddlePinching && !this.wasMiddlePinchingLastFrame;
        const middlePinchEnd = !this.isMiddlePinching && this.wasMiddlePinchingLastFrame;

        return { indexPinchStart, indexPinchEnd, middlePinchStart, middlePinchEnd };
    }

    draw(gl, programInfo, view, drawSolid, time) {
        if (this.jointPoses.size === 0) {
            return;
        }

        for (const [jointName, poseMatrix] of this.jointPoses) {
            const jointMatrix = glMatrix.mat4.clone(poseMatrix);
            glMatrix.mat4.scale(jointMatrix, jointMatrix, [JOINT_RADIUS, JOINT_RADIUS, JOINT_RADIUS]);
            let color = [0.8, 0.8, 0.8, 1.0]; // Default color

            if (this.isIndexPinching && (jointName === 'index-finger-tip' || jointName === 'thumb-tip')) {
                color = [1.0, 0.0, 0.0, 1.0]; // Red for index pinch
            }
            if (this.isMiddlePinching && (jointName === 'middle-finger-tip' || jointName === 'thumb-tip')) {
                color = [0.0, 1.0, 0.0, 1.0]; // Green for middle pinch
            }

            drawSolid(gl, programInfo, this.controllerBuffers.sphere, jointMatrix, view, color);
        }

        for (const startJoint in handBoneConnections) {
            const endJoints = handBoneConnections[startJoint];
            for (const endJoint of endJoints) {
                const startPose = this.jointPoses.get(startJoint);
                const endPose = this.jointPoses.get(endJoint);
                if (startPose && endPose) {
                    this.drawBone(gl, programInfo, startPose, endPose, view, drawSolid);
                }
            }
        }
    }

    drawBone(gl, programInfo, startMatrix, endMatrix, view, drawSolid) {
        const { vec3, mat4, quat } = glMatrix;

        const startPosition = vec3.create();
        mat4.getTranslation(startPosition, startMatrix);

        const endPosition = vec3.create();
        mat4.getTranslation(endPosition, endMatrix);

        const diff = vec3.subtract(vec3.create(), endPosition, startPosition);
        const length = vec3.length(diff);

        const boneMatrix = mat4.create();
        const direction = vec3.normalize(vec3.create(), diff);
        const rotation = quat.rotationTo(quat.create(), vec3.fromValues(0, 1, 0), direction);

        const center = vec3.add(vec3.create(), startPosition, vec3.scale(vec3.create(), diff, 0.5));
        mat4.fromRotationTranslation(boneMatrix, rotation, center);
        mat4.scale(boneMatrix, boneMatrix, [BONE_RADIUS, length / 2, BONE_RADIUS]);

        drawSolid(gl, programInfo, this.controllerBuffers.stick, boneMatrix, view, [0.5, 0.5, 0.5, 1.0]);
    }
}
