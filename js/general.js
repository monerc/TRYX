// DOM
const dpiInput = document.querySelector("#dpi");
const generalInput = document.querySelector("#general");
const testSection = document.querySelector("#testSection");
const aimArea = document.querySelector("#aimArea");
const crosshair = document.querySelector("#crosshair");
const target = document.querySelector("#target");
const startBtn = document.querySelector("#startBtn");
const applyRecommendBtn = document.querySelector("#applyRecommendBtn");
const roundText = document.querySelector("#roundText");
const timeText = document.querySelector("#timeText");
const statusText = document.querySelector("#statusText");
const countdownOverlay = document.querySelector("#countdownOverlay");
const averageTime = document.querySelector("#averageTime");
const averageOvershoot = document.querySelector("#averageOvershoot");
const averageUndershoot = document.querySelector("#averageUndershoot");
const averageCorrection = document.querySelector("#averageCorrection");
const firstAccuracy = document.querySelector("#firstAccuracy");
const sensitivityState = document.querySelector("#sensitivityState");
const oneFlickSuccessCountText = document.querySelector("#oneFlickSuccessCount");
const recommendGeneral = document.querySelector("#recommendGeneral");
const recommendState = document.querySelector("#recommendState");
const feedback = document.querySelector("#feedback");
const bestSensitivity = document.querySelector("#bestSensitivity");
const bestSensitivityState = document.querySelector("#bestSensitivityState");
const sensitivityHistoryList = document.querySelector("#sensitivityHistoryList");
const generalComparisonSummary = document.querySelector("#generalComparisonSummary");
const generalComparisonGrid = document.querySelector("#generalComparisonGrid");
const generalHistoryList = document.querySelector("#generalHistoryList");
const clearGeneralHistoryBtn = document.querySelector("#clearGeneralHistoryBtn");

// 기본 설정
const TOTAL_TESTS = 15;
const BASE_GENERAL_SENSITIVITY = 40;
const TARGET_HOLD_TIME = 1000;
const GENERAL_SETTINGS_STORAGE_KEY = "tryxGeneralSettings";
const GENERAL_HISTORY_STORAGE_KEY = "tryxGeneralTestHistory";
const GENERAL_MAX_HISTORY_COUNT = 5;
const MIN_RECOMMENDATION_TRIALS = 10;

// First flick detection thresholds (tune after browser play testing)
const FLICK_NOISE_DISTANCE = 0.5;
const FLICK_START_MIN_SAMPLES = 3;
const FLICK_START_MIN_DISTANCE = 4;
const FLICK_START_MIN_SPEED = 0.08;
const FLICK_START_MAX_GAP = 45;
const FLICK_START_WINDOW = 120;
const FLICK_LOW_SPEED_THRESHOLD = 0.05;
const FLICK_LOW_SPEED_DURATION = 45;
const FLICK_END_INACTIVITY = 100;
const CORRECTION_BURST_INACTIVITY = 120;
const OFF_AXIS_RADIUS_MULTIPLIER = 1.5;
const SLOW_FLICK_DURATION = 700;

document.documentElement.style.setProperty(
    "--target-hold-time",
    `${TARGET_HOLD_TIME}ms`
);

let currentTest = 0;
let isTesting = false;

let currentGeneralSensitivity = 40;
let testSessionActive = false;
let normalFullscreenExit = false;

let crosshairX = 0;
let crosshairY = 0;
let targetX = 0;
let targetY = 0;
let trialStartTime = 0;
let timerAnimation = null;
let currentTrial = null;
let testResults = [];
let sensitivityHistory = [];
let latestRecommendGeneral = null;
let latestGeneralTestSummary = null;
let pendingRecommendationTest = null;
let isRecommendationRetest = false;
let isHoldingTarget = false;
let targetHoldTimer = null;
let targetHitTime = null;

function getGeneralSensitivityMultiplier() {
    return currentGeneralSensitivity / BASE_GENERAL_SENSITIVITY;
}

// 테스트 타겟 위치
const TARGET_POSITIONS = [
    { x: 78, y: 50 },
    { x: 22, y: 45 },
    { x: 70, y: 25 },
    { x: 30, y: 75 },
    { x: 82, y: 28 },
    { x: 18, y: 70 },
    { x: 65, y: 78 },
    { x: 35, y: 20 },
    { x: 80, y: 68 },
    { x: 20, y: 30 },
    { x: 60, y: 18 },
    { x: 40, y: 82 },
    { x: 85, y: 50 },
    { x: 15, y: 52 },
    { x: 72, y: 72 }
];

// 공통 함수
function clamp(value, min, max) {
    return Math.max(
        min,
        Math.min(max, value)
    );
}

function wait(ms) {
    return new Promise(resolve => {
        setTimeout(resolve, ms);
    });
}

// 조준점 위치
function resetCrosshair() {
    crosshairX = aimArea.clientWidth / 2;
    crosshairY = aimArea.clientHeight / 2;
    updateCrosshair();
}

function updateCrosshair() {
    crosshair.style.left = `${crosshairX}px`;
    crosshair.style.top = `${crosshairY}px`;
}

// 전체화면
async function enterFullscreen() {
    try {
        if (!document.fullscreenElement) {
            await testSection.requestFullscreen();
        }

        return true;
    } catch (error) {
        console.log (
            "전체화면 실행 실패 ===>",
            error
        );

        return false;
    }
}

document.addEventListener("fullscreenchange", () => {
    if (document.fullscreenElement) {
        return;
    }

    if (normalFullscreenExit) {
        normalFullscreenExit = false;
        return;
    }

    if (testSessionActive) {
        cancelTestSession(
            "전체화면이 종료되어 테스트가 취소되었습니다."
        );
    }
});

// POINTER LOCK
function requestPointerLock() {
    try {
        aimArea.requestPointerLock();
    } catch (error) {
        console.log(
            "Pointer Lock 실행 실패 ===>",
            error
        );
    }
}

document.addEventListener("pointerlockchange", () => {
    if (
        testSessionActive &&
        !document.pointerLockElement
    ) {
        cancelTestSession(
            "마우스 고정이 해제되어 테스트가 취소되었습니다."
        );
    }
});

async function cancelTestSession(message) {
    if (!testSessionActive) {
        return;
    }

    isTesting = false;
    testSessionActive = false;
    isHoldingTarget = false;
    targetHitTime = null;
    target.classList.remove("holding");
    if (targetHoldTimer) {
        clearTimeout(targetHoldTimer);
        targetHoldTimer = null;
    }

    target.classList.remove("show");
    aimArea.classList.remove("testing");
    countdownOverlay.classList.remove("show");
    countdownOverlay.textContent = "";

    if (timerAnimation) {
        cancelAnimationFrame(timerAnimation);
        timerAnimation = null;
    }

    clearCurrentTrialTimers();
    currentTest = 0;
    currentTrial = null;
    testResults = [];

    roundText.textContent = `0 / ${TOTAL_TESTS}`;
    timeText.textContent = "0.00";
    statusText.textContent = "TEST CANCELLED";

    dpiInput.disabled = false;
    generalInput.disabled = false;

    startBtn.disabled = false;
    feedback.textContent = message;

    if (document.pointerLockElement) {
        document.exitPointerLock();
    }

    if (document.fullscreenElement) {
        normalFullscreenExit = true;
        await document.exitFullscreen();
    }
}

// 카운트다운
async function startCountdown() {
    statusText.textContent = "COUNTDOWN";

    for (let count = 3; count >= 1; count--) {
        countdownOverlay.textContent = count;
        countdownOverlay.classList.add("show");

        await wait(700);

        countdownOverlay.classList.remove("show");

        await wait(300);
    }

    countdownOverlay.textContent = "";
}

// 테스트 시작
startBtn.addEventListener("click", async () => {

    const dpi = Number(dpiInput.value);
    const general = Number(generalInput.value);

    if (
        !dpi ||
        dpi < 100 ||
        dpi > 10000
    ) {
        alert("DPI 값을 확인해주세요.");
        return;
    }

    if (
        Number.isNaN(general) ||
        general < 0 ||
        general > 100
    ) {
        alert("일반 상태 감도를 확인해주세요.");
        return;
    }

    isRecommendationRetest =
        pendingRecommendationTest !== null &&
        pendingRecommendationTest.dpi === dpi &&
        pendingRecommendationTest.recommendedGeneral === general;

    if (
        pendingRecommendationTest &&
        !isRecommendationRetest
    ) {
        pendingRecommendationTest = null;
    }

    currentGeneralSensitivity = general;

    currentTest = 0;
    testResults = [];
    latestRecommendGeneral = null;

    resetResultUI();

    startBtn.disabled = true;
    dpiInput.disabled = true;
    generalInput.disabled = true;

    aimArea.classList.add("testing");
    testSessionActive = true;
    const fullscreenSuccess = await enterFullscreen();

    if (!fullscreenSuccess) {
        await cancelTestSession(
            "전체화면을 실행할 수 없어 테스트가 취소되었습니다."
        );
        return;
    }

    resetCrosshair();
    requestPointerLock();
    await startCountdown();

    if (!testSessionActive) {
        return;
    }

    isTesting = true;
    statusText.textContent = "AIM";
    startTrial();
    updateTimer();
});

// 한 회차 시작
function startTrial() {
    const position =
        TARGET_POSITIONS[currentTest];
    target.style.left =
        `${position.x}%`;
    target.style.top =
        `${position.y}%`;
    target.classList.add("show");
    targetX =
        aimArea.clientWidth *
        (position.x / 100);
    targetY =
        aimArea.clientHeight *
        (position.y / 100);
    const startX = crosshairX;
    const startY = crosshairY;
    const vectorX =
        targetX - startX;
    const vectorY =
        targetY - startY;
    const targetDistance =
        Math.hypot(
            vectorX,
            vectorY
        );
    const unitX =
        vectorX /
        targetDistance;
    const unitY =
        vectorY /
        targetDistance;
    currentTrial = {
        startX,
        startY,
        targetDistance,
        unitX,
        unitY,
        maxProgress: 0,
        overshoot: 0,
        undershoot: 0,
        correctionCount: 0,
        hasMissed: false,
        flickState: "WAITING",
        flickStartTime: null,
        flickEndTime: null,
        flickStartX: null,
        flickStartY: null,
        flickEndX: null,
        flickEndY: null,
        firstFlickEndDistance: null,
        firstFlickProgress: null,
        firstFlickCrossError: null,
        firstFlickPattern: null,
        offAxis: false,
        flickCandidateStartTime: null,
        flickCandidateStartX: null,
        flickCandidateStartY: null,
        flickCandidateSamples: 0,
        flickCandidateDistance: 0,
        lastSampleTime: null,
        lastMeaningfulMoveTime: null,
        lastActiveSampleTime: null,
        lastActiveX: null,
        lastActiveY: null,
        rawPeakSpeed: 0,
        lowSpeedSince: null,
        flickEndTimer: null,
        correctionBurstActive: false,
        correctionBurstTimer: null,
        flickEndFallback: false,
        slowTrial: false,
        invalidPace: false
    };

    trialStartTime =
        performance.now();
    roundText.textContent =
        `${currentTest + 1} / ${TOTAL_TESTS}`;
    timeText.textContent =
        "0.00";
    statusText.textContent =
        "AIM";
}

// 마우스 이동
document.addEventListener(
    "mousemove",
    event => {

        if (!isTesting) {
            return;
        }

        if (
            document.pointerLockElement !==
            aimArea
        ) {
            return;
        }

        const rawMoveX = event.movementX;
        const rawMoveY = event.movementY;

        const sensitivityMultiplier = getGeneralSensitivityMultiplier();

        const moveX = rawMoveX * sensitivityMultiplier;
        const moveY = rawMoveY * sensitivityMultiplier;

        const previousX = crosshairX;
        const previousY = crosshairY;

        crosshairX += moveX;
        crosshairY += moveY;

        const padding = 10;

        crosshairX = clamp(
            crosshairX,
            padding,
            aimArea.clientWidth - padding
        );

        crosshairY = clamp(
            crosshairY,
            padding,
            aimArea.clientHeight - padding
        );

        updateCrosshair();

        analyzeMouseMovement({
            rawMoveX,
            rawMoveY,
            scaledMoveX: crosshairX - previousX,
            scaledMoveY: crosshairY - previousY,
            time: performance.now(),
            x: crosshairX,
            y: crosshairY,
            previousX,
            previousY
        });
    }
);

document.addEventListener("mouseup", event => {
    if (event.button !== 0) {
        return;
    }
    if (!isHoldingTarget) {
        return
    }
    if (targetHoldTimer) {
        clearTimeout(targetHoldTimer);
        targetHoldTimer = null;
    }
    isHoldingTarget = false;
    targetHitTime = null;
    target.classList.remove("holding");
    if (isTesting && currentTrial) {
        statusText.textContent = "AIM";
    }
});

// 첫 플릭 및 후속 보정 움직임 분석
function analyzeMouseMovement(sample) {
    if (!currentTrial) {
        return;
    }

    if (isHoldingTarget && currentTrial.flickState !== "ACTIVE") {
        return;
    }

    const rawMovementDistance = Math.hypot(
        sample.rawMoveX,
        sample.rawMoveY
    );
    const previousSampleTime = currentTrial.lastSampleTime;
    const deltaTime = previousSampleTime === null
        ? 0
        : Math.max(1, sample.time - previousSampleTime);
    const rawSpeed = deltaTime > 0
        ? rawMovementDistance / deltaTime
        : 0;
    currentTrial.lastSampleTime = sample.time;

    if (currentTrial.flickState === "WAITING") {
        updateFlickStartCandidate(sample, rawMovementDistance, rawSpeed);
        return;
    }

    if (currentTrial.flickState === "ACTIVE") {
        currentTrial.lastActiveSampleTime = sample.time;
        currentTrial.lastActiveX = sample.x;
        currentTrial.lastActiveY = sample.y;
        currentTrial.rawPeakSpeed = Math.max(
            currentTrial.rawPeakSpeed,
            rawSpeed
        );

        if (rawSpeed <= FLICK_LOW_SPEED_THRESHOLD) {
            if (currentTrial.lowSpeedSince === null) {
                currentTrial.lowSpeedSince = sample.time;
            }
        } else {
            currentTrial.lowSpeedSince = null;
        }

        scheduleFlickEnd(sample);
        return;
    }

    if (rawMovementDistance >= FLICK_NOISE_DISTANCE) {
        trackCorrectionBurst();
    }
}

function resetFlickStartCandidate(sample) {
    currentTrial.flickCandidateStartTime = sample.time;
    currentTrial.flickCandidateStartX = sample.previousX;
    currentTrial.flickCandidateStartY = sample.previousY;
    currentTrial.flickCandidateSamples = 0;
    currentTrial.flickCandidateDistance = 0;
}

function updateFlickStartCandidate(sample, rawMovementDistance, rawSpeed) {
    if (rawMovementDistance < FLICK_NOISE_DISTANCE) {
        return;
    }

    const candidateExpired =
        currentTrial.flickCandidateStartTime !== null &&
        (sample.time - currentTrial.flickCandidateStartTime > FLICK_START_WINDOW ||
            (currentTrial.lastMeaningfulMoveTime !== null &&
                sample.time - currentTrial.lastMeaningfulMoveTime > FLICK_START_MAX_GAP));

    if (currentTrial.flickCandidateStartTime === null || candidateExpired) {
        resetFlickStartCandidate(sample);
    }

    currentTrial.flickCandidateSamples++;
    currentTrial.flickCandidateDistance += rawMovementDistance;
    currentTrial.lastMeaningfulMoveTime = sample.time;

    const elapsed = Math.max(1, sample.time - currentTrial.flickCandidateStartTime);
    const averageSpeed = currentTrial.flickCandidateDistance / elapsed;

    if (
        currentTrial.flickCandidateSamples >= FLICK_START_MIN_SAMPLES &&
        currentTrial.flickCandidateDistance >= FLICK_START_MIN_DISTANCE &&
        Math.max(rawSpeed, averageSpeed) >= FLICK_START_MIN_SPEED
    ) {
        currentTrial.flickState = "ACTIVE";
        currentTrial.flickStartTime = currentTrial.flickCandidateStartTime;
        currentTrial.flickStartX = currentTrial.flickCandidateStartX;
        currentTrial.flickStartY = currentTrial.flickCandidateStartY;
        currentTrial.lastActiveSampleTime = sample.time;
        currentTrial.lastActiveX = sample.x;
        currentTrial.lastActiveY = sample.y;
        currentTrial.rawPeakSpeed = Math.max(rawSpeed, averageSpeed);
        scheduleFlickEnd(sample);
    }
}

function scheduleFlickEnd(sample) {
    if (currentTrial.flickEndTimer) {
        clearTimeout(currentTrial.flickEndTimer);
    }

    const lowSpeedDuration = currentTrial.lowSpeedSince === null
        ? 0
        : sample.time - currentTrial.lowSpeedSince;
    const delay = currentTrial.lowSpeedSince === null
        ? FLICK_END_INACTIVITY
        : Math.max(0, FLICK_LOW_SPEED_DURATION - lowSpeedDuration);
    const trial = currentTrial;

    trial.flickEndTimer = setTimeout(() => {
        if (currentTrial !== trial || trial.flickState !== "ACTIVE") {
            return;
        }
        finalizeFirstFlick(sample.time, sample.x, sample.y);
    }, delay);
}

function finalizeFirstFlick(endTime, endX, endY) {
    if (!currentTrial || currentTrial.flickState === "ENDED") {
        return;
    }

    if (currentTrial.flickEndTimer) {
        clearTimeout(currentTrial.flickEndTimer);
        currentTrial.flickEndTimer = null;
    }

    currentTrial.flickState = "ENDED";
    currentTrial.flickEndTime = endTime;
    currentTrial.flickEndX = endX;
    currentTrial.flickEndY = endY;
    currentTrial.firstFlickEndDistance = Math.hypot(
        endX - targetX,
        endY - targetY
    );

    const movedX = endX - currentTrial.startX;
    const movedY = endY - currentTrial.startY;
    currentTrial.firstFlickProgress =
        movedX * currentTrial.unitX + movedY * currentTrial.unitY;
    currentTrial.firstFlickCrossError =
        movedX * -currentTrial.unitY + movedY * currentTrial.unitX;
    currentTrial.slowTrial =
        currentTrial.flickStartTime !== null &&
        endTime - currentTrial.flickStartTime > SLOW_FLICK_DURATION;
    currentTrial.invalidPace = currentTrial.slowTrial;

    classifyFirstFlick();
}

function classifyFirstFlick() {
    const targetRadius = target.offsetWidth / 2;
    const distance = currentTrial.firstFlickEndDistance;
    const progress = currentTrial.firstFlickProgress;
    const crossError = Math.abs(currentTrial.firstFlickCrossError);

    if (distance <= targetRadius) {
        currentTrial.firstFlickPattern = "CLEAN";
        return;
    }

    if (crossError > targetRadius * OFF_AXIS_RADIUS_MULTIPLIER) {
        currentTrial.offAxis = true;
        currentTrial.firstFlickPattern = "OFF_AXIS";
        return;
    }

    if (progress < currentTrial.targetDistance) {
        currentTrial.firstFlickPattern = "UNDER";
        currentTrial.undershoot = Math.max(
            0,
            currentTrial.targetDistance - targetRadius - progress
        );
        return;
    }

    currentTrial.firstFlickPattern = "OVER";
    currentTrial.overshoot = Math.max(
        0,
        progress - (currentTrial.targetDistance + targetRadius)
    );
}

function trackCorrectionBurst() {
    if (!currentTrial.correctionBurstActive) {
        currentTrial.correctionBurstActive = true;
        currentTrial.correctionCount++;
    }

    if (currentTrial.correctionBurstTimer) {
        clearTimeout(currentTrial.correctionBurstTimer);
    }

    const trial = currentTrial;
    trial.correctionBurstTimer = setTimeout(() => {
        if (currentTrial === trial) {
            trial.correctionBurstActive = false;
            trial.correctionBurstTimer = null;
        }
    }, CORRECTION_BURST_INACTIVITY);
}

function getTargetProgress() {
    const movedX =
        crosshairX -
        currentTrial.startX;

    const movedY =
        crosshairY -
        currentTrial.startY;


    return (
        movedX *
        currentTrial.unitX +
        movedY *
        currentTrial.unitY
    );
}

// 클릭 판정
document.addEventListener(
    "mousedown",
    event => {

        if (!isTesting || !currentTrial) {
            return;
        }

        if (event.button !== 0) {
            return;
        }

        const distance =
            Math.hypot(
                crosshairX - targetX,
                crosshairY - targetY
            );

        const targetRadius =
            target.offsetWidth / 2;

        if (
            distance >
            targetRadius
        ) {
            currentTrial.hasMissed = true;
            statusText.textContent =
                "MISS";

            setTimeout(() => {

                if (isTesting) {
                    statusText.textContent =
                        "AIM";
                }

            }, 150);

            return;
        }

        if (isHoldingTarget) {
            return;
        }
        isHoldingTarget = true;
        targetHitTime = performance.now();
        target.classList.add("holding");
        statusText.textContent = "HOLD";
        targetHoldTimer = setTimeout(() => {
            if (!isTesting || !currentTrial || !isHoldingTarget) {
                return;
            }
            isHoldingTarget = false;
            targetHoldTimer = null;
            target.classList.remove("holding");
            completeTrial(targetHitTime);
        }, TARGET_HOLD_TIME);
    }
);

// 한 회차 완료
function completeTrial(endTime = performance.now()) {
    const elapsedTime =
        endTime -
        trialStartTime;

    const targetRadius =
        target.offsetWidth / 2;


    if (currentTrial.flickState === "WAITING") {
        currentTrial.flickState = "ENDED";
        currentTrial.flickEndTime = endTime;
        currentTrial.flickEndX = crosshairX;
        currentTrial.flickEndY = crosshairY;
        currentTrial.firstFlickEndDistance = Math.hypot(
            crosshairX - targetX,
            crosshairY - targetY
        );
        currentTrial.firstFlickProgress = null;
        currentTrial.firstFlickCrossError = null;
        currentTrial.firstFlickPattern = "INVALID";
        currentTrial.invalidPace = true;
    } else if (currentTrial.flickState === "ACTIVE") {
        currentTrial.flickEndFallback = true;
        finalizeFirstFlick(
            currentTrial.lastActiveSampleTime ?? endTime,
            currentTrial.lastActiveX ?? crosshairX,
            currentTrial.lastActiveY ?? crosshairY
        );
        currentTrial.invalidPace = true;
    }


    const firstAccuracyValue = calculateFirstAccuracy(
        currentTrial.firstFlickEndDistance, targetRadius
    );

    const pattern = currentTrial.firstFlickPattern;
    const firstFlickDetected = currentTrial.flickStartTime !== null;
    const oneFlickSuccess =
        firstFlickDetected &&
        currentTrial.flickEndFallback === false &&
        currentTrial.invalidPace === false &&
        pattern === "CLEAN" &&
        currentTrial.correctionCount === 0 &&
        currentTrial.hasMissed === false &&
        currentTrial.offAxis === false;

    const firstFlickDuration = currentTrial.flickStartTime === null
        ? 0
        : currentTrial.flickEndTime - currentTrial.flickStartTime;
    const validTrial =
        firstFlickDetected &&
        currentTrial.invalidPace === false &&
        pattern !== "INVALID";
    const recommendationEligible =
        validTrial && currentTrial.offAxis === false;
    const trialResult = {
        time: elapsedTime,
        overshoot: currentTrial.overshoot,
        undershoot: currentTrial.undershoot,
        correctionCount: currentTrial.correctionCount,
        firstAccuracy: firstAccuracyValue,
        pattern: pattern,
        hasMissed: currentTrial.hasMissed,
        oneFlickSuccess: oneFlickSuccess,
        firstFlickDetected,
        flickEndFallback: currentTrial.flickEndFallback,
        offAxis: currentTrial.offAxis,
        firstFlickEndDistance: currentTrial.firstFlickEndDistance,
        firstFlickProgress: currentTrial.firstFlickProgress,
        firstFlickCrossError: currentTrial.firstFlickCrossError,
        firstFlickDuration,
        slowTrial: currentTrial.slowTrial,
        invalidPace: currentTrial.invalidPace,
        validTrial,
        recommendationEligible,
        rawPeakSpeed: currentTrial.rawPeakSpeed
    };

    testResults.push(trialResult);
    console.table([{
        trial: currentTest + 1,
        firstFlickPattern: pattern,
        firstFlickDuration,
        firstFlickEndDistance: currentTrial.firstFlickEndDistance,
        firstFlickProgress: currentTrial.firstFlickProgress,
        firstFlickCrossError: currentTrial.firstFlickCrossError,
        firstAccuracy: firstAccuracyValue,
        correctionCount: currentTrial.correctionCount,
        offAxis: currentTrial.offAxis,
        slowTrial: currentTrial.slowTrial,
        invalidPace: currentTrial.invalidPace,
        oneFlickSuccess,
        rawPeakSpeed: currentTrial.rawPeakSpeed
    }]);

    clearCurrentTrialTimers();
    currentTrial = null;
    target.classList.remove("show");
    currentTest++;

    if (
        currentTest >=
        TOTAL_TESTS
    ) {
        endTest();
        return;
    }


    statusText.textContent =
        "NEXT";


    setTimeout(() => {

        if (isTesting) {
            startTrial();
        }

    }, 300);
}

// 첫 접근 정확도
function calculateFirstAccuracy(distance, targetRadius) {
    const toleranceDistance = targetRadius * 4;
    const accuracy = (
        1 - distance / toleranceDistance
    ) * 100;
    return clamp(
        accuracy, 0, 100
    );
}

// 시간 표시
function updateTimer() {

    if (!isTesting) {
        return;
    }

    if (currentTrial && trialStartTime) {

        const elapsed =
            (
                performance.now() -
                trialStartTime
            ) /
            1000;


        timeText.textContent =
            elapsed.toFixed(2);
    }

    timerAnimation =
        requestAnimationFrame(
            updateTimer
        );
}

// 테스트 종료
function endTest() {

    isTesting = false;
    testSessionActive = false;

    target.classList.remove("show");

    aimArea.classList.remove("testing");


    if (timerAnimation) {
        cancelAnimationFrame(
            timerAnimation
        );
    }


    statusText.textContent =
        "FINISHED";

    roundText.textContent =
        `${TOTAL_TESTS} / ${TOTAL_TESTS}`;


    if (
        document.pointerLockElement
    ) {
        document.exitPointerLock();
    }

    if (document.fullscreenElement) {
        normalFullscreenExit = true;
        document.exitFullscreen();
    }

    dpiInput.disabled = false;
    generalInput.disabled = false;

    startBtn.disabled = false;


    analyzeResult();
}

// 전체 결과 분석
function analyzeResult() {

    if (
        testResults.length === 0
    ) {
        return;
    }


    const totalTrialCount = testResults.length;
    const eligibleResults = testResults.filter(
        result => result.recommendationEligible === true
    );
    const recommendationEligibleTrialCount = eligibleResults.length;
    const underCount = eligibleResults.filter(
        result => result.pattern === "UNDER"
    ).length;
    const overCount = eligibleResults.filter(
        result => result.pattern === "OVER"
    ).length;
    const cleanCount = eligibleResults.filter(
        result => result.pattern === "CLEAN"
    ).length;
    const offAxisCount = testResults.filter(
        result => result.pattern === "OFF_AXIS"
    ).length;
    const slowTrialCount = testResults.filter(
        result => result.slowTrial === true
    ).length;
    const invalidPaceCount = testResults.filter(
        result => result.invalidPace === true
    ).length;
    const validTrialCount = testResults.filter(
        result => result.validTrial === true
    ).length;
    const oneFlickSuccessCount = eligibleResults.filter(
        result => result.oneFlickSuccess
    ).length;
    const oneFlickSuccessRate =
        recommendationEligibleTrialCount > 0
            ? oneFlickSuccessCount / recommendationEligibleTrialCount * 100
            : 0;
    const correctionOccurredCount = eligibleResults.filter(
        result => result.correctionCount >= 1
    ).length;
    const missedTrialCount = testResults.filter(
        result => result.hasMissed
    ).length;
    const underResults = eligibleResults.filter(
        result => result.pattern === "UNDER"
    );
    const overResults = eligibleResults.filter(
        result => result.pattern === "OVER"
    );
    const avgUnderPattern = 
        underCount > 0
            ? underResults.reduce (
                (sum, result) => sum + result.undershoot, 0
            ) / underCount : 0;
    const avgOverPattern = 
        overCount > 0
            ? overResults.reduce(
                (sum, result) => sum + result.overshoot, 0
            ) / overCount : 0;
    console.log (
        "GENERAL PATTERN COUNT ===>", {
            totalTrialCount,
            underCount,
            overCount,
            cleanCount,
            offAxisCount,
            slowTrialCount,
            invalidPaceCount,
            validTrialCount,
            recommendationEligibleTrialCount,
            oneFlickSuccessCount,
            oneFlickSuccessRate,
            correctionOccurredCount,
            missedTrialCount
        }
    );


    const avgTime =
        testResults.reduce(
            (sum, result) =>
                sum + result.time,
            0
        ) /
        totalTrialCount /
        1000;


    const avgOvershoot = avgOverPattern;


    const avgUndershoot = avgUnderPattern;


    const avgCorrection =
        eligibleResults.reduce(
            (sum, result) =>
                sum +
                result.correctionCount,
            0
        ) /
        Math.max(1, recommendationEligibleTrialCount);


    const avgFirstAccuracy =
        eligibleResults.reduce(
            (sum, result) =>
                sum +
                result.firstAccuracy,
            0
        ) /
        Math.max(1, recommendationEligibleTrialCount);


    averageTime.textContent =
        `${avgTime.toFixed(2)}초`;


    averageOvershoot.textContent =
        `${avgOvershoot.toFixed(1)} px`;


    averageUndershoot.textContent =
        `${avgUndershoot.toFixed(1)} px`;


    averageCorrection.textContent =
        `${avgCorrection.toFixed(1)}회`;


    firstAccuracy.textContent =
        `${avgFirstAccuracy.toFixed(1)}%`;

    oneFlickSuccessCountText.textContent =
        `${oneFlickSuccessCount} / ${recommendationEligibleTrialCount}`;

    recordSensitivitySession({
        generalSensitivity: currentGeneralSensitivity,
        totalTrialCount,
        oneFlickSuccessCount,
        oneFlickSuccessRate,
        underCount,
        overCount,
        offAxisCount,
        slowTrialCount,
        invalidPaceCount,
        validTrialCount,
        recommendationEligibleTrialCount,
        correctionOccurredCount,
        missedTrialCount,
        avgFirstAccuracy,
        avgTime
    });


    createRecommendation(
        avgOvershoot,
        avgUndershoot,
        avgCorrection,
        avgFirstAccuracy,
        avgTime,
        underCount,
        overCount,
        cleanCount,
        oneFlickSuccessCount,
        oneFlickSuccessRate,
        avgUnderPattern,
        avgOverPattern,
        recommendationEligibleTrialCount,
        invalidPaceCount,
        offAxisCount
    );

    const previousRecord = getGeneralTestHistory()[0] || null;
    const currentRecord = {
        timestamp: Date.now(),
        dpi: Number(dpiInput.value),
        generalSensitivity: currentGeneralSensitivity,
        recommendedGeneral: latestRecommendGeneral,
        totalTrialCount,
        oneFlickSuccessCount,
        oneFlickSuccessRate,
        underCount,
        overCount,
        cleanCount,
        offAxisCount,
        slowTrialCount,
        invalidPaceCount,
        validTrialCount,
        recommendationEligibleTrialCount,
        correctionOccurredCount,
        missedTrialCount,
        avgFirstAccuracy,
        avgTime,
        avgOvershoot,
        avgUndershoot,
        avgCorrection
    };

    const comparisonRecord =
        isRecommendationRetest && pendingRecommendationTest
            ? pendingRecommendationTest.baseline
            : previousRecord;

    renderGeneralComparison(
        currentRecord,
        comparisonRecord,
        isRecommendationRetest
    );
    saveGeneralTestHistory(currentRecord);
    latestGeneralTestSummary = currentRecord;

    if (isRecommendationRetest) {
        pendingRecommendationTest = null;
        isRecommendationRetest = false;
    }
}

function clearCurrentTrialTimers() {
    if (!currentTrial) {
        return;
    }

    if (currentTrial.flickEndTimer) {
        clearTimeout(currentTrial.flickEndTimer);
        currentTrial.flickEndTimer = null;
    }

    if (currentTrial.correctionBurstTimer) {
        clearTimeout(currentTrial.correctionBurstTimer);
        currentTrial.correctionBurstTimer = null;
    }
}

// 감도별 테스트 기록
function recordSensitivitySession(sessionResult) {
    sensitivityHistory.push(sessionResult);
    renderSensitivityHistory();
}

function getSensitivitySummaries() {
    const groupedHistory = new Map();
    const qualifiedHistory = sensitivityHistory.filter(
        result =>
            Number.isFinite(result.recommendationEligibleTrialCount) &&
            result.recommendationEligibleTrialCount >= MIN_RECOMMENDATION_TRIALS
    );

    qualifiedHistory.forEach(result => {
        if (!groupedHistory.has(result.generalSensitivity)) {
            groupedHistory.set(result.generalSensitivity, []);
        }

        groupedHistory.get(result.generalSensitivity).push(result);
    });

    return Array.from(groupedHistory.entries()).map(
        ([generalSensitivity, results]) => {
            const average = key =>
                results.reduce(
                    (sum, result) => sum + result[key],
                    0
                ) / results.length;

            return {
                generalSensitivity,
                testCount: results.length,
                avgOneFlickSuccessCount: average("oneFlickSuccessCount"),
                avgOneFlickSuccessRate: average("oneFlickSuccessRate"),
                avgUnderCount: average("underCount"),
                avgOverCount: average("overCount"),
                avgOffAxisCount: average("offAxisCount"),
                avgSlowTrialCount: average("slowTrialCount"),
                avgInvalidPaceCount: average("invalidPaceCount"),
                avgValidTrialCount: average("validTrialCount"),
                avgRecommendationEligibleTrialCount:
                    average("recommendationEligibleTrialCount"),
                avgCorrectionOccurredCount: average("correctionOccurredCount"),
                avgMissedTrialCount: average("missedTrialCount"),
                avgFirstAccuracy: average("avgFirstAccuracy"),
                avgTime: average("avgTime")
            };
        }
    );
}

function getBestSensitivityCandidate(summaries) {
    const eligibleSummaries = summaries.filter(
        summary =>
            Number.isFinite(summary.avgRecommendationEligibleTrialCount) &&
            summary.avgRecommendationEligibleTrialCount >= MIN_RECOMMENDATION_TRIALS
    );

    if (eligibleSummaries.length === 0) {
        return null;
    }

    const highestSuccessRate = Math.max(
        ...eligibleSummaries.map(summary => summary.avgOneFlickSuccessRate)
    );

    const closeCandidates = eligibleSummaries.filter(
        summary =>
            highestSuccessRate - summary.avgOneFlickSuccessRate <= 5
    );

    closeCandidates.sort((a, b) => {
        const balanceA = Math.abs(a.avgUnderCount - a.avgOverCount);
        const balanceB = Math.abs(b.avgUnderCount - b.avgOverCount);

        return (
            balanceA - balanceB ||
            a.avgCorrectionOccurredCount - b.avgCorrectionOccurredCount ||
            a.avgMissedTrialCount - b.avgMissedTrialCount ||
            b.avgFirstAccuracy - a.avgFirstAccuracy ||
            b.avgOneFlickSuccessRate - a.avgOneFlickSuccessRate
        );
    });

    return closeCandidates[0];
}

function renderSensitivityHistory() {
    const summaries = getSensitivitySummaries();
    const bestCandidate = getBestSensitivityCandidate(summaries);

    if (!bestCandidate) {
        bestSensitivity.textContent = "-";
        bestSensitivityState.textContent =
            "유효한 테스트 데이터가 부족합니다.";
        sensitivityHistoryList.textContent = "";
        return;
    }

    bestSensitivity.textContent = bestCandidate.generalSensitivity;
    bestSensitivityState.textContent =
        `평균 ONE FLICK ${bestCandidate.avgOneFlickSuccessRate.toFixed(1)}% · ${bestCandidate.testCount}회 테스트`;

    sensitivityHistoryList.textContent = "";

    summaries
        .sort((a, b) => a.generalSensitivity - b.generalSensitivity)
        .forEach(summary => {
            const historyItem = document.createElement("div");
            const sensitivityText = document.createElement("strong");
            const resultText = document.createElement("span");
            const testCountText = document.createElement("small");

            historyItem.className = "history_item";
            sensitivityText.textContent = summary.generalSensitivity;
            resultText.textContent =
                `ONE FLICK ${summary.avgOneFlickSuccessRate.toFixed(1)}%`;
            testCountText.textContent = `${summary.testCount}회 평균`;

            historyItem.append(
                sensitivityText,
                resultText,
                testCountText
            );
            sensitivityHistoryList.append(historyItem);
        });
}

// General 사용자 설정
function saveGeneralSettings() {
    const settings = {
        dpi: Number(dpiInput.value),
        general: Number(generalInput.value)
    };

    localStorage.setItem(
        GENERAL_SETTINGS_STORAGE_KEY,
        JSON.stringify(settings)
    );
}

function loadGeneralSettings() {
    const savedSettings = localStorage.getItem(
        GENERAL_SETTINGS_STORAGE_KEY
    );

    if (!savedSettings) {
        return;
    }

    try {
        const settings = JSON.parse(savedSettings);

        if (Number.isFinite(settings.dpi)) {
            dpiInput.value = settings.dpi;
        }

        if (Number.isFinite(settings.general)) {
            generalInput.value = settings.general;
        }
    } catch (error) {
        console.error("General 설정 불러오기 실패:", error);
    }
}

// 최근 General 테스트 기록
function getGeneralTestHistory() {
    const savedHistory = localStorage.getItem(
        GENERAL_HISTORY_STORAGE_KEY
    );

    if (!savedHistory) {
        return [];
    }

    try {
        const history = JSON.parse(savedHistory);
        return Array.isArray(history) ? history : [];
    } catch (error) {
        console.error("General 테스트 기록 불러오기 실패:", error);
        return [];
    }
}

function saveGeneralTestHistory(record) {
    const history = getGeneralTestHistory();
    history.unshift(record);

    localStorage.setItem(
        GENERAL_HISTORY_STORAGE_KEY,
        JSON.stringify(
            history.slice(0, GENERAL_MAX_HISTORY_COUNT)
        )
    );

    renderGeneralTestHistory();
}

function createGeneralHistoryMetric(label, value) {
    const metric = document.createElement("div");
    const labelText = document.createElement("span");
    const valueText = document.createElement("strong");

    labelText.textContent = label;
    valueText.textContent = value;
    metric.append(labelText, valueText);

    return metric;
}

function renderGeneralTestHistory() {
    const history = getGeneralTestHistory();
    generalHistoryList.textContent = "";

    if (history.length === 0) {
        const emptyMessage = document.createElement("p");
        emptyMessage.className = "recent_history_empty";
        emptyMessage.textContent =
            "아직 저장된 테스트 기록이 없습니다.";
        generalHistoryList.append(emptyMessage);
        return;
    }

    history.forEach((record, index) => {
        const historyItem = document.createElement("div");
        const historyTop = document.createElement("div");
        const title = document.createElement("strong");
        const date = document.createElement("span");
        const setting = document.createElement("p");
        const metrics = document.createElement("div");
        const pattern = document.createElement("p");
        const recommendation = document.createElement("p");

        historyItem.className = "recent_history_item";
        historyTop.className = "recent_history_top";
        title.className = "recent_history_title";
        date.className = "recent_history_date";
        setting.className = "recent_history_setting";
        metrics.className = "recent_history_metrics";
        pattern.className = "recent_history_pattern";
        recommendation.className = "recent_history_recommend";

        title.textContent =
            `#${history.length - index} GENERAL ${record.generalSensitivity}`;
        date.textContent = new Date(record.timestamp).toLocaleString("ko-KR");
        setting.textContent =
            `DPI ${record.dpi} · 일반 감도 ${record.generalSensitivity}`;

        metrics.append(
            createGeneralHistoryMetric(
                "ONE FLICK",
                `${record.oneFlickSuccessRate.toFixed(1)}%`
            ),
            createGeneralHistoryMetric(
                "첫 접근 정확도",
                `${record.avgFirstAccuracy.toFixed(1)}%`
            ),
            createGeneralHistoryMetric(
                "평균 수정 횟수",
                `${record.avgCorrection.toFixed(1)}회`
            ),
            createGeneralHistoryMetric(
                "MISS",
                `${record.missedTrialCount}회`
            )
        );

        pattern.textContent =
            `UNDER ${record.underCount} / OVER ${record.overCount} / CLEAN ${record.cleanCount}`;
        recommendation.textContent =
            `추천: GENERAL ${record.recommendedGeneral}`;

        historyTop.append(title, date);
        historyItem.append(
            historyTop,
            setting,
            metrics,
            pattern,
            recommendation
        );
        generalHistoryList.append(historyItem);
    });
}

// 이전 테스트 및 추천값 재테스트 비교
function getGeneralMetricComparison(
    previousValue,
    currentValue,
    threshold,
    higherIsBetter
) {
    const improvement = higherIsBetter
        ? currentValue - previousValue
        : previousValue - currentValue;

    if (improvement >= threshold) {
        return { score: 1, text: "▲ 개선", className: "improved" };
    }

    if (improvement <= -threshold) {
        return { score: -1, text: "▼ 감소", className: "worse" };
    }

    return { score: 0, text: "– 동일", className: "same" };
}

function createGeneralComparisonItem(
    label,
    previousValue,
    currentValue,
    suffix,
    comparison
) {
    const item = document.createElement("div");
    const labelText = document.createElement("span");
    const values = document.createElement("strong");
    const status = document.createElement("small");

    item.className = "general_comparison_item";
    labelText.textContent = label;
    values.textContent =
        `${previousValue}${suffix} → ${currentValue}${suffix}`;
    status.textContent = comparison.text;
    status.className = comparison.className;
    item.append(labelText, values, status);

    return item;
}

function renderGeneralComparison(current, previous, recommendationRetest) {
    generalComparisonGrid.textContent = "";

    if (!previous) {
        generalComparisonSummary.textContent =
            "이전 테스트 기록이 없습니다.";
        return;
    }

    if (current.dpi !== previous.dpi) {
        generalComparisonSummary.textContent =
            "이전 테스트와 DPI가 달라 직접 비교하지 않습니다.";
        return;
    }

    const comparisons = [
        {
            label: "ONE FLICK",
            previous: previous.oneFlickSuccessRate,
            current: current.oneFlickSuccessRate,
            suffix: "%",
            digits: 1,
            result: getGeneralMetricComparison(
                previous.oneFlickSuccessRate,
                current.oneFlickSuccessRate,
                6,
                true
            )
        },
        {
            label: "첫 접근 정확도",
            previous: previous.avgFirstAccuracy,
            current: current.avgFirstAccuracy,
            suffix: "%",
            digits: 1,
            result: getGeneralMetricComparison(
                previous.avgFirstAccuracy,
                current.avgFirstAccuracy,
                5,
                true
            )
        },
        {
            label: "평균 수정 횟수",
            previous: previous.avgCorrection,
            current: current.avgCorrection,
            suffix: "회",
            digits: 1,
            result: getGeneralMetricComparison(
                previous.avgCorrection,
                current.avgCorrection,
                0.2,
                false
            )
        },
        {
            label: "MISS",
            previous: previous.missedTrialCount,
            current: current.missedTrialCount,
            suffix: "회",
            digits: 0,
            result: getGeneralMetricComparison(
                previous.missedTrialCount,
                current.missedTrialCount,
                2,
                false
            )
        }
    ];

    const verificationScore = comparisons.reduce(
        (sum, item) => sum + item.result.score,
        0
    );

    if (recommendationRetest) {
        if (verificationScore >= 2) {
            generalComparisonSummary.textContent =
                "추천 감도 검증 성공 - 이전 감도보다 전체적인 ONE FLICK 성능이 향상되었습니다.";
        } else if (verificationScore <= -2) {
            generalComparisonSummary.textContent =
                "추천 감도 검증 실패 - 이전 감도보다 전체적인 ONE FLICK 성능이 감소했습니다.";
        } else {
            generalComparisonSummary.textContent =
                "추천 감도 검증 보류 - 이전 감도와 성능 차이가 크지 않아 추가 테스트가 필요합니다.";
        }
    } else {
        generalComparisonSummary.textContent =
            `이전 동일 DPI 테스트 GENERAL ${previous.generalSensitivity}과 현재 GENERAL ${current.generalSensitivity}을 비교합니다.`;
    }

    comparisons.forEach(item => {
        generalComparisonGrid.append(
            createGeneralComparisonItem(
                item.label,
                item.previous.toFixed(item.digits),
                item.current.toFixed(item.digits),
                item.suffix,
                item.result
            )
        );
    });
}

// 추천 감도 계산
function createRecommendation(
    avgOvershoot,
    avgUndershoot,
    avgCorrection,
    avgFirstAccuracy,
    avgTime,
    underCount,
    overCount,
    cleanCount,
    oneFlickSuccessCount,
    oneFlickSuccessRate,
    avgUnderPattern,
    avgOverPattern,
    recommendationEligibleTrialCount,
    invalidPaceCount,
    offAxisCount
) {
    const currentGeneral =
        Number(generalInput.value);

    // 양수 = UNDER가 많음 = 감도가 낮은 경향
    // 음수 = OVER가 많음 = 감도가 높은 경향
    const patternDifference = underCount - overCount;
    const patternGap = Math.abs(patternDifference);
    const directionalCount = underCount + overCount;
    const stableControl = oneFlickSuccessRate >= 80;

    let change = 0;
    let state = "현재 감도 적정";
    let feedbackMessage = "";

    if (recommendationEligibleTrialCount < MIN_RECOMMENDATION_TRIALS) {
        change = 0;
        state = "테스트 품질 부족";
        feedbackMessage =
            `추천 가능한 Trial이 ${recommendationEligibleTrialCount}회로 최소 기준 ${MIN_RECOMMENDATION_TRIALS}회보다 적습니다. ` +
            `OFF_AXIS ${offAxisCount}회, invalidPace ${invalidPaceCount}회가 발생해 정확한 감도 추천이 어려우므로 현재 감도 ${currentGeneral}을 유지하고 재테스트해 주세요.`;
    // UNDER / OVER 방향 표본이 부족한 경우
    } else if (directionalCount < 5) {
        change = 0;
        if (!stableControl) {
            state = "추가 테스트 필요";
            feedbackMessage =
                `ONE FLICK 성공률은 ${oneFlickSuccessRate.toFixed(1)}%로 낮지만 UNDER/OVER 방향 데이터가 충분하지 않아 ` +
                `현재 감도 ${currentGeneral}을 유지한 상태로 재테스트를 추천합니다.`;
        } else {
            state = "현재 감도 적정";
            feedbackMessage =
                `ONE FLICK 성공률은 ${oneFlickSuccessRate.toFixed(1)}%로 안정적이며 UNDER/OVER 방향 데이터가 충분하지 않아 ` +
                `현재 일반 상태 감도 ${currentGeneral}을 유지하는 것을 추천합니다.`;
        }
    // UNDER와 OVER 횟수가 거의 같은 경우
    } else if (patternGap <= 1) {
        change = 0;
        if (!stableControl) {
            state = "추가 테스트 필요";
            feedbackMessage =
                `UNDER ${underCount}회, OVER ${overCount}회로 두 패턴의 차이가 크지 않습니다. ` +
                `ONE FLICK 성공률이 ${oneFlickSuccessRate.toFixed(1)}%로 낮게 측정되어 현재 감도 ${currentGeneral}을 유지한 상태로 한 번 더 테스트하는 것을 추천합니다.`;
        } else {
            state = "현재 감도 적정";
            feedbackMessage =
                `ONE FLICK ${oneFlickSuccessCount}회 성공(${oneFlickSuccessRate.toFixed(1)}%)했고 UNDER ${underCount}회, OVER ${overCount}회로 특정 방향의 편향이 크지 않습니다. ` +
                `현재 일반 상태 감도 ${currentGeneral}을 유지하는 것을 추천합니다.`;
        }
    } else {
        let changeAmount = 0;

        // 1순위: UNDER / OVER 발생 횟수 차이
        if (patternGap <= 3) {
            changeAmount = 1;
        } else if (patternGap <= 5) {
            changeAmount = 2;
        } else if (patternGap <= 7) {
            changeAmount = 3;
        } else {
            changeAmount = 4;
        }

        // 2순위: 우세한 패턴이 얼마나 크게 발생했는지
        const dominantError =
            patternDifference > 0
                ? avgUnderPattern
                : avgOverPattern;

        if (dominantError >= 80) {
            changeAmount++;
        }

        // 조작 자체가 매우 안정적이면 과도한 변경 방지
        if (stableControl) {
            changeAmount--;
        }

        changeAmount =
            clamp(
                changeAmount,
                0,
                5
            );

        if (changeAmount === 0) {
            change = 0;
            state = "현재 감도 적정";
            feedbackMessage =
                `약간의 방향 차이는 있지만 전체 조준 결과가 안정적입니다. 현재 일반 상태 감도 ${currentGeneral}을 유지하는 것을 추천합니다.`;
        }  else if (patternDifference > 0) {

            // UNDER가 더 많음
            change = changeAmount;
            state = "감도가 낮은 경향";
            feedbackMessage =
                `UNDER ${underCount}회, OVER ${overCount}회, CLEAN ${cleanCount}회로 목표물에 부족하게 도달하는 패턴이 더 많이 나타났습니다. ` +
                `현재 일반 상태 감도 ${currentGeneral}에서 ${currentGeneral + change} 정도로 높여 테스트해보는 것을 추천합니다.`;
        } else {
            // OVER가 더 많음
            change = -changeAmount;
            state = "감도가 높은 경향";
            feedbackMessage =
                `UNDER ${underCount}회, OVER ${overCount}회, CLEAN ${cleanCount}회로 목표물을 지나치는 패턴이 더 많이 나타났습니다. ` +
                `현재 일반 상태 감도 ${currentGeneral}에서 ${currentGeneral + change} 정도로 낮춰 테스트해보는 것을 추천합니다.`;
        }
    }

    latestRecommendGeneral =
        clamp(
            currentGeneral + change,
            0,
            100
        );

    sensitivityState.textContent = state;
    recommendGeneral.textContent = latestRecommendGeneral;

    if (change > 0) {
        recommendState.textContent =
            `현재보다 +${change} 추천`;
    } else if (change < 0) {
        recommendState.textContent =
            `현재보다 ${change} 추천`;
    } else {
        recommendState.textContent =
            state === "추가 테스트 필요" || state === "테스트 품질 부족"
                ? "현재값 유지 후 재테스트"
                : "현재 감도 유지 추천";
    }

    feedback.textContent = feedbackMessage;
    applyRecommendBtn.disabled = false;
    console.log(
        "GENERAL TEST RESULT ===>",
        {
            underCount,
            overCount,
            cleanCount,
            oneFlickSuccessCount,
            oneFlickSuccessRate,
            recommendationEligibleTrialCount,
            invalidPaceCount,
            offAxisCount,
            avgUnderPattern,
            avgOverPattern,
            avgOvershoot,
            avgUndershoot,
            avgCorrection,
            avgFirstAccuracy,
            avgTime,
            patternDifference,
            currentGeneral,
            change,
            recommended:
                latestRecommendGeneral
        }
    );
}

// 추천값 적용
applyRecommendBtn.addEventListener("click", () => {
        if (latestRecommendGeneral === null) {
            return;
        }

        if (
            latestGeneralTestSummary &&
            latestRecommendGeneral !==
                latestGeneralTestSummary.generalSensitivity
        ) {
            pendingRecommendationTest = {
                dpi: latestGeneralTestSummary.dpi,
                beforeGeneral:
                    latestGeneralTestSummary.generalSensitivity,
                recommendedGeneral: latestRecommendGeneral,
                baseline: { ...latestGeneralTestSummary }
            };
        } else {
            pendingRecommendationTest = null;
        }

        generalInput.value = latestRecommendGeneral;
        recommendState.textContent = "추천값이 적용되었습니다.";
        saveGeneralSettings();
        document.querySelector(".setting").scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }
);

// 결과 초기화
function resetResultUI() {
    averageTime.textContent = "0.00초";
    averageOvershoot.textContent = "0 px";
    averageUndershoot.textContent = "0 px";
    averageCorrection.textContent = "0회";
    firstAccuracy.textContent = "0%";
    sensitivityState.textContent = "-";
    oneFlickSuccessCountText.textContent = `0 / ${TOTAL_TESTS}`;
    recommendGeneral.textContent = "-";
    recommendState.textContent = "테스트를 진행해주세요.";
    feedback.textContent = "테스트를 진행하면 마우스 이동 패턴을 분석하여 일반 상태 감도를 추천합니다.";
    applyRecommendBtn.disabled = true;
}

dpiInput.addEventListener("input", saveGeneralSettings);
generalInput.addEventListener("input", saveGeneralSettings);

clearGeneralHistoryBtn.addEventListener("click", () => {
    const confirmed = confirm(
        "최근 General 테스트 기록을 모두 삭제하시겠습니까?"
    );

    if (!confirmed) {
        return;
    }

    localStorage.removeItem(GENERAL_HISTORY_STORAGE_KEY);
    renderGeneralTestHistory();
});

loadGeneralSettings();
renderGeneralTestHistory();
