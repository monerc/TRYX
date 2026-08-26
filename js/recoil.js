// DOM
const aimArea = document.querySelector("#aimArea");
const testSection = document.querySelector("#testSection");
const targetCenter = document.querySelector(".target_center");
const countdownOverlay = document.querySelector("#countdownOverlay");
const startBtn = document.querySelector("#startBtn");
const applyRecommendBtn = document.querySelector("#applyRecommendBtn");
const statusText = document.querySelector("#status");
const roundText = document.querySelector("#roundText");
const timeText = document.querySelector("#timeText");
const ammoText = document.querySelector("#ammoText");
const redDot = document.querySelector("#redDot");

// 감도
const dpiInput = document.querySelector("#dpi");
const generalInput = document.querySelector("#general");
const adsInput = document.querySelector("#ads");
const verticalInput = document.querySelector("#vertical");

// 총기
const weaponInput = document.querySelector("#weapon");
const sightInput = document.querySelector("#sight");
const muzzleInput = document.querySelector("#muzzle");
const gripInput = document.querySelector("#grip");
const stanceInput = document.querySelector("#stance");

// 총기 정보
const selectedWeaponText = document.querySelector("#selectedWeapon");
const weaponRPMText = document.querySelector("#weaponRPM");

// 기본 분석
const resultX = document.querySelector("#resultX");
const resultY = document.querySelector("#resultY");
const averageDistanceText = document.querySelector("#averageDistance");
const centerRateText = document.querySelector("#centerRate");

// 상세 분석
const escapeCountText = document.querySelector("#escapeCount");
const outsideTimeText = document.querySelector("#outsideTime");
const outsideDistanceText = document.querySelector("#outsideDistance");
const returnTimeText = document.querySelector("#returnTime");

// 제어
const verticalControlText = document.querySelector("#verticalControl");
const horizontalControlText = document.querySelector("#horizontalControl");
const stabilityText = document.querySelector("#stability");
const comparisonText = document.querySelector("#comparison");
const historyList = document.querySelector("#historyList");
const clearHistoryBtn = document.querySelector("#clearHistoryBtn");

// 추천
const recommendGrid = document.querySelector(".recommend_grid");
const recommendGeneral = document.querySelector("#recommendGeneral");
const recommendADS = document.querySelector("#recommendADS");
const recommendVertical = document.querySelector("#recommendVertical");

const recommendGeneralState = document.querySelector("#recommendGeneralState");
const recommendADSState = document.querySelector("#recommendADSState");
const recommendVerticalState = document.querySelector("#recommendVerticalState");

const feedback = document.querySelector("#feedback");

let recommendScopeCard = null;
let recommendScopeLabel = null;
let recommendScopeValue = null;
let recommendScopeState = null;

// 기본 설정
const TOTAL_ROUNDS = 3;
const MAGAZINE_SIZE = 30;
const BASE_SENSITIVITY = 35;

// 실제 마우스 움직임 반영량
const MOUSE_INPUT_SCALE = 0.045;

// 수직, 수평 반동 보정값
const VERTICAL_RECOIL_CALIBRATION = 0.75;
const HORIZONTAL_RECOIL_CALIBRATION = 0.75;

// TRYX 기준 테스트 영역
const REFERENCE_AIM_WIDTH = 1818;
const REFERENCE_AIM_HEIGHT = 918;

// 현재 화면 해상도 배율
function getResolutionScale() {
    const currentHeight = aimArea.clientHeight;
    if (currentHeight <= 0) {
        return 1;
    }
    return currentHeight / REFERENCE_AIM_HEIGHT;
}

// 전체화면 타겟 기본 크기
const BASE_FULLSCREEN_TARGET_SCALE = 1.15;

// 해상도에 맞춰 타겟 크기 조절
function updateResolutionUI() {
    const resolutionScale = getResolutionScale();

    const targetScale =
        BASE_FULLSCREEN_TARGET_SCALE *
        resolutionScale;
    console.log (
        "현재 해상도 배율값은? ===>", resolutionScale
    );

    testSection.style.setProperty (
        "--target-scale",
        targetScale
    );
    console.log (
        "현재 타겟 크기 배율값은? ===>", targetScale
    );
}

// 최소 입력 판정
const NO_INPUT_DISTANCE = 80;
const NO_VERTICAL_INPUT = 40;
const MIN_NET_DOWNWARD_INPUT = 20;

// 총기 데이터
/*
    PUBG 내부 원본 recoil table이 아니라
    실제 게임과 비교하면서 보정하기 위한
    TRYX 근사 반동 데이터.
*/
const WEAPONS = {
    m416: {
        name: "M416",
        rpm: 700,
        vertical: 9.4,
        horizontal: 4.0,
        buildup: 1.00,
        horizontalChaos: 0.90
    },

    beryl: {
        name: "Beryl M762",
        rpm: 700,
        vertical: 11.8,
        horizontal: 5.7,
        buildup: 1.10,
        horizontalChaos: 1.18
    },

    aug: {
        name: "AUG",
        rpm: 720,
        vertical: 9.1,
        horizontal: 4.5,
        buildup: 1.02,
        horizontalChaos: 0.98
    },

    ace32: {
        name: "ACE32",
        rpm: 680,
        vertical: 10.6,
        horizontal: 5.1,
        buildup: 1.07,
        horizontalChaos: 1.08
    },

    akm: {
        name: "AKM",
        rpm: 600,
        vertical: 12.0,
        horizontal: 5.0,
        buildup: 1.05,
        horizontalChaos: 1.02
    }
};

// 총구
const MUZZLES = {
    none: {
        vertical: 1,
        horizontal: 1
    },

    compensator: {
        vertical: 0.85,
        horizontal: 0.90
    },

    muzzleBrake: {
        vertical: 0.90,
        horizontal: 0.90
    },

    flashHider: {
        vertical: 0.90,
        horizontal: 1
    },

    suppressor: {
        vertical: 1,
        horizontal: 1
    }
};

// 손잡이
const GRIPS = {
    none: {
        vertical: 1,
        horizontal: 1
    },

    vertical: {
        vertical: 0.85,
        horizontal: 1
    },

    tilted: {
        vertical: 0.88,
        horizontal: 0.94
    },

    half: {
        vertical: 0.92,
        horizontal: 0.84
    },

    thumb: {
        vertical: 0.90,
        horizontal: 1.05
    }
};

// 자세
const STANCES = {
    stand: {
        vertical: 1,
        horizontal: 1
    },

    crouch: {
        vertical: 0.80,
        horizontal: 0.82
    }
};

// 조준경
const SIGHTS = {
    redDot: {
        name: "레드 도트",
        magnified: false,
        screenScale: 1
    },

    holo: {
        name: "홀로그램",
        magnified: false,
        screenScale: 1
    },

    "2x": {
        name: "2배율",
        magnified: true,
        screenScale: 1.15
    },

    "3x": {
        name: "3배율",
        magnified: true,
        screenScale: 1.30
    },

    "4x": {
        name: "4배율",
        magnified: true,
        screenScale: 1.45
    },

    "6x": {
        name: "6배율",
        magnified: true,
        screenScale: 1.65
    }
};

// 배율 감도 저장
const scopeSensitivityValues = {
    "2x": 35,
    "3x": 35,
    "4x": 35,
    "6x": 35
};

let scopeSensitivityInput = null;

// 테스트 상태
let testing = false;
let preparingRound = false;
let testSessionActive = false;
let normalFullscreenExit = false;

let currentRound = 0;
let currentBullet = 0;

let dotX = 0;
let dotY = 0;

let aimSamples = [];
let roundResults = [];

// 마우스 입력
let mouseMovementCount = 0;
let totalMouseDistance = 0;
let totalVerticalMovement = 0;
let totalHorizontalMovement = 0;
let netMouseY = 0;

// Timer
let shotTimer;
let roundTimer;
let countdownTimer;
let nextRoundTimer;

// 반동
let horizontalDirection = 1;
let shotsUntilDirectionChange = 3;

// 동일 반동 패턴을 위한 시드
const RECOIL_PATTERN_SEED = 20260821;
let recoilRandomState = RECOIL_PATTERN_SEED;

// 시드 초기화
function resetRecoilRandom(round) {
    recoilRandomState = (RECOIL_PATTERN_SEED + round * 1000) >>> 0;
    console.log (
        "반동 랜덤 시드 초기화값은? ===>", round, recoilRandomState
    );
}

// 반동 전용 랜덤
function recoilRandom() {
    recoilRandomState += 0x6D2B79F5;

    let t = recoilRandomState;
    t = Math.imul (
        t ^ (t >>> 15),
        t | 1
    );
    t ^= t + Math.imul (
        t ^ (t >>> 7),
        t | 61
    );
    return (
        (t ^ (t >>> 14)) >>> 0
    ) / 4294967296;
}

// 반동 전용 범위 랜덤
function recoilRandomRange(min, max) {
    return (
        recoilRandom() * (max - min)
    ) + min;
}

// 반동 전용 정수 랜덤
function recoilRandomInt(min, max) {
    return Math.floor (
        recoilRandomRange (
            min, max + 1
        )
    );
}

// 반동 전용 평균 랜덤
function recoilAverageRandom(min, max) {
    const a = recoilRandom();
    const b = recoilRandom();

    return (
        min + ((a + b) / 2) * (max - min)
    );
}

// 중앙 이탈 추적
let roundTracking = null;

// 이전 테스트
let previousTestSummary = null;

// 마지막 추천값
let lastRecommendation = null;

// 추천값 적용 후 재테스트 대기 정보
let pendingRecommendationTest = null;

// 현재 테스트가 추천값 검증 테스트인지 여부
let isRecommendationRetest = false;

// 테스트 당시 설정
let testSensitivity = {
    dpi: 800,
    general: 40,
    ads: 35,
    vertical: 1,
    scope: null
};

let testWeaponSetting = {
    weapon: "m416",
    sight: "redDot",
    muzzle: "none",
    grip: "none",
    stance: "stand"
};

// 사용자 설정 저장 키
const SETTINGS_STORAGE_KEY = "tryxUserSettings";

// 현재 설정 저장
function saveUserSettings() {
    const settings = {
        dpi : Number(dpiInput.value),
        general : Number(generalInput.value),
        ads : Number(adsInput.value),
        vertical : Number(verticalInput.value),

        weapon : weaponInput.value,
        sight : sightInput.value,
        muzzle : muzzleInput.value,
        grip : gripInput.value,
        stance : stanceInput.value,

        scopeSensitivityValues : {
            ...scopeSensitivityValues
        }
    };

    localStorage.setItem (
        SETTINGS_STORAGE_KEY, JSON.stringify(settings)
    );
    console.log(
        "사용자 설정 저장값은 ===>", settings
    );
}

// 저장된 설정 불러오기
function loadUserSettings() {
    const saved = localStorage.getItem (
        SETTINGS_STORAGE_KEY
    );

    if (!saved) {
        return;
    }

    try {
        const settings =
            JSON.parse(saved);
        console.log (
            "사용자 설정 불러온 값은? ===>", settings
        );

        if (settings.dpi !== undefined) {
            dpiInput.value =
                settings.dpi;
        }

        if (settings.general !== undefined) {
            generalInput.value =
                settings.general;
        }

        if (settings.ads !== undefined) {
            adsInput.value =
                settings.ads;
        }

        if (settings.vertical !== undefined) {
            verticalInput.value =
                settings.vertical;
        }

        if (
            settings.weapon &&
            WEAPONS[settings.weapon]
        ) {
            weaponInput.value =
                settings.weapon;
        }

        if (
            settings.sight &&
            SIGHTS[settings.sight]
        ) {
            sightInput.value =
                settings.sight;
        }

        if (
            settings.muzzle &&
            MUZZLES[settings.muzzle]
        ) {
            muzzleInput.value =
                settings.muzzle;
        }

        if (
            settings.grip &&
            GRIPS[settings.grip]
        ) {
            gripInput.value =
                settings.grip;
        }

        if (
            settings.stance &&
            STANCES[settings.stance]
        ) {
            stanceInput.value =
                settings.stance;
        }

        if (
            settings.scopeSensitivityValues
        ) {
            Object.assign(
                scopeSensitivityValues,
                settings.scopeSensitivityValues
            );
        }

        updateWeaponInfo();
        updateAttachmentAvailability();
        updateScopeSensitivityUI();
        updateRecommendationScopeCard();

        } catch (error) {
            console.error (
                "TRYX 설정 불러오기 실패 :", error
            );
        }
    }

// 기본 감도 변경 시 자동 저장
[
    dpiInput,
    generalInput,
    adsInput,
    verticalInput
].forEach((input) => {
    input.addEventListener(
        "input",
        saveUserSettings
    );
});

// 총기 설정 변경 시 자동 저장
[
    weaponInput,
    sightInput,
    muzzleInput,
    gripInput,
    stanceInput
].forEach((select) => {
    select.addEventListener(
        "change",
        saveUserSettings
    );
});

// 페이지 시작 시 마지막 설정 복원
loadUserSettings();

// 최근 테스트 기록
const HISTORY_STORAGE_KEY = "tryxTestHistory";
const MAX_HISTORY_COUNT = 5;

// 기록 불러오기
function getTestHistory() {
    const saved = localStorage.getItem(
        HISTORY_STORAGE_KEY
    );

    if (!saved) {
        return [];
    }

    try {
        const history =
            JSON.parse(saved);

        if (!Array.isArray(history)) {
            return [];
        }

        // 이전 버전 기록도 현재 필드명으로 자동 변환
        return history.map((record) => ({
            ...record,

            verticalCalibration: Number(
                record.verticalCalibration ??
                record.verticalCAlibration ??
                VERTICAL_RECOIL_CALIBRATION
            ),

            horizontalCalibration: Number(
                record.horizontalCalibration ??
                HORIZONTAL_RECOIL_CALIBRATION
            )
        }));

    } catch (error) {
        console.error(
            "TRYX 테스트 기록 불러오기 실패 :",
            error
        );

        return [];
    }
}

// 최근 테스트 저장
function saveTestHistory(record) {
    const history = getTestHistory();
    history.unshift(record);

    const limitedHistory = history.slice (
        0,
        MAX_HISTORY_COUNT
    );

    localStorage.setItem (
        HISTORY_STORAGE_KEY,
        JSON.stringify(limitedHistory)
    );
    console.log (
        "최근 테스트 기록 저장값은? ===>", record
    );

    renderTestHistory();
}

function getMuzzleName(value) {
    const names = {
        none: "총구 없음",
        compensator: "보정기",
        muzzleBrake: "제동기",
        flashHider: "소염기",
        suppressor: "소음기"
    };

    return names[value] || value;
}


function getGripName(value) {
    const names = {
        none: "손잡이 없음",
        vertical: "수직 손잡이",
        tilted: "틸티드 그립",
        half: "하프 그립",
        thumb: "엄지 그립"
    };

    return names[value] || value;
}


function getStanceName(value) {
    const names = {
        stand: "서서 사격",
        crouch: "앉아서 사격"
    };

    return names[value] || value;
}

// 테스트 기록 비교 조건 확인
function canCompareHistory (current, previous) {
    if (!previous) {
        return false;
    }

    return (
        current.weaponName === previous.weaponName &&
        current.sightName === previous.sightName &&
        current.muzzleName === previous.muzzleName &&
        current.gripName === previous.gripName &&
        current.stanceName === previous.stanceName &&
        Number(current.dpi) === Number(previous.dpi) &&
        Number(current.verticalCalibration) === Number(previous.verticalCalibration) &&
        Number(current.horizontalCalibration) === Number(previous.horizontalCalibration)
    );
}

// 비교 상태 생성
function getHistoryCompareStatus (current, previous, higherIsBetter) {
    if (current === previous) {
        return {
            text : "유지",
            className : "same"
        };
    }

    const improved = higherIsBetter
        ? current > previous
        : current < previous;
    
    return {
        text : improved
            ? "▲ 개선"
            : "▼ 악화",

        className : improved
            ? "improved"
            : "worse"
    };
}

// 최근 테스트 화면 출력
function renderTestHistory() {
    if (!historyList) {
        return;
    }

    const history = getTestHistory();
    historyList.innerHTML = "";

    if (history.length === 0) {
        const empty = document.createElement("p");
        empty.className = "history_empty";
        empty.textContent = "아직 저장된 테스트 기록이 없습니다.";
        historyList.appendChild (
            empty
        );
        return;
    }

    history.forEach(
        (record, index) => {
            const item = document.createElement("div");
            item.className = "history_item";
            const date = new Date (
                record.timestamp
            );
            const dateText = date.toLocaleString("ko-KR");
            const previousRecord =
                history[index + 1];
            let comparisonHTML = "";

            // 가장 첫 테스트
            if (!previousRecord) {
                comparisonHTML = `
                    <div class="history_compare history_compare_none">
                        비교할 이전 테스트가 없습니다.
                    </div>
                `;
            }

            // 조건이 다른 테스트
            else if (
                !canCompareHistory(
                    record,
                    previousRecord
                )
            ) {
                comparisonHTML = `
                    <div class="history_compare history_compare_none">
                        이전 테스트와 조건이 달라 직접 비교하지 않습니다.
                    </div>
                `;
            }

            // 동일 조건 테스트
            else {
                const currentCenter =
                    Number(
                        record.centerRate.toFixed(0)
                    );

                const previousCenter =
                    Number(
                        previousRecord.centerRate.toFixed(0)
                    );


                const currentHorizontal =
                    Number(
                        record.horizontalError.toFixed(1)
                    );

                const previousHorizontal =
                    Number(
                        previousRecord.horizontalError.toFixed(1)
                    );


                const currentVertical =
                    Number(
                        record.verticalError.toFixed(1)
                    );

                const previousVertical =
                    Number(
                        previousRecord.verticalError.toFixed(1)
                    );


                const currentReturn =
                    Number(
                        (
                            record.returnTime / 1000
                        ).toFixed(2)
                    );

                const previousReturn =
                    Number(
                        (
                            previousRecord.returnTime / 1000
                        ).toFixed(2)
                    );


                const centerStatus =
                    getHistoryCompareStatus(
                        currentCenter,
                        previousCenter,
                        true
                    );

                const horizontalStatus =
                    getHistoryCompareStatus(
                        currentHorizontal,
                        previousHorizontal,
                        false
                    );

                const verticalStatus =
                    getHistoryCompareStatus(
                        currentVertical,
                        previousVertical,
                        false
                    );

                const returnStatus =
                    getHistoryCompareStatus(
                        currentReturn,
                        previousReturn,
                        false
                    );

                comparisonHTML = `
                    <div class="history_compare">
                        <strong class="history_compare_title">
                            이전 동일 조건 테스트 대비
                        </strong>

                        <div class="history_compare_grid">

                            <div>
                                <span>중앙 유지율</span>

                                <p>
                                    ${previousCenter}%
                                    →
                                    ${currentCenter}%
                                </p>

                                <strong class="${centerStatus.className}">
                                    ${centerStatus.text}
                                </strong>
                            </div>

                            <div>
                                <span>수평 오차</span>

                                <p>
                                    ${previousHorizontal}px
                                    →
                                    ${currentHorizontal}px
                                </p>

                                <strong class="${horizontalStatus.className}">
                                    ${horizontalStatus.text}
                                </strong>
                            </div>

                            <div>
                                <span>수직 오차</span>

                                <p>
                                    ${previousVertical}px
                                    →
                                    ${currentVertical}px
                                </p>

                                <strong class="${verticalStatus.className}">
                                    ${verticalStatus.text}
                                </strong>
                            </div>

                            <div>
                                <span>복귀 시간</span>

                                <p>
                                    ${previousReturn.toFixed(2)}초
                                    →
                                    ${currentReturn.toFixed(2)}초
                                </p>

                                <strong class="${returnStatus.className}">
                                    ${returnStatus.text}
                                </strong>
                            </div>

                        </div>
                    </div>
                `;
            }

            item.innerHTML = `
                <div class="history_top">
                    <strong class="history_weapon">
                        #${history.length - index}
                        ${record.weaponName}
                        / ${record.sightName}
                    </strong>
                    <span class="history_date">
                        ${dateText}
                    </span>
                </div>

                <p class="history_setting">
                    ${record.muzzleName}
                    / ${record.gripName}
                    / ${record.stanceName}
                    <br>
                    DPI ${record.dpi}
                    /
                    ${record.aimSensitivityName}
                    ${record.aimSensitivity}
                    /
                    수직 감도 배수
                    ${record.vertical.toFixed(2)}
                    반동 보정
                    수직 ${record.verticalCalibration.toFixed(2)}
                    /
                    수평 ${record.horizontalCalibration.toFixed(2)}
                </p>
                <div class="history_result">
                    <div>
                        <span>중앙 유지율</span>
                        <strong>
                            ${record.centerRate.toFixed(0)}%
                        </strong>
                    </div>

                    <div>
                        <span>수평 오차</span>
                        <strong>
                            ${record.horizontalError.toFixed(1)}px
                        </strong>
                    </div>

                    <div>
                        <span>수직 오차</span>
                        <strong>
                            ${record.verticalError.toFixed(1)}px
                        </strong>
                    </div>

                    <div>
                        <span>복귀 시간</span>
                        <strong>
                            ${(record.returnTime / 1000).toFixed(2)}초
                        </strong>
                    </div>
                </div>

                <p class="history_recommend">
                    추천:
                    <strong>
                        ${record.aimSensitivityName}
                        ${record.recommendedAimSensitivity}
                        /
                        수직 감도
                        ${record.recommendedVertical.toFixed(2)}
                    </strong>
                </p>
                ${comparisonHTML}
            `;

            historyList.appendChild(
                item
            );
        } 
    )
}

// 최근 테스트 기록 출력
renderTestHistory();

// 최근 테스트 기록 전체 삭제
clearHistoryBtn.addEventListener("click", () => {
    const confirmed = confirm (
        "최근 테스트 기록을 모두 삭제하시겠습니까?"
    );

    if (!confirmed) {
        return;
    }

    localStorage.removeItem (
        HISTORY_STORAGE_KEY
    );

    renderTestHistory();
});

// 총기 정보
weaponInput.addEventListener("change", () => {
    updateWeaponInfo();
    updateAttachmentAvailability();
});

function updateWeaponInfo() {
    const weapon = WEAPONS[weaponInput.value];

    selectedWeaponText.textContent = weapon.name;
    weaponRPMText.textContent = `${weapon.rpm} RPM`;
    console.log (
        "현재 선택 총기 정보값은? ===>", weapon
    );
}

// 총기별 파츠 제한
function updateAttachmentAvailability() {
    if (weaponInput.value === "akm") {
        gripInput.value = "none";
        gripInput.disabled = true;
    } else {
        gripInput.disabled = false;
    }
}

updateWeaponInfo();
updateAttachmentAvailability();

// 조준경 변경
sightInput.addEventListener("change", () => {
    updateScopeSensitivityUI();
    updateRecommendationScopeCard();
});

function updateScopeSensitivityUI() {
    const sight = sightInput.value;
    const sightData = SIGHTS[sight];

    const oldSetting = document.querySelector(".dynamic_scope_setting");

    if (oldSetting) {
        oldSetting.remove();
    }

    scopeSensitivityInput = null;

    if (!sightData.magnified) {
        return;
    }

    const label = document.createElement("label");
    label.className = "dynamic_scope_setting";

    const title = document.createElement("span");
    title.textContent = `${sightData.name} 감도`;

    const input = document.createElement("input");

    input.type = "number";
    input.id = "scopeSensitivity";
    input.min = "1";
    input.max = "100";
    input.value = scopeSensitivityValues[sight];

    input.addEventListener("input", () => {
        const value = Number(input.value);

        if (value > 0) {
            scopeSensitivityValues[sight] = value;
            console.log (
                "배율 감도 변경값은? ===>", sight, value
            );
            saveUserSettings();
        }
    });

    label.appendChild(title);
    label.appendChild(input);

    document.querySelector(".setting_grid").appendChild(label);

    scopeSensitivityInput = input;
}

updateScopeSensitivityUI();

// 추천 배율 카드
function updateRecommendationScopeCard() {
    const sight = sightInput.value;
    const sightData = SIGHTS[sight];

    if (!sightData.magnified) {
        if (recommendScopeCard) {
            recommendScopeCard.remove();
        }

        recommendScopeCard = null;
        recommendScopeLabel = null;
        recommendScopeValue = null;
        recommendScopeState = null;

        return;
    }

    if (!recommendScopeCard) {
        recommendScopeCard = document.createElement("div");
        recommendScopeLabel = document.createElement("span");
        recommendScopeValue = document.createElement("strong");
        recommendScopeState = document.createElement("small");

        recommendScopeCard.appendChild(recommendScopeLabel);
        recommendScopeCard.appendChild(recommendScopeValue);
        recommendScopeCard.appendChild(recommendScopeState);

        recommendGrid.appendChild(recommendScopeCard);
    }

    recommendScopeLabel.textContent = `${sightData.name} 감도`;
    recommendScopeValue.textContent = "-";
    recommendScopeState.textContent = "-";
}

updateRecommendationScopeCard();

// 전체화면
async function enterFullscreenTest() {
    try {
        if (!document.fullscreenElement) {
            await testSection.requestFullscreen();
        }
        console.log (
            "전체화면 진입 상태값은? ===>", document.fullscreenElement
        );

        return true;
    } catch (error) {
        console.error("전체화면 전환 실패:", error);
        return false;
    }
}

async function exitFullscreenTest() {
    if (!document.fullscreenElement) {
        return;
    }

    normalFullscreenExit = true;

    try {
        await document.exitFullscreen();
    } catch (error) {
        console.error("전체화면 종료 실패:", error);
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

// Pointer Lock
function requestPointerLock() {
    try {
        const result = aimArea.requestPointerLock({
            unadjustedMovement: true
        });

        if (result && typeof result.catch === "function") {
            result.catch(() => {
                aimArea.requestPointerLock();
            });
        }
    } catch {
        aimArea.requestPointerLock();
    }
}

document.addEventListener("pointerlockchange", () => {
    if (
        testSessionActive &&
        (testing || preparingRound) &&
        !document.pointerLockElement
    ) {
        cancelTestSession(
            "마우스 고정이 해제되어 테스트가 취소되었습니다."
        );
    }
});

// 테스트 취소
async function cancelTestSession(message) {
    console.log(
        "테스트 취소 사유값은? ===>", message
    );
    testing = false;
    preparingRound = false;
    testSessionActive = false;

    clearInterval(shotTimer);
    clearInterval(countdownTimer);
    clearTimeout(roundTimer);
    clearTimeout(nextRoundTimer);
    countdownOverlay.classList.remove (
        "show"
    );
    countdownOverlay.textContent = "";

    aimArea.classList.remove("testing");

    currentRound = 0;
    currentBullet = 0;

    aimSamples = [];
    roundResults = [];

    roundText.textContent = `0 / ${TOTAL_ROUNDS}`;
    ammoText.textContent = `0 / ${MAGAZINE_SIZE}`;
    timeText.textContent = "0.0";
    statusText.textContent = "TEST CANCELLED";

    resetRedDot();
    resetResult();

    startBtn.disabled = false;
    startBtn.textContent = "START TEST";

    feedback.textContent = message;

    if (document.fullscreenElement) {
        await exitFullscreenTest();
    }
}

// START
startBtn.addEventListener("click", async () => {
    if (testing || preparingRound || testSessionActive) {
        return;
    }

    const dpi = Number(dpiInput.value);
    const general = Number(generalInput.value);
    const ads = Number(adsInput.value);
    const vertical = Number(verticalInput.value);

    const sight = sightInput.value;
    const sightData = SIGHTS[sight];

    let scope = null;

    if (sightData.magnified) {
        scope = Number(scopeSensitivityInput?.value);

        if (!scope || scope <= 0) {
            alert(`${sightData.name} 감도를 입력해주세요.`);
            return;
        }

        scopeSensitivityValues[sight] = scope;
    }

    if (
        dpi <= 0 ||
        general < 0 ||
        ads <= 0 ||
        vertical <= 0
    ) {
        alert("감도 값을 올바르게 입력해주세요.");
        return;
    }

    /*
        매우 중요:
        START를 누를 때마다 현재 입력창 값을
        다시 가져오기 때문에 추천값을 입력하고
        재테스트하면 실제 새 감도가 적용된다.
    */

    testSensitivity = {
        dpi,
        general,
        ads,
        vertical,
        scope
    };

    console.log(
        "테스트 시작 감도값은? ===>", testSensitivity
    );

    testWeaponSetting = {
        weapon: weaponInput.value,
        sight,
        muzzle: muzzleInput.value,
        grip: gripInput.value,
        stance: stanceInput.value
    };

    console.log(
        "테스트 시작 총기 설정값은? ===>", testWeaponSetting
    );

    // 이번 테스트가 추천값 적용 후 재테스트인지 확인
    const currentSignature =
        getCurrentTestSignature();

    isRecommendationRetest =
        pendingRecommendationTest !== null &&
        pendingRecommendationTest.signature ===
            currentSignature &&
        pendingRecommendationTest.sight ===
            sight &&
        pendingRecommendationTest.ads ===
            ads &&
        Math.abs(
            pendingRecommendationTest.vertical -
            vertical
        ) < 0.001 &&
        (
            !sightData.magnified ||
            pendingRecommendationTest.scope ===
                scope
        );

    if (
        pendingRecommendationTest &&
        !isRecommendationRetest
    ) {
        pendingRecommendationTest = null;
    }

    currentRound = 0;
    currentBullet = 0;
    roundResults = [];

    resetResult();

    startBtn.disabled = true;
    startBtn.textContent = "TESTING...";

    feedback.textContent =
        "3회의 반동 테스트를 진행하고 있습니다.";

    testSessionActive = true;

    await enterFullscreenTest();

    updateResolutionUI();

    requestPointerLock();

    startNextRound();
});

// 결과 초기화
function resetResult() {
    resultX.textContent = "0";
    resultY.textContent = "0";

    averageDistanceText.textContent = "0";
    centerRateText.textContent = "0%";

    escapeCountText.textContent = "0회";
    outsideTimeText.textContent = "0.0초";
    outsideDistanceText.textContent = "0 px";
    returnTimeText.textContent = "0.00초";

    verticalControlText.textContent = "-";
    horizontalControlText.textContent = "-";
    stabilityText.textContent = "-";

    recommendGeneral.textContent = "-";
    recommendADS.textContent = "-";
    recommendVertical.textContent = "-";

    recommendGeneralState.textContent = "-";
    recommendADSState.textContent = "-";
    recommendVerticalState.textContent = "-";

    if (recommendScopeValue) {
        recommendScopeValue.textContent = "-";
        recommendScopeState.textContent = "-";
    }

    applyRecommendBtn.disabled = true;
    lastRecommendation = null;
}

// 현재 조준 감도
function getCurrentAimSensitivity() {
    const sight = SIGHTS[testWeaponSetting.sight];

    if (sight.magnified) {
        return testSensitivity.scope;
    }

    return testSensitivity.ads;
}

// 감도 배율
function getSensitivityMultiplier() {
    const aimSensitivity = getCurrentAimSensitivity();

    const sensitivityRatio =
        aimSensitivity / BASE_SENSITIVITY;

    const sightScale =
        SIGHTS[testWeaponSetting.sight].screenScale;

    return {
        horizontal:
            sensitivityRatio *
            sightScale,

        vertical:
            sensitivityRatio *
            testSensitivity.vertical *
            sightScale
    };
}

// 반동 프로필
function getCurrentRecoilProfile() {
    const weapon = WEAPONS[testWeaponSetting.weapon];
    const muzzle = MUZZLES[testWeaponSetting.muzzle];
    const grip = GRIPS[testWeaponSetting.grip];
    const stance = STANCES[testWeaponSetting.stance];
    const sight = SIGHTS[testWeaponSetting.sight];

    return {
        name: weapon.name,
        rpm: weapon.rpm,

        vertical:
            weapon.vertical *
            muzzle.vertical *
            grip.vertical *
            stance.vertical *
            sight.screenScale *
            VERTICAL_RECOIL_CALIBRATION,

        horizontal:
            weapon.horizontal *
            muzzle.horizontal *
            grip.horizontal *
            stance.horizontal *
            sight.screenScale *
            HORIZONTAL_RECOIL_CALIBRATION,

        buildup:
            weapon.buildup,

        horizontalChaos:
            weapon.horizontalChaos
    };
}

// 실제 화면 중앙 원 반지름
function getCenterRadius() {
    /*
        화면에 보이는 target_center를
        직접 측정한다.

        따라서 화면의 원과
        JS 판정 원이 완전히 동일하다.
    */

    return targetCenter.getBoundingClientRect().width / 2;
}

// ROUND 추적 초기화
function createRoundTracking() {
    return {
        lastTimestamp: null,
        lastInside: true,

        insideTime: 0,
        outsideTime: 0,

        escapeCount: 0,
        escapeStartTime: null,

        outsideDistanceTime: 0,
        maxOutsideDistance: 0,

        returnTimes: [],

        lastXSign: 0,
        lastYSign: 0,

        horizontalCrossings: 0,
        verticalCrossings: 0
    };
}

// ROUND 시작 카운트 다운
function startReadyCountdown () {
    let count = 3;
    countdownOverlay.textContent = count;
    countdownOverlay.classList.add (
        "show"
    );

    statusText.textContent = `TEST ${currentRound} READY`;
    console.log(
        "카운트다운 시작 ROUND값은? ===>", currentRound
    );

    function nextCount () {
        if (!testSessionActive) {
            countdownOverlay.classList.remove (
                "show"
            );

            countdownOverlay.textContent = "";

            return;
        }

        if (count > 1) {
            count--;
            countdownOverlay.textContent = count;
            nextRoundTimer = setTimeout (
                nextCount,
                1000
            );

            return;
        }

        // 1초 표시 후 바로 테스트 시작
        countdownOverlay.classList.remove (
            "show"
        );
        countdownOverlay.textContent = "";
        preparingRound = false;
        startRound();
    }

    nextRoundTimer = setTimeout (
        nextCount,
        1000
    );
}

// 다음 ROUND
function startNextRound() {
    if (!testSessionActive) {
        return;
    }

    preparingRound = true;
    currentRound++;

    roundText.textContent =
        `${currentRound} / ${TOTAL_ROUNDS}`;

    ammoText.textContent = 
        `0 / ${MAGAZINE_SIZE}`;

    statusText.textContent =
        `TEST ${currentRound} READY`;

    resetRedDot();

    const recoil = getCurrentRecoilProfile();
    const shotInterval = 60000 / recoil.rpm;

    const roundDuration =
        shotInterval *
        (MAGAZINE_SIZE - 1);

    timeText.textContent =
        (roundDuration / 1000).toFixed(1);

    startReadyCountdown();
}

// ROUND 시작
function startRound() {
    if (!testSessionActive) {
        return;
    }

    testing = true;
    preparingRound = false;

    aimArea.classList.add("testing");

    currentBullet = 0;

    dotX = 0;
    dotY = 0;

    aimSamples = [];

    mouseMovementCount = 0;
    totalMouseDistance = 0;
    totalVerticalMovement = 0;
    totalHorizontalMovement = 0;
    netMouseY = 0;

    roundTracking = createRoundTracking();

    resetRecoilRandom(currentRound);

    horizontalDirection =
        recoilRandom() < 0.5 ? -1 : 1;

    shotsUntilDirectionChange =
        recoilRandomInt(2, 5);

    const recoil = getCurrentRecoilProfile();
    const shotInterval = 60000 / recoil.rpm;

    const roundDuration =
        shotInterval *
        (MAGAZINE_SIZE - 1);
    console.log(
        `ROUND ${currentRound} 시작 반동 프로필값은? ===>`, recoil
    );
    console.log(
        `ROUND ${currentRound} 발사 시간값은? ===>`,
        {
            shotInterval,
            roundDuration,
            magazineSize:
                MAGAZINE_SIZE
        }
    );

    let remaining = roundDuration;

    statusText.textContent =
        `TEST ${currentRound} | 0 / ${MAGAZINE_SIZE}`;

    fireBullet();

    shotTimer = setInterval(() => {
        fireBullet();

        if (currentBullet >= MAGAZINE_SIZE) {
            clearInterval(shotTimer);
            clearInterval(countdownTimer);
            clearTimeout(roundTimer);

            timeText.textContent = "0.0";

            endRound();
        }
    }, shotInterval);

    countdownTimer = setInterval(() => {
        remaining -= 50;

        if (remaining < 0) {
            remaining = 0;
        }

        timeText.textContent =
            (remaining / 1000).toFixed(1);
    }, 50);

    roundTimer = setTimeout(() => {
        if(testing) {
            endRound();
        }
    }, roundDuration + 1000);
}

// 연사 반동 증가
function getBurstMultiplier(bullet, weapon) {
    let multiplier;

    if (bullet <= 4) {
        multiplier =
            0.88 +
            (bullet - 1) * 0.035;
    } else if (bullet <= 10) {
        multiplier =
            1.00 +
            (bullet - 5) * 0.022;
    } else if (bullet <= 20) {
        multiplier =
            1.13 +
            (bullet - 11) * 0.013;
    } else {
        multiplier =
            1.25 +
            (bullet - 21) * 0.006;
    }

    return 1 +
        (multiplier - 1) *
        weapon.buildup;
}

// 한 발 발사
function fireBullet() {
    if (
        !testing ||
        currentBullet >= MAGAZINE_SIZE
    ) {
        return;
    }

    const recoil = getCurrentRecoilProfile();

    currentBullet++;

    ammoText.textContent =
        `${currentBullet} / ${MAGAZINE_SIZE}`;

    const burstMultiplier =
        getBurstMultiplier(
            currentBullet,
            recoil
        );

    // 수직 반동
    const verticalRandom =
        recoilAverageRandom(
            0.88,
            1.14
        );

    const verticalKick =
        recoil.vertical *
        burstMultiplier *
        verticalRandom;

    // 좌우 반동
    shotsUntilDirectionChange--;

    if (shotsUntilDirectionChange <= 0) {
        if (recoilRandom() < 0.78) {
            horizontalDirection *= -1;
        }

        shotsUntilDirectionChange =
            recoilRandomInt(2, 6);
    }

    const horizontalRandom =
        recoilAverageRandom(
            0.60,
            1.38
        );

    const horizontalNoise =
        recoilRandomRange(
            -0.35,
            0.35
        ) *
        recoil.horizontal;

    const horizontalKick =
        (
            recoil.horizontal *
            horizontalRandom *
            horizontalDirection *
            recoil.horizontalChaos
        ) +
        horizontalNoise;
    
    const resolutionScale = getResolutionScale();
    
    dotY -= verticalKick * resolutionScale;
    dotX += horizontalKick * resolutionScale;
    console.log(
        `ROUND ${currentRound} / BULLET ${currentBullet} 반동값은? ===>`,
        {
            verticalKick,
            horizontalKick,
            dotX,
            dotY
        }
    );

    statusText.textContent =
        `TEST ${currentRound} | ${currentBullet} / ${MAGAZINE_SIZE}`;

    updateRedDot();
}

// 마우스 입력
document.addEventListener("mousemove", (e) => {
    if (!testing) {
        return;
    }

    const moveX = e.movementX;
    const moveY = e.movementY;

    if (
        Math.abs(moveX) > 250 ||
        Math.abs(moveY) > 250
    ) {
        return;
    }

    if (moveX !== 0 || moveY !== 0) {
        mouseMovementCount++;
    }

    totalMouseDistance +=
        Math.sqrt(
            moveX * moveX +
            moveY * moveY
        );

    totalHorizontalMovement +=
        Math.abs(moveX);

    totalVerticalMovement +=
        Math.abs(moveY);

    // 아래 방향은 양수
    netMouseY += moveY;

    const sensitivity =
        getSensitivityMultiplier();

    const resolutionScale =
        getResolutionScale();

    dotX +=
        moveX *
        MOUSE_INPUT_SCALE *
        sensitivity.horizontal *
        resolutionScale;

    dotY +=
        moveY *
        MOUSE_INPUT_SCALE *
        sensitivity.vertical *
        resolutionScale;

    updateRedDot();
});

// AIM 분석 LOOP
function sampleLoop(timestamp) {
    if (testing && roundTracking) {
        const centerRadius =
            getCenterRadius();

        const distance =
            Math.sqrt(
                dotX * dotX +
                dotY * dotY
            );

        const inside =
            distance <= centerRadius;

        const excessDistance =
            Math.max(
                0,
                distance - centerRadius
            );

        const previousTimestamp =
            roundTracking.lastTimestamp;

        if (previousTimestamp !== null) {
            const delta =
                Math.min(
                    timestamp - previousTimestamp,
                    100
                );

            if (roundTracking.lastInside) {
                roundTracking.insideTime += delta;
            } else {
                roundTracking.outsideTime += delta;

                roundTracking.outsideDistanceTime +=
                    excessDistance *
                    delta;
            }
        }

        // 원 안 → 원 밖
        if (
            roundTracking.lastInside &&
            !inside
        ) {
            roundTracking.escapeCount++;

            roundTracking.escapeStartTime =
                timestamp;
        }

        // 원 밖 → 원 안
        if (
            !roundTracking.lastInside &&
            inside &&
            roundTracking.escapeStartTime !== null
        ) {
            roundTracking.returnTimes.push(
                timestamp -
                roundTracking.escapeStartTime
            );

            roundTracking.escapeStartTime =
                null;
        }

        if (!inside) {
            roundTracking.maxOutsideDistance =
                Math.max(
                    roundTracking.maxOutsideDistance,
                    excessDistance
                );
        }

        // 좌우 중앙 교차 횟수
        const xSign =
            Math.sign(dotX);

        if (
            xSign !== 0 &&
            roundTracking.lastXSign !== 0 &&
            xSign !== roundTracking.lastXSign
        ) {
            roundTracking.horizontalCrossings++;
        }

        if (xSign !== 0) {
            roundTracking.lastXSign =
                xSign;
        }

        // 위아래 중앙 교차 횟수
        const ySign =
            Math.sign(dotY);

        if (
            ySign !== 0 &&
            roundTracking.lastYSign !== 0 &&
            ySign !== roundTracking.lastYSign
        ) {
            roundTracking.verticalCrossings++;
        }

        if (ySign !== 0) {
            roundTracking.lastYSign =
                ySign;
        }

        roundTracking.lastTimestamp =
            timestamp;

        roundTracking.lastInside =
            inside;

        aimSamples.push({
            x: dotX,
            y: dotY,
            distance,
            inside,
            timestamp
        });
    }

    requestAnimationFrame(
        sampleLoop
    );
}

requestAnimationFrame(
    sampleLoop
);

// RED DOT
function updateRedDot() {
    const maxX =
        aimArea.clientWidth / 2 - 15;

    const maxY =
        aimArea.clientHeight / 2 - 15;

    const displayX =
        clamp(
            dotX,
            -maxX,
            maxX
        );

    const displayY =
        clamp(
            dotY,
            -maxY,
            maxY
        );

    redDot.style.transform = `
        translate(
            calc(-50% + ${displayX}px),
            calc(-50% + ${displayY}px)
        )
    `;
}

function resetRedDot() {
    dotX = 0;
    dotY = 0;

    redDot.style.transform =
        "translate(-50%, -50%)";
}

// ROUND 추적 마무리
function finalizeRoundTracking(timestamp) {
    if (
        !roundTracking ||
        roundTracking.lastTimestamp === null
    ) {
        return;
    }

    const delta =
        Math.min(
            timestamp -
            roundTracking.lastTimestamp,
            100
        );

    if (roundTracking.lastInside) {
        roundTracking.insideTime +=
            delta;
    } else {
        roundTracking.outsideTime +=
            delta;

        const centerRadius =
            getCenterRadius();

        const distance =
            Math.sqrt(
                dotX * dotX +
                dotY * dotY
            );

        roundTracking.outsideDistanceTime +=
            Math.max(
                0,
                distance - centerRadius
            ) *
            delta;
    }

    /*
        테스트 종료 순간까지 원 밖이면
        복귀하지 못한 시간 역시 복귀시간에 포함.
    */

    if (
        !roundTracking.lastInside &&
        roundTracking.escapeStartTime !== null
    ) {
        roundTracking.returnTimes.push(
            timestamp -
            roundTracking.escapeStartTime
        );

        roundTracking.escapeStartTime =
            null;
    }
}

// ROUND 종료
function endRound() {
    if (!testing) {
        return;
    }

    finalizeRoundTracking(
        performance.now()
    );

    testing = false;

    aimArea.classList.remove(
        "testing"
    );

    clearInterval(shotTimer);
    clearInterval(countdownTimer);
    clearTimeout(roundTimer);

    timeText.textContent =
        "0.0";

    saveRoundResult();

    if (
        currentRound <
        TOTAL_ROUNDS
    ) {
        statusText.textContent =
            `TEST ${currentRound} COMPLETE`;

        nextRoundTimer =
            setTimeout(() => {
                startNextRound();
            }, 1200);
    } else {
        finishAllTests();
    }
}

// ROUND 결과 저장
function saveRoundResult() {
    if (
        aimSamples.length === 0 ||
        !roundTracking
    ) {
        return;
    }

    let horizontalError = 0;
    let verticalError = 0;

    let verticalDirection = 0;
    let horizontalDirectionAverage = 0;

    let totalDistance = 0;

    aimSamples.forEach((sample) => {
        horizontalError +=
            Math.abs(sample.x);

        verticalError +=
            Math.abs(sample.y);

        verticalDirection +=
            sample.y;

        horizontalDirectionAverage +=
            sample.x;

        totalDistance +=
            sample.distance;
    });

    const count =
        aimSamples.length;

    const totalTrackedTime =
        roundTracking.insideTime +
        roundTracking.outsideTime;

    const resolutionScale = getResolutionScale();

    const centerRate =
        totalTrackedTime > 0
            ? (
                roundTracking.insideTime /
                totalTrackedTime
            ) * 100
            : 0;

    const averageOutsideDistance =
        roundTracking.outsideTime > 0
            ? roundTracking.outsideDistanceTime /
              roundTracking.outsideTime
            : 0;

    const returnTimeSum =
        roundTracking.returnTimes.reduce(
            (sum, time) =>
                sum + time,
            0
        );

    roundResults.push({
        horizontalError:
        (horizontalError / count) / resolutionScale,

        verticalError:
            (verticalError / count) / resolutionScale,

        verticalDirection:
            (verticalDirection / count) / resolutionScale,

        horizontalDirection:
            (horizontalDirectionAverage / count) / resolutionScale,

        averageDistance:
            (totalDistance / count) / resolutionScale,

        centerRate,

        escapeCount:
            roundTracking.escapeCount,

        insideTime:
            roundTracking.insideTime,

        outsideTime:
            roundTracking.outsideTime,

        outsideDistanceTime:
            roundTracking.outsideDistanceTime / resolutionScale,

        averageOutsideDistance :
            averageOutsideDistance / resolutionScale,

        maxOutsideDistance:
            roundTracking.maxOutsideDistance / resolutionScale,

        returnTimeSum,

        returnCount:
            roundTracking.returnTimes.length,

        horizontalCrossings:
            roundTracking.horizontalCrossings,

        verticalCrossings:
            roundTracking.verticalCrossings,

        mouseMovementCount,
        totalMouseDistance,
        totalHorizontalMovement,
        totalVerticalMovement,
        netMouseY
    });
    console.log(
        `ROUND ${currentRound} 결과값은? ===>`,
        roundResults[
            roundResults.length - 1
        ]
    );
}

// 전체 테스트 완료
async function finishAllTests() {
    testing = false;
    preparingRound = false;
    testSessionActive = false;

    clearInterval(shotTimer);
    clearInterval(countdownTimer);
    clearTimeout(roundTimer);
    clearTimeout(nextRoundTimer);

    aimArea.classList.remove(
        "testing"
    );

    if (document.pointerLockElement) {
        document.exitPointerLock();
    }

    statusText.textContent =
        "ALL TEST COMPLETE";

    startBtn.disabled =
        false;

    startBtn.textContent =
        "RESTART TEST";
    console.log(
        "전체 ROUND 결과값은? ===>",
        roundResults
    );

    analyzeAverage();

    await exitFullscreenTest();

    setTimeout(() => {
        document
            .querySelector(".result")
            ?.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });
    }, 150);
}

// 조정 강도
function getAdjustmentStrength(
    centerRate,
    outsideDistance,
    returnTime
) {
    /*
        중앙 유지율이 낮을수록
        감도를 더 크게 변경한다.
    */

    let strength;

    if (centerRate >= 85) {
        strength = 0;
    } else if (centerRate >= 70) {
        strength = 0.03;
    } else if (centerRate >= 55) {
        strength = 0.06;
    } else if (centerRate >= 40) {
        strength = 0.10;
    } else {
        strength = 0.15;
    }

    /*
        원 밖에서 지나치게 멀리 벗어나거나
        복귀 시간이 길면 최소 조정 강도를 올린다.
    */

    if (
        outsideDistance >= 50 ||
        returnTime >= 900
    ) {
        strength =
            Math.max(
                strength,
                0.15
            );
    } else if (
        outsideDistance >= 30 ||
        returnTime >= 650
    ) {
        strength =
            Math.max(
                strength,
                0.10
            );
    } else if (
        outsideDistance >= 18 ||
        returnTime >= 450
    ) {
        strength =
            Math.max(
                strength,
                0.06
            );
    }

    return Math.min(
        strength,
        0.15
    );
}

// 평균 분석
function analyzeAverage() {
    if (
        roundResults.length === 0
    ) {
        feedback.textContent =
            "테스트 데이터를 측정하지 못했습니다.";

        return;
    }

    let horizontalError = 0;
    let verticalError = 0;

    let verticalDirection = 0;
    let horizontalDirectionAverage = 0;

    let averageDistance = 0;
    let centerRate = 0;

    let escapeCount = 0;

    let outsideTime = 0;
    let outsideDistanceTime = 0;

    let maxOutsideDistance = 0;

    let returnTimeSum = 0;
    let returnCount = 0;

    let horizontalCrossings = 0;
    let verticalCrossings = 0;

    let totalMovement = 0;
    let totalHorizontal = 0;
    let totalVertical = 0;
    let netVerticalInput = 0;

    roundResults.forEach((result) => {
        horizontalError +=
            result.horizontalError;

        verticalError +=
            result.verticalError;

        verticalDirection +=
            result.verticalDirection;

        horizontalDirectionAverage +=
            result.horizontalDirection;

        averageDistance +=
            result.averageDistance;

        centerRate +=
            result.centerRate;

        escapeCount +=
            result.escapeCount;

        outsideTime +=
            result.outsideTime;

        outsideDistanceTime +=
            result.outsideDistanceTime;

        maxOutsideDistance =
            Math.max(
                maxOutsideDistance,
                result.maxOutsideDistance
            );

        returnTimeSum +=
            result.returnTimeSum;

        returnCount +=
            result.returnCount;

        horizontalCrossings +=
            result.horizontalCrossings;

        verticalCrossings +=
            result.verticalCrossings;

        totalMovement +=
            result.totalMouseDistance;

        totalHorizontal +=
            result.totalHorizontalMovement;

        totalVertical +=
            result.totalVerticalMovement;

        netVerticalInput +=
            result.netMouseY;
    });

    const count =
        roundResults.length;

    const avgHorizontal =
        horizontalError / count;

    const avgVertical =
        verticalError / count;

    const avgVerticalDirection =
        verticalDirection / count;

    const avgHorizontalDirection =
        horizontalDirectionAverage / count;

    const avgDistance =
        averageDistance / count;

    const avgCenterRate =
        centerRate / count;

    const avgOutsideDistance =
        outsideTime > 0
            ? outsideDistanceTime /
              outsideTime
            : 0;

    const avgReturnTime =
        returnCount > 0
            ? returnTimeSum /
              returnCount
            : 0;

    const horizontalCrossingsPerRound =
        horizontalCrossings /
        count;

    const verticalCrossingsPerRound =
        verticalCrossings /
        count;

    console.log(
        "전체 평균 분석값은? ===>",
        {
            avgHorizontal,
            avgVertical,
            avgVerticalDirection,
            avgHorizontalDirection,
            avgDistance,
            avgCenterRate,
            avgOutsideDistance,
            avgReturnTime,
            horizontalCrossingsPerRound,
            verticalCrossingsPerRound,
            totalMovement,
            totalHorizontal,
            totalVertical,
            netVerticalInput
        }
    );

    // 결과 출력
    resultX.textContent =
        `${avgHorizontal.toFixed(1)} px`;

    resultY.textContent =
        `${avgVertical.toFixed(1)} px`;

    averageDistanceText.textContent =
        `${avgDistance.toFixed(1)} px`;

    centerRateText.textContent =
        `${avgCenterRate.toFixed(0)}%`;

    escapeCountText.textContent =
        `${escapeCount}회`;

    outsideTimeText.textContent =
        `${(outsideTime / 1000).toFixed(1)}초`;

    outsideDistanceText.textContent =
        `${avgOutsideDistance.toFixed(1)} px`;

    returnTimeText.textContent =
        `${(avgReturnTime / 1000).toFixed(2)}초`;

    // 입력 여부 확인
    if (
        totalMovement <
            NO_INPUT_DISTANCE ||
        totalVertical <
            NO_VERTICAL_INPUT ||
        netVerticalInput <
            MIN_NET_DOWNWARD_INPUT
    ) {
        verticalControlText.textContent =
            "측정 불가";

        horizontalControlText.textContent =
            "측정 불가";

        stabilityText.textContent =
            "측정 불가";

        recommendGeneral.textContent = "-";
        recommendADS.textContent = "-";
        recommendVertical.textContent = "-";

        recommendGeneralState.textContent = "-";
        recommendADSState.textContent = "-";
        recommendVerticalState.textContent = "-";

        if (recommendScopeValue) {
            recommendScopeValue.textContent = "-";
            recommendScopeState.textContent = "-";
        }

        feedback.textContent =
            "충분한 반동 제어 입력이 감지되지 않았습니다. " +
            "빨간 점이 중앙 원 안에 머물도록 실제 PUBG처럼 마우스를 아래로 끌어내리면서 다시 테스트해주세요.";

        comparisonText.textContent =
            "정상적인 테스트 데이터가 없어 이전 기록과 비교하지 않습니다.";

        applyRecommendBtn.disabled =
            true;
        
        console.log(
            "입력 부족 판정값은? ===>",
            {
                totalMovement,
                totalVertical,
                netVerticalInput,
                NO_INPUT_DISTANCE,
                NO_VERTICAL_INPUT,
                MIN_NET_DOWNWARD_INPUT
            }
        );

        return;
    }

    // 제어 상태
    let verticalState;
    let horizontalState;
    let overallState;

    if (
        avgVertical <= 16 &&
        avgCenterRate >= 85
    ) {
        verticalState =
            "매우 안정적";
    } else if (
        avgVertical <= 32 &&
        avgCenterRate >= 70
    ) {
        verticalState =
            "안정적";
    } else if (
        avgVertical <= 55
    ) {
        verticalState =
            "보통";
    } else {
        verticalState =
            "조정 필요";
    }

    if (
        avgHorizontal <= 14 &&
        avgCenterRate >= 85
    ) {
        horizontalState =
            "매우 안정적";
    } else if (
        avgHorizontal <= 28 &&
        avgCenterRate >= 70
    ) {
        horizontalState =
            "안정적";
    } else if (
        avgHorizontal <= 48
    ) {
        horizontalState =
            "보통";
    } else {
        horizontalState =
            "조정 필요";
    }

    if (
        avgCenterRate >= 85 &&
        avgOutsideDistance <= 12
    ) {
        overallState =
            "매우 안정적";
    } else if (
        avgCenterRate >= 70 &&
        avgOutsideDistance <= 25
    ) {
        overallState =
            "안정적";
    } else if (
        avgCenterRate >= 50
    ) {
        overallState =
            "보통";
    } else {
        overallState =
            "조정 필요";
    }

    verticalControlText.textContent =
        verticalState;

    horizontalControlText.textContent =
        horizontalState;

    stabilityText.textContent =
        overallState;
    console.log(
        "제어 상태 판정값은? ===>",
        {
            verticalState,
            horizontalState,
            overallState
        }
    );
    
    // 현재 설정
    const currentGeneral =
        testSensitivity.general;

    const currentADS =
        testSensitivity.ads;

    const currentVertical =
        testSensitivity.vertical;

    const magnified =
        SIGHTS[
            testWeaponSetting.sight
        ].magnified;

    const currentScope =
        testSensitivity.scope;

    let newGeneral =
        currentGeneral;

    let newADS =
        currentADS;

    let newVertical =
        currentVertical;

    let newScope =
        currentScope;

    // 조정 강도
    const strength =
        getAdjustmentStrength(
            avgCenterRate,
            avgOutsideDistance,
            avgReturnTime
        );

    const centerRadius =
        getCenterRadius() / getResolutionScale();

    const verticalDeadzone =
        centerRadius * 0.35;
    
    console.log(
        "감도 조정 기준값은? ===>",
        {
            strength,
            centerRadius,
            verticalDeadzone
        }
    );

    // 수직 감도
    /*
        평균 위치가 위
        → 마우스를 충분히 못 내림
        → 수직 감도 증가
    */

    if (
        avgVerticalDirection <
        -verticalDeadzone
    ) {
        newVertical *=
            1 + strength;
    }

    /*
        평균 위치가 아래
        → 과하게 내림
        → 수직 감도 감소
    */

    else if (
        avgVerticalDirection >
        verticalDeadzone
    ) {
        newVertical *=
            1 - strength;
    }

    /*
        평균 위치는 중앙인데
        위아래를 계속 크게 왕복한다면
        감도가 조금 높은 가능성
    */

    else if (
        avgVertical > centerRadius * 1.7 &&
        verticalCrossingsPerRound >= 8
    ) {
        newVertical *=
            1 -
            Math.min(
                strength * 0.5,
                0.06
            );
    }

    // ADS / 배율 감도
    const movementRatio =
        totalHorizontal /
        Math.max(
            totalVertical,
            1
        );
    
    // 좌우 감도를 왜 조정했는지 저장
    let horizontalAdjustmentReason = "none";
    
    const horizontalProblem =
        avgHorizontal > centerRadius * 0.85 || (
            avgCenterRate < 70 && avgHorizontal > centerRadius * 0.60
        );

    if (horizontalProblem) {
        const aimStrength =
            Math.min(
                Math.max(
                    strength * 0.65,
                    0.02
                ),
                0.10
            );

        /*
            좌우 중앙을 반복적으로 많이 넘김
            또는 좌우 마우스 움직임이 지나치게 많음

            → 좌우 과보정 가능성
            → 감도 감소
        */

        if (
            horizontalCrossingsPerRound >= 8 ||
            movementRatio >= 0.70
        ) {
            horizontalAdjustmentReason = "overCorrection";
            if (magnified) {
                newScope *=
                    1 - aimStrength;
            } else {
                newADS *=
                    1 - aimStrength;
            }
        }

        /*
            좌우 움직임은 적고
            중앙 복귀가 느린 경우

            → 보정 반응이 부족한 가능성
            → 감도 소폭 증가
        */

        else if (
            avgReturnTime >= 550 &&
            movementRatio < 0.35
        ) {
            horizontalAdjustmentReason = "underResponse";
            const increase =
                Math.min(
                    aimStrength,
                    0.08
                );

            if (magnified) {
                newScope *=
                    1 + increase;
            } else {
                newADS *=
                    1 + increase;
            }
        }

        /*
            방향이 명확하지 않지만
            중앙 유지율이 심각하게 낮으면
            미세하게 감도를 낮춰 안정성을 우선.
        */

        else if (
            avgCenterRate < 50
        ) {
            horizontalAdjustmentReason = "lowStability";
            const safeAdjustment =
                Math.min(
                    strength * 0.35,
                    0.05
                );

            if (magnified) {
                newScope *=
                    1 - safeAdjustment;
            } else {
                newADS *=
                    1 - safeAdjustment;
            }
        } else {
             /*
            좌우 이탈은 확인됐지만
            과보정/보정 부족 방향이 명확하지 않은 경우

            한쪽으로 치우쳐 있으면
            좌우 보정 반응 부족 가능성 → 감도 소폭 증가

            한쪽 치우침이 크지 않으면
            좌우 흔들림 안정화를 위해 → 감도 소폭 감소
            */
           const horizontalFineAdjustment = 
                Math.min (
                    Math.max (
                        aimStrength * 0.5, 0.02
                    ), 0.04
                );
            
            const horizontalBias = 
            Math.abs (
                avgHorizontalDirection
            );

            if (
                horizontalBias > centerRadius * 0.30
            ) {
                horizontalAdjustmentReason = "oneSideBias";
                // 한쪽으로 계속 밀림 -> 좌우 보정 반응 부족
                if (magnified) {
                    newScope *= 1 + horizontalFineAdjustment;
                } else {
                    newADS *= 1 + horizontalFineAdjustment;
                }
            } else {
                horizontalAdjustmentReason = "oscillation";
                // 좌우로 흔들리지만 한쪽 편향은 크지않음 -> 안정성을 위해 감도 감소
                if (magnified) {
                    newScope *= 1 - horizontalFineAdjustment;
                } else {
                    newADS *= 1 - horizontalFineAdjustment;
                }
            }
        }
    }

    console.log(
        "좌우 감도 분석값은? ===>",
        {
            horizontalProblem,
            horizontalAdjustmentReason,
            movementRatio,
            avgHorizontalDirection,
            horizontalCrossingsPerRound
        }
    );

    // 값 제한
    newVertical =
        clamp(
            newVertical,
            0.1,
            2
        );

    newADS =
        clamp(
            newADS,
            1,
            100
        );

    if (magnified) {
        newScope =
            clamp(
                newScope,
                1,
                100
            );
    }

    console.log(
        "최종 감도 추천 계산값은? ===>",
        {
            currentGeneral,
            currentADS,
            currentVertical,
            currentScope,
            newGeneral,
            newADS,
            newVertical,
            newScope,
            horizontalAdjustmentReason
        }
    );

    // 추천 출력
    showRecommendations(
        newGeneral,
        newADS,
        newVertical,
        newScope
    );

    // 이전 테스트 비교
    const signature =
        getCurrentTestSignature();

    let comparisonMessage =
        "동일한 총기 설정의 이전 테스트 기록이 없습니다.";

    if (
        previousTestSummary &&
        previousTestSummary.signature === signature
    ) {
        // 높을수록 좋은 값
        const centerDifference =
            avgCenterRate -
            previousTestSummary.centerRate;

        // 낮을수록 좋은 값
        const verticalImprovement =
            previousTestSummary.verticalError -
            avgVertical;

        const horizontalImprovement =
            previousTestSummary.horizontalError -
            avgHorizontal;

        const returnTimeImprovement =
            previousTestSummary.returnTime -
            avgReturnTime;

        let improvementScore = 0;

        // 중앙 유지율
        if (centerDifference >= 3) {
            improvementScore++;
        } else if (centerDifference <= -3) {
            improvementScore--;
        }

        // 수직 오차
        if (verticalImprovement >= 3) {
            improvementScore++;
        } else if (verticalImprovement <= -3) {
            improvementScore--;
        }

        // 수평 오차
        if (horizontalImprovement >= 3) {
            improvementScore++;
        } else if (horizontalImprovement <= -3) {
            improvementScore--;
        }

        // 복귀 시간
        if (returnTimeImprovement >= 80) {
            improvementScore++;
        } else if (returnTimeImprovement <= -80) {
            improvementScore--;
        }

        console.log(
            "이전 테스트 비교 계산값은? ===>",
            {
                centerDifference,
                verticalImprovement,
                horizontalImprovement,
                returnTimeImprovement,
                improvementScore,
                isRecommendationRetest
            }
        );

        /*
            추천값을 실제 적용한 뒤
            다시 테스트한 경우
        */
        if (isRecommendationRetest) {
            if (improvementScore >= 2) {
                comparisonMessage =
                    "추천 감도 검증 성공 - 이전 감도보다 전체적인 반동 제어가 향상되었습니다. 현재 감도를 기준으로 추가 미세 조정을 진행할 수 있습니다.";
            } else if (improvementScore <= -2) {
                comparisonMessage =
                    "추천 감도 검증 실패 - 이전 감도보다 전체적인 반동 제어가 불안정해졌습니다. 현재 추천값을 그대로 유지하기보다는 이전 감도로 돌아가거나 다시 조정하는 것을 추천합니다.";
            } else {
                comparisonMessage =
                    "추천 감도 검증 보류 - 이전 감도와 현재 감도의 성능 차이가 크지 않습니다. 현재 결과만으로 감도 우위를 판단하기 어려우므로 한 번 더 테스트하는 것을 추천합니다.";
            }
        }

        /*
            추천값 재테스트가 아닌
            일반적인 연속 테스트
        */
        else {
            if (improvementScore >= 2) {
                comparisonMessage =
                    "이전 테스트보다 전체적인 반동 제어가 향상되었습니다. ";
            } else if (improvementScore <= -2) {
                comparisonMessage =
                    "이전 테스트보다 전체적인 반동 제어가 감소했습니다. ";
            } else {
                comparisonMessage =
                    "이전 테스트와 전체적인 제어 성능이 비슷합니다. ";
            }
        }

        comparisonMessage +=
            `중앙 유지율 ${previousTestSummary.centerRate.toFixed(0)}% → ${avgCenterRate.toFixed(0)}%, ` +
            `수직 오차 ${previousTestSummary.verticalError.toFixed(1)} → ${avgVertical.toFixed(1)}px, ` +
            `수평 오차 ${previousTestSummary.horizontalError.toFixed(1)} → ${avgHorizontal.toFixed(1)}px, ` +
            `복귀 시간 ${(previousTestSummary.returnTime / 1000).toFixed(2)} → ${(avgReturnTime / 1000).toFixed(2)}초`;
    }

    comparisonText.textContent =
        comparisonMessage;

    console.log(
        "이전 테스트 비교 결과값은? ===>",
        comparisonMessage
    );
    

    previousTestSummary = {
        signature,

        // 분석 결과
        centerRate : avgCenterRate,
        horizontalError : avgHorizontal,
        verticalError : avgVertical,
        averageDistance : avgDistance,
        outsideDistance : avgOutsideDistance,
        returnTime : avgReturnTime,

        // 당시 감도
        general : currentGeneral,
        ads : currentADS,
        vertical : currentVertical,
        scope : currentScope
    };

    // 최근 테스트 기록 저장
    const currentSightData =
        SIGHTS[
            testWeaponSetting.sight
        ];

    const historyAimSensitivityName =
        currentSightData.magnified
            ? `${currentSightData.name} 감도`
            : "스코프 모드 감도";

    const historyAimSensitivity =
        currentSightData.magnified
            ? currentScope
            : currentADS;

    const historyRecommendedAimSensitivity =
        currentSightData.magnified
            ? Math.round(newScope)
            : Math.round(newADS);

    saveTestHistory({
        timestamp: Date.now(),

        dpi:
            testSensitivity.dpi,

        verticalCalibration:
            VERTICAL_RECOIL_CALIBRATION,
        
        horizontalCalibration:
            HORIZONTAL_RECOIL_CALIBRATION,

        weaponName:
            WEAPONS[
                testWeaponSetting.weapon
            ].name,

        sightName:
            currentSightData.name,

        muzzleName:
            getMuzzleName(
                testWeaponSetting.muzzle
            ),

        gripName:
            getGripName(
                testWeaponSetting.grip
            ),

        stanceName:
            getStanceName(
                testWeaponSetting.stance
            ),

        aimSensitivityName:
            historyAimSensitivityName,

        aimSensitivity:
            Math.round(
                historyAimSensitivity
            ),

        vertical:
            currentVertical,

        centerRate:
            avgCenterRate,

        horizontalError:
            avgHorizontal,

        verticalError:
            avgVertical,

        returnTime:
            avgReturnTime,

        recommendedAimSensitivity:
            historyRecommendedAimSensitivity,

        recommendedVertical:
            newVertical
    });

    // 추천값 검증 테스트가 끝났으면 상태 초기화
    if (isRecommendationRetest) {
        pendingRecommendationTest = null;
        isRecommendationRetest = false;
    }

    // 피드백
    let message = "";

    /*
        일반 감도는 실제로 추천한 것이 아니라
        현재값 유지라는 점을 명확히 표시.
    */

    message +=
        `일반 감도 ${currentGeneral}은 현재 ADS 반동 테스트의 측정 대상이 아니므로 현재값을 유지합니다. `;

    if (avgCenterRate >= 85) {
        message +=
            `중앙 유지율이 ${avgCenterRate.toFixed(0)}%로 매우 안정적입니다. `;
    } else if (avgCenterRate >= 70) {
        message +=
            `중앙 유지율은 ${avgCenterRate.toFixed(0)}%로 안정적인 편이지만 일부 이탈이 확인됩니다. `;
    } else if (avgCenterRate >= 50) {
        message +=
            `중앙 유지율이 ${avgCenterRate.toFixed(0)}%로 감도 미세 조정이 필요합니다. `;
    } else {
        message +=
            `중앙 유지율이 ${avgCenterRate.toFixed(0)}%로 낮고 중앙 이탈이 많아 감도 조정이 필요합니다. `;
    }

    if (
        avgVerticalDirection <
        -verticalDeadzone
    ) {
        message +=
            `조준점이 주로 중앙보다 위에 남아 수직 보정량이 부족합니다. 수직 감도를 ${currentVertical.toFixed(2)}에서 ${newVertical.toFixed(2)}로 올리는 것을 추천합니다. `;
    } else if (
        avgVerticalDirection >
        verticalDeadzone
    ) {
        message +=
            `조준점이 주로 중앙 아래로 내려가 수직 과보정 경향이 있습니다. 수직 감도를 ${currentVertical.toFixed(2)}에서 ${newVertical.toFixed(2)}로 낮추는 것을 추천합니다. `;
    } else {
        message +=
            "수직 방향의 평균 보정량은 비교적 균형이 맞습니다. ";
    }

    // 좌우 제어 분석 피드백
    const aimSensitivityName =
        magnified
            ? `${SIGHTS[testWeaponSetting.sight].name} 감도`
            : "스코프 모드 감도";

    const currentAimSensitivity =
        magnified
            ? Math.round(currentScope)
            : Math.round(currentADS);

    const recommendedAimSensitivity =
        magnified
            ? Math.round(newScope)
            : Math.round(newADS);

    // 실제 게임 입력 단위에서 값이 달라졌을 때
    if (
        currentAimSensitivity !==
        recommendedAimSensitivity
    ) {
        if (
            horizontalAdjustmentReason ===
            "overCorrection"
        ) {
            message +=
                `좌우 중앙을 반복적으로 넘거나 좌우 보정량이 큰 과보정 경향이 확인됩니다. ` +
                `${aimSensitivityName}를 ${currentAimSensitivity}에서 ${recommendedAimSensitivity}로 낮춰 좌우 흔들림을 줄이는 것을 추천합니다.`;
        }

        else if (
            horizontalAdjustmentReason ===
            "underResponse"
        ) {
            message +=
                `좌우 보정 움직임이 적고 중앙 복귀가 느려 좌우 반응이 부족한 경향이 확인됩니다. ` +
                `${aimSensitivityName}를 ${currentAimSensitivity}에서 ${recommendedAimSensitivity}로 높여 중앙 복귀 반응을 개선하는 것을 추천합니다.`;
        }

        else if (
            horizontalAdjustmentReason ===
            "lowStability"
        ) {
            message +=
                `좌우 오차와 낮은 중앙 유지율이 함께 확인되어 좌우 제어 안정성이 부족합니다. ` +
                `${aimSensitivityName}를 ${currentAimSensitivity}에서 ${recommendedAimSensitivity}로 낮춰 안정성을 높이는 것을 추천합니다.`;
        }

        else if (
            horizontalAdjustmentReason ===
            "oneSideBias"
        ) {
            message +=
                `조준점이 한쪽으로 치우치는 경향이 확인되어 좌우 보정 반응이 부족할 가능성이 있습니다. ` +
                `${aimSensitivityName}를 ${currentAimSensitivity}에서 ${recommendedAimSensitivity}로 높여 좌우 보정 반응을 개선하는 것을 추천합니다.`;
        }

        else if (
            horizontalAdjustmentReason ===
            "oscillation"
        ) {
            message +=
                `좌우 이탈이 확인되며 한쪽 편향보다는 좌우 왕복 흔들림이 두드러집니다. ` +
                `${aimSensitivityName}를 ${currentAimSensitivity}에서 ${recommendedAimSensitivity}로 낮춰 좌우 움직임을 안정시키는 것을 추천합니다.`;
        }

        else {
            message +=
                `${aimSensitivityName}를 ${currentAimSensitivity}에서 ${recommendedAimSensitivity}로 조정하는 것을 추천합니다.`;
        }
    }

    // 내부적으로 문제가 감지됐어도
    // 게임 입력 단위에서 값이 같다면 유지
    else {
        if (
            horizontalProblem &&
            horizontalAdjustmentReason !== "none"
        ) {
            message +=
                `좌우 제어에서 미세한 조정 필요성이 감지되었지만 변경 폭이 작아 ${aimSensitivityName}는 현재값 ${currentAimSensitivity}을 유지합니다.`;
        } else {
            message +=
                `${aimSensitivityName}는 현재값을 유지합니다.`;
        }
    }

    feedback.textContent =
        avgCenterRate >= 85
            ? "현재 감도 유지 또는 미세 조정 - " + message
            : "감도 조정 추천 - " + message;
}

// 추천 출력
function showRecommendations(
    general,
    ads,
    vertical,
    scope
) {
    recommendGeneral.textContent =
        Math.round(general);

    recommendADS.textContent =
        Math.round(ads);

    recommendVertical.textContent =
        vertical.toFixed(2);

    recommendGeneralState.textContent =
        "현재 반동 테스트 대상 아님 · 유지";

    recommendADSState.textContent =
        createChangeText(
            testSensitivity.ads,
            ads,
            false
        );

    recommendVerticalState.textContent =
        createChangeText(
            testSensitivity.vertical,
            vertical,
            true
        );

    const magnified =
        SIGHTS[
            testWeaponSetting.sight
        ].magnified;

    if (
        magnified &&
        recommendScopeValue
    ) {
        recommendScopeLabel.textContent =
            `${SIGHTS[testWeaponSetting.sight].name} 감도`;

        recommendScopeValue.textContent =
            Math.round(scope);

        recommendScopeState.textContent =
            createChangeText(
                testSensitivity.scope,
                scope,
                false
            );
    }

    lastRecommendation = {
        general,
        ads,
        vertical,
        scope,
        sight:
            testWeaponSetting.sight
    };

    const adsChanged =
        Math.round(ads) !==
        Math.round(
            testSensitivity.ads
        );

    const verticalChanged =
        Math.abs(
            vertical -
            testSensitivity.vertical
        ) >= 0.005;

    const scopeChanged =
        magnified &&
        Math.round(scope) !==
        Math.round(
            testSensitivity.scope
        );

    applyRecommendBtn.disabled =
        !(
            adsChanged ||
            verticalChanged ||
            scopeChanged
        );
    console.log(
        "추천 감도 출력값은? ===>",
        {
            lastRecommendation,
            adsChanged,
            verticalChanged,
            scopeChanged,
            applyButtonDisabled:
                applyRecommendBtn.disabled
        }
    );
}

// 변경값 표시
function createChangeText(
    current,
    recommended,
    decimal
) {
    const currentValue =
        decimal
            ? Number(current).toFixed(2)
            : Math.round(current);

    const newValue =
        decimal
            ? Number(recommended).toFixed(2)
            : Math.round(recommended);

    if (
        currentValue ===
        newValue
    ) {
        return "현재값 유지";
    }

    return `${currentValue} → ${newValue}`;
}

// 추천값 실제 입력란에 적용
applyRecommendBtn.addEventListener(
    "click",
    () => {
        if (!lastRecommendation) {
            return;
        }

        /*
            일반 감도는 변경하지 않는다.
            ADS / 수직 / 해당 배율만 적용.
        */

        adsInput.value =
            Math.round(
                lastRecommendation.ads
            );

        verticalInput.value =
            lastRecommendation.vertical
                .toFixed(2);

        const sight =
            lastRecommendation.sight;

        if (
            SIGHTS[sight].magnified &&
            lastRecommendation.scope !== null
        ) {
            scopeSensitivityValues[sight] =
                Math.round(
                    lastRecommendation.scope
                );

            if (
                sightInput.value === sight
            ) {
                if (!scopeSensitivityInput) {
                    updateScopeSensitivityUI();
                }

                scopeSensitivityInput.value =
                    Math.round(
                        lastRecommendation.scope
                    );
            }
        }

        // 추천값 적용 후 재테스트할 값 기억
        pendingRecommendationTest = {
            ads: Number(adsInput.value),
            vertical: Number(verticalInput.value),

            scope:
                SIGHTS[lastRecommendation.sight].magnified
                    ? Number(
                        scopeSensitivityValues[
                            lastRecommendation.sight
                        ]
                    )
                    : null,

            sight: lastRecommendation.sight,

            // 총기 / 조준경 / 파츠 / 자세까지 기억
            signature: getCurrentTestSignature()
        };
        console.log(
            "추천값 적용 후 재테스트 대기값은? ===>",
            pendingRecommendationTest
        );

        saveUserSettings();

        applyRecommendBtn.disabled =
            true;

        feedback.textContent =
            "추천 감도를 현재 설정 입력란에 적용했습니다. RESTART TEST를 눌러 변경된 감도로 다시 테스트해주세요.";

        document
            .querySelector(".setting")
            .scrollIntoView({
                behavior: "smooth",
                block: "start"
            });
    }
);

// 현재 테스트 조건 식별
function getCurrentTestSignature() {
    return [
        testWeaponSetting.weapon,
        testWeaponSetting.sight,
        testWeaponSetting.muzzle,
        testWeaponSetting.grip,
        testWeaponSetting.stance
    ].join("|");
}

// RANDOM
function randomRange(
    min,
    max
) {
    return (
        Math.random() *
        (max - min)
    ) + min;
}

function randomInt(
    min,
    max
) {
    return Math.floor(
        randomRange(
            min,
            max + 1
        )
    );
}

function averageRandom(
    min,
    max
) {
    const a =
        Math.random();

    const b =
        Math.random();

    return (
        min +
        (
            (a + b) /
            2
        ) *
        (max - min)
    );
}

// CLAMP
function clamp(
    value,
    min,
    max
) {
    return Math.max(
        min,
        Math.min(
            max,
            value
        )
    );
}