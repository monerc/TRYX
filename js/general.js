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
const recommendGeneral = document.querySelector("#recommendGeneral");
const recommendState = document.querySelector("#recommendState");
const feedback = document.querySelector("#feedback");

// 기본 설정
const TOTAL_TESTS = 15;
const BASE_GENERAL_SENSITIVITY = 40;

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
let latestRecommendGeneral = null;

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

    target.classList.remove("show");
    aimArea.classList.remove("testing");
    countdownOverlay.classList.remove("show");
    countdownOverlay.textContent = "";

    if (timerAnimation) {
        cancelAnimationFrame(timerAnimation);
        timerAnimation = null;
    }

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
        overshoot: 0,
        undershoot: 0,
        correctionCount: 0,
        lastDirection: 0,
        firstCorrection: false,
        minDistanceBeforeCorrection:
            targetDistance,
        firstApproachDistance:
            null
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

        analyzeMouseMovement(
            rawMoveX,
            rawMoveY
        );
    }
);

// 마우스 움직임 분석
function analyzeMouseMovement(
    moveX,
    moveY
) {

    if (!currentTrial) {
        return;
    }


    const distanceToTarget =
        Math.hypot(
            crosshairX - targetX,
            crosshairY - targetY
        );


    if (
        !currentTrial.firstCorrection
    ) {
        currentTrial.minDistanceBeforeCorrection =
            Math.min(
                currentTrial.minDistanceBeforeCorrection,
                distanceToTarget
            );
    }


    const movementProjection =
        moveX *
        currentTrial.unitX +
        moveY *
        currentTrial.unitY;


    let direction = 0;


    if (movementProjection > 0.6) {
        direction = 1;
    }

    if (movementProjection < -0.6) {
        direction = -1;
    }


    if (
        direction !== 0 &&
        currentTrial.lastDirection !== 0 &&
        direction !==
        currentTrial.lastDirection
    ) {

        currentTrial.correctionCount++;


        if (
            !currentTrial.firstCorrection
        ) {
            currentTrial.firstCorrection =
                true;


            currentTrial.firstApproachDistance =
                currentTrial
                    .minDistanceBeforeCorrection;


            const progress =
                getTargetProgress();


            const targetRadius =
                target.offsetWidth / 2;


            if (
                progress <
                currentTrial.targetDistance -
                targetRadius
            ) {

                currentTrial.undershoot =
                    Math.max(
                        0,

                        currentTrial.targetDistance -
                        progress -
                        targetRadius
                    );
            }
        }
    }


    if (direction !== 0) {
        currentTrial.lastDirection =
            direction;
    }


    const progress =
        getTargetProgress();


    if (
        progress >
        currentTrial.targetDistance
    ) {

        const overshoot =
            progress -
            currentTrial.targetDistance;


        currentTrial.overshoot =
            Math.max(
                currentTrial.overshoot,
                overshoot
            );
    }
}

// 목표 방향 진행 거리
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

        completeTrial();
    }
);

// 한 회차 완료
function completeTrial() {

    const endTime =
        performance.now();


    const elapsedTime =
        endTime -
        trialStartTime;


    const targetRadius =
        target.offsetWidth / 2;


    if (
        currentTrial
            .firstApproachDistance ===
        null
    ) {

        currentTrial.firstApproachDistance =
            currentTrial
                .minDistanceBeforeCorrection;
    }


    const firstAccuracyValue =
        calculateFirstAccuracy(
            currentTrial
                .firstApproachDistance,

            currentTrial
                .targetDistance,

            targetRadius
        );


    testResults.push({
        time: elapsedTime,
        overshoot: currentTrial.overshoot,
        undershoot: currentTrial.undershoot,
        correctionCount: currentTrial.correctionCount,
        firstAccuracy: firstAccuracyValue
    });

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
function calculateFirstAccuracy(
    distance,
    totalDistance,
    targetRadius
) {

    const usableDistance =
        Math.max(
            1,
            totalDistance -
            targetRadius
        );


    const errorDistance =
        Math.max(
            0,
            distance -
            targetRadius
        );


    const accuracy =
        (
            1 -
            errorDistance /
            usableDistance
        ) *
        100;


    return clamp(
        accuracy,
        0,
        100
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


    const count =
        testResults.length;


    const avgTime =
        testResults.reduce(
            (sum, result) =>
                sum + result.time,
            0
        ) /
        count /
        1000;


    const avgOvershoot =
        testResults.reduce(
            (sum, result) =>
                sum + result.overshoot,
            0
        ) /
        count;


    const avgUndershoot =
        testResults.reduce(
            (sum, result) =>
                sum + result.undershoot,
            0
        ) /
        count;


    const avgCorrection =
        testResults.reduce(
            (sum, result) =>
                sum +
                result.correctionCount,
            0
        ) /
        count;


    const avgFirstAccuracy =
        testResults.reduce(
            (sum, result) =>
                sum +
                result.firstAccuracy,
            0
        ) /
        count;


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


    createRecommendation(
        avgOvershoot,
        avgUndershoot,
        avgCorrection,
        avgFirstAccuracy,
        avgTime
    );
}

// 추천 감도 계산
function createRecommendation(
    avgOvershoot,
    avgUndershoot,
    avgCorrection,
    avgFirstAccuracy,
    avgTime
) {

    const currentGeneral =
        Number(
            generalInput.value
        );


    const difference =
        avgUndershoot -
        avgOvershoot;


    let change = 0;

    let state = "적정";


    if (difference > 6) {

        change =
            clamp(
                Math.round(
                    difference / 10
                ),
                1,
                5
            );

        state =
            "감도가 낮은 경향";
    }


    else if (difference < -6) {

        change =
            -clamp(
                Math.round(
                    Math.abs(
                        difference
                    ) /
                    10
                ),
                1,
                5
            );

        state =
            "감도가 높은 경향";
    }


    else {

        change = 0;

        state =
            "현재 감도 적정";
    }


    latestRecommendGeneral =
        clamp(
            currentGeneral +
            change,
            0,
            100
        );


    sensitivityState.textContent =
        state;


    recommendGeneral.textContent =
        latestRecommendGeneral;


    if (change > 0) {

        recommendState.textContent =
            `현재보다 +${change} 추천`;


        feedback.textContent =
            `목표물에 도달하기 전 방향을 수정하는 경향이 나타났습니다. 현재 일반 상태 감도 ${currentGeneral}에서 ${latestRecommendGeneral} 정도로 높여 테스트해보는 것을 추천합니다.`;
    }


    else if (change < 0) {

        recommendState.textContent =
            `현재보다 ${change} 추천`;


        feedback.textContent =
            `목표물을 지나친 뒤 다시 보정하는 경향이 나타났습니다. 현재 일반 상태 감도 ${currentGeneral}에서 ${latestRecommendGeneral} 정도로 낮춰 테스트해보는 것을 추천합니다.`;
    }


    else {

        recommendState.textContent =
            "현재 감도 유지 추천";


        feedback.textContent =
            `현재 일반 상태 감도 ${currentGeneral}에서 오버슈트와 언더슈트의 차이가 크지 않습니다. 현재 감도를 유지하면서 추가 테스트를 진행하는 것을 추천합니다.`;
    }


    applyRecommendBtn.disabled =
        false;


    console.log(
        "GENERAL TEST RESULT ===>",
        {
            avgOvershoot,
            avgUndershoot,
            avgCorrection,
            avgFirstAccuracy,
            avgTime,
            currentGeneral,
            recommended:
                latestRecommendGeneral
        }
    );
}

// 추천값 적용
applyRecommendBtn.addEventListener(
    "click",
    () => {

        if (
            latestRecommendGeneral ===
            null
        ) {
            return;
        }


        generalInput.value =
            latestRecommendGeneral;


        recommendState.textContent =
            "추천값이 적용되었습니다.";
    }
);

// 결과 초기화
function resetResultUI() {

    averageTime.textContent =
        "0.00초";

    averageOvershoot.textContent =
        "0 px";

    averageUndershoot.textContent =
        "0 px";

    averageCorrection.textContent =
        "0회";

    firstAccuracy.textContent =
        "0%";

    sensitivityState.textContent =
        "-";

    recommendGeneral.textContent =
        "-";

    recommendState.textContent =
        "테스트를 진행해주세요.";

    feedback.textContent =
        "테스트를 진행하면 마우스 이동 패턴을 분석하여 일반 상태 감도를 추천합니다.";

    applyRecommendBtn.disabled =
        true;
}